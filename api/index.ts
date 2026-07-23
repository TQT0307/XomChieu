import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { MongoClient } from "mongodb";
import { createClient } from "@vercel/kv";
import { createClient as createRedisRawClient } from "redis";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Seed data
import {
  initialCategories,
  initialArticles,
  initialMembers,
  initialCoaches,
  initialAchievements,
  initialTournaments,
  initialClubs,
  initialHighlights,
  initialWebConfig
} from "./initialData.js";

const app = express();
const PORT = 3000;
const MEDIA_COLLECTION = "vovinam_media";
const MAX_STORED_IMAGE_BYTES = 650 * 1024;
const FIREBASE_BACKUP_SLOT_COUNT = 5;
const AUTO_BACKUP_MIN_INTERVAL_MS = 10 * 60 * 1000;
const ADMIN_SESSION_COOKIE = "vovinam_admin_session";

// Body parser
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ limit: "8mb", extended: true }));

// Vercel Serverless routing normalization middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    console.log(`[Request] Method: ${req.method} | Original URL: ${req.url}`);
  }

  // API responses represent live admin data and must never be served stale by a
  // browser, proxy, or Vercel CDN.
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  
  // Nếu request được định tuyến tới Serverless Function này bởi Vercel,
  // req.url có thể bị strip tiền tố /api (ví dụ thành /db-status).
  // Nếu req.url không bắt đầu bằng /api và không phải trang tĩnh /,
  // chúng ta tự động thêm tiền tố /api để khớp với các Express routes.
  if (process.env.VERCEL && req.url && !req.url.startsWith("/api") && req.url !== "/") {
    const oldUrl = req.url;
    req.url = "/api" + req.url;
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Route Normalization] Rewrote ${oldUrl} to ${req.url}`);
    }
  }
  next();
});

const DB_PATH = path.join(process.cwd(), "db.json");

function isValidEnvVar(val: any): boolean {
  return typeof val === "string" && val.trim() !== "" && val !== "undefined" && val !== "null";
}

// Support custom prefix for Vercel Redis (e.g. STORAGE_REST_API_URL or KV_REST_API_URL)
const kvUrl = isValidEnvVar(process.env.KV_REST_API_URL) ? process.env.KV_REST_API_URL : (isValidEnvVar(process.env.STORAGE_REST_API_URL) ? process.env.STORAGE_REST_API_URL : null);
const kvToken = isValidEnvVar(process.env.KV_REST_API_TOKEN) ? process.env.KV_REST_API_TOKEN : (isValidEnvVar(process.env.STORAGE_REST_API_TOKEN) ? process.env.STORAGE_REST_API_TOKEN : null);

// Instantiate dynamic KV client safely to avoid top-level crashes if environment variables are missing
let kv: any = null;
if (kvUrl && kvToken) {
  try {
    kv = createClient({
      url: kvUrl,
      token: kvToken,
    });
  } catch (err) {
    console.error("[Vercel KV] Failed to initialize client:", err);
  }
}

const hasVercelKv = !!(kvUrl && kvToken && kv);

// Leak-proof timeout helper to prevent unhandled promise rejections in serverless environments
async function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMsg));
    }, ms);
  });
  
  // Attach a silent catch to the original promise to absorb any eventual unhandled rejection after the race is over
  promise.catch((err) => {
    console.warn(`[Timeout Recovery] Background promise rejected after timeout/completion:`, err?.message || String(err));
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    throw err;
  }
}

// Support connection via TCP Redis (using 'redis' package with KV_REDIS_URL / REDIS_URL / KV_URL)
const rawRedisUrl = isValidEnvVar(process.env.KV_REDIS_URL) ? process.env.KV_REDIS_URL : (isValidEnvVar(process.env.REDIS_URL) ? process.env.REDIS_URL : (isValidEnvVar(process.env.KV_URL) ? process.env.KV_URL : null));
let redisUrl: string | null = null;
if (rawRedisUrl) {
  redisUrl = rawRedisUrl;
  // Auto-upgrade non-TLS redis:// to TLS rediss:// for Upstash / Vercel KV endpoints which mandate TLS
  if (redisUrl.startsWith("redis://") && (redisUrl.includes(".upstash.io") || redisUrl.includes(".vercel-storage.com"))) {
    redisUrl = redisUrl.replace("redis://", "rediss://");
    console.log("[Redis Config] Upgraded redis:// to rediss:// for Upstash/Vercel host to enforce TLS");
  }
}

// Only use raw TCP Redis if Vercel KV REST is not available to avoid socket crashes/thread-leaks on Vercel Serverless
const hasRedis = !!redisUrl && !hasVercelKv;

let redisFailed = false;
let sharedRedisClient: any = null;
let sharedRedisConnectPromise: Promise<any> | null = null;

// Reuse one Redis connection while a Vercel function instance is warm. Opening
// and closing TLS for every 12-second metadata poll previously added close to a
// second of latency to otherwise tiny requests.
async function runRedisCommand<T>(commandFn: (client: any) => Promise<T>): Promise<T> {
  if (!redisUrl) throw new Error("Redis connection URL is not configured");
  if (redisFailed) throw new Error("Redis connection previously failed and is disabled");

  try {
    if (!sharedRedisClient?.isReady) {
      if (!sharedRedisConnectPromise) {
        const isSecure = redisUrl.startsWith("rediss://");
        const client = createRedisRawClient({
          url: redisUrl,
          socket: {
            connectTimeout: 2500,
            tls: isSecure,
            keepAlive: 5000,
            reconnectStrategy: false
          } as any
        } as any);
        client.on("error", (error: any) => {
          console.error("[Redis TCP Client Error]:", error?.message || error);
        });
        sharedRedisConnectPromise = withTimeout(
          client.connect().then(() => client),
          3000,
          "Redis connection timeout after 3 seconds"
        ).finally(() => {
          sharedRedisConnectPromise = null;
        });
      }
      sharedRedisClient = await sharedRedisConnectPromise;
    }
    return await withTimeout(
      Promise.resolve(commandFn(sharedRedisClient)),
      4000,
      "Redis command timed out"
    );
  } catch (err) {
    console.error("[Redis TCP] Failed, disabling Redis fallback:", err);
    redisFailed = true;
    try {
      if (sharedRedisClient?.isOpen) await sharedRedisClient.disconnect();
    } catch {}
    sharedRedisClient = null;
    sharedRedisConnectPromise = null;
    throw err;
  }
}

// MongoDB Setup
let mongoClient: MongoClient | null = null;
let mongoFailed = false;
const MONGODB_URI = isValidEnvVar(process.env.MONGODB_URI) ? process.env.MONGODB_URI : null;

async function getMongoClient(): Promise<MongoClient | null> {
  if (!MONGODB_URI) return null;
  if (mongoClient) return mongoClient;
  if (mongoFailed) return null;
  try {
    const client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 2000,
      socketTimeoutMS: 2000,
      serverSelectionTimeoutMS: 2000,
    });
    // Use our leak-proof timeout to connect
    await withTimeout(client.connect(), 2000, "MongoDB connection timeout after 2 seconds");
    mongoClient = client;
    console.log("[MongoDB] Connected successfully to Cloud Atlas Database.");
    return mongoClient;
  } catch (err) {
    console.error("[MongoDB] Connection failure:", err);
    mongoClient = null;
    mongoFailed = true;
    return null;
  }
}

// Firebase Setup
let firestore: any = null;
let firebaseInitError: string | null = null;
let firebaseFailed = false;
let vercelKvFailed = false;
const hasFirebase = !!(
  isValidEnvVar(process.env.FIREBASE_SERVICE_ACCOUNT) ||
  (isValidEnvVar(process.env.FIREBASE_PROJECT_ID) &&
    isValidEnvVar(process.env.FIREBASE_CLIENT_EMAIL) &&
    isValidEnvVar(process.env.FIREBASE_PRIVATE_KEY))
);

const hasPersistentStorage = hasFirebase || hasVercelKv || hasRedis || !!MONGODB_URI;
const firebaseStorageBucketName = isValidEnvVar(process.env.FIREBASE_STORAGE_BUCKET)
  ? process.env.FIREBASE_STORAGE_BUCKET!.trim()
  : "";

function getAdminSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.KV_REDIS_URL ||
    "vovinam-local-development-session"
  );
}

function signAdminSession(account: any, remember: boolean) {
  const payload = Buffer.from(JSON.stringify({
    id: String(account.id || ""),
    username: String(account.username || ""),
    role: account.role,
    exp: Date.now() + (remember ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000)
  })).toString("base64url");
  const signature = createHmac("sha256", getAdminSessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function readAdminSession(req: any) {
  const cookieHeader = String(req.headers?.cookie || "");
  const token = cookieHeader
    .split(";")
    .map((part: string) => part.trim())
    .find((part: string) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.substring(ADMIN_SESSION_COOKIE.length + 1);
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", getAdminSessionSecret())
    .update(payload)
    .digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(session.exp || 0) > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function requireAdminSession(req: any, res: any, next: any) {
  const session = readAdminSession(req);
  if (!session) {
    return res.status(401).json({
      error: "Phiên đăng nhập Admin đã hết hạn. Vui lòng đăng nhập lại."
    });
  }
  req.adminSession = session;
  next();
}

async function getFirebaseFirestore() {
  if (firestore) return firestore;
  if (!hasFirebase) return null;
  if (firebaseFailed) return null;

  try {
    if (getApps().length === 0) {
      let credential;
      if (isValidEnvVar(process.env.FIREBASE_SERVICE_ACCOUNT)) {
        let val = process.env.FIREBASE_SERVICE_ACCOUNT!.trim();
        
        // Robust handling: Auto-detect and decode Base64 strings if the user encoded it
        if (!val.startsWith("{") && /^[A-Za-z0-9+/=]+$/.test(val)) {
          try {
            const decoded = Buffer.from(val, "base64").toString("utf-8");
            if (decoded.trim().startsWith("{")) {
              val = decoded.trim();
              console.log("[Firebase] Successfully decoded service account JSON from Base64");
            }
          } catch (e) {
            // Not actually base64, proceed
          }
        }

        let serviceAccount: any;
        try {
          // Parse the downloaded Firebase JSON exactly as provided. In particular,
          // keep `\\n` escaped until JSON.parse converts it inside private_key.
          serviceAccount = JSON.parse(val);
          // Also accept a JSON value that was accidentally encoded as a string.
          if (typeof serviceAccount === "string") {
            serviceAccount = JSON.parse(serviceAccount);
          }
        } catch (firstError) {
          // Some dashboards escape only the quotation marks. Repair those marks,
          // but never turn `\\n` into raw control characters before JSON.parse.
          const repaired = val.replace(/\\\"/g, '"');
          serviceAccount = JSON.parse(repaired);
        }

        if (!serviceAccount || typeof serviceAccount !== "object") {
          throw new Error("FIREBASE_SERVICE_ACCOUNT must contain a JSON object");
        }
        credential = cert(serviceAccount);
      } else {
        let projectId = (process.env.FIREBASE_PROJECT_ID || "").trim();
        if (projectId.startsWith('"') && projectId.endsWith('"')) {
          projectId = projectId.substring(1, projectId.length - 1).trim();
        } else if (projectId.startsWith("'") && projectId.endsWith("'")) {
          projectId = projectId.substring(1, projectId.length - 1).trim();
        }

        let clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
        if (clientEmail.startsWith('"') && clientEmail.endsWith('"')) {
          clientEmail = clientEmail.substring(1, clientEmail.length - 1).trim();
        } else if (clientEmail.startsWith("'") && clientEmail.endsWith("'")) {
          clientEmail = clientEmail.substring(1, clientEmail.length - 1).trim();
        }

        let privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").trim();
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
          privateKey = privateKey.substring(1, privateKey.length - 1).trim();
        } else if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
          privateKey = privateKey.substring(1, privateKey.length - 1).trim();
        }
        privateKey = privateKey.replace(/\\n/g, "\n");

        if (projectId && clientEmail && privateKey) {
          credential = cert({
            projectId,
            clientEmail,
            privateKey,
          });
        } else {
          throw new Error("Missing discrete Firebase credentials (projectId, clientEmail, or privateKey)");
        }
      }

      if (credential) {
        initializeApp({
          credential,
          ...(firebaseStorageBucketName ? { storageBucket: firebaseStorageBucketName } : {})
        });
      } else {
        throw new Error("No valid credential could be initialized. Check service account or individual variables.");
      }
    }
    firestore = getFirestore();
    console.log("[Firebase] Admin SDK initialized successfully.");
    return firestore;
  } catch (err: any) {
    console.error("[Firebase] Lazy initialization error:", err);
    firebaseInitError = err.message || String(err);
    firebaseFailed = true;
    return null;
  }
}

const DEFAULT_ADMIN_ACCOUNTS = [{
  id: "admin",
  username: "admin",
  password: "123",
  role: "super",
  name: "HLV Trưởng (Admin chính)",
  permissions: [
    "articles", "categories", "coaches", "members", "achievements",
    "tournaments", "clubs", "highlights", "webConfig"
  ]
}];

async function mirrorAdminAccountsToRedis(accounts: any[]) {
  if (!hasRedis || redisFailed) return;
  try {
    await runRedisCommand(client =>
      client.set("vovinam_admin_accounts", JSON.stringify(accounts))
    );
  } catch (error) {
    console.error("[Admin accounts] Redis mirror failed:", error);
  }
}

async function readAdminAccounts() {
  const dbInstance = await getFirebaseFirestore();
  if (dbInstance) {
    try {
      const snapshot: any = await withTimeout(
        dbInstance.collection("vovinam_private").doc("admin_accounts").get(),
        5000,
        "Firebase admin accounts GET timed out"
      );
      const accounts = snapshot.exists && Array.isArray(snapshot.data()?.accounts)
        ? snapshot.data()!.accounts
        : DEFAULT_ADMIN_ACCOUNTS;
      await mirrorAdminAccountsToRedis(accounts);
      return { accounts, exists: snapshot.exists, dbInstance };
    } catch (error) {
      console.error("[Admin accounts] Firebase read failed, trying Redis:", error);
    }
  }

  if (hasRedis && !redisFailed) {
    let accounts: any[] | null = null;
    await runRedisCommand(async client => {
      const value = await client.get("vovinam_admin_accounts");
      if (value) accounts = JSON.parse(value);
    });
    if (accounts && Array.isArray(accounts) && accounts.length > 0) {
      return { accounts, exists: true, dbInstance };
    }
  }
  throw new Error("Admin account storage is unavailable");
}

// Global in-memory fallback to avoid crashes on read-only environments like Vercel Serverless
let memoryDb: any = null;

function getInitialDbState() {
  return {
    categories: initialCategories,
    articles: initialArticles,
    members: initialMembers,
    coaches: initialCoaches,
    achievements: initialAchievements,
    tournaments: initialTournaments,
    clubs: initialClubs,
    highlights: initialHighlights,
    webConfig: initialWebConfig,
    lastUpdated: 0,
    keyVersions: {}
  };
}

const EXPECTED_KEYS = [
  "categories",
  "articles",
  "members",
  "coaches",
  "achievements",
  "tournaments",
  "clubs",
  "highlights",
  "webConfig"
];

// Firestore documents are limited to 1 MiB. Banner images are stored as base64,
// so keeping every banner inside webConfig makes the third/fourth image exceed
// that limit. Store each banner in its own document instead.
const BANNER_DOC_PREFIX = "webConfig_banner_";
const MAX_BANNERS = 50;
const ACHIEVEMENT_DOC_PREFIX = "achievement_item_";
const MAX_ACHIEVEMENTS = 400;

const getAchievementDocId = (id: unknown) =>
  `${ACHIEVEMENT_DOC_PREFIX}${encodeURIComponent(String(id))}`;

function splitWebConfigForFirestore(webConfig: any) {
  const source = webConfig || {};
  const banners = Array.isArray(source.banners) ? source.banners : [];
  const { banners: _banners, bannerCount: _bannerCount, ...config } = source;
  return { config: { ...config, bannerCount: banners.length }, banners };
}

function detectImageContentType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  const gifHeader = buffer.subarray(0, 6).toString("ascii");
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
    return "image/gif";
  }
  return null;
}

async function storeImageInFirebaseStorage(
  id: string,
  imageBuffer: Buffer,
  contentType: string
) {
  if (!firebaseStorageBucketName) return null;
  const bucket = getStorage().bucket(firebaseStorageBucketName);
  const objectPath = `vovinam-media/${id}`;
  const downloadToken = randomUUID();
  await withTimeout(
    bucket.file(objectPath).save(imageBuffer, {
      resumable: false,
      metadata: {
        contentType,
        cacheControl: "public,max-age=31536000,immutable",
        metadata: {
          firebaseStorageDownloadTokens: downloadToken
        }
      }
    }),
    15000,
    "Firebase Storage image upload timed out"
  );
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;
}

function mergeWebConfigPreservingMedia(existing: any, incoming: any) {
  const current = existing && typeof existing === "object" ? existing : {};
  const update = incoming && typeof incoming === "object" ? incoming : {};
  const merged = { ...current, ...update };

  // Older frontend builds may omit newly introduced fields. Omission must not
  // erase cloud media after a deployment or page reload.
  if (typeof update.logo !== "string" || update.logo.trim() === "") {
    merged.logo = current.logo;
  }
  if (!Array.isArray(update.banners)) {
    merged.banners = current.banners;
  } else {
    merged.banners = mergeCollectionPreservingMedia(current.banners, update.banners);
  }

  return merged;
}

const MEDIA_FIELDS = ["photo", "image", "thumbnail", "mediaUrls"];

function mergeCollectionPreservingMedia(existing: any, incoming: any) {
  if (!Array.isArray(incoming)) return Array.isArray(existing) ? existing : [];
  const currentById = new Map(
    (Array.isArray(existing) ? existing : []).map((item: any) => [String(item?.id), item])
  );

  return incoming.map((item: any) => {
    const current = currentById.get(String(item?.id));
    if (!current || !item || typeof item !== "object") return item;
    const merged = { ...current, ...item };

    MEDIA_FIELDS.forEach(field => {
      const value = item[field];
      const isMissing = value === undefined || value === null || value === "";
      const isEmptyArray = Array.isArray(value) && value.length === 0;
      if ((isMissing || isEmptyArray) && current[field]) {
        merged[field] = current[field];
      }
    });

    return merged;
  });
}

function isSuspiciousCollectionReplacement(existing: any, incoming: any) {
  if (!Array.isArray(existing) || !Array.isArray(incoming)) return false;
  if (existing.length >= 5) {
    const removedCount = existing.length - incoming.length;
    const allowedSingleSaveRemoval = Math.max(2, Math.floor(existing.length * 0.25));
    if (removedCount > allowedSingleSaveRemoval) return true;
  }

  const existingIds = new Set(
    existing
      .map(item => item?.id)
      .filter(id => id !== undefined && id !== null)
      .map(id => String(id))
  );
  const incomingIds = new Set(
    incoming
      .map(item => item?.id)
      .filter(id => id !== undefined && id !== null)
      .map(id => String(id))
  );
  if (existingIds.size >= 3 && incomingIds.size >= 3) {
    const overlap = Array.from(existingIds).filter(id => incomingIds.has(id)).length;
    const overlapRatio = overlap / Math.min(existingIds.size, incomingIds.size);
    if (overlapRatio < 0.34) return true;
  }

  return false;
}

async function mirrorFirebaseDataToRedis(data: any, changedKey?: string) {
  if (!hasRedis || redisFailed || !data) return;
  try {
    await runRedisCommand(async client => {
      const metadataText = await client.get("vovinam_metadata");
      const cachedMetadata = metadataText ? JSON.parse(metadataText) : {};
      const cachedTimestamp = Number(cachedMetadata.lastUpdated || 0);
      const sourceTimestamp = Number(data.lastUpdated || 0);
      if (!changedKey && sourceTimestamp > 0 && cachedTimestamp === sourceTimestamp) return;

      const keys = changedKey ? [changedKey] : EXPECTED_KEYS;
      await Promise.all([
        ...keys.map(key =>
          client.set(
            `vovinam_${key}`,
            JSON.stringify(data[key] ?? (key === "webConfig" ? {} : []))
          )
        ),
        client.set("vovinam_metadata", JSON.stringify({
          lastUpdated: sourceTimestamp || Date.now(),
          changedKey: changedKey || null,
          keyVersions: changedKey
            ? {
                ...(cachedMetadata.keyVersions || {}),
                [changedKey]: Number(data.keyVersions?.[changedKey] || sourceTimestamp || Date.now())
              }
            : data.keyVersions || {}
        }))
      ]);
    });
  } catch (err) {
    // Firebase remains authoritative. A cache failure must not fail an Admin save.
    console.error("[Redis mirror] Failed to refresh recovery cache:", err);
  }
}

async function getValidRedisMirror() {
  if (!hasRedis || redisFailed) return null;
  try {
    let mirroredData: any = null;
    await runRedisCommand(async client => {
      const metadataText = await client.get("vovinam_metadata");
      if (!metadataText) return;

      const metadata = JSON.parse(metadataText);
      const lastUpdated = Number(metadata?.lastUpdated || 0);
      // Existing seed/fallback data has lastUpdated = 0. It must never become
      // authoritative merely because Firebase is temporarily unavailable.
      if (lastUpdated <= 0) return;

      const results = await Promise.all(
        EXPECTED_KEYS.map(key => client.get(`vovinam_${key}`))
      );
      if (results.some(value => value === null)) return;

      mirroredData = {
        lastUpdated,
        keyVersions: metadata?.keyVersions || {}
      };
      EXPECTED_KEYS.forEach((key, index) => {
        mirroredData[key] = JSON.parse(results[index] as string);
      });
    });
    return mirroredData;
  } catch (err) {
    console.error("[Redis mirror] Failed to read validated cache:", err);
    return null;
  }
}

async function getRedisKeyData(key: string) {
  if (!hasRedis || redisFailed) return null;
  try {
    let result: any = null;
    await runRedisCommand(async client => {
      const [dataText, metadataText] = await Promise.all([
        client.get(`vovinam_${key}`),
        client.get("vovinam_metadata")
      ]);
      if (!dataText || !metadataText) return;
      const metadata = JSON.parse(metadataText);
      if (Number(metadata?.lastUpdated || 0) <= 0) return;
      result = {
        data: JSON.parse(dataText),
        keyVersion: Number(metadata?.keyVersions?.[key] || metadata.lastUpdated || 0)
      };
    });
    return result;
  } catch (error) {
    console.error(`[Redis mirror] Failed to read ${key}:`, error);
    return null;
  }
}

// Helper to get database timestamp only (optimized)
async function getDbTimestamp() {
  if (hasFirebase && !firebaseFailed) {
    const dbInstance = await getFirebaseFirestore();
    if (dbInstance) {
      try {
        const docRef = dbInstance.collection("vovinam").doc("metadata");
        const doc: any = await withTimeout(
          docRef.get(),
          8000,
          "Firebase Firestore GET timestamp timed out"
        );
        if (doc.exists) {
          return doc.data().lastUpdated || 0;
        }
      } catch (err) {
        console.error("[Firebase] Timestamp GET error:", err);
      }
    }
  }

  if (hasVercelKv && !vercelKvFailed) {
    try {
      const val = await withTimeout(
        kv.get("vovinam_metadata"),
        1000,
        "Vercel KV GET timestamp timed out"
      );
      if (val) {
        return (val as any).lastUpdated || 0;
      }
    } catch (err) {
      console.error("[Vercel KV REST] Timestamp GET error:", err);
    }
  }

  if (hasRedis && !redisFailed) {
    try {
      let lastUpdated = 0;
      await runRedisCommand(async (client) => {
        const valStr = await client.get("vovinam_metadata");
        if (valStr) {
          lastUpdated = JSON.parse(valStr).lastUpdated || 0;
        }
      });
      return lastUpdated;
    } catch (err) {
      console.error("[Redis via TCP] Timestamp GET error:", err);
    }
  }

  if (MONGODB_URI && !mongoFailed) {
    const client = await getMongoClient();
    if (client) {
      try {
        const db = client.db("vovinam");
        const collection = db.collection("data");
        const doc = await withTimeout(
          collection.findOne({ _id: "main_state" as any }, { projection: { lastUpdated: 1 } }),
          1500,
          "MongoDB GET timestamp timed out"
        );
        if (doc) {
          return doc.lastUpdated || 0;
        }
      } catch (err) {
        console.error("[MongoDB] Timestamp GET error:", err);
      }
    }
  }

  if (memoryDb) {
    return memoryDb.lastUpdated || 0;
  }

  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      const parsed = JSON.parse(content);
      return parsed.lastUpdated || 0;
    }
  } catch (e) {
    // Ignore
  }

  return 0;
}

async function getDbChangeStatus() {
  // Use the inexpensive Redis mirror for polling. Firebase is reserved for the
  // initial data load and actual changes, preventing the 50k free daily reads
  // from being exhausted by open visitor tabs.
  if (hasRedis && !redisFailed) {
    try {
      let cachedStatus: any = null;
      await runRedisCommand(async client => {
        const value = await client.get("vovinam_metadata");
        if (value) cachedStatus = JSON.parse(value);
      });
      if (Number(cachedStatus?.lastUpdated || 0) > 0) {
        return {
          lastUpdated: Number(cachedStatus.lastUpdated),
          changedKey: cachedStatus.changedKey || null,
          keyVersions: cachedStatus.keyVersions || {}
        };
      }
    } catch (err) {
      console.error("[Redis] Change status cache error:", err);
    }
  }

  if (hasFirebase && !firebaseFailed) {
    const dbInstance = await getFirebaseFirestore();
    if (dbInstance) {
      try {
        const snapshot: any = await withTimeout(
          dbInstance.collection("vovinam").doc("metadata").get(),
          5000,
          "Firebase GET change status timed out"
        );
        if (snapshot.exists) {
          const metadata = snapshot.data() || {};
          return {
            lastUpdated: metadata.lastUpdated || 0,
            changedKey: metadata.changedKey || null,
            keyVersions: metadata.keyVersions || {}
          };
        }
      } catch (err) {
        console.error("[Firebase] Change status error:", err);
      }
    }
  }
  return { lastUpdated: await getDbTimestamp(), changedKey: null, keyVersions: {} };
}

async function getDbKeyData(key: string) {
  const redisResult = await getRedisKeyData(key);
  if (redisResult) return redisResult.data;

  if (hasFirebase && !firebaseFailed) {
    const dbInstance = await getFirebaseFirestore();
    if (dbInstance) {
      try {
        const snapshot: any = await withTimeout(
          dbInstance.collection("vovinam").doc(key).get(),
          7000,
          `Firebase GET ${key} timed out`
        );
        if (snapshot.exists) {
          if (key === "achievements" && Array.isArray(snapshot.data()?.itemIds)) {
            const itemIds = snapshot.data().itemIds.map((itemId: any) => String(itemId));
            const itemSnapshots: any[] = await Promise.all(
              itemIds.map((itemId: string) =>
                dbInstance.collection("vovinam").doc(getAchievementDocId(itemId)).get()
              )
            );
            return itemSnapshots.map(item => item.data()?.item).filter(Boolean);
          }
          if (key !== "webConfig") return snapshot.data()?.list || [];

          const { bannerCount = 0, ...config } = snapshot.data() || {};
          const safeCount = Math.min(Math.max(Number(bannerCount) || 0, 0), MAX_BANNERS);
          const bannerSnapshots: any[] = await Promise.all(
            Array.from({ length: safeCount }, (_, index) =>
              dbInstance.collection("vovinam").doc(`${BANNER_DOC_PREFIX}${index}`).get()
            )
          );
          return {
            ...config,
            banners: bannerSnapshots.map(item => item.data()?.banner).filter(Boolean)
          };
        }
      } catch (err) {
        console.error(`[Firebase] Key GET error (${key}):`, err);
      }
    }
  }
  const db = await getDbData();
  return db[key];
}

// Helper to get DB data (async)
async function getDbData() {
  // Once Firebase has populated a complete Redis mirror, serve public reads
  // from Redis. Admin saves update Firebase first and refresh this mirror, so
  // ordinary visitors no longer consume Firestore's daily document-read quota.
  const redisMirror = await getValidRedisMirror();
  if (redisMirror) {
    memoryDb = redisMirror;
    return redisMirror;
  }

  // 1. Try Firebase Firestore if enabled (authoritative cache warm-up)
  if (hasFirebase && !firebaseFailed) {
    const dbInstance = await getFirebaseFirestore();
    if (dbInstance) {
      try {
        const snapshot: any = await withTimeout(
          dbInstance.collection("vovinam").get(),
          10000,
          "Firebase Firestore GET collection timed out"
        );
        
        if (!snapshot.empty) {
          const db: any = {};
          let hasLegacy = false;
          let legacyData: any = null;
          const splitBanners: Array<{ index: number; value: any }> = [];
          const splitAchievements = new Map<string, any>();
          
          snapshot.forEach((doc: any) => {
            const id = doc.id;
            const docData = doc.data();
            if (id === "main_state") {
              hasLegacy = true;
              legacyData = docData;
            } else if (id === "metadata") {
              db.lastUpdated = docData.lastUpdated || 0;
              db.keyVersions = docData.keyVersions || {};
            } else if (id === "webConfig") {
              const { bannerCount: _bannerCount, ...webConfig } = docData;
              db.webConfig = webConfig;
            } else if (id.startsWith(BANNER_DOC_PREFIX)) {
              const index = Number(id.substring(BANNER_DOC_PREFIX.length));
              if (Number.isInteger(index) && docData.banner) {
                splitBanners.push({ index, value: docData.banner });
              }
            } else if (id.startsWith(ACHIEVEMENT_DOC_PREFIX)) {
              if (docData.item?.id !== undefined) {
                splitAchievements.set(String(docData.item.id), docData.item);
              }
            } else if (EXPECTED_KEYS.includes(id)) {
              if (id === "achievements" && Array.isArray(docData.itemIds)) {
                db.__achievementItemIds = docData.itemIds.map((itemId: any) => String(itemId));
              } else {
                db[id] = docData.list || [];
              }
            }
          });

          if (Array.isArray(db.__achievementItemIds)) {
            db.achievements = db.__achievementItemIds
              .map((itemId: string) => splitAchievements.get(itemId))
              .filter(Boolean);
            delete db.__achievementItemIds;
          }

          if (splitBanners.length > 0 && db.webConfig) {
            db.webConfig.banners = splitBanners
              .sort((a, b) => a.index - b.index)
              .map(item => item.value);
          }
          
          if (hasLegacy && legacyData) {
            // Merge legacy data, prioritize split documents if they exist
            const merged = { ...legacyData, ...db };
            memoryDb = merged;
            await mirrorFirebaseDataToRedis(merged);
            return merged;
          }
          
          const hasData = EXPECTED_KEYS.some(k => db[k] !== undefined);
          if (hasData) {
            EXPECTED_KEYS.forEach(k => {
              if (db[k] === undefined) {
                db[k] = k === "webConfig" ? getInitialDbState().webConfig : [];
              }
            });
            if (db.lastUpdated === undefined) {
              db.lastUpdated = 0;
            }
            if (!db.keyVersions) db.keyVersions = {};
            memoryDb = db;
            await mirrorFirebaseDataToRedis(db);
            return db;
          }
        }
        
        // A read request must never initialize or overwrite cloud storage.
        // Return bundled content for rendering only; Firebase is written solely
        // after an explicit Admin action.
        const initialDb = getInitialDbState();
        memoryDb = initialDb;
        return initialDb;
      } catch (err) {
        console.error("[Firebase] Read/Init error:", err);
      }
    } else {
      firebaseFailed = true;
    }
  }

  // 1.5 Try Vercel KV (REST) first in serverless/any environment if available (extremely fast, stateless, HTTP-based)
  if (hasVercelKv && !vercelKvFailed) {
    try {
      const keys = [...EXPECTED_KEYS, "metadata"];
      const results = await Promise.all(
        keys.map(k => withTimeout(kv.get(`vovinam_${k}`), 1500, `Vercel KV GET ${k} timed out`))
      );
      
      const db: any = {};
      let hasData = false;
      keys.forEach((k, idx) => {
        const val = results[idx];
        if (val !== null && val !== undefined) {
          hasData = true;
          if (k === "metadata") {
            db.lastUpdated = (val as any).lastUpdated || 0;
            db.keyVersions = (val as any).keyVersions || {};
          } else {
            db[k] = val;
          }
        }
      });
      
      if (hasData) {
        EXPECTED_KEYS.forEach(k => {
          if (db[k] === undefined) {
            db[k] = k === "webConfig" ? getInitialDbState().webConfig : [];
          }
        });
        if (db.lastUpdated === undefined) db.lastUpdated = 0;
        memoryDb = db;
        return db;
      } else {
        // Try to read legacy key "vovinam_db_state" for backward compatibility
        const legacyData = await withTimeout(
          kv.get("vovinam_db_state"),
          1500,
          "Vercel KV GET legacy timed out"
        );
        if (legacyData) {
          memoryDb = legacyData;
          return legacyData;
        }
        
        // Reads never seed persistent storage.
        const initialDb = getInitialDbState();
        memoryDb = initialDb;
        return initialDb;
      }
    } catch (err) {
      console.error("[Vercel KV REST] Read error, disabling Vercel KV REST fallback:", err);
      vercelKvFailed = true;
    }
  }

  // 1.5 Try TCP Redis (using redis package) as fallback or if REST is not configured
  if (hasRedis && !redisFailed) {
    try {
      const db: any = {};
      let hasData = false;
      
      await runRedisCommand(async (client) => {
        const keys = [...EXPECTED_KEYS, "metadata"];
        const results = await Promise.all(keys.map(k => client.get(`vovinam_${k}`)));
        
        keys.forEach((k, idx) => {
          const valStr = results[idx];
          if (valStr) {
            hasData = true;
            const parsed = JSON.parse(valStr);
            if (k === "metadata") {
              db.lastUpdated = parsed.lastUpdated || 0;
              db.keyVersions = parsed.keyVersions || {};
            } else {
              db[k] = parsed;
            }
          }
        });
        
        if (!hasData) {
          // Check legacy
          const legacyStr = await client.get("vovinam_db_state");
          if (legacyStr) {
            Object.assign(db, JSON.parse(legacyStr));
            hasData = true;
          }
        }
      });
      
      if (hasData) {
        EXPECTED_KEYS.forEach(k => {
          if (db[k] === undefined) {
            db[k] = k === "webConfig" ? getInitialDbState().webConfig : [];
          }
        });
        if (db.lastUpdated === undefined) db.lastUpdated = 0;
        memoryDb = db;
        return db;
      } else {
        // Reads never seed persistent storage.
        const initialDb = getInitialDbState();
        memoryDb = initialDb;
        return initialDb;
      }
    } catch (err) {
      console.error("[Redis via TCP] Read error, disabling TCP Redis fallback:", err);
      redisFailed = true;
    }
  }

  // 2. Try MongoDB Atlas if MONGODB_URI is provided
  if (MONGODB_URI && !mongoFailed) {
    const client = await getMongoClient();
    if (client) {
      try {
        const db = client.db("vovinam");
        const collection = db.collection("data");
        const document = await withTimeout(
          collection.findOne({ _id: "main_state" as any }),
          2000,
          "MongoDB findOne operation timed out"
        );
        if (document) {
          const { _id, ...rest } = document;
          memoryDb = rest; // Sync memoryDb
          return rest;
        } else {
          // Reads never create the initial document.
          const initialDb = getInitialDbState();
          memoryDb = initialDb;
          return initialDb;
        }
      } catch (e) {
        console.error("[MongoDB] Read error, disabling MongoDB fallback:", e);
        mongoFailed = true;
      }
    }
  }

  // 3. Fallback to memoryDb if already loaded in this serverless instance
  if (memoryDb) {
    return memoryDb;
  }

  // 4. Local file fallback for local development or simple environments
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialDb = getInitialDbState();
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), "utf-8");
      } catch (writeErr) {
        console.warn("[Local File] Failed to write initial db.json (Expected on read-only file systems):", writeErr);
      }
      memoryDb = initialDb;
      return initialDb;
    }
    
    const content = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(content);
    memoryDb = parsed;
    return parsed;
  } catch (e) {
    console.warn("[Local File] Read error or write fallback failed, returning in-memory database:", e);
    if (!memoryDb) {
      memoryDb = getInitialDbState();
    }
    return memoryDb;
  }
}

async function readFirebaseCurrentForBackup(dbInstance: any) {
  const snapshot: any = await withTimeout(
    dbInstance.collection("vovinam").get(),
    10000,
    "Firebase current data backup read timed out"
  );
  if (snapshot.empty) return null;

  const current: any = {};
  let legacy: any = null;
  let hasCurrent = false;
  const splitBanners: Array<{ index: number; value: any }> = [];
  const achievementItems = new Map<string, any>();
  let achievementIds: string[] | null = null;

  snapshot.forEach((doc: any) => {
    const id = doc.id;
    const value = doc.data() || {};
    if (id === "main_state") {
      legacy = value;
    } else if (id === "metadata") {
      current.lastUpdated = value.lastUpdated || 0;
      current.keyVersions = value.keyVersions || {};
    } else if (id === "webConfig") {
      const { bannerCount: _bannerCount, ...config } = value;
      current.webConfig = config;
      hasCurrent = true;
    } else if (id.startsWith(BANNER_DOC_PREFIX)) {
      const index = Number(id.substring(BANNER_DOC_PREFIX.length));
      if (Number.isInteger(index) && value.banner) {
        splitBanners.push({ index, value: value.banner });
      }
    } else if (id.startsWith(ACHIEVEMENT_DOC_PREFIX)) {
      if (value.item?.id !== undefined) {
        achievementItems.set(String(value.item.id), value.item);
      }
    } else if (EXPECTED_KEYS.includes(id)) {
      hasCurrent = true;
      if (id === "achievements" && Array.isArray(value.itemIds)) {
        achievementIds = value.itemIds.map((itemId: any) => String(itemId));
      } else {
        current[id] = Array.isArray(value.list) ? value.list : [];
      }
    }
  });

  if (achievementIds) {
    current.achievements = achievementIds
      .map(itemId => achievementItems.get(itemId))
      .filter(Boolean);
  }
  if (splitBanners.length > 0) {
    current.webConfig = current.webConfig || {};
    current.webConfig.banners = splitBanners
      .sort((a, b) => a.index - b.index)
      .map(item => item.value);
  }

  if (hasCurrent) {
    EXPECTED_KEYS.forEach(key => {
      if (current[key] === undefined) {
        current[key] = key === "webConfig" ? {} : [];
      }
    });
    return current;
  }
  return legacy;
}

async function createFirebaseSafetyBackup(
  dbInstance: any,
  changedKey?: string,
  previousData?: any,
  force = false
) {
  // CRUD already loaded the current state. Reusing it avoids a full Firestore
  // collection scan before every save.
  const previous = previousData || await readFirebaseCurrentForBackup(dbInstance);
  if (!previous) return null;

  const recoveryCollection = dbInstance.collection("vovinam_recovery");
  const stateRef = recoveryCollection.doc("slot_state");
  const stateSnapshot: any = await withTimeout(
    stateRef.get(),
    5000,
    "Firebase recovery slot read timed out"
  );
  const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
  const slots = { ...(state.slots || {}) };
  const lastBackupAtByKey = { ...(state.lastBackupAtByKey || {}) };
  if (
    changedKey &&
    !force &&
    Date.now() - Number(lastBackupAtByKey[changedKey] || 0) < AUTO_BACKUP_MIN_INTERVAL_MS
  ) {
    return Number(lastBackupAtByKey[changedKey] || 0);
  }
  const keysToBackup = changedKey ? [changedKey] : EXPECTED_KEYS;
  const batch = dbInstance.batch();
  const backupAt = Date.now();

  keysToBackup.forEach(key => {
    const previousSlot = Number.isInteger(Number(slots[key]))
      ? Number(slots[key])
      : -1;
    const slot = (previousSlot + 1) % FIREBASE_BACKUP_SLOT_COUNT;
    slots[key] = slot;
    lastBackupAtByKey[key] = backupAt;
    const baseId = `${key}_slot_${slot}`;

    if (key === "webConfig") {
      const split = splitWebConfigForFirestore(previous.webConfig);
      batch.set(recoveryCollection.doc(baseId), {
        kind: "webConfig",
        key,
        slot,
        backupAt,
        config: split.config,
        bannerCount: split.banners.length
      });
      split.banners.forEach((banner: any, index: number) => {
        batch.set(recoveryCollection.doc(`${baseId}_banner_${index}`), {
          kind: "banner",
          key,
          slot,
          index,
          backupAt,
          banner
        });
      });
      for (let index = split.banners.length; index < MAX_BANNERS; index += 1) {
        batch.delete(recoveryCollection.doc(`${baseId}_banner_${index}`));
      }
    } else if (key === "achievements") {
      const list = Array.isArray(previous.achievements) ? previous.achievements : [];
      batch.set(recoveryCollection.doc(baseId), {
        kind: "achievements",
        key,
        slot,
        backupAt,
        itemIds: list.map((item: any) => String(item.id))
      });
      list.forEach((item: any) => {
        batch.set(
          recoveryCollection.doc(`${baseId}_item_${encodeURIComponent(String(item.id))}`),
          { kind: "achievement-item", key, slot, backupAt, item }
        );
      });
    } else {
      batch.set(recoveryCollection.doc(baseId), {
        kind: "list",
        key,
        slot,
        backupAt,
        list: Array.isArray(previous[key]) ? previous[key] : []
      });
    }
  });

  batch.set(stateRef, {
    slots,
    lastBackupAtByKey,
    updatedAt: backupAt,
    retentionSlots: FIREBASE_BACKUP_SLOT_COUNT,
    ...(changedKey ? {} : { lastFullBackupAt: backupAt })
  }, { merge: true });
  await withTimeout(
    batch.commit(),
    10000,
    "Firebase safety backup timed out"
  );
  return backupAt;
}

// Helper to save DB data (async)
async function saveDbData(
  data: any,
  changedKey?: string,
  previousData?: any,
  forceBackup = false
) {
  const { _id, ...dataToSave } = data;

  // 1. Try Firebase Firestore if enabled (Highest priority)
  if (hasFirebase && !firebaseFailed) {
    const dbInstance = await getFirebaseFirestore();
    if (dbInstance) {
      try {
        try {
          await createFirebaseSafetyBackup(dbInstance, changedKey, previousData, forceBackup);
        } catch (backupError) {
          console.error("[Firebase] Automatic safety backup failed:", backupError);
          if (forceBackup) throw backupError;
        }
        const batch = dbInstance.batch();
        const splitWebConfig = splitWebConfigForFirestore(dataToSave.webConfig);
        const previousAchievements = Array.isArray(previousData?.achievements)
          ? previousData.achievements
          : [];
        const previousBanners = Array.isArray(previousData?.webConfig?.banners)
          ? previousData.webConfig.banners
          : [];

        if (splitWebConfig.banners.length > MAX_BANNERS) {
          throw new Error(`A maximum of ${MAX_BANNERS} banners is supported`);
        }
        
        const keysToWrite = changedKey ? [changedKey] : EXPECTED_KEYS;
        keysToWrite.forEach(k => {
          const docRef = dbInstance.collection("vovinam").doc(k);
          if (k === "webConfig") {
            batch.set(docRef, splitWebConfig.config);
          } else if (k === "achievements") {
            const achievementList = Array.isArray(dataToSave.achievements) ? dataToSave.achievements : [];
            if (achievementList.length > MAX_ACHIEVEMENTS) {
              throw new Error(`A maximum of ${MAX_ACHIEVEMENTS} achievements is supported`);
            }
            batch.set(docRef, { itemIds: achievementList.map((item: any) => String(item.id)) });
          } else {
            batch.set(docRef, { list: dataToSave[k] || [] });
          }
        });

        if (!changedKey || changedKey === "achievements") {
          const achievementList = Array.isArray(dataToSave.achievements) ? dataToSave.achievements : [];
          const previousById = new Map(
            previousAchievements.map((item: any) => [String(item?.id), item])
          );
          const nextIds = new Set(achievementList.map((item: any) => String(item?.id)));
          achievementList.forEach((item: any) => {
            const previousItem = previousById.get(String(item?.id));
            if (JSON.stringify(previousItem) !== JSON.stringify(item)) {
              batch.set(
                dbInstance.collection("vovinam").doc(getAchievementDocId(item.id)),
                { item }
              );
            }
          });
          previousAchievements.forEach((item: any) => {
            if (!nextIds.has(String(item?.id))) {
              batch.delete(
                dbInstance.collection("vovinam").doc(getAchievementDocId(item.id))
              );
            }
          });
        }

        if (!changedKey || changedKey === "webConfig") {
          // Write only changed banners. The previous implementation issued 50
          // writes for every web setting save, even when one title changed.
          const bannerSlots = Math.max(previousBanners.length, splitWebConfig.banners.length);
          for (let index = 0; index < bannerSlots; index += 1) {
            const bannerRef = dbInstance
              .collection("vovinam")
              .doc(`${BANNER_DOC_PREFIX}${index}`);
            if (index < splitWebConfig.banners.length) {
              if (JSON.stringify(previousBanners[index]) !== JSON.stringify(splitWebConfig.banners[index])) {
                batch.set(bannerRef, { banner: splitWebConfig.banners[index] });
              }
            } else {
              batch.delete(bannerRef);
            }
          }
        }
        
        const metaRef = dbInstance.collection("vovinam").doc("metadata");
        if (changedKey && Number(previousData?.lastUpdated || 0) > 0) {
          batch.update(metaRef, {
            lastUpdated: dataToSave.lastUpdated || Date.now(),
            changedKey,
            [`keyVersions.${changedKey}`]: Number(
              dataToSave.keyVersions?.[changedKey] || dataToSave.lastUpdated || Date.now()
            )
          });
        } else if (changedKey) {
          batch.set(metaRef, {
            lastUpdated: dataToSave.lastUpdated || Date.now(),
            changedKey,
            keyVersions: {
              [changedKey]: Number(
                dataToSave.keyVersions?.[changedKey] || dataToSave.lastUpdated || Date.now()
              )
            }
          }, { merge: true });
        } else {
          batch.set(metaRef, {
            lastUpdated: dataToSave.lastUpdated || Date.now(),
            changedKey: null,
            keyVersions: dataToSave.keyVersions || {}
          });
        }
        
        // Never delete the legacy main_state document automatically. Older
        // deployments may still contain the only complete copy of the club's
        // data there, so it is retained as a recovery source.
        
        await withTimeout(
          batch.commit(),
          10000,
          "Firebase Firestore SET batch commit timed out"
        );
        await mirrorFirebaseDataToRedis(dataToSave, changedKey);
        memoryDb = dataToSave;
        return true;
      } catch (err) {
        console.error("[Firebase] Write batch error:", err);
        if (process.env.VERCEL) return false;
      }
    } else {
      firebaseFailed = true;
    }
  }

  // 1.5 Try Vercel KV (REST) first as specified by the user for fast serverless performance
  if (hasVercelKv && !vercelKvFailed) {
    try {
      const keysToPersist = changedKey ? [changedKey] : EXPECTED_KEYS;
      await Promise.all([
        ...keysToPersist.map(k => withTimeout(
          kv.set(`vovinam_${k}`, dataToSave[k] || (k === "webConfig" ? {} : [])),
          1500,
          `Vercel KV SET ${k} timed out`
        )),
        withTimeout(
          kv.set("vovinam_metadata", {
            lastUpdated: dataToSave.lastUpdated || Date.now(),
            changedKey: changedKey || null,
            keyVersions: dataToSave.keyVersions || {}
          }),
          1500,
          "Vercel KV SET metadata timed out"
        ),
        kv.del("vovinam_db_state")
      ]);
      memoryDb = dataToSave;
      return true;
    } catch (err) {
      console.error("[Vercel KV REST] Write error, disabling Vercel KV REST fallback:", err);
      vercelKvFailed = true;
    }
  }

  // 1.5 Try TCP Redis (using redis package)
  if (hasRedis && !redisFailed) {
    try {
      await runRedisCommand(async (client) => {
        const keysToPersist = changedKey ? [changedKey] : EXPECTED_KEYS;
        await Promise.all([
          ...keysToPersist.map(k => client.set(`vovinam_${k}`, JSON.stringify(dataToSave[k] || (k === "webConfig" ? {} : [])))),
          client.set("vovinam_metadata", JSON.stringify({
            lastUpdated: dataToSave.lastUpdated || Date.now(),
            changedKey: changedKey || null,
            keyVersions: dataToSave.keyVersions || {}
          })),
          client.del("vovinam_db_state")
        ]);
      });
      memoryDb = dataToSave;
      return true;
    } catch (err) {
      console.error("[Redis via TCP] Write error, disabling TCP Redis fallback:", err);
      redisFailed = true;
    }
  }

  // 2. Try MongoDB Atlas if MONGODB_URI is provided
  if (MONGODB_URI && !mongoFailed) {
    const client = await getMongoClient();
    if (client) {
      try {
        const db = client.db("vovinam");
        const collection = db.collection("data");
        await withTimeout(
          collection.replaceOne(
            { _id: "main_state" as any },
            { ...dataToSave },
            { upsert: true }
          ),
          2000,
          "MongoDB replaceOne operation timed out"
        );
        memoryDb = dataToSave;
        return true;
      } catch (e) {
        console.error("[MongoDB] Write error, disabling MongoDB fallback:", e);
        mongoFailed = true;
      }
    }
  }

  // 3. Local file fallback. Serverless memory/files are ephemeral, so a failed
  // cloud write must never be reported as successfully persisted on Vercel.
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    console.error("[Persistence] No cloud database accepted the write.");
    return false;
  }

  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(dataToSave, null, 2), "utf-8");
    memoryDb = dataToSave;
    return true;
  } catch (e) {
    console.warn("[Local File] Error saving database file (Expected on read-only file systems):", e);
    // Return true since we successfully persisted in-memory for this serverless instance session
    memoryDb = dataToSave;
    return true;
  }
}

// API Routes
type RecoveryCandidate = {
  source: string;
  data: any;
};

function decodeFirestoreRestValue(value: any): any {
  if (!value || typeof value !== "object") return null;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("stringValue" in value) return value.stringValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  if ("arrayValue" in value) {
    return (value.arrayValue?.values || []).map((item: any) => decodeFirestoreRestValue(item));
  }
  if ("mapValue" in value) {
    return decodeFirestoreRestFields(value.mapValue?.fields || {});
  }
  return null;
}

function decodeFirestoreRestFields(fields: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreRestValue(value)])
  );
}

function getFirebaseRecoveryProjectId() {
  let projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim().replace(/^["']|["']$/g, "");
  if (projectId) return projectId;
  const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (!raw) return "";
  try {
    let jsonText = raw;
    if (!jsonText.startsWith("{") && /^[A-Za-z0-9+/=]+$/.test(jsonText)) {
      jsonText = Buffer.from(jsonText, "base64").toString("utf8");
    }
    let parsed: any = JSON.parse(jsonText);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    return String(parsed.project_id || "");
  } catch {
    return "";
  }
}

async function getFirebaseRecoveryAccessToken() {
  await getFirebaseFirestore();
  const app: any = getApps()[0];
  const credential: any = app?.options?.credential;
  if (!credential?.getAccessToken) {
    throw new Error("Firebase credential cannot create a recovery access token");
  }
  const token = await credential.getAccessToken();
  return String(token?.access_token || token?.accessToken || "");
}

async function listVovinamDocumentsAt(readTime: string, accessToken: string, projectId: string) {
  const documents: any[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      pageSize: "100",
      readTime
    });
    if (pageToken) params.set("pageToken", pageToken);
    const url =
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
      `/databases/(default)/documents/vovinam?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const body: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body?.error?.message || `Firestore historical read failed (${response.status})`);
    }
    documents.push(...(body.documents || []));
    pageToken = String(body.nextPageToken || "");
  } while (pageToken);
  return documents;
}

function rebuildPitrCandidates(restDocuments: any[], minutesAgo: number): RecoveryCandidate[] {
  const current: any = {};
  let legacy: any = null;
  let hasCurrent = false;
  let achievementIds: string[] | null = null;
  const achievementItems = new Map<string, any>();
  const banners: Array<{ index: number; value: any }> = [];

  restDocuments.forEach(document => {
    const encodedId = String(document.name || "").split("/").pop() || "";
    const id = decodeURIComponent(encodedId);
    const value = decodeFirestoreRestFields(document.fields || {});
    if (id === "main_state") {
      legacy = value;
    } else if (id === "metadata") {
      current.lastUpdated = value.lastUpdated || 0;
    } else if (id === "webConfig") {
      const { bannerCount: _bannerCount, ...config } = value;
      current.webConfig = config;
      hasCurrent = true;
    } else if (id.startsWith(BANNER_DOC_PREFIX)) {
      const index = Number(id.substring(BANNER_DOC_PREFIX.length));
      if (Number.isInteger(index) && value.banner) banners.push({ index, value: value.banner });
    } else if (id.startsWith(ACHIEVEMENT_DOC_PREFIX)) {
      if (value.item?.id !== undefined) achievementItems.set(String(value.item.id), value.item);
    } else if (EXPECTED_KEYS.includes(id)) {
      hasCurrent = true;
      if (id === "achievements" && Array.isArray(value.itemIds)) {
        achievementIds = value.itemIds.map((itemId: any) => String(itemId));
      } else {
        current[id] = Array.isArray(value.list) ? value.list : [];
      }
    }
  });

  if (achievementIds) {
    current.achievements = achievementIds.map(id => achievementItems.get(id)).filter(Boolean);
  }
  if (banners.length > 0) {
    current.webConfig = current.webConfig || {};
    current.webConfig.banners = banners.sort((a, b) => a.index - b.index).map(item => item.value);
  }

  return [
    ...(hasCurrent ? [{ source: `firestore-pitr-${minutesAgo}m-current`, data: current }] : []),
    ...(legacy ? [{ source: `firestore-pitr-${minutesAgo}m-legacy`, data: legacy }] : [])
  ];
}

function summarizeRecoveryData(data: any) {
  if (!data || typeof data !== "object") {
    return { available: false };
  }
  const counts: Record<string, number> = {};
  EXPECTED_KEYS.forEach(key => {
    if (Array.isArray(data[key])) counts[key] = data[key].length;
  });
  const bannerCount = Array.isArray(data.webConfig?.banners) ? data.webConfig.banners.length : 0;
  return {
    available: true,
    lastUpdated: Number(data.lastUpdated || 0),
    counts,
    bannerCount,
    hasLogo: typeof data.webConfig?.logo === "string" && data.webConfig.logo.trim() !== "",
    approximateJsonBytes: Buffer.byteLength(JSON.stringify(data), "utf8")
  };
}

async function readFirebaseRecoveryCandidates(): Promise<RecoveryCandidate[]> {
  const dbInstance = await getFirebaseFirestore();
  if (!dbInstance) return [];

  const snapshot: any = await withTimeout(
    dbInstance.collection("vovinam").get(),
    10000,
    "Firebase recovery read timed out"
  );
  const current: any = {};
  let legacy: any = null;
  let hasCurrent = false;
  const splitBanners: Array<{ index: number; value: any }> = [];
  const achievementItems = new Map<string, any>();
  let achievementIds: string[] | null = null;

  snapshot.forEach((doc: any) => {
    const id = doc.id;
    const value = doc.data() || {};
    if (id === "main_state") {
      legacy = value;
    } else if (id === "metadata") {
      current.lastUpdated = value.lastUpdated || 0;
    } else if (id === "webConfig") {
      const { bannerCount: _bannerCount, ...config } = value;
      current.webConfig = config;
      hasCurrent = true;
    } else if (id.startsWith(BANNER_DOC_PREFIX)) {
      const index = Number(id.substring(BANNER_DOC_PREFIX.length));
      if (Number.isInteger(index) && value.banner) {
        splitBanners.push({ index, value: value.banner });
      }
    } else if (id.startsWith(ACHIEVEMENT_DOC_PREFIX)) {
      if (value.item?.id !== undefined) {
        achievementItems.set(String(value.item.id), value.item);
      }
    } else if (EXPECTED_KEYS.includes(id)) {
      hasCurrent = true;
      if (id === "achievements" && Array.isArray(value.itemIds)) {
        achievementIds = value.itemIds.map((itemId: any) => String(itemId));
      } else {
        current[id] = Array.isArray(value.list) ? value.list : [];
      }
    }
  });

  if (achievementIds) {
    current.achievements = achievementIds
      .map(itemId => achievementItems.get(itemId))
      .filter(Boolean);
  }
  if (splitBanners.length > 0) {
    current.webConfig = current.webConfig || {};
    current.webConfig.banners = splitBanners
      .sort((a, b) => a.index - b.index)
      .map(item => item.value);
  }

  const candidates: RecoveryCandidate[] = [];
  if (hasCurrent) candidates.push({ source: "firebase-current", data: current });
  if (legacy) candidates.push({ source: "firebase-legacy", data: legacy });
  const referencedAchievementIds = new Set(achievementIds || []);
  const orphanedAchievements = Array.from(achievementItems.entries())
    .filter(([itemId]) => !referencedAchievementIds.has(itemId))
    .map(([, item]) => item);
  if (orphanedAchievements.length > 0) {
    candidates.push({
      source: "firebase-orphaned-achievements",
      data: { achievements: orphanedAchievements, lastUpdated: current.lastUpdated || 0 }
    });
  }

  const recoverySnapshot: any = await withTimeout(
    dbInstance.collection("vovinam_recovery").get(),
    10000,
    "Firebase safety backup scan timed out"
  );
  const backupGroups = new Map<string, any>();
  recoverySnapshot.forEach((doc: any) => {
    const value = doc.data() || {};
    if (
      !value.key ||
      !Number.isInteger(value.slot) ||
      value.slot < 0 ||
      value.slot >= FIREBASE_BACKUP_SLOT_COUNT
    ) return;
    const groupId = `${value.key}:${value.slot}`;
    const group = backupGroups.get(groupId) || {
      key: value.key,
      slot: value.slot,
      backupAt: value.backupAt || 0,
      banners: [],
      items: new Map<string, any>()
    };
    group.backupAt = Math.max(group.backupAt, value.backupAt || 0);
    if (value.kind === "list") group.list = value.list || [];
    if (value.kind === "webConfig") {
      group.config = value.config || {};
      group.bannerCount = Number(value.bannerCount || 0);
      group.itemIds = null;
    }
    if (value.kind === "banner" && Number.isInteger(value.index)) {
      group.banners.push({ index: value.index, value: value.banner });
    }
    if (value.kind === "achievements") group.itemIds = value.itemIds || [];
    if (value.kind === "achievement-item" && value.item?.id !== undefined) {
      group.items.set(String(value.item.id), value.item);
    }
    backupGroups.set(groupId, group);
  });

  backupGroups.forEach(group => {
    let value: any;
    if (Array.isArray(group.list)) {
      value = group.list;
    } else if (group.config) {
      value = {
        ...group.config,
        banners: group.banners
          .sort((a: any, b: any) => a.index - b.index)
          .slice(0, Math.max(0, group.bannerCount || 0))
          .map((item: any) => item.value)
      };
    } else if (Array.isArray(group.itemIds)) {
      value = group.itemIds.map((id: string) => group.items.get(String(id))).filter(Boolean);
    } else {
      return;
    }
    candidates.push({
      source: `firebase-backup-${group.key}-slot-${group.slot}`,
      data: { [group.key]: value, lastUpdated: group.backupAt }
    });
  });
  return candidates;
}

async function readKvRecoveryCandidates(): Promise<RecoveryCandidate[]> {
  if (!hasVercelKv || vercelKvFailed) return [];
  const results = await Promise.all(
    EXPECTED_KEYS.map(key => withTimeout(kv.get(`vovinam_${key}`), 2500, `KV recovery ${key} timed out`))
  );
  const metadata: any = await withTimeout(kv.get("vovinam_metadata"), 2500, "KV recovery metadata timed out");
  const current: any = { lastUpdated: metadata?.lastUpdated || 0 };
  let hasCurrent = false;
  EXPECTED_KEYS.forEach((key, index) => {
    if (results[index] !== null && results[index] !== undefined) {
      current[key] = results[index];
      hasCurrent = true;
    }
  });
  const legacy = await withTimeout(kv.get("vovinam_db_state"), 2500, "KV legacy recovery timed out");
  return [
    ...(hasCurrent ? [{ source: "kv-current", data: current }] : []),
    ...(legacy ? [{ source: "kv-legacy", data: legacy }] : [])
  ];
}

async function readRedisRecoveryCandidates(): Promise<RecoveryCandidate[]> {
  if (!hasRedis || redisFailed) return [];
  const candidates: RecoveryCandidate[] = [];
  await runRedisCommand(async client => {
    const results = await Promise.all(EXPECTED_KEYS.map(key => client.get(`vovinam_${key}`)));
    const metadataText = await client.get("vovinam_metadata");
    const current: any = {
      lastUpdated: metadataText ? JSON.parse(metadataText).lastUpdated || 0 : 0
    };
    let hasCurrent = false;
    EXPECTED_KEYS.forEach((key, index) => {
      if (results[index]) {
        current[key] = JSON.parse(results[index] as string);
        hasCurrent = true;
      }
    });
    if (hasCurrent) candidates.push({ source: "redis-current", data: current });
    const legacyText = await client.get("vovinam_db_state");
    if (legacyText) candidates.push({ source: "redis-legacy", data: JSON.parse(legacyText) });
  });
  return candidates;
}

async function readMongoRecoveryCandidates(): Promise<RecoveryCandidate[]> {
  if (!MONGODB_URI || mongoFailed) return [];
  const client = await getMongoClient();
  if (!client) return [];
  const document: any = await withTimeout(
    client.db("vovinam").collection("data").findOne({ _id: "main_state" as any }),
    5000,
    "Mongo recovery read timed out"
  );
  if (!document) return [];
  const { _id, ...data } = document;
  return [{ source: "mongo-current", data }];
}

async function collectRecoveryCandidates() {
  const groups = await Promise.allSettled([
    readFirebaseRecoveryCandidates(),
    readKvRecoveryCandidates(),
    readRedisRecoveryCandidates(),
    readMongoRecoveryCandidates()
  ]);
  return groups.flatMap(result => result.status === "fulfilled" ? result.value : []);
}

app.get("/api/recovery-status", async (_req, res) => {
  try {
    const candidates = await collectRecoveryCandidates();
    res.json({
      warning: "Read-only recovery scan. No data was changed.",
      sources: candidates.map(candidate => ({
        source: candidate.source,
        ...summarizeRecoveryData(candidate.data)
      }))
    });
  } catch (err: any) {
    console.error("[recovery-status]", err);
    res.status(500).json({ error: "Không thể quét các nguồn khôi phục.", message: err?.message || String(err) });
  }
});

app.get("/api/recovery-pitr-scan", async (_req, res) => {
  try {
    const projectId = getFirebaseRecoveryProjectId();
    if (!projectId) return res.status(503).json({ error: "Không xác định được Firebase projectId." });
    const accessToken = await getFirebaseRecoveryAccessToken();
    const offsets = [2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const scans = await Promise.allSettled(offsets.map(async minutesAgo => {
      const readTime = new Date(Date.now() - minutesAgo * 60_000).toISOString();
      const documents = await listVovinamDocumentsAt(readTime, accessToken, projectId);
      return {
        minutesAgo,
        readTime,
        documentCount: documents.length,
        sources: rebuildPitrCandidates(documents, minutesAgo).map(candidate => ({
          source: candidate.source,
          ...summarizeRecoveryData(candidate.data)
        }))
      };
    }));
    res.json({
      warning: "Historical Firestore scan only. No data was changed.",
      scannedAt: new Date().toISOString(),
      results: scans.map((result, index) =>
        result.status === "fulfilled"
          ? result.value
          : { minutesAgo: offsets[index], error: result.reason?.message || String(result.reason) }
      )
    });
  } catch (err: any) {
    console.error("[recovery-pitr-scan]", err);
    res.status(500).json({
      error: "Không thể quét lịch sử Firestore.",
      message: err?.message || String(err)
    });
  }
});

app.get("/api/recovery-pitr-export", async (req, res) => {
  try {
    const minutesAgo = Number(req.query.minutesAgo);
    const variant = String(req.query.variant || "");
    if (!Number.isInteger(minutesAgo) || minutesAgo < 1 || minutesAgo > 59) {
      return res.status(400).json({ error: "minutesAgo phải nằm trong khoảng 1-59." });
    }
    if (variant !== "current" && variant !== "legacy") {
      return res.status(400).json({ error: "variant phải là current hoặc legacy." });
    }
    const projectId = getFirebaseRecoveryProjectId();
    const accessToken = await getFirebaseRecoveryAccessToken();
    const readTime = new Date(Date.now() - minutesAgo * 60_000).toISOString();
    const documents = await listVovinamDocumentsAt(readTime, accessToken, projectId);
    const source = `firestore-pitr-${minutesAgo}m-${variant}`;
    const candidate = rebuildPitrCandidates(documents, minutesAgo).find(item => item.source === source);
    if (!candidate) {
      return res.status(404).json({ error: "Không tìm thấy dữ liệu tại mốc thời gian này." });
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="vovinam-${source}-${Date.now()}.json"`);
    res.send(JSON.stringify(candidate.data, null, 2));
  } catch (err: any) {
    console.error("[recovery-pitr-export]", err);
    res.status(500).json({
      error: "Không thể xuất lịch sử Firestore.",
      message: err?.message || String(err)
    });
  }
});

app.get("/api/recovery-export/:source", async (req, res) => {
  try {
    const source = String(req.params.source || "");
    const candidates = await collectRecoveryCandidates();
    const candidate = candidates.find(item => item.source === source);
    if (!candidate) {
      return res.status(404).json({ error: "Không tìm thấy nguồn dữ liệu khôi phục này." });
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="vovinam-recovery-${source}-${Date.now()}.json"`);
    res.send(JSON.stringify(candidate.data, null, 2));
  } catch (err: any) {
    console.error("[recovery-export]", err);
    res.status(500).json({ error: "Không thể xuất dữ liệu khôi phục.", message: err?.message || String(err) });
  }
});

app.get("/api/backup-status", async (_req, res) => {
  try {
    const dbInstance = await getFirebaseFirestore();
    if (!dbInstance) {
      return res.status(503).json({
        error: "Firebase Firestore chưa sẵn sàng để kiểm tra sao lưu."
      });
    }
    const [changeStatus, stateSnapshot]: any[] = await Promise.all([
      getDbChangeStatus(),
      withTimeout(
        dbInstance.collection("vovinam_recovery").doc("slot_state").get(),
        5000,
        "Firebase backup status timed out"
      )
    ]);
    const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
    const lastUpdated = Number(changeStatus?.lastUpdated || 0);
    const lastFullBackupAt = Number(state.lastFullBackupAt || 0);
    const latestSafetyBackupAt = Number(state.updatedAt || 0);
    res.json({
      available: true,
      lastUpdated,
      latestSafetyBackupAt,
      lastFullBackupAt,
      retentionSlots: Number(state.retentionSlots || FIREBASE_BACKUP_SLOT_COUNT),
      needsBackup:
        latestSafetyBackupAt <= 0 ||
        Date.now() - latestSafetyBackupAt > 24 * 60 * 60 * 1000
    });
  } catch (err: any) {
    console.error("[backup-status]", err);
    res.status(500).json({
      error: "Không thể kiểm tra trạng thái sao lưu.",
      message: err?.message || String(err)
    });
  }
});

app.post("/api/backup-now", requireAdminSession, async (_req, res) => {
  try {
    const dbInstance = await getFirebaseFirestore();
    if (!dbInstance) {
      return res.status(503).json({
        error: "Firebase Firestore chưa sẵn sàng để tạo sao lưu."
      });
    }
    const backupAt = await createFirebaseSafetyBackup(dbInstance);
    if (!backupAt) {
      return res.status(404).json({
        error: "Không tìm thấy dữ liệu Firebase hiện tại để sao lưu."
      });
    }
    const current = await getDbData();
    res.json({
      success: true,
      backupAt,
      retentionSlots: FIREBASE_BACKUP_SLOT_COUNT,
      summary: summarizeRecoveryData(current)
    });
  } catch (err: any) {
    console.error("[backup-now]", err);
    res.status(500).json({
      error: "Không thể tạo bản sao lưu Cloud.",
      message: err?.message || String(err)
    });
  }
});

app.get("/api/db-status", async (req, res) => {
  try {
    // Reset connection failure flags to allow active troubleshooting retries
    firebaseFailed = false;
    vercelKvFailed = false;
    redisFailed = false;
    mongoFailed = false;

    const dbInstance = await getFirebaseFirestore();

    let storageType = "Local Memory / File Fallback (Mặc định - Dữ liệu sẽ BỊ MẤT khi Vercel khởi động lại / Cold Start)";
    if (hasFirebase && dbInstance) {
      storageType = "Firebase Firestore Cloud - Bền vững lâu dài";
    } else if (hasVercelKv) {
      storageType = "Vercel KV (REST Database) - Bền vững lâu dài";
    } else if (hasRedis) {
      storageType = "Vercel Redis (TCP Socket) - Bền vững lâu dài";
    } else if (MONGODB_URI) {
      storageType = "MongoDB Atlas Cloud - Bền vững lâu dài";
    }

    const status: any = {
      storageType,
      persistentStorageReady: hasPersistentStorage && (!hasFirebase || !!dbInstance),
      firebase: {
        hasConfig: hasFirebase,
        isInitialized: !!dbInstance,
        initError: firebaseInitError,
        projectId: process.env.FIREBASE_PROJECT_ID || null,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || null,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        serviceAccountLength: process.env.FIREBASE_SERVICE_ACCOUNT ? process.env.FIREBASE_SERVICE_ACCOUNT.length : 0,
        serviceAccountPreview: process.env.FIREBASE_SERVICE_ACCOUNT ? (process.env.FIREBASE_SERVICE_ACCOUNT.trim().substring(0, 15) + "...") : null,
        test: "not_run",
        error: null
      },
      mediaStorage: {
        backend: firebaseStorageBucketName ? "Firebase Storage" : "Firestore media documents",
        hasBucket: !!firebaseStorageBucketName,
        bucket: firebaseStorageBucketName || null,
        test: firebaseStorageBucketName ? "not_run" : "not_configured",
        error: null,
        recommendation: firebaseStorageBucketName
          ? "Ảnh mới được tách khỏi dữ liệu JSON và lưu trong Firebase Storage."
          : "Nên cấu hình FIREBASE_STORAGE_BUCKET khi số lượng ảnh tăng cao."
      },
      vercelKvRest: {
        hasUrl: !!kvUrl,
        hasToken: !!kvToken,
        url: kvUrl ? `${kvUrl.substring(0, 30)}...` : null,
        isCustomStoragePrefix: !process.env.KV_REST_API_URL && !!process.env.STORAGE_REST_API_URL,
        test: "not_run",
        error: null
      },
      redisTcp: {
        hasUrl: !!redisUrl,
        url: redisUrl ? `${redisUrl.substring(0, 30)}...` : null,
        test: "not_run",
        error: null
      },
      mongoDb: {
        hasUri: !!MONGODB_URI,
        uri: MONGODB_URI ? `${MONGODB_URI.substring(0, 30)}...` : null,
        test: "not_run",
        error: null
      }
    };

    // Test all connections in parallel with short timeouts to prevent Vercel Gateway/Execution limits
    const tests: Promise<any>[] = [];

    // Test Firebase
    if (hasFirebase && dbInstance) {
      tests.push((async () => {
        try {
          const start = Date.now();
          const docRef = dbInstance.collection("vovinam").doc("metadata");
          await withTimeout(
            docRef.get(),
            2000,
            "Firebase Firestore read test timed out"
          );
          status.firebase.test = `success (took ${Date.now() - start}ms)`;
        } catch (err: any) {
          status.firebase.test = "failed";
          status.firebase.error = err.message || err;
        }
      })());
    }

    if (firebaseStorageBucketName && dbInstance) {
      tests.push((async () => {
        try {
          const start = Date.now();
          await withTimeout(
            getStorage().bucket(firebaseStorageBucketName).getMetadata(),
            3000,
            "Firebase Storage bucket test timed out"
          );
          status.mediaStorage.test = `success (took ${Date.now() - start}ms)`;
        } catch (error: any) {
          status.mediaStorage.test = "failed";
          status.mediaStorage.error = error?.message || String(error);
        }
      })());
    }

    // Test Vercel KV REST
    if (hasVercelKv) {
      tests.push((async () => {
        try {
          const start = Date.now();
          const testVal = await withTimeout(
            kv.get("vovinam_db_state_test_ping"),
            2000,
            "Vercel KV GET timed out"
          );
          status.vercelKvRest.test = `success (took ${Date.now() - start}ms)`;
          status.vercelKvRest.pingResult = testVal;
        } catch (err: any) {
          status.vercelKvRest.test = "failed";
          status.vercelKvRest.error = err.message || err;
        }
      })());
    }

    // Test TCP Redis
    if (hasRedis) {
      tests.push((async () => {
        try {
          const start = Date.now();
          await runRedisCommand(async (client) => {
            await client.ping();
          });
          status.redisTcp.test = `success (took ${Date.now() - start}ms)`;
        } catch (err: any) {
          status.redisTcp.test = "failed";
          status.redisTcp.error = err.message || err;
        }
      })());
    }

    // Test MongoDB
    if (MONGODB_URI) {
      tests.push((async () => {
        try {
          const start = Date.now();
          const client = await getMongoClient();
          if (client) {
            await withTimeout(
              client.db("admin").command({ ping: 1 }),
              2000,
              "MongoDB ping timed out"
            );
            status.mongoDb.test = `success (took ${Date.now() - start}ms)`;
          } else {
            status.mongoDb.test = "failed_to_initialize_client";
          }
        } catch (err: any) {
          status.mongoDb.test = "failed";
          status.mongoDb.error = err.message || err;
        }
      })());
    }

    await Promise.all(tests);
    res.json(status);
  } catch (err: any) {
    console.error("[db-status] Route handling crashed:", err);
    res.status(500).json({
      error: "Unhandled serverless function exception in /api/db-status",
      message: err.message || String(err),
      stack: err.stack || null
    });
  }
});

app.post("/api/admin-login", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const remember = req.body?.remember === true;
    if (!username || !password) {
      return res.status(400).json({ error: "Vui lòng nhập tài khoản và mật khẩu." });
    }

    const { accounts, exists, dbInstance } = await readAdminAccounts();
    const account = accounts.find((item: any) =>
      String(item.username || "").trim().toLowerCase() === username &&
      String(item.password || "") === password
    );
    if (!account) {
      return res.status(401).json({ error: "Tài khoản hoặc mật khẩu không chính xác!" });
    }
    if (!exists && dbInstance) {
      await dbInstance
        .collection("vovinam_private")
        .doc("admin_accounts")
        .set({ accounts, updatedAt: Date.now() });
    }

    const token = signAdminSession(account, remember);
    const cookieParts = [
      `${ADMIN_SESSION_COOKIE}=${token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      remember ? `Max-Age=${30 * 24 * 60 * 60}` : "",
      process.env.VERCEL || process.env.NODE_ENV === "production" ? "Secure" : ""
    ].filter(Boolean);
    res.setHeader("Set-Cookie", cookieParts.join("; "));
    const { password: _password, ...safeAccount } = account;
    res.json({ success: true, account: safeAccount });
  } catch (error: any) {
    console.error("[admin-login]", error);
    res.status(500).json({ error: "Không thể đăng nhập Admin.", message: error?.message || String(error) });
  }
});

app.get("/api/admin-session", (req, res) => {
  const session = readAdminSession(req);
  if (!session) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, session });
});

app.post("/api/admin-logout", (_req, res) => {
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.VERCEL ? "; Secure" : ""}`
  );
  res.json({ success: true });
});

// Admin accounts live in a private Firestore document and are deliberately kept
// out of /api/data, so public website visitors never receive them with site data.
app.get("/api/admin-accounts", requireAdminSession, async (_req, res) => {
  try {
    const { accounts, exists } = await readAdminAccounts();
    res.json({ accounts, exists });
  } catch (err: any) {
    console.error("[admin-accounts GET]", err);
    res.status(500).json({ error: "Cannot load admin accounts" });
  }
});

app.put("/api/admin-accounts", requireAdminSession, async (req, res) => {
  try {
    const accounts = req.body?.accounts;
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ error: "A non-empty accounts array is required" });
    }
    const validAccounts = accounts.every((account: any) =>
      account && typeof account.id === "string" && typeof account.username === "string" &&
      typeof account.password === "string" && typeof account.name === "string" &&
      (account.role === "super" || account.role === "assistant") && Array.isArray(account.permissions)
    );
    if (!validAccounts) return res.status(400).json({ error: "Invalid admin account data" });

    const dbInstance = await getFirebaseFirestore();
    if (!dbInstance) return res.status(503).json({ error: "Firebase is unavailable" });
    await withTimeout(
      dbInstance.collection("vovinam_private").doc("admin_accounts").set({ accounts, updatedAt: Date.now() }),
      5000,
      "Firebase admin accounts SET timed out"
    );
    await mirrorAdminAccountsToRedis(accounts);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[admin-accounts PUT]", err);
    res.status(500).json({ error: "Cannot save admin accounts" });
  }
});

app.post("/api/media/image", requireAdminSession, async (req, res) => {
  try {
    const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl.trim() : "";
    const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(dataUrl);
    if (!match) {
      return res.status(400).json({ error: "Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF hợp lệ." });
    }

    const encoded = match[2].replace(/\s/g, "");
    const imageBuffer = Buffer.from(encoded, "base64");
    const detectedContentType = detectImageContentType(imageBuffer);
    if (!detectedContentType) {
      return res.status(400).json({ error: "Nội dung tải lên không phải là một file ảnh hợp lệ." });
    }
    if (imageBuffer.length === 0 || imageBuffer.length > MAX_STORED_IMAGE_BYTES) {
      return res.status(413).json({
        error: `Ảnh sau khi nén phải nhỏ hơn ${Math.round(MAX_STORED_IMAGE_BYTES / 1024)} KB.`
      });
    }

    const dbInstance = await getFirebaseFirestore();
    if (!dbInstance) {
      return res.status(503).json({
        error: "Firebase Firestore chưa sẵn sàng. Hãy kiểm tra FIREBASE_SERVICE_ACCOUNT trên Vercel."
      });
    }

    const id = `${Date.now()}_${randomUUID()}`;
    if (firebaseStorageBucketName) {
      try {
        const storageUrl = await storeImageInFirebaseStorage(
          id,
          imageBuffer,
          detectedContentType
        );
        if (storageUrl) {
          return res.status(201).json({
            success: true,
            id,
            url: storageUrl,
            byteSize: imageBuffer.length,
            storageBackend: "firebase-storage"
          });
        }
      } catch (storageError) {
        // Preserve the Admin workflow if a bucket was recently configured but
        // billing/rules are not ready yet. Firestore remains a compatible,
        // size-limited fallback and the status endpoint exposes this condition.
        console.error("[Firebase Storage] Image upload failed; using Firestore media fallback:", storageError);
      }
    }

    await withTimeout(
      dbInstance.collection(MEDIA_COLLECTION).doc(id).set({
        base64: encoded,
        contentType: detectedContentType,
        byteSize: imageBuffer.length,
        createdAt: Date.now()
      }),
      10000,
      "Firebase image upload timed out"
    );

    res.status(201).json({
      success: true,
      id,
      url: `/api/media/image/${id}`,
      byteSize: imageBuffer.length,
      storageBackend: firebaseStorageBucketName ? "firestore-fallback" : "firestore"
    });
  } catch (err: any) {
    console.error("[media/image POST]", err);
    res.status(500).json({
      error: "Không thể lưu ảnh vào Firebase.",
      message: err?.message || String(err)
    });
  }
});

app.get("/api/media/image/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) {
      return res.status(400).json({ error: "Mã ảnh không hợp lệ." });
    }

    const dbInstance = await getFirebaseFirestore();
    if (!dbInstance) {
      return res.status(503).json({ error: "Firebase Firestore chưa sẵn sàng." });
    }

    const snapshot: any = await withTimeout(
      dbInstance.collection(MEDIA_COLLECTION).doc(id).get(),
      8000,
      "Firebase image read timed out"
    );
    if (!snapshot.exists) {
      return res.status(404).json({ error: "Không tìm thấy ảnh." });
    }

    const image = snapshot.data() || {};
    const imageBuffer = Buffer.from(String(image.base64 || ""), "base64");
    const contentType = detectImageContentType(imageBuffer);
    if (!contentType) {
      return res.status(500).json({ error: "Dữ liệu ảnh lưu trên Firebase không hợp lệ." });
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(imageBuffer.length));
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    res.removeHeader("Pragma");
    res.removeHeader("Expires");
    res.send(imageBuffer);
  } catch (err: any) {
    console.error("[media/image GET]", err);
    res.status(500).json({
      error: "Không thể tải ảnh từ Firebase.",
      message: err?.message || String(err)
    });
  }
});

app.get("/api/timestamp", async (req, res) => {
  try {
    res.json(await getDbChangeStatus());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch timestamp" });
  }
});

app.get("/api/key/:key", async (req, res) => {
  try {
    const key = req.params.key;
    if (!EXPECTED_KEYS.includes(key)) return res.status(400).json({ error: "Invalid data key" });
    const redisResult = await getRedisKeyData(key);
    if (redisResult) {
      return res.json({
        key,
        data: redisResult.data,
        keyVersion: redisResult.keyVersion
      });
    }
    const [data, status] = await Promise.all([
      getDbKeyData(key),
      getDbChangeStatus()
    ]);
    res.json({
      key,
      data,
      keyVersion: Number(status?.keyVersions?.[key] || status?.lastUpdated || 0)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requested data key" });
  }
});

app.get("/api/data", async (req, res) => {
  try {
    const db = await getDbData();
    res.json(db);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch database data" });
  }
});

// Granular resource endpoints
app.get("/api/categories", async (req, res) => {
  try {
    const db = await getDbData();
    res.json(db.categories || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/articles", async (req, res) => {
  try {
    const db = await getDbData();
    res.json(db.articles || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

app.get("/api/members", async (req, res) => {
  try {
    const db = await getDbData();
    res.json(db.members || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

app.get("/api/coaches", async (req, res) => {
  try {
    const db = await getDbData();
    res.json(db.coaches || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch coaches" });
  }
});

app.get("/api/achievements", async (req, res) => {
  try {
    const db = await getDbData();
    res.json(db.achievements || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

app.get("/api/tournaments", async (req, res) => {
  try {
    const db = await getDbData();
    res.json(db.tournaments || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tournaments" });
  }
});

app.get("/api/clubs", async (req, res) => {
  try {
    const db = await getDbData();
    res.json(db.clubs || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch clubs" });
  }
});

app.get("/api/highlights", async (req, res) => {
  try {
    const db = await getDbData();
    res.json(db.highlights || []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch highlights" });
  }
});

app.get("/api/webConfig", async (req, res) => {
  try {
    const db = await getDbData();
    res.json(db.webConfig || {});
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch webConfig" });
  }
});

// Sync any specific state key
app.post("/api/save-key", requireAdminSession, async (req, res) => {
  try {
    const { key, data, baseVersion } = req.body;
    if (!key || !EXPECTED_KEYS.includes(key)) {
      return res.status(400).json({ error: "Invalid state key" });
    }
    if (data === undefined || data === null) {
      return res.status(400).json({ error: "Missing data; existing cloud data was not changed" });
    }
    
    const db = await getDbData();
    const previousDb = { ...db };
    const currentVersion = Number(db.keyVersions?.[key] || 0);
    const requestedBaseVersion = Number(baseVersion || 0);
    if (
      requestedBaseVersion > 0 &&
      currentVersion > 0 &&
      requestedBaseVersion !== currentVersion
    ) {
      return res.status(409).json({
        error: "Dữ liệu đã được một quản trị viên khác cập nhật.",
        key,
        currentVersion,
        message: "Hãy tải dữ liệu mới nhất trước khi lưu lại để tránh ghi đè thay đổi của người khác."
      });
    }
    if (isSuspiciousCollectionReplacement(db[key], data)) {
      return res.status(409).json({
        error: "Đã chặn thao tác có nguy cơ làm mất hàng loạt dữ liệu.",
        key,
        existingCount: db[key].length,
        incomingCount: data.length,
        message: "Hãy xuất bản sao lưu và thực hiện xóa theo từng mục nếu đây là thao tác có chủ ý."
      });
    }
    db[key] = key === "webConfig"
      ? mergeWebConfigPreservingMedia(db.webConfig, data)
      : Array.isArray(data)
        ? mergeCollectionPreservingMedia(db[key], data)
        : data;
    const now = Date.now();
    db.lastUpdated = now;
    db.keyVersions = {
      ...(db.keyVersions || {}),
      [key]: now
    };
    const forceBackup = Array.isArray(previousDb[key]) && Array.isArray(db[key])
      ? db[key].length < previousDb[key].length
      : key === "webConfig" &&
        Array.isArray(previousDb.webConfig?.banners) &&
        Array.isArray(db.webConfig?.banners) &&
        db.webConfig.banners.length < previousDb.webConfig.banners.length;
    
    if (await saveDbData(db, key, previousDb, forceBackup)) {
      res.json({
        success: true,
        lastUpdated: now,
        keyVersion: now,
        data: db[key]
      });
    } else {
      res.status(500).json({ error: "Failed to write database changes" });
    }
  } catch (err: any) {
    console.error("[save-key]", err);
    res.status(500).json({ error: "Internal server error during save", message: err?.message || String(err) });
  }
});

// Restore one or more collections from an Admin JSON backup. Unlike the
// regular React setters, this endpoint writes each supplied key sequentially,
// so a large import cannot launch several competing Firestore batches.
app.post("/api/restore-backup", requireAdminSession, async (req, res) => {
  try {
    const rawBackup = req.body?.backup && typeof req.body.backup === "object"
      ? req.body.backup
      : req.body;
    if (!rawBackup || typeof rawBackup !== "object") {
      return res.status(400).json({ error: "File sao lưu không có dữ liệu hợp lệ." });
    }

    const supplied: Partial<Record<string, any>> = {};
    EXPECTED_KEYS.forEach(key => {
      const prefixedKey = `vovinam_${key}`;
      if (rawBackup[prefixedKey] !== undefined) {
        supplied[key] = rawBackup[prefixedKey];
      } else if (rawBackup[key] !== undefined) {
        supplied[key] = rawBackup[key];
      }
    });
    const restoreKeys = EXPECTED_KEYS.filter(key => supplied[key] !== undefined);
    if (restoreKeys.length === 0) {
      return res.status(400).json({
        error: "File sao lưu không chứa mục dữ liệu nào mà hệ thống nhận diện được."
      });
    }

    for (const key of restoreKeys) {
      if (key === "webConfig") {
        if (!supplied[key] || typeof supplied[key] !== "object" || Array.isArray(supplied[key])) {
          return res.status(400).json({ error: "Cấu hình website trong file sao lưu không hợp lệ." });
        }
      } else if (!Array.isArray(supplied[key])) {
        return res.status(400).json({ error: `Dữ liệu ${key} trong file sao lưu không phải danh sách.` });
      }
    }

    const existing = await getDbData();
    const dbInstance = await getFirebaseFirestore();
    if (!dbInstance) {
      return res.status(503).json({ error: "Firebase Firestore chưa sẵn sàng để khôi phục dữ liệu." });
    }

    // A complete safety snapshot is mandatory before the first restored key.
    const backupAt = await createFirebaseSafetyBackup(dbInstance, undefined, existing, true);
    if (!backupAt) {
      return res.status(500).json({ error: "Không thể tạo bản sao an toàn trước khi khôi phục." });
    }

    let working = {
      ...existing,
      keyVersions: { ...(existing.keyVersions || {}) }
    };
    const restoredKeys: string[] = [];

    for (let index = 0; index < restoreKeys.length; index += 1) {
      const key = restoreKeys[index];
      const previous = working;
      const incoming = supplied[key];
      const restoredValue = key === "webConfig"
        ? mergeWebConfigPreservingMedia(previous.webConfig, incoming)
        : key === "categories"
          ? incoming
          : mergeCollectionPreservingMedia(previous[key], incoming);
      const now = Date.now() + index;
      working = {
        ...previous,
        [key]: restoredValue,
        lastUpdated: now,
        changedKey: key,
        keyVersions: {
          ...(previous.keyVersions || {}),
          [key]: now
        }
      };

      const saved = await saveDbData(working, key, previous, false);
      if (!saved) {
        return res.status(500).json({
          error: `Không thể lưu ${key} trong quá trình khôi phục.`,
          failedKey: key,
          restoredKeys,
          backupAt
        });
      }
      restoredKeys.push(key);
    }

    res.json({
      success: true,
      restoredKeys,
      backupAt,
      lastUpdated: working.lastUpdated,
      data: working
    });
  } catch (err: any) {
    console.error("[restore-backup]", err);
    res.status(500).json({
      error: "Không thể khôi phục dữ liệu từ file sao lưu.",
      message: err?.message || String(err)
    });
  }
});

// Sync entire database at once
app.post("/api/save-all", requireAdminSession, async (req, res) => {
  try {
    const { categories, articles, members, coaches, achievements, tournaments, clubs, highlights, webConfig } = req.body;
    const existing = await getDbData();
    const incomingByKey: Record<string, any> = {
      categories, articles, members, coaches, achievements, tournaments, clubs, highlights
    };
    const suspiciousKey = Object.keys(incomingByKey).find(key =>
      isSuspiciousCollectionReplacement(existing[key], incomingByKey[key])
    );
    if (suspiciousKey) {
      return res.status(409).json({
        error: "Đã chặn đồng bộ toàn bộ vì có nguy cơ làm mất hàng loạt dữ liệu.",
        key: suspiciousKey,
        existingCount: existing[suspiciousKey]?.length || 0,
        incomingCount: incomingByKey[suspiciousKey]?.length || 0
      });
    }

    const now = Date.now();
    const keyVersions = Object.fromEntries(EXPECTED_KEYS.map(key => [key, now]));
    const db = {
      categories: Array.isArray(categories) ? categories : (existing.categories || []),
      articles: mergeCollectionPreservingMedia(existing.articles, articles),
      members: mergeCollectionPreservingMedia(existing.members, members),
      coaches: mergeCollectionPreservingMedia(existing.coaches, coaches),
      achievements: mergeCollectionPreservingMedia(existing.achievements, achievements),
      tournaments: mergeCollectionPreservingMedia(existing.tournaments, tournaments),
      clubs: mergeCollectionPreservingMedia(existing.clubs, clubs),
      highlights: mergeCollectionPreservingMedia(existing.highlights, highlights),
      webConfig: mergeWebConfigPreservingMedia(existing.webConfig, webConfig),
      lastUpdated: now,
      keyVersions
    };
    
    if (await saveDbData(db, undefined, existing, true)) {
      res.json({ success: true, lastUpdated: now });
    } else {
      res.status(500).json({ error: "Failed to save entire database" });
    }
  } catch (err: any) {
    console.error("[save-all]", err);
    res.status(500).json({ error: "Internal server error during save-all", message: err?.message || String(err) });
  }
});

// Vite or Static Assets handling
async function initServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const viteModule = "vite";
    const { createServer } = await import(viteModule);
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Vovinam Board Server] Running at http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  initServer();
}

export default app;

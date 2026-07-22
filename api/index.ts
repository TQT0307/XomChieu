import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { MongoClient } from "mongodb";
import { createClient } from "@vercel/kv";
import { createClient as createRedisRawClient } from "redis";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Vercel Serverless routing normalization middleware
app.use((req, res, next) => {
  console.log(`[Request] Method: ${req.method} | Original URL: ${req.url}`);

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
    console.log(`[Route Normalization] Rewrote ${oldUrl} to ${req.url}`);
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

// Stateless, leak-proof connection manager for Redis TCP in serverless environments.
async function runRedisCommand<T>(commandFn: (client: any) => Promise<T>): Promise<T> {
  if (!redisUrl) throw new Error("Redis connection URL is not configured");
  if (redisFailed) throw new Error("Redis connection previously failed and is disabled");
  
  const isSecure = redisUrl.startsWith("rediss://");
  const client = createRedisRawClient({
    url: redisUrl,
    socket: {
      connectTimeout: 2000, // 2 seconds timeout
      tls: isSecure, // Enforce TLS on rediss://
    } as any,
    reconnectStrategy: () => {
      // Disable reconnect loops in serverless to prevent thread leaks
      return new Error("Connection failed");
    }
  } as any);

  client.on("error", (err) => {
    console.error("[Redis TCP Client Error]:", err);
  });

  try {
    // 1. Establish connection with absolute timeout
    await withTimeout(client.connect(), 2000, "Redis connection timeout after 2 seconds");
    
    // 2. Run the actual operation
    const result = await commandFn(client);
    
    // 3. Gracefully disconnect
    try {
      await client.quit();
    } catch {
      try {
        await client.disconnect();
      } catch {}
    }
    
    return result;
  } catch (err) {
    console.error("[Redis TCP] Failed, disabling Redis fallback:", err);
    redisFailed = true;
    // Forcefully disconnect on failure to release the socket
    try {
      await client.disconnect();
    } catch {}
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
    lastUpdated: 0
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

function splitWebConfigForFirestore(webConfig: any) {
  const source = webConfig || {};
  const banners = Array.isArray(source.banners) ? source.banners : [];
  const { banners: _banners, bannerCount: _bannerCount, ...config } = source;
  return { config: { ...config, bannerCount: banners.length }, banners };
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

// Helper to get DB data (async)
async function getDbData() {
  // 1. Try Firebase Firestore if enabled (Highest priority)
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
          
          snapshot.forEach((doc: any) => {
            const id = doc.id;
            const docData = doc.data();
            if (id === "main_state") {
              hasLegacy = true;
              legacyData = docData;
            } else if (id === "metadata") {
              db.lastUpdated = docData.lastUpdated || 0;
            } else if (id === "webConfig") {
              const { bannerCount: _bannerCount, ...webConfig } = docData;
              db.webConfig = webConfig;
            } else if (id.startsWith(BANNER_DOC_PREFIX)) {
              const index = Number(id.substring(BANNER_DOC_PREFIX.length));
              if (Number.isInteger(index) && docData.banner) {
                splitBanners.push({ index, value: docData.banner });
              }
            } else if (EXPECTED_KEYS.includes(id)) {
              db[id] = docData.list || [];
            }
          });

          if (splitBanners.length > 0 && db.webConfig) {
            db.webConfig.banners = splitBanners
              .sort((a, b) => a.index - b.index)
              .map(item => item.value);
          }
          
          if (hasLegacy && legacyData) {
            // Merge legacy data, prioritize split documents if they exist
            const merged = { ...legacyData, ...db };
            memoryDb = merged;
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
            memoryDb = db;
            return db;
          }
        }
        
        // Collection is empty, initialize it in split format
        const initialDb = getInitialDbState();
        const batch = dbInstance.batch();
        
        EXPECTED_KEYS.forEach(k => {
          const docRef = dbInstance.collection("vovinam").doc(k);
          if (k === "webConfig") {
            const split = splitWebConfigForFirestore(initialDb.webConfig);
            batch.set(docRef, split.config);
            split.banners.forEach((banner: any, index: number) => {
              batch.set(
                dbInstance.collection("vovinam").doc(`${BANNER_DOC_PREFIX}${index}`),
                { banner }
              );
            });
          } else {
            batch.set(docRef, { list: (initialDb as any)[k] });
          }
        });
        
        const metaRef = dbInstance.collection("vovinam").doc("metadata");
        batch.set(metaRef, { lastUpdated: initialDb.lastUpdated });
        
        await withTimeout(
          batch.commit(),
          10000,
          "Firebase Firestore initialization batch commit timed out"
        );
        
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
        
        const initialDb = getInitialDbState();
        await Promise.all([
          ...EXPECTED_KEYS.map(k => kv.set(`vovinam_${k}`, (initialDb as any)[k])),
          kv.set("vovinam_metadata", { lastUpdated: initialDb.lastUpdated })
        ]);
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
        const initialDb = getInitialDbState();
        await runRedisCommand(async (client) => {
          await Promise.all([
            ...EXPECTED_KEYS.map(k => client.set(`vovinam_${k}`, JSON.stringify((initialDb as any)[k]))),
            client.set("vovinam_metadata", JSON.stringify({ lastUpdated: initialDb.lastUpdated }))
          ]);
        });
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
          // Initial insert
          const initialDb = getInitialDbState();
          try {
            await withTimeout(
              collection.insertOne({ _id: "main_state" as any, ...initialDb }),
              2000,
              "MongoDB insertOne operation timed out"
            );
          } catch (insertErr) {
            console.error("[MongoDB] Initial insert error:", insertErr);
          }
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

// Helper to save DB data (async)
async function saveDbData(data: any, changedKey?: string) {
  const { _id, ...dataToSave } = data;
  
  // Always update in-memory representation so current process stays up to date
  memoryDb = dataToSave;

  // 1. Try Firebase Firestore if enabled (Highest priority)
  if (hasFirebase && !firebaseFailed) {
    const dbInstance = await getFirebaseFirestore();
    if (dbInstance) {
      try {
        const batch = dbInstance.batch();
        const splitWebConfig = splitWebConfigForFirestore(dataToSave.webConfig);

        if (splitWebConfig.banners.length > MAX_BANNERS) {
          throw new Error(`A maximum of ${MAX_BANNERS} banners is supported`);
        }
        
        const keysToWrite = changedKey ? [changedKey] : EXPECTED_KEYS;
        keysToWrite.forEach(k => {
          const docRef = dbInstance.collection("vovinam").doc(k);
          if (k === "webConfig") {
            batch.set(docRef, splitWebConfig.config);
          } else {
            batch.set(docRef, { list: dataToSave[k] || [] });
          }
        });

        if (!changedKey || changedKey === "webConfig") {
          // Set current banner documents and delete obsolete ones in the same
          // atomic batch, so visitors never receive a partially updated carousel.
          for (let index = 0; index < MAX_BANNERS; index += 1) {
            const bannerRef = dbInstance
              .collection("vovinam")
              .doc(`${BANNER_DOC_PREFIX}${index}`);
            if (index < splitWebConfig.banners.length) {
              batch.set(bannerRef, { banner: splitWebConfig.banners[index] });
            } else {
              batch.delete(bannerRef);
            }
          }
        }
        
        const metaRef = dbInstance.collection("vovinam").doc("metadata");
        batch.set(metaRef, { lastUpdated: dataToSave.lastUpdated || Date.now() });
        
        // Delete legacy main_state document to clean up Firestore
        const legacyRef = dbInstance.collection("vovinam").doc("main_state");
        batch.delete(legacyRef);
        
        await withTimeout(
          batch.commit(),
          10000,
          "Firebase Firestore SET batch commit timed out"
        );
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
      await Promise.all([
        ...EXPECTED_KEYS.map(k => withTimeout(
          kv.set(`vovinam_${k}`, dataToSave[k] || (k === "webConfig" ? {} : [])),
          1500,
          `Vercel KV SET ${k} timed out`
        )),
        withTimeout(
          kv.set("vovinam_metadata", { lastUpdated: dataToSave.lastUpdated || Date.now() }),
          1500,
          "Vercel KV SET metadata timed out"
        ),
        kv.del("vovinam_db_state")
      ]);
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
        await Promise.all([
          ...EXPECTED_KEYS.map(k => client.set(`vovinam_${k}`, JSON.stringify(dataToSave[k] || (k === "webConfig" ? {} : [])))),
          client.set("vovinam_metadata", JSON.stringify({ lastUpdated: dataToSave.lastUpdated || Date.now() })),
          client.del("vovinam_db_state")
        ]);
      });
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
    return true;
  } catch (e) {
    console.warn("[Local File] Error saving database file (Expected on read-only file systems):", e);
    // Return true since we successfully persisted in-memory for this serverless instance session
    return true;
  }
}

// API Routes
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
          const docRef = dbInstance.collection("vovinam").doc("main_state_ping_test");
          await withTimeout(
            docRef.set({ ping: true, timestamp: new Date().toISOString() }),
            2000,
            "Firebase Firestore ping write timed out"
          );
          status.firebase.test = `success (took ${Date.now() - start}ms)`;
        } catch (err: any) {
          status.firebase.test = "failed";
          status.firebase.error = err.message || err;
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

// Admin accounts live in a private Firestore document and are deliberately kept
// out of /api/data, so public website visitors never receive them with site data.
app.get("/api/admin-accounts", async (_req, res) => {
  try {
    const dbInstance = await getFirebaseFirestore();
    if (!dbInstance) return res.status(503).json({ error: "Firebase is unavailable" });
    const snapshot: any = await withTimeout(
      dbInstance.collection("vovinam_private").doc("admin_accounts").get(),
      5000,
      "Firebase admin accounts GET timed out"
    );
    const accounts = snapshot.exists && Array.isArray(snapshot.data()?.accounts)
      ? snapshot.data()!.accounts
      : [];
    res.json({ accounts, exists: snapshot.exists });
  } catch (err: any) {
    console.error("[admin-accounts GET]", err);
    res.status(500).json({ error: "Cannot load admin accounts" });
  }
});

app.put("/api/admin-accounts", async (req, res) => {
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
    res.json({ success: true });
  } catch (err: any) {
    console.error("[admin-accounts PUT]", err);
    res.status(500).json({ error: "Cannot save admin accounts" });
  }
});

app.get("/api/timestamp", async (req, res) => {
  try {
    const ts = await getDbTimestamp();
    res.json({ lastUpdated: ts });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch timestamp" });
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
app.post("/api/save-key", async (req, res) => {
  try {
    const { key, data } = req.body;
    if (!key || !EXPECTED_KEYS.includes(key)) {
      return res.status(400).json({ error: "Invalid state key" });
    }
    if (data === undefined || data === null) {
      return res.status(400).json({ error: "Missing data; existing cloud data was not changed" });
    }
    
    const db = await getDbData();
    db[key] = key === "webConfig"
      ? mergeWebConfigPreservingMedia(db.webConfig, data)
      : Array.isArray(data)
        ? mergeCollectionPreservingMedia(db[key], data)
        : data;
    const now = Date.now();
    db.lastUpdated = now;
    
    if (await saveDbData(db, key)) {
      res.json({ success: true, lastUpdated: now });
    } else {
      res.status(500).json({ error: "Failed to write database changes" });
    }
  } catch (err: any) {
    console.error("[save-key]", err);
    res.status(500).json({ error: "Internal server error during save", message: err?.message || String(err) });
  }
});

// Sync entire database at once
app.post("/api/save-all", async (req, res) => {
  try {
    const { categories, articles, members, coaches, achievements, tournaments, clubs, highlights, webConfig, lastUpdated } = req.body;
    const existing = await getDbData();

    const now = lastUpdated || Date.now();
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
      lastUpdated: now
    };
    
    if (await saveDbData(db)) {
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

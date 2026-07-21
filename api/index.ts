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
} from "./initialData";

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Vercel Serverless routing normalization middleware
app.use((req, res, next) => {
  console.log(`[Request] Method: ${req.method} | Original URL: ${req.url}`);
  
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
const hasFirebase = !!(
  (isValidEnvVar(process.env.FIREBASE_SERVICE_ACCOUNT)) ||
  (isValidEnvVar(process.env.FIREBASE_PROJECT_ID))
);

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

        // Robust handling: Unwrap outer double/single quotes if the env variable was saved with surrounding quotes
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1).trim();
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1).trim();
        }

        if (val.startsWith("{")) {
          const serviceAccount = JSON.parse(val);
          credential = cert(serviceAccount);
        } else {
          const warnMsg = "[Firebase] FIREBASE_SERVICE_ACCOUNT is set but does not look like a JSON object. It should be a complete JSON string starting with '{'.";
          console.warn(warnMsg);
          firebaseInitError = warnMsg;
        }
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

// Helper to get DB data (async)
async function getDbData() {
  // 1. Try Firebase Firestore if enabled (Highest priority)
  if (hasFirebase) {
    const dbInstance = await getFirebaseFirestore();
    if (dbInstance) {
      try {
        const docRef = dbInstance.collection("vovinam").doc("main_state");
        const doc: any = await withTimeout(
          docRef.get(),
          2500,
          "Firebase Firestore GET timed out"
        );
        if (doc.exists) {
          const data = doc.data();
          memoryDb = data; // Sync memoryDb
          return data;
        } else {
          const initialDb = getInitialDbState();
          try {
            await withTimeout(
              docRef.set(initialDb),
              2500,
              "Firebase Firestore SET timed out"
            );
          } catch (setErr) {
            console.error("[Firebase] Initial set error:", setErr);
          }
          memoryDb = initialDb;
          return initialDb;
        }
      } catch (err) {
        console.error("[Firebase] Read error, trying other fallbacks:", err);
      }
    }
  }

  // 1.5 Try Vercel KV (REST) first in serverless/any environment if available (extremely fast, stateless, HTTP-based)
  if (hasVercelKv) {
    try {
      const data = await withTimeout(
        kv.get("vovinam_db_state"),
        2000,
        "Vercel KV GET timed out"
      );
      if (data) {
        memoryDb = data; // Sync memoryDb
        return data;
      } else {
        const initialDb = getInitialDbState();
        try {
          await withTimeout(
            kv.set("vovinam_db_state", initialDb),
            2000,
            "Vercel KV SET timed out"
          );
        } catch (setErr) {
          console.error("[Vercel KV REST] Initial set error:", setErr);
        }
        memoryDb = initialDb;
        return initialDb;
      }
    } catch (err) {
      console.error("[Vercel KV REST] Read error, trying other fallbacks:", err);
    }
  }

  // 1.5 Try TCP Redis (using redis package) as fallback or if REST is not configured
  if (hasRedis) {
    try {
      const dataStr = await runRedisCommand(async (client) => {
        return await client.get("vovinam_db_state");
      });

      if (dataStr) {
        const parsed = JSON.parse(dataStr as string);
        memoryDb = parsed; // Sync memoryDb
        return parsed;
      } else {
        const initialDb = getInitialDbState();
        await runRedisCommand(async (client) => {
          await client.set("vovinam_db_state", JSON.stringify(initialDb));
        });
        memoryDb = initialDb;
        return initialDb;
      }
    } catch (err) {
      console.error("[Redis via TCP] Read error, trying other fallbacks:", err);
    }
  }

  // 2. Try MongoDB Atlas if MONGODB_URI is provided
  if (MONGODB_URI) {
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
        console.error("[MongoDB] Read error, falling back to local file/memory:", e);
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
async function saveDbData(data: any) {
  const { _id, ...dataToSave } = data;
  
  // Always update in-memory representation so current process stays up to date
  memoryDb = dataToSave;

  // 1. Try Firebase Firestore if enabled (Highest priority)
  if (hasFirebase) {
    const dbInstance = await getFirebaseFirestore();
    if (dbInstance) {
      try {
        const docRef = dbInstance.collection("vovinam").doc("main_state");
        await withTimeout(
          docRef.set(dataToSave),
          2500,
          "Firebase Firestore SET timed out"
        );
        return true;
      } catch (err) {
        console.error("[Firebase] Write error:", err);
      }
    }
  }

  // 1.5 Try Vercel KV (REST) first as specified by the user for fast serverless performance
  if (hasVercelKv) {
    try {
      await withTimeout(
        kv.set("vovinam_db_state", dataToSave),
        2000,
        "Vercel KV SET timed out"
      );
      return true;
    } catch (err) {
      console.error("[Vercel KV REST] Write error, trying fallbacks:", err);
    }
  }

  // 1.5 Try TCP Redis (using redis package)
  if (hasRedis) {
    try {
      await runRedisCommand(async (client) => {
        await client.set("vovinam_db_state", JSON.stringify(dataToSave));
      });
      return true;
    } catch (err) {
      console.error("[Redis via TCP] Write error, trying other fallbacks:", err);
    }
  }

  // 2. Try MongoDB Atlas if MONGODB_URI is provided
  if (MONGODB_URI) {
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
        console.error("[MongoDB] Write error:", e);
      }
    }
  }

  // 3. Local file fallback
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

app.get("/api/data", async (req, res) => {
  try {
    const db = await getDbData();
    res.json(db);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch database data" });
  }
});

// Sync any specific state key
app.post("/api/save-key", async (req, res) => {
  try {
    const { key, data } = req.body;
    if (!key) {
      return res.status(400).json({ error: "Missing state key" });
    }
    
    const db = await getDbData();
    db[key] = data;
    const now = Date.now();
    db.lastUpdated = now;
    
    if (await saveDbData(db)) {
      res.json({ success: true, lastUpdated: now });
    } else {
      res.status(500).json({ error: "Failed to write database changes" });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error during save" });
  }
});

// Sync entire database at once
app.post("/api/save-all", async (req, res) => {
  try {
    const { categories, articles, members, coaches, achievements, tournaments, clubs, highlights, webConfig, lastUpdated } = req.body;
    
    const now = lastUpdated || Date.now();
    const db = {
      categories: categories || [],
      articles: articles || [],
      members: members || [],
      coaches: coaches || [],
      achievements: achievements || [],
      tournaments: tournaments || [],
      clubs: clubs || [],
      highlights: highlights || [],
      webConfig: webConfig || {},
      lastUpdated: now
    };
    
    if (await saveDbData(db)) {
      res.json({ success: true, lastUpdated: now });
    } else {
      res.status(500).json({ error: "Failed to save entire database" });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error during save-all" });
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

initServer();

export default app;

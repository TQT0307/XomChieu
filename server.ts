import express from "express";
import path from "path";
import fs from "fs";
import { MongoClient } from "mongodb";
import { createClient } from "@vercel/kv";

import { createClient as createRedisRawClient } from "redis";

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
} from "./src/initialData";

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const DB_PATH = path.join(process.cwd(), "db.json");

// Support custom prefix for Vercel Redis (e.g. STORAGE_REST_API_URL or KV_REST_API_URL)
const kvUrl = process.env.KV_REST_API_URL || process.env.STORAGE_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN;

const hasVercelKv = !!(kvUrl && kvToken);

// Instantiate dynamic KV client safely to avoid top-level crashes if environment variables are missing
let kv: any = null;
if (hasVercelKv) {
  try {
    kv = createClient({
      url: kvUrl || "",
      token: kvToken || "",
    });
  } catch (err) {
    console.error("[Vercel KV] Failed to initialize client:", err);
  }
}

// Leak-proof timeout helper to prevent unhandled promise rejections in serverless environments
async function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMsg));
    }, ms);
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
let redisUrl = process.env.KV_REDIS_URL || process.env.REDIS_URL || process.env.KV_URL;

// Auto-upgrade non-TLS redis:// to TLS rediss:// for Upstash / Vercel KV endpoints which mandate TLS
if (redisUrl && redisUrl.startsWith("redis://") && (redisUrl.includes(".upstash.io") || redisUrl.includes(".vercel-storage.com"))) {
  redisUrl = redisUrl.replace("redis://", "rediss://");
  console.log("[Redis Config] Upgraded redis:// to rediss:// for Upstash/Vercel host to enforce TLS");
}

let hasRedis = !!redisUrl;

// Stateless, leak-proof connection manager for Redis TCP in serverless environments.
// Opens connection, executes command, closes connection immediately to avoid stale sockets/crashes.
async function runRedisCommand<T>(commandFn: (client: any) => Promise<T>): Promise<T | null> {
  if (!hasRedis || !redisUrl) return null;
  
  const isSecure = redisUrl.startsWith("rediss://");
  
  const client = createRedisRawClient({
    url: redisUrl,
    socket: {
      connectTimeout: 5000, // 5 seconds timeout
      tls: isSecure, // Enforce TLS on rediss://
      reconnectStrategy: () => {
        // Disable reconnect loops in serverless to prevent thread leaks
        return false;
      }
    } as any
  });
  
  client.on("error", (err: any) => {
    // Suppress background errors to avoid unhandled exceptions crashing serverless processes
    console.error("[Redis Transient Error]", err.message || err);
  });

  try {
    // 1. Establish connection with absolute timeout
    await withTimeout(client.connect(), 5000, "Redis connection timeout after 5 seconds");
    
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
    // Forcefully disconnect on failure to release the socket
    try {
      await client.disconnect();
    } catch {}
    throw err;
  }
}

// MongoDB Setup
let mongoClient: MongoClient | null = null;
const MONGODB_URI = process.env.MONGODB_URI;

async function getMongoClient(): Promise<MongoClient | null> {
  if (!MONGODB_URI) return null;
  if (mongoClient) return mongoClient;
  try {
    const client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 3000,
      socketTimeoutMS: 3000,
      serverSelectionTimeoutMS: 3000,
    });
    // Use our leak-proof timeout to connect
    await withTimeout(client.connect(), 3000, "MongoDB connection timeout after 3 seconds");
    mongoClient = client;
    console.log("[MongoDB] Connected successfully to Cloud Atlas Database.");
    return mongoClient;
  } catch (err) {
    console.error("[MongoDB] Connection failure:", err);
    mongoClient = null;
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
    webConfig: initialWebConfig
  };
}

// Helper to get DB data (async)
async function getDbData() {
  // 1. Try TCP Redis (using redis package) first (Highly reliable and uses the direct TCP URL)
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

  // 1.5 Try Vercel KV (REST)
  if (hasVercelKv) {
    try {
      const data = await withTimeout(
        kv.get("vovinam_db_state"),
        3000,
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
            3000,
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

  // 2. Try MongoDB Atlas if MONGODB_URI is provided
  if (MONGODB_URI) {
    const client = await getMongoClient();
    if (client) {
      try {
        const db = client.db("vovinam");
        const collection = db.collection("data");
        const document = await withTimeout(
          collection.findOne({ _id: "main_state" as any }),
          3000,
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
              3000,
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

  // 1. Try TCP Redis first as specified by the user
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

  // 1.5 Try Vercel KV (REST)
  if (hasVercelKv) {
    try {
      await withTimeout(
        kv.set("vovinam_db_state", dataToSave),
        3000,
        "Vercel KV SET timed out"
      );
      return true;
    } catch (err) {
      console.error("[Vercel KV REST] Write error, trying fallbacks:", err);
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
          3000,
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
  const status: any = {
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
      uri: MONGODB_URI ? `${MONGODB_URI.substring(0, 20)}...` : null,
      test: "not_run",
      error: null
    },
    localFile: {
      path: DB_PATH,
      exists: fs.existsSync(DB_PATH)
    },
    storageType: hasVercelKv 
      ? "Vercel KV Cloud via REST (Được khuyên dùng)" 
      : (hasRedis 
          ? "Vercel Redis Cloud via TCP (Được khuyên dùng)" 
          : (MONGODB_URI ? "MongoDB Atlas Cloud" : "Local File Fallback (db.json - Không đồng bộ)")),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      PORT: PORT
    }
  };

  // Test Vercel KV REST
  if (hasVercelKv) {
    try {
      const start = Date.now();
      const testVal = await withTimeout(
        kv.get("vovinam_db_state_test_ping"),
        3000,
        "Vercel KV GET timed out"
      );
      status.vercelKvRest.test = `success (took ${Date.now() - start}ms)`;
      status.vercelKvRest.pingResult = testVal;
    } catch (err: any) {
      status.vercelKvRest.test = "failed";
      status.vercelKvRest.error = err.message || err;
    }
  }

  // Test TCP Redis
  if (hasRedis) {
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
  }

  // Test MongoDB
  if (MONGODB_URI) {
    try {
      const start = Date.now();
      const client = await getMongoClient();
      if (client) {
        await withTimeout(
          client.db("admin").command({ ping: 1 }),
          3000,
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
  }

  res.json(status);
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
    
    if (await saveDbData(db)) {
      res.json({ success: true });
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
    const { categories, articles, members, coaches, achievements, tournaments, clubs, highlights, webConfig } = req.body;
    
    const db = {
      categories: categories || [],
      articles: articles || [],
      members: members || [],
      coaches: coaches || [],
      achievements: achievements || [],
      tournaments: tournaments || [],
      clubs: clubs || [],
      highlights: highlights || [],
      webConfig: webConfig || {}
    };
    
    if (await saveDbData(db)) {
      res.json({ success: true });
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

import express from "express";
import path from "path";
import fs from "fs";
import { MongoClient } from "mongodb";
import { createClient } from "@vercel/kv";

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
const PORT = parseInt(process.env.PORT || "3000", 10);

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

// MongoDB Setup
let mongoClient: MongoClient | null = null;
const MONGODB_URI = process.env.MONGODB_URI;

async function getMongoClient(): Promise<MongoClient | null> {
  if (!MONGODB_URI) return null;
  if (mongoClient) return mongoClient;
  try {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log("[MongoDB] Connected successfully to Cloud Atlas Database.");
    return mongoClient;
  } catch (err) {
    console.error("[MongoDB] Connection failure:", err);
    return null;
  }
}

// Helper to get DB data (async)
async function getDbData() {
  // 1. Try Vercel KV (REST) first (Highly reliable in serverless environments)
  if (hasVercelKv) {
    try {
      const data = await kv.get("vovinam_db_state");
      if (data) {
        return data;
      } else {
        const initialDb = {
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
        await kv.set("vovinam_db_state", initialDb);
        return initialDb;
      }
    } catch (err) {
      console.error("[Vercel KV REST] Read error, trying other fallbacks:", err);
    }
  }

  // 2. Try MongoDB Atlas if MONGODB_URI is provided
  const client = await getMongoClient();
  if (client) {
    try {
      const db = client.db("vovinam");
      const collection = db.collection("data");
      const document = await collection.findOne({ _id: "main_state" as any });
      if (document) {
        const { _id, ...rest } = document;
        return rest;
      } else {
        // Initial insert
        const initialDb = {
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
        await collection.insertOne({ _id: "main_state" as any, ...initialDb });
        return initialDb;
      }
    } catch (e) {
      console.error("[MongoDB] Read error, falling back to local file:", e);
    }
  }

  // 4. Local file fallback for local development or simple environments
  if (!fs.existsSync(DB_PATH)) {
    const initialDb = {
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
    fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), "utf-8");
    return initialDb;
  }
  try {
    const content = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    console.error("Error reading database file, using fallback:", e);
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
}

// Helper to save DB data (async)
async function saveDbData(data: any) {
  const { _id, ...dataToSave } = data;

  // 1. Try Vercel KV (REST) first (Highly reliable in serverless environments)
  if (hasVercelKv) {
    try {
      await kv.set("vovinam_db_state", dataToSave);
      return true;
    } catch (err) {
      console.error("[Vercel KV REST] Write error, trying fallbacks:", err);
    }
  }

  // 2. Try MongoDB Atlas
  const client = await getMongoClient();
  if (client) {
    try {
      const db = client.db("vovinam");
      const collection = db.collection("data");
      await collection.replaceOne(
        { _id: "main_state" as any },
        { ...dataToSave },
        { upsert: true }
      );
      return true;
    } catch (e) {
      console.error("[MongoDB] Write error:", e);
    }
  }

  // 3. Local file fallback
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error saving database file:", e);
    return false;
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
      ? "Vercel KV Cloud (Được khuyên dùng)" 
      : (MONGODB_URI ? "MongoDB Atlas Cloud" : "Local File Fallback (db.json - Không đồng bộ)"),
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
      const testVal = await kv.get("vovinam_db_state_test_ping");
      status.vercelKvRest.test = `success (took ${Date.now() - start}ms)`;
      status.vercelKvRest.pingResult = testVal;
    } catch (err: any) {
      status.vercelKvRest.test = "failed";
      status.vercelKvRest.error = err.message || err;
    }
  }

  // Test MongoDB
  if (MONGODB_URI) {
    try {
      const start = Date.now();
      const client = await getMongoClient();
      if (client) {
        await client.db("admin").command({ ping: 1 });
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
    const { createServer } = await import("vite");
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

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { MongoClient } from "mongodb";
import { kv } from "@vercel/kv";

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

// Vercel KV Support Check
const hasVercelKv = !!process.env.KV_REST_API_URL;

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
  // 1. Try Vercel KV first (100% free, 1-click in Vercel Storage dashboard, auto-injected environment variables)
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
      console.error("[Vercel KV] Read error, trying fallbacks:", err);
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

  // 3. Local file fallback for local development or simple environments
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
  // 1. Try Vercel KV first
  if (hasVercelKv) {
    try {
      const { _id, ...dataToSave } = data;
      await kv.set("vovinam_db_state", dataToSave);
      return true;
    } catch (err) {
      console.error("[Vercel KV] Write error, trying fallbacks:", err);
    }
  }

  // 2. Try MongoDB Atlas
  const client = await getMongoClient();
  if (client) {
    try {
      const db = client.db("vovinam");
      const collection = db.collection("data");
      const { _id, ...dataToSave } = data;
      await collection.replaceOne(
        { _id: "main_state" as any },
        { ...dataToSave },
        { upsert: true }
      );
      return true;
    } catch (e) {
      console.error("[MongoDB] Write error:", e);
      return false;
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
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

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

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

// Helper to get DB data
function getDbData() {
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

// Helper to save DB data
function saveDbData(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error saving database file:", e);
    return false;
  }
}

// API Routes
app.get("/api/data", (req, res) => {
  const db = getDbData();
  res.json(db);
});

// Sync any specific state key
app.post("/api/save-key", (req, res) => {
  const { key, data } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Missing state key" });
  }
  
  const db = getDbData();
  db[key] = data;
  
  if (saveDbData(db)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: "Failed to write database to disk" });
  }
});

// Sync entire database at once
app.post("/api/save-all", (req, res) => {
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
  
  if (saveDbData(db)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: "Failed to save data" });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Vovinam Board Server] Running at http://localhost:${PORT}`);
  });
}

initServer();

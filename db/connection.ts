import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

// db/ lives at the repo root, so the real data dir is one level up. The DB path
// is resolved lazily (in openDatabase) so tests can point COCKPIT_DB_PATH at a
// temp file before the handle is created, never touching the real cockpit.db.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = path.join(__dirname, "..", "data");

export function resolveDbPath(): string {
  return process.env["COCKPIT_DB_PATH"] || path.join(dataDir, "cockpit.db");
}

// Single shared SQLite handle for the whole process. Repositories reach it via
// getDb(); it is created exactly once in openDatabase() during initDatabase().
let db: DatabaseSync | null = null;

export function openDatabase(): DatabaseSync {
  db = new DatabaseSync(resolveDbPath());
  return db;
}

export function getDb(): DatabaseSync {
  if (!db) {
    throw new Error("Database not initialized — call initDatabase() before using a repository.");
  }
  return db;
}

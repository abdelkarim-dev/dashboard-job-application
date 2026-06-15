// Facade — kept at the repo root as the stable entry point so existing importers
// (server.mjs, lib/data/storage.mjs, lib/domain/profile.mjs, test/database.test.mjs)
// keep importing `initDatabase`, `seedLearningData`, and every `sql*` accessor
// from "./database.mjs" unchanged. The implementation now lives in the db/
// TypeScript modules, resolved at runtime by tsx (see `npm start` / `npm test`).
//
//   db/connection.ts        — lazy SQLite handle (resolveDbPath / getDb)
//   db/schema.ts            — table creation + additive ensureColumn migrations
//   db/legacy-migration.ts  — one-time JSON-store import
//   db/seed.ts              — default course / system-design content
//   db/repositories/*.ts    — typed load/save accessors per table
//   db/index.ts             — composes initDatabase() + re-exports the accessors
export * from "./db/index.ts";

import { openDatabase } from "./connection";
import { createSchema } from "./schema";
import { performLegacyMigration } from "./legacy-migration";
import { seedLearningData } from "./seed";

// Public entry point: open the SQLite handle, create/migrate the schema, run the
// one-time legacy JSON import, then seed default learning content. Mirrors the
// original monolithic initDatabase() exactly — just composed from focused modules.
export async function initDatabase(): Promise<void> {
  openDatabase();
  createSchema();
  await performLegacyMigration();
  await seedLearningData();
}

export { seedLearningData };

export * from "./repositories/applications";
export * from "./repositories/profile";
export * from "./repositories/practice";
export * from "./repositories/courses";
export * from "./repositories/system-design";
export * from "./repositories/cv";
export * from "./repositories/settings";

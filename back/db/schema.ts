import { getDb } from "./connection";
import type { TableInfoRow } from "./types";

// Adds a column only if it is missing — the additive migration primitive that
// lets the schema evolve without a destructive rebuild of the table.
function ensureColumn(table: string, column: string, definition: string): void {
  const db = getDb();
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as TableInfoRow[];
  if (!columns.some((row) => row.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Creates every table (IF NOT EXISTS) and runs the additive ensureColumn
// migrations. Idempotent: safe to call on every boot.
export function createSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      dateApplied TEXT,
      appliedAt TEXT,
      rejectedAt TEXT,
      location TEXT,
      salary TEXT,
      equity TEXT,
      oaDeadline TEXT,
      skills TEXT,
      "group" TEXT,
      sourceUrl TEXT,
      notes TEXT,
      description TEXT,
      stageDates TEXT,
      stageDateTimes TEXT,
      evaluation TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  ensureColumn("applications", "oaDeadline", "TEXT");
  ensureColumn("applications", "attachments", "TEXT");
  // OA task completion is independent of pipeline stage: a candidate can submit
  // the assessment while still waiting for results (i.e. still in the OA stage).
  ensureColumn("applications", "oaCompletedAt", "TEXT");
  ensureColumn("applications", "stagePassedAt", "TEXT");
  // Priority is normalized server-side but was never persisted — surface it.
  ensureColumn("applications", "priority", "TEXT");
  // CRM-style next step: a short action label and the date it is due. Powers the
  // board "Next actions" tracker and the CSV export. Both clear with "".
  ensureColumn("applications", "nextAction", "TEXT");
  ensureColumn("applications", "nextActionAt", "TEXT");
  ensureColumn("applications", "level", "TEXT");
  ensureColumn("applications", "source", "TEXT");
  ensureColumn("applications", "interviewDate", "TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      key TEXT PRIMARY KEY,
      fullName TEXT,
      email TEXT,
      phone TEXT,
      country TEXT,
      city TEXT,
      province TEXT,
      portfolio TEXT,
      github TEXT,
      linkedin TEXT,
      resumeText TEXT,
      resumeText2 TEXT,
      legallyAuthorized TEXT,
      requiresSponsorship TEXT,
      gender TEXT,
      race TEXT,
      veteranStatus TEXT,
      disabilityStatus TEXT,
      gemmaPrompt TEXT,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  ensureColumn("profile", "country", "TEXT");
  ensureColumn("profile", "city", "TEXT");
  ensureColumn("profile", "province", "TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS practice_problems (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      url TEXT,
      difficulty TEXT,
      tags TEXT,
      paidOnly INTEGER DEFAULT 0,
      acceptance REAL,
      syncedAt TEXT,
      methodName TEXT,
      description TEXT,
      notes TEXT,
      reflection TEXT,
      customTests TEXT,
      starterCode TEXT,
      solutionCode TEXT,
      draft TEXT,
      languageDrafts TEXT,
      solutionRevealed INTEGER DEFAULT 0,
      userStarted INTEGER DEFAULT 0,
      solved INTEGER DEFAULT 0,
      solveCount INTEGER DEFAULT 0,
      reviewLevel INTEGER DEFAULT 0,
      nextReviewAt TEXT,
      history TEXT,
      attempts TEXT,
      sessions TEXT,
      approach TEXT,
      insight TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  ensureColumn("practice_problems", "languageDrafts", "TEXT");
  ensureColumn("practice_problems", "approach", "TEXT");
  ensureColumn("practice_problems", "insight", "TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      track TEXT,
      status TEXT,
      progress INTEGER DEFAULT 0,
      modules TEXT,
      resources TEXT,
      notes TEXT,
      lastStudiedAt TEXT,
      nextReviewAt TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS system_design (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT,
      confidence INTEGER DEFAULT 1,
      prompts TEXT,
      checklist TEXT,
      notes TEXT,
      diagramLinks TEXT,
      practiceHistory TEXT,
      lastPracticedAt TEXT,
      nextReviewAt TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS profile_cvs (
      variant TEXT PRIMARY KEY,
      fileName TEXT,
      mimeType TEXT,
      data TEXT,
      uploadedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

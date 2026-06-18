import { getDb } from "../connection";
import type { PracticeProblemRow, PracticeSettings, PracticeStoreInput } from "../types";

const defaultPracticeSettings: PracticeSettings = {
  timezone: "America/Vancouver",
  dailyReviewTime: "20:00",
  reviewMinutes: 45,
};

export async function sqlLoadPracticeStore() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM practice_problems").all() as unknown as PracticeProblemRow[];
  const problems = rows.map((prob) => ({
    ...prob,
    tags: JSON.parse(prob.tags || "[]"),
    paidOnly: prob.paidOnly === 1,
    customTests: JSON.parse(prob.customTests || "[]"),
    languageDrafts: JSON.parse(prob.languageDrafts || "{}"),
    solutionRevealed: prob.solutionRevealed === 1,
    userStarted: prob.userStarted === 1,
    solved: prob.solved === 1,
    history: JSON.parse(prob.history || "[]"),
    attempts: JSON.parse(prob.attempts || "[]"),
    sessions: JSON.parse(prob.sessions || "[]"),
    approach: JSON.parse(prob.approach || "{}"),
    insight: prob.insight || "",
  }));

  const settingsRow = db
    .prepare("SELECT value FROM app_settings WHERE key = 'practice'")
    .get() as unknown as { value: string } | undefined;
  let settings: PracticeSettings = { ...defaultPracticeSettings };
  if (settingsRow?.value) {
    try {
      settings = { ...settings, ...JSON.parse(settingsRow.value) };
    } catch {}
  }

  return {
    version: 1,
    settings,
    problems,
  };
}

export async function sqlSavePracticeStore(store: PracticeStoreInput) {
  const db = getDb();
  if (store.settings && typeof store.settings === "object") {
    db.prepare(
      `
      INSERT OR REPLACE INTO app_settings (key, value, updatedAt) VALUES ('practice', ?, ?)
    `
    ).run(JSON.stringify(store.settings), new Date().toISOString());
  }

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO practice_problems (
      id, title, slug, url, difficulty, tags, paidOnly, acceptance, syncedAt,
      methodName, description, notes, reflection, customTests, starterCode, solutionCode,
      draft, languageDrafts, solutionRevealed, userStarted, solved, solveCount, reviewLevel, nextReviewAt,
      history, attempts, sessions, approach, insight, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN TRANSACTION");
  try {
    const problemIds = store.problems.map((prob) => prob.id).filter(Boolean);
    if (problemIds.length > 0) {
      const placeholders = problemIds.map(() => "?").join(", ");
      db.prepare(`DELETE FROM practice_problems WHERE id NOT IN (${placeholders})`).run(...problemIds);
    } else {
      db.prepare("DELETE FROM practice_problems").run();
    }

    for (const prob of store.problems) {
      stmt.run(
        prob.id,
        prob.title,
        prob.slug,
        prob.url || "",
        prob.difficulty || "Easy",
        JSON.stringify(prob.tags || []),
        prob.paidOnly ? 1 : 0,
        prob.acceptance || null,
        prob.syncedAt || "",
        prob.methodName || "solve",
        prob.description || "",
        prob.notes || "",
        prob.reflection || "",
        JSON.stringify(prob.customTests || []),
        prob.starterCode || "",
        prob.solutionCode || "",
        prob.draft || "",
        JSON.stringify(prob.languageDrafts || {}),
        prob.solutionRevealed ? 1 : 0,
        prob.userStarted ? 1 : 0,
        prob.solved ? 1 : 0,
        prob.solveCount || 0,
        prob.reviewLevel || 0,
        prob.nextReviewAt || "",
        JSON.stringify(prob.history || []),
        JSON.stringify(prob.attempts || []),
        JSON.stringify(prob.sessions || []),
        JSON.stringify(prob.approach || {}),
        prob.insight || "",
        new Date().toISOString()
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

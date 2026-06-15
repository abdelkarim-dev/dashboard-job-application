import { getDb } from "../connection";
import type { SystemDesignRow, SystemDesignStoreInput } from "../types";

export async function sqlLoadSystemDesignStore() {
  const rows = getDb().prepare("SELECT * FROM system_design").all() as unknown as SystemDesignRow[];
  const topics = rows.map((t) => ({
    ...t,
    prompts: JSON.parse(t.prompts || "[]"),
    checklist: JSON.parse(t.checklist || "[]"),
    practiceHistory: JSON.parse(t.practiceHistory || "[]"),
  }));
  return { version: 1, topics };
}

export async function sqlSaveSystemDesignStore(store: SystemDesignStoreInput) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO system_design (
      id, title, status, confidence, prompts, checklist, notes, diagramLinks, practiceHistory, lastPracticedAt, nextReviewAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN TRANSACTION");
  try {
    for (const t of store.topics) {
      stmt.run(
        t.id,
        t.title,
        t.status || "Not Started",
        t.confidence || 1,
        JSON.stringify(t.prompts || []),
        JSON.stringify(t.checklist || []),
        t.notes || "",
        t.diagramLinks || "",
        JSON.stringify(t.practiceHistory || []),
        t.lastPracticedAt || "",
        t.nextReviewAt || ""
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

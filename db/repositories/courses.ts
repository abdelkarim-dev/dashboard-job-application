import { getDb } from "../connection";
import type { CourseRow, CourseStoreInput } from "../types";

export async function sqlLoadCoursesStore() {
  const rows = getDb().prepare("SELECT * FROM courses").all() as unknown as CourseRow[];
  const items = rows.map((r) => ({
    ...r,
    modules: JSON.parse(r.modules || "[]"),
    resources: JSON.parse(r.resources || "[]"),
  }));
  return { version: 1, items };
}

export async function sqlSaveCoursesStore(store: CourseStoreInput) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO courses (
      id, title, track, status, progress, modules, resources, notes, lastStudiedAt, nextReviewAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN TRANSACTION");
  try {
    for (const item of store.items) {
      stmt.run(
        item.id,
        item.title,
        item.track || "Algorithms",
        item.status || "Not Started",
        item.progress || 0,
        JSON.stringify(item.modules || []),
        JSON.stringify(item.resources || []),
        item.notes || "",
        item.lastStudiedAt || "",
        item.nextReviewAt || ""
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

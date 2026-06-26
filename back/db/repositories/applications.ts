import { getDb } from "../connection";
import type { ApplicationInput, ApplicationRow } from "../types";

export async function sqlLoadApplications() {
  const rows = getDb()
    .prepare("SELECT * FROM applications ORDER BY updatedAt DESC")
    .all() as unknown as ApplicationRow[];
  return rows.map((r) => ({
    ...r,
    oaCompletedAt: r.oaCompletedAt || "",
    priority: r.priority || "Medium",
    nextAction: r.nextAction || "",
    nextActionAt: r.nextActionAt || "",
    level: r.level || "",
    source: r.source || "Manual",
    interviewDate: r.interviewDate || "",
    processId: r.processId || "",
    processName: r.processName || "",
    currentStepId: r.currentStepId || "",
    stageDates: JSON.parse(r.stageDates || "{}"),
    stageDateTimes: JSON.parse(r.stageDateTimes || "{}"),
    stagePassedAt: JSON.parse(r.stagePassedAt || "{}"),
    evaluation: JSON.parse(r.evaluation || "null"),
    attachments: JSON.parse(r.attachments || "[]"),
    processSteps: JSON.parse(r.processSteps || "[]"),
    stepProgress: JSON.parse(r.stepProgress || "{}"),
  }));
}

export async function sqlSaveApplications(apps: ApplicationInput[]) {
  const db = getDb();
  // SQLite maintains single updates cleanly via INSERT OR REPLACE
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO applications (
      id, company, role, status, dateApplied, appliedAt, rejectedAt, location,
      salary, equity, oaDeadline, oaCompletedAt, stagePassedAt, priority, nextAction, nextActionAt, skills, "group", sourceUrl, notes, description, stageDates, stageDateTimes, evaluation, attachments, level, source, interviewDate, processId, processName, processSteps, stepProgress, currentStepId, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN TRANSACTION");
  try {
    for (const app of apps) {
      stmt.run(
        app.id,
        app.company,
        app.role,
        app.status,
        app.dateApplied || "",
        app.appliedAt || "",
        app.rejectedAt || "",
        app.location || "",
        app.salary || "",
        app.equity || "",
        app.oaDeadline || "",
        app.oaCompletedAt || "",
        JSON.stringify(app.stagePassedAt || {}),
        app.priority || "Medium",
        app.nextAction || "",
        app.nextActionAt || "",
        Array.isArray(app.skills) ? app.skills.join(", ") : String(app.skills || ""),
        app.group || "",
        app.sourceUrl || "",
        app.notes || "",
        app.description || "",
        JSON.stringify(app.stageDates || {}),
        JSON.stringify(app.stageDateTimes || {}),
        JSON.stringify(app.evaluation || null),
        JSON.stringify(app.attachments || []),
        app.level || "",
        app.source || "Manual",
        app.interviewDate || "",
        app.processId || "",
        app.processName || "",
        JSON.stringify(app.processSteps || []),
        JSON.stringify(app.stepProgress || {}),
        app.currentStepId || "",
        new Date().toISOString()
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export async function sqlDeleteApplication(id: string) {
  getDb().prepare("DELETE FROM applications WHERE id = ?").run(id);
}

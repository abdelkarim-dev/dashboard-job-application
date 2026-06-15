import { readFile, rename } from "node:fs/promises";
import path from "node:path";
import { dataDir, getDb } from "./connection";
import type { CountRow } from "./types";

// One-time import of the old flat-JSON stores into SQLite. Each table is only
// migrated when empty, and the source JSON file is renamed to *.backup after a
// successful import. A missing file (ENOENT) is the normal post-migration state.
export async function performLegacyMigration() {
  const db = getDb();
  const fileApplications = path.join(dataDir, "applications.json");
  const fileProfile = path.join(dataDir, "profile.json");
  const filePractice = path.join(dataDir, "practice.json");
  const fileCourses = path.join(dataDir, "courses.json");
  const fileSystemDesign = path.join(dataDir, "system-design.json");

  // Check if applications table has any entries
  const appCountRow = db.prepare("SELECT COUNT(*) as count FROM applications").get() as unknown as CountRow | undefined;
  if ((appCountRow?.count ?? 0) === 0) {
    try {
      const dataText = await readFile(fileApplications, "utf8");
      const apps = JSON.parse(dataText);
      if (Array.isArray(apps)) {
        const stmt = db.prepare(`
          INSERT INTO applications (
            id, company, role, status, dateApplied, appliedAt, rejectedAt, location,
            salary, equity, oaDeadline, skills, "group", sourceUrl, notes, description, stageDates, stageDateTimes, evaluation
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const app of apps) {
          stmt.run(
            app.id || `app-${Date.now()}-${Math.random()}`,
            app.company || "Unknown Company",
            app.role || "Unknown Role",
            app.status || "Applied",
            app.dateApplied || "",
            app.appliedAt || "",
            app.rejectedAt || "",
            app.location || "",
            app.salary || "",
            app.equity || "",
            app.oaDeadline || "",
            Array.isArray(app.skills) ? app.skills.join(", ") : String(app.skills || ""),
            app.group || "",
            app.sourceUrl || "",
            app.notes || "",
            app.description || "",
            JSON.stringify(app.stageDates || {}),
            JSON.stringify(app.stageDateTimes || {}),
            JSON.stringify(app.evaluation || null)
          );
        }
        console.log(`Migrated ${apps.length} applications from JSON to SQLite.`);
        await rename(fileApplications, `${fileApplications}.backup`);
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") console.error("Legacy applications migration failed", e);
    }
  }

  // Migrate Profile
  const profileCountRow = db.prepare("SELECT COUNT(*) as count FROM profile").get() as unknown as CountRow | undefined;
  if ((profileCountRow?.count ?? 0) === 0) {
    try {
      const dataText = await readFile(fileProfile, "utf8");
      const p = JSON.parse(dataText);
      if (p) {
        db.prepare(`
          INSERT INTO profile (
            key, fullName, email, phone, country, city, province, portfolio, github, linkedin, resumeText,
            legallyAuthorized, requiresSponsorship, gender, race, veteranStatus, disabilityStatus, gemmaPrompt
          ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          p.fullName || "",
          p.email || "",
          p.phone || "",
          p.country || "Canada",
          p.city || "Vancouver",
          p.province || "BC",
          p.portfolio || "",
          p.github || "",
          p.linkedin || "",
          p.resumeText || "",
          p.legallyAuthorized || "Yes",
          p.requiresSponsorship || "No",
          p.gender || "Decline to Self-Identify",
          p.race || "Decline to Self-Identify",
          p.veteranStatus || "No",
          p.disabilityStatus || "No, I don't have a disability",
          p.gemmaPrompt || ""
        );
        console.log("Migrated user profile from JSON to SQLite.");
        await rename(fileProfile, `${fileProfile}.backup`);
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") console.error("Legacy profile migration failed", e);
    }
  }

  // Migrate Practice Problems
  const problemCountRow = db.prepare("SELECT COUNT(*) as count FROM practice_problems").get() as unknown as CountRow | undefined;
  if ((problemCountRow?.count ?? 0) === 0) {
    try {
      const dataText = await readFile(filePractice, "utf8");
      const store = JSON.parse(dataText);
      if (store && Array.isArray(store.problems)) {
        const stmt = db.prepare(`
          INSERT INTO practice_problems (
            id, title, slug, url, difficulty, tags, paidOnly, acceptance, syncedAt,
            methodName, description, notes, reflection, customTests, starterCode, solutionCode,
            draft, languageDrafts, solutionRevealed, userStarted, solved, solveCount, reviewLevel, nextReviewAt,
            history, attempts, sessions
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
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
            JSON.stringify(prob.sessions || [])
          );
        }
        console.log(`Migrated ${store.problems.length} practice problems from JSON to SQLite.`);
        await rename(filePractice, `${filePractice}.backup`);
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") console.error("Legacy practice migration failed", e);
    }
  }

  // Migrate Courses
  const courseCountRow = db.prepare("SELECT COUNT(*) as count FROM courses").get() as unknown as CountRow | undefined;
  if ((courseCountRow?.count ?? 0) === 0) {
    try {
      const dataText = await readFile(fileCourses, "utf8");
      const store = JSON.parse(dataText);
      if (store && Array.isArray(store.items)) {
        const stmt = db.prepare(`
          INSERT INTO courses (
            id, title, track, status, progress, modules, resources, notes, lastStudiedAt, nextReviewAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
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
        console.log(`Migrated ${store.items.length} courses from JSON to SQLite.`);
        await rename(fileCourses, `${fileCourses}.backup`);
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") console.error("Legacy courses migration failed", e);
    }
  }

  // Migrate System Design Topics
  const sdCountRow = db.prepare("SELECT COUNT(*) as count FROM system_design").get() as unknown as CountRow | undefined;
  if ((sdCountRow?.count ?? 0) === 0) {
    try {
      const dataText = await readFile(fileSystemDesign, "utf8");
      const store = JSON.parse(dataText);
      if (store && Array.isArray(store.topics)) {
        const stmt = db.prepare(`
          INSERT INTO system_design (
            id, title, status, confidence, prompts, checklist, notes, diagramLinks, practiceHistory, lastPracticedAt, nextReviewAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
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
        console.log(`Migrated ${store.topics.length} system design topics from JSON to SQLite.`);
        await rename(fileSystemDesign, `${fileSystemDesign}.backup`);
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") console.error("Legacy system design migration failed", e);
    }
  }
}

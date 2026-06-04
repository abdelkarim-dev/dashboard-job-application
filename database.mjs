import { DatabaseSync } from "node:sqlite";
import { readFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
// The DB path is resolved lazily in initDatabase so tests can point at a temp
// file via COCKPIT_DB_PATH without touching the real data/cockpit.db.
function resolveDbPath() {
  return process.env.COCKPIT_DB_PATH || path.join(dataDir, "cockpit.db");
}

const defaultPracticeSettings = {
  timezone: "America/Vancouver",
  dailyReviewTime: "20:00",
  reviewMinutes: 45,
};

// Core database instance
let db = null;

export async function initDatabase() {
  const dbPath = resolveDbPath();
  await mkdir(path.dirname(dbPath), { recursive: true });
  db = new DatabaseSync(dbPath);

  // 1. Create Tables
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
      solutionRevealed INTEGER DEFAULT 0,
      userStarted INTEGER DEFAULT 0,
      solved INTEGER DEFAULT 0,
      solveCount INTEGER DEFAULT 0,
      reviewLevel INTEGER DEFAULT 0,
      nextReviewAt TEXT,
      history TEXT,
      attempts TEXT,
      sessions TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

  // 2. Perform Seamless JSON Data Migration
  await performLegacyMigration();
  await seedLearningData();
}

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((row) => row.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function performLegacyMigration() {
  const fileApplications = path.join(dataDir, "applications.json");
  const fileProfile = path.join(dataDir, "profile.json");
  const filePractice = path.join(dataDir, "practice.json");
  const fileCourses = path.join(dataDir, "courses.json");
  const fileSystemDesign = path.join(dataDir, "system-design.json");

  // Check if applications table has any entries
  const appCountRow = db.prepare("SELECT COUNT(*) as count FROM applications").get();
  if (appCountRow.count === 0) {
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
      if (e.code !== "ENOENT") console.error("Legacy applications migration failed", e);
    }
  }

  // Migrate Profile
  const profileCountRow = db.prepare("SELECT COUNT(*) as count FROM profile").get();
  if (profileCountRow.count === 0) {
    try {
      const dataText = await readFile(fileProfile, "utf8");
      const p = JSON.parse(dataText);
      if (p) {
        db.prepare(`
          INSERT INTO profile (
            key, fullName, email, phone, portfolio, github, linkedin, resumeText,
            legallyAuthorized, requiresSponsorship, gender, race, veteranStatus, disabilityStatus, gemmaPrompt
          ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          p.fullName || "",
          p.email || "",
          p.phone || "",
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
      if (e.code !== "ENOENT") console.error("Legacy profile migration failed", e);
    }
  }

  // Migrate Practice Problems
  const problemCountRow = db.prepare("SELECT COUNT(*) as count FROM practice_problems").get();
  if (problemCountRow.count === 0) {
    try {
      const dataText = await readFile(filePractice, "utf8");
      const store = JSON.parse(dataText);
      if (store && Array.isArray(store.problems)) {
        const stmt = db.prepare(`
          INSERT INTO practice_problems (
            id, title, slug, url, difficulty, tags, paidOnly, acceptance, syncedAt,
            methodName, description, notes, reflection, customTests, starterCode, solutionCode,
            draft, solutionRevealed, userStarted, solved, solveCount, reviewLevel, nextReviewAt,
            history, attempts, sessions
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      if (e.code !== "ENOENT") console.error("Legacy practice migration failed", e);
    }
  }

  // Migrate Courses
  const courseCountRow = db.prepare("SELECT COUNT(*) as count FROM courses").get();
  if (courseCountRow.count === 0) {
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
      if (e.code !== "ENOENT") console.error("Legacy courses migration failed", e);
    }
  }

  // Migrate System Design Topics
  const sdCountRow = db.prepare("SELECT COUNT(*) as count FROM system_design").get();
  if (sdCountRow.count === 0) {
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
      if (e.code !== "ENOENT") console.error("Legacy system design migration failed", e);
    }
  }
}

// ── SQL Database Drivers ────────────────────────────────────────

export async function sqlLoadApplications() {
  const rows = db.prepare("SELECT * FROM applications ORDER BY updatedAt DESC").all();
  return rows.map((r) => ({
    ...r,
    oaCompletedAt: r.oaCompletedAt || "",
    priority: r.priority || "Medium",
    nextAction: r.nextAction || "",
    nextActionAt: r.nextActionAt || "",
    level: r.level || "",
    source: r.source || "Manual",
    interviewDate: r.interviewDate || "",
    stageDates: JSON.parse(r.stageDates || "{}"),
    stageDateTimes: JSON.parse(r.stageDateTimes || "{}"),
    evaluation: JSON.parse(r.evaluation || "null"),
    attachments: JSON.parse(r.attachments || "[]"),
  }));
}

export async function sqlSaveApplications(apps) {
  // SQLite maintains single updates cleanly via INSERT OR REPLACE
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO applications (
      id, company, role, status, dateApplied, appliedAt, rejectedAt, location,
      salary, equity, oaDeadline, oaCompletedAt, priority, nextAction, nextActionAt, skills, "group", sourceUrl, notes, description, stageDates, stageDateTimes, evaluation, attachments, level, source, interviewDate, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        new Date().toISOString()
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export async function sqlDeleteApplication(id) {
  db.prepare("DELETE FROM applications WHERE id = ?").run(id);
}

export async function sqlLoadProfile() {
  const p = db.prepare("SELECT * FROM profile WHERE key = 'default'").get();
  if (!p) return {};
  return p;
}

export async function sqlSaveProfile(p) {
  db.prepare(`
    INSERT OR REPLACE INTO profile (
      key, fullName, email, phone, portfolio, github, linkedin, resumeText, resumeText2,
      legallyAuthorized, requiresSponsorship, gender, race, veteranStatus, disabilityStatus, gemmaPrompt, updatedAt
    ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    p.fullName || "",
    p.email || "",
    p.phone || "",
    p.portfolio || "",
    p.github || "",
    p.linkedin || "",
    p.resumeText || "",
    p.resumeText2 || "",
    p.legallyAuthorized || "Yes",
    p.requiresSponsorship || "No",
    p.gender || "Decline to Self-Identify",
    p.race || "Decline to Self-Identify",
    p.veteranStatus || "No",
    p.disabilityStatus || "No, I don't have a disability",
    p.gemmaPrompt || "",
    new Date().toISOString()
  );
}

export async function sqlLoadPracticeStore() {
  const rows = db.prepare("SELECT * FROM practice_problems").all();
  const problems = rows.map((prob) => ({
    ...prob,
    tags: JSON.parse(prob.tags || "[]"),
    paidOnly: prob.paidOnly === 1,
    customTests: JSON.parse(prob.customTests || "[]"),
    solutionRevealed: prob.solutionRevealed === 1,
    userStarted: prob.userStarted === 1,
    solved: prob.solved === 1,
    history: JSON.parse(prob.history || "[]"),
    attempts: JSON.parse(prob.attempts || "[]"),
    sessions: JSON.parse(prob.sessions || "[]"),
  }));

  const settingsRow = db.prepare("SELECT value FROM app_settings WHERE key = 'practice'").get();
  let settings = { ...defaultPracticeSettings };
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

export async function sqlSavePracticeStore(store) {
  if (store.settings && typeof store.settings === "object") {
    db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value, updatedAt) VALUES ('practice', ?, ?)
    `).run(JSON.stringify(store.settings), new Date().toISOString());
  }

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO practice_problems (
      id, title, slug, url, difficulty, tags, paidOnly, acceptance, syncedAt,
      methodName, description, notes, reflection, customTests, starterCode, solutionCode,
      draft, solutionRevealed, userStarted, solved, solveCount, reviewLevel, nextReviewAt,
      history, attempts, sessions, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        prob.solutionRevealed ? 1 : 0,
        prob.userStarted ? 1 : 0,
        prob.solved ? 1 : 0,
        prob.solveCount || 0,
        prob.reviewLevel || 0,
        prob.nextReviewAt || "",
        JSON.stringify(prob.history || []),
        JSON.stringify(prob.attempts || []),
        JSON.stringify(prob.sessions || []),
        new Date().toISOString()
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export async function sqlLoadCoursesStore() {
  const rows = db.prepare("SELECT * FROM courses").all();
  const items = rows.map((r) => ({
    ...r,
    modules: JSON.parse(r.modules || "[]"),
    resources: JSON.parse(r.resources || "[]"),
  }));
  return { version: 1, items };
}

export async function sqlSaveCoursesStore(store) {
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

export async function sqlLoadSystemDesignStore() {
  const rows = db.prepare("SELECT * FROM system_design").all();
  const topics = rows.map((t) => ({
    ...t,
    prompts: JSON.parse(t.prompts || "[]"),
    checklist: JSON.parse(t.checklist || "[]"),
    practiceHistory: JSON.parse(t.practiceHistory || "[]"),
  }));
  return { version: 1, topics };
}

export async function sqlSaveSystemDesignStore(store) {
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

export async function sqlLoadCvMeta() {
  const rows = db.prepare("SELECT variant, fileName, mimeType, uploadedAt FROM profile_cvs").all();
  const meta = { backend: null, architect: null };
  for (const row of rows) {
    if (row.variant === "backend" || row.variant === "architect") {
      meta[row.variant] = { fileName: row.fileName, mimeType: row.mimeType, uploadedAt: row.uploadedAt };
    }
  }
  return meta;
}

export async function sqlLoadCv(variant) {
  return db.prepare("SELECT variant, fileName, mimeType, data, uploadedAt FROM profile_cvs WHERE variant = ?").get(variant) || null;
}

export async function sqlSaveCv(variant, fileName, mimeType, data) {
  db.prepare(`
    INSERT OR REPLACE INTO profile_cvs (variant, fileName, mimeType, data, uploadedAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(variant, fileName, mimeType, data, new Date().toISOString());
}

export async function sqlDeleteCv(variant) {
  db.prepare("DELETE FROM profile_cvs WHERE variant = ?").run(variant);
}

export async function seedLearningData() {
  // 1. Seed Courses if empty
  const courseCountRow = db.prepare("SELECT COUNT(*) as count FROM courses").get();
  if (courseCountRow.count === 0) {
    const courses = [
      {
        id: "course-sd-fundamentals",
        title: "System Design Fundamentals",
        track: "System Design",
        status: "In Progress",
        progress: 20,
        modules: [
          { name: "Scalability & Performance (Vertical vs Horizontal scaling, Latency vs Throughput)", completed: true },
          { name: "High Availability & Redundancy (SLA, Active-Passive vs Active-Active, Failover)", completed: false },
          { name: "Consistency & Database Partitioning (CAP Theorem, PACELC, Replication models)", completed: false },
          { name: "Network Protocols & APIs (REST, gRPC, WebSockets, GraphQL, TCP vs UDP)", completed: false },
          { name: "Microservices Architecture (Service Discovery, Saga Pattern, CQRS)", completed: false }
        ],
        resources: [
          "https://github.com/donnemartin/system-design-primer",
          "https://bytebytego.com/",
          "https://microservices.io/"
        ],
        notes: "Focus on understanding standard scalability building blocks first. Learn to calculate rough numbers (QPS, storage, bandwidth).",
        lastStudiedAt: new Date().toISOString(),
        nextReviewAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "course-advanced-sd",
        title: "Advanced Architecture Design",
        track: "System Design",
        status: "Not Started",
        progress: 0,
        modules: [
          { name: "Designing a Large-Scale Video Streaming Platform (Netflix, YouTube)", completed: false },
          { name: "Designing a Distributed Real-time Chat/Messenger App (WhatsApp, Slack)", completed: false },
          { name: "Designing a Global Rate Limiter (Token Bucket, Distributed Redis)", completed: false },
          { name: "Designing a High-Throughput Web Crawler", completed: false },
          { name: "Designing a Distributed Cache (Redis-like, Consistent Hashing)", completed: false }
        ],
        resources: [
          "https://bytebytego.com/",
          "https://alexxu.io/"
        ],
        notes: "Dive into specific design scenarios. Focus on data modeling, message queues, and global consistency.",
        lastStudiedAt: "",
        nextReviewAt: ""
      },
      {
        id: "course-ds-algo",
        title: "Data Structures & Algorithms Mastery",
        track: "Algorithms",
        status: "In Progress",
        progress: 40,
        modules: [
          { name: "Arrays & Hashing (Two-sum, Group Anagrams, Top K Frequent Elements)", completed: true },
          { name: "Two Pointers & Sliding Window (Valid Palindrome, Container With Most Water, Longest Substring)", completed: true },
          { name: "Trees & Graphs (DFS/BFS, Dijkstra's, Topological Sort, Union Find)", completed: false },
          { name: "Dynamic Programming (Knapsack, LCS, LIS, Coin Change)", completed: false },
          { name: "Systematic Coding Mock Prep (Time management, constraints analysis)", completed: false }
        ],
        resources: [
          "https://neetcode.io/",
          "https://leetcode.com/"
        ],
        notes: "Focus on templates and pattern matching rather than memorizing solutions.",
        lastStudiedAt: new Date().toISOString(),
        nextReviewAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "course-mock-prep",
        title: "Mock Interview Prep & Behavioral",
        track: "Interview Prep",
        status: "Not Started",
        progress: 0,
        modules: [
          { name: "Scoping & Requirements Gathering (Clarifying questions, estimating scale)", completed: false },
          { name: "High-Level Architecture & API Spec", completed: false },
          { name: "Detailed Component Deep Dive & Sharding", completed: false },
          { name: "Behavioral STAR Method (Leadership, resolving conflict, ownership)", completed: false }
        ],
        resources: [
          "https://tryexponent.com/",
          "https://www.pramp.com/"
        ],
        notes: "Practice talking out loud. Explain trade-offs clearly. Use the STAR framework for behavioral questions.",
        lastStudiedAt: "",
        nextReviewAt: ""
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO courses (
        id, title, track, status, progress, modules, resources, notes, lastStudiedAt, nextReviewAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN TRANSACTION");
    try {
      for (const item of courses) {
        stmt.run(
          item.id,
          item.title,
          item.track,
          item.status,
          item.progress,
          JSON.stringify(item.modules),
          JSON.stringify(item.resources),
          item.notes,
          item.lastStudiedAt,
          item.nextReviewAt
        );
      }
      db.exec("COMMIT");
      console.log("Seeded 4 default learning courses.");
    } catch (err) {
      db.exec("ROLLBACK");
      console.error("Seeded courses failed", err);
    }
  }

  // 2. Seed System Design Topics if empty
  const sdCountRow = db.prepare("SELECT COUNT(*) as count FROM system_design").get();
  if (sdCountRow.count === 0) {
    const topics = [
      {
        id: "sd-distributed-caching",
        title: "Distributed Caching",
        status: "In Progress",
        confidence: 3,
        prompts: [
          "Design a distributed cache like Redis.",
          "How do you handle the hotkey problem in a global cache?",
          "Explain cache consistency strategies in a write-heavy system."
        ],
        checklist: [
          { name: "Functional requirements & API Spec", completed: true },
          { name: "Eviction policies (LRU, LFU, FIFO)", completed: true },
          { name: "Cache hit/miss strategies (Cache-aside, Write-through, Write-behind)", completed: true },
          { name: "Cache stampede & Thundering Herd mitigation", completed: false },
          { name: "Consistent hashing & Redis clusters", completed: false },
          { name: "Cache invalidation & TTL mechanisms", completed: false }
        ],
        notes: "Core caching notes. LRU can be implemented with a doubly linked list + hash map. In a distributed environment, use consistent hashing to map keys to cache nodes to prevent massive invalidations when nodes scale up/down.\n\nRead-Through / Write-Through: Cache acts as main data interface, syncs with DB. Simple client code but latency penalty on writes.\n\nCache-Aside: Client queries cache; on miss, queries DB and updates cache. Highly popular, robust to DB outages, but risk of stale data.\n\nHotkey Mitigation: Use local memory cache on application nodes for extremely hot keys (e.g. celebrity profiles) to shield Redis cluster.",
        diagramLinks: "https://excalidraw.com/#json=consistent-hashing-example"
      },
      {
        id: "sd-rate-limiting",
        title: "Rate Limiting",
        status: "Not Started",
        confidence: 1,
        prompts: [
          "Design an API Rate Limiter for a high-traffic SaaS.",
          "How do you build a distributed rate limiter with Redis?",
          "Explain how to handle race conditions in distributed rate limiting."
        ],
        checklist: [
          { name: "Algorithms: Token Bucket, Leaking Bucket, Fixed Window, Sliding Window", completed: false },
          { name: "Distributed rate limiting with Redis (Lua scripts to prevent race conditions)", completed: false },
          { name: "Handling HTTP 429 status and headers (Retry-After)", completed: false },
          { name: "API Gateway integration", completed: false },
          { name: "Client-side fallback and exponential backoff", completed: false }
        ],
        notes: "Algorithms:\n1. Token Bucket: Tokens added at constant rate. Requests consume tokens. Simple, handles bursts well. Used by AWS/Stripe.\n2. Leaky Bucket: Requests added to queue, processed at constant rate (FIFO). Smooths out traffic, but overflows drop packages.\n3. Sliding Window Log: Keep timestamps in sorted set. Extremely accurate but high memory cost.\n\nDistributed scale: Race conditions occur when multiple workers read and write counter. Fix this by using Redis with a Lua script (executed atomically) to read-and-decrement in a single operation.",
        diagramLinks: ""
      },
      {
        id: "sd-load-balancing",
        title: "Load Balancing",
        status: "Not Started",
        confidence: 1,
        prompts: [
          "Design a scalable load balancer.",
          "Explain the difference between L4 and L7 load balancing.",
          "How does consistent hashing work in dynamic load balancers?"
        ],
        checklist: [
          { name: "L4 vs L7 load balancing capabilities", completed: false },
          { name: "Algorithms: Round Robin, Least Connections, Consistent Hashing", completed: false },
          { name: "Health checking & active/passive monitoring", completed: false },
          { name: "SSL/TLS termination at the load balancer", completed: false },
          { name: "DNS load balancing vs HAProxy/Nginx", completed: false }
        ],
        notes: "L4 (Transport Layer): Routes traffic based on IP & port (TCP/UDP). Super fast, doesn't inspect package payloads. No cookie-based sessions.\n\nL7 (Application Layer): Routes based on HTTP headers, URLs, cookies, SSL payloads. Enables smart routing (e.g. /images to image servers, header-based A/B testing) but has CPU overhead since it terminates and decrypts SSL.\n\nConsistent Hashing: Map servers and request hashes onto a 360-degree ring. When a server goes down, only keys mapped to that server move, preventing global reshuffling.",
        diagramLinks: ""
      },
      {
        id: "sd-db-sharding",
        title: "Database Sharding & Partitioning",
        status: "Not Started",
        confidence: 1,
        prompts: [
          "How do you partition a multi-terabyte SQL database?",
          "Design a sharding scheme for a social media feed system.",
          "Explain consistent hashing vs range-based sharding."
        ],
        checklist: [
          { name: "Horizontal partitioning (sharding) vs Vertical partitioning", completed: false },
          { name: "Sharding keys: range-based, hash-based, directory-based", completed: false },
          { name: "Consistent Hashing & Virtual Nodes", completed: false },
          { name: "Distributed joins & cross-shard query performance", completed: false },
          { name: "Re-sharding & data migration strategies without downtime", completed: false }
        ],
        notes: "Sharding splits a table horizontally across multiple DB instances. Shard Key selection is the single most critical decision.\n\nAvoid hot spots: Sharding by user_id distributes load evenly. Sharding by date/time creates a hot shard on today's data.\n\nJoins: Cross-shard joins are extremely expensive. Mitigate by: De-normalizing data (duplicating tables), co-locating related records (e.g., sharding both posts and comments by user_id so they reside on the same server), or running background workers to compile aggregate results.",
        diagramLinks: ""
      },
      {
        id: "sd-message-queues",
        title: "Message Queues & Pub/Sub",
        status: "Not Started",
        confidence: 1,
        prompts: [
          "Design a distributed message queue like Apache Kafka.",
          "How do you guarantee exactly-once delivery?",
          "Explain horizontal scaling in message brokers."
        ],
        checklist: [
          { name: "Point-to-point (Queue) vs Publish-Subscribe models", completed: false },
          { name: "Broker architecture (Partitions, Offsets, Consumer Groups)", completed: false },
          { name: "Delivery guarantees: At-least-once, At-most-once, Exactly-once", completed: false },
          { name: "Handling consumer slow-down & backpressure", completed: false },
          { name: "Message persistence & compaction algorithms", completed: false },
          { name: "Dead-letter queues (DLQ) for failed message handling", completed: false }
        ],
        notes: "Kafka Model: Messages are appended to an immutable commit log on disk. Scalability is achieved by splitting topics into Partitions.\n\nConsumer Groups: Dynamic balancing of consumers. Each partition is consumed by exactly one consumer per group.\n\nExactly-Once: Achieved by combining idempotent producers (message has unique ID and broker rejects duplicates) with two-phase commit transactions (message write and offset commit succeed or fail together).",
        diagramLinks: ""
      },
      {
        id: "sd-cdn",
        title: "Content Delivery Networks (CDN)",
        status: "Not Started",
        confidence: 2,
        prompts: [
          "Design a global Content Delivery Network.",
          "How do you invalidate static assets across thousands of edge locations?",
          "Explain dynamic site acceleration (DSA)."
        ],
        checklist: [
          { name: "Edge servers (PoPs) & GeoDNS routing", completed: true },
          { name: "Static asset caching vs Dynamic site acceleration", completed: false },
          { name: "Cache invalidation models (Purge, Versioning, TTL)", completed: false },
          { name: "Pull model vs Push model for content ingestion", completed: false },
          { name: "Security: DDoS protection & SSL at edge", completed: false }
        ],
        notes: "A CDN is a distributed network of edge servers (Points of Presence) that cache static files close to users.\n\nIngestion Models:\n1. Pull: Client requests file -> edge has miss -> fetches from origin -> caches at edge. Zero origin management, but first request is slow.\n2. Push: Origin uploads files directly to CDN. Great control over asset availability, but origin must push every update.\n\nDynamic Site Acceleration (DSA): Speeds up dynamic content by optimizing TCP routes (e.g. keeping connection pools active, route scouting) from the edge server to the origin.",
        diagramLinks: ""
      },
      {
        id: "sd-api-gateway",
        title: "API Gateway",
        status: "Not Started",
        confidence: 1,
        prompts: [
          "Design an enterprise API Gateway.",
          "How does an API Gateway handle authentication and rate limiting at scale?",
          "Explain request aggregation in microservices."
        ],
        checklist: [
          { name: "Reverse proxy, routing, and request forwarding", completed: false },
          { name: "Cross-cutting concerns: Auth, SSL termination, Rate limiting, Logging", completed: false },
          { name: "Request/Response transformation & Request aggregation", completed: false },
          { name: "Service registry integration & Load balancing", completed: false },
          { name: "Resiliency: Circuit breaker & bulkhead patterns", completed: false }
        ],
        notes: "An API Gateway is a single entry point for clients, routing requests to appropriate downstream microservices.\n\nRequest Aggregation: If a client needs data from 3 services (e.g., User info, Order details, and Payment history), the Gateway can fetch all 3 in parallel and merge them into a single response, saving mobile bandwidth.\n\nCircuit Breaker: Tacks downstream service failures. If service A has failures > threshold, open circuit immediately (returning cached/default data) to prevent cascading system exhaust. Close gradually as health returns.",
        diagramLinks: ""
      },
      {
        id: "sd-distributed-kv",
        title: "Distributed Key-Value Store",
        status: "Not Started",
        confidence: 1,
        prompts: [
          "Design a highly available distributed key-value store (like DynamoDB).",
          "How do you handle concurrent writes in a leaderless replication system?",
          "Explain the Gossip protocol and quorum writes."
        ],
        checklist: [
          { name: "Leaderless replication & Quorum model (W + R > N)", completed: false },
          { name: "Vector clocks & Conflict-free Replicated Data Types (CRDTs)", completed: false },
          { name: "SSTables & LSM Trees (write optimization)", completed: false },
          { name: "Gossip protocol for peer-to-peer membership", completed: false },
          { name: "Consistent hashing & Hinted Handoff / Read Repair", completed: false }
        ],
        notes: "Leaderless Replication (Dynamo-style):\nNo master node. Writes are sent to all N replica nodes. A write is successful if W nodes acknowledge. A read is successful if R nodes acknowledge. If W + R > N, we are guaranteed to read at least one node with the latest write.\n\nConflict Resolution:\n1. Last-Write-Wins (LWW): Simple but data-destructive (clock drifts can overwrite newer writes).\n2. Vector Clocks: Stems logical causality. If keys diverge, client resolves conflicts during read (e.g. shopping cart merges).\n3. CRDTs: Mathematical structures that merge automatically (commutative/associative). Great for counters and sets.",
        diagramLinks: ""
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO system_design (
        id, title, status, confidence, prompts, checklist, notes, diagramLinks, practiceHistory, lastPracticedAt, nextReviewAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN TRANSACTION");
    try {
      for (const t of topics) {
        stmt.run(
          t.id,
          t.title,
          t.status,
          t.confidence,
          JSON.stringify(t.prompts),
          JSON.stringify(t.checklist),
          t.notes,
          t.diagramLinks,
          JSON.stringify([]),
          "",
          ""
        );
      }
      db.exec("COMMIT");
      console.log("Seeded 8 system design architecture topics.");
    } catch (err) {
      db.exec("ROLLBACK");
      console.error("Seeding system design failed", err);
    }
  }
}

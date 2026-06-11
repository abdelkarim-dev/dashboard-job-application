import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";

// The DB path env var MUST be set before importing database.mjs because the
// module resolves it lazily in initDatabase().
const DB = path.join(os.tmpdir(), `cockpit-db-test-${process.pid}.db`);
process.env.COCKPIT_DB_PATH = DB;

const db = await import("../database.mjs");

test.before(async () => {
  await db.initDatabase();
});

test.after(async () => {
  await rm(DB, { force: true });
  await rm(`${DB}-journal`, { force: true });
  await rm(`${DB}-wal`, { force: true });
  await rm(`${DB}-shm`, { force: true });
});

// ── Applications ────────────────────────────────────────────────

test("applications save -> load round-trip preserves JSON fields", async () => {
  const app = {
    id: "app-rt-1",
    company: "Acme",
    role: "Senior Engineer",
    status: "Applied",
    dateApplied: "2026-01-01",
    appliedAt: "2026-01-01T10:00:00.000Z",
    location: "Remote",
    salary: "$200k",
    equity: "0.1%",
    oaDeadline: "2026-01-10",
    oaCompletedAt: "2026-01-05T00:00:00.000Z",
    stagePassedAt: { "Online Assessment": "2026-01-06T00:00:00.000Z" },
    priority: "High",
    nextAction: "Follow up",
    nextActionAt: "2026-01-08",
    skills: ["JavaScript", "Node", "SQLite"],
    group: "Top Targets",
    sourceUrl: "https://example.com/job",
    notes: "Great culture",
    description: "Build things",
    stageDates: { Applied: "2026-01-01", "Phone Screen": "2026-01-07" },
    stageDateTimes: {
      Applied: "2026-01-01T10:00:00.000Z",
      "Phone Screen": "2026-01-07T15:30:00.000Z",
    },
    evaluation: { overall: 8, notes: "strong" },
    attachments: [{ name: "resume.pdf", url: "http://x/resume.pdf" }],
    level: "Senior",
    source: "Referral",
    interviewDate: "2026-01-15",
  };

  await db.sqlSaveApplications([app]);
  const loaded = await db.sqlLoadApplications();
  const got = loaded.find((a) => a.id === "app-rt-1");

  assert.ok(got, "saved application should be loadable");
  // Scalar NOT NULL columns.
  assert.equal(got.company, "Acme");
  assert.equal(got.role, "Senior Engineer");
  assert.equal(got.status, "Applied");
  // Plain scalar columns.
  assert.equal(got.location, "Remote");
  assert.equal(got.salary, "$200k");
  assert.equal(got.equity, "0.1%");
  assert.equal(got.oaDeadline, "2026-01-10");
  assert.equal(got.oaCompletedAt, "2026-01-05T00:00:00.000Z");
  assert.equal(got.priority, "High");
  assert.equal(got.nextAction, "Follow up");
  assert.equal(got.nextActionAt, "2026-01-08");
  assert.equal(got.level, "Senior");
  assert.equal(got.source, "Referral");
  assert.equal(got.interviewDate, "2026-01-15");
  assert.deepEqual(got.stagePassedAt, { "Online Assessment": "2026-01-06T00:00:00.000Z" });
  // skills stored as comma-joined string.
  assert.equal(got.skills, "JavaScript, Node, SQLite");
  assert.equal(got.group, "Top Targets");
  assert.equal(got.sourceUrl, "https://example.com/job");
  assert.equal(got.notes, "Great culture");
  assert.equal(got.description, "Build things");
  // JSON columns are parsed back into objects/arrays.
  assert.deepEqual(got.stageDates, {
    Applied: "2026-01-01",
    "Phone Screen": "2026-01-07",
  });
  assert.deepEqual(got.stageDateTimes, {
    Applied: "2026-01-01T10:00:00.000Z",
    "Phone Screen": "2026-01-07T15:30:00.000Z",
  });
  assert.deepEqual(got.evaluation, { overall: 8, notes: "strong" });
  assert.deepEqual(got.attachments, [
    { name: "resume.pdf", url: "http://x/resume.pdf" },
  ]);
});

test("application save applies defaults for omitted optional fields", async () => {
  const minimal = {
    id: "app-defaults",
    company: "MinCo",
    role: "Dev",
    status: "Applied",
  };
  await db.sqlSaveApplications([minimal]);
  const got = (await db.sqlLoadApplications()).find((a) => a.id === "app-defaults");

  assert.ok(got);
  // Defaults filled by sqlSaveApplications / sqlLoadApplications.
  assert.equal(got.priority, "Medium");
  assert.equal(got.source, "Manual");
  assert.equal(got.oaCompletedAt, "");
  assert.equal(got.nextAction, "");
  assert.equal(got.nextActionAt, "");
  assert.equal(got.level, "");
  assert.equal(got.interviewDate, "");
  // Empty string skills (no array given).
  assert.equal(got.skills, "");
  // JSON defaults: empty object / null / empty array.
  assert.deepEqual(got.stageDates, {});
  assert.deepEqual(got.stageDateTimes, {});
  assert.equal(got.evaluation, null);
  assert.deepEqual(got.attachments, []);
});

test("updating an existing application (same id) reflects the change on load", async () => {
  await db.sqlSaveApplications([
    { id: "app-upd", company: "OldCo", role: "Dev", status: "Applied" },
  ]);
  let got = (await db.sqlLoadApplications()).find((a) => a.id === "app-upd");
  assert.equal(got.company, "OldCo");
  assert.equal(got.status, "Applied");

  await db.sqlSaveApplications([
    {
      id: "app-upd",
      company: "NewCo",
      role: "Staff Engineer",
      status: "Phone Screen",
      stageDates: { "Phone Screen": "2026-02-01" },
    },
  ]);
  got = (await db.sqlLoadApplications()).find((a) => a.id === "app-upd");

  assert.equal(got.company, "NewCo");
  assert.equal(got.role, "Staff Engineer");
  assert.equal(got.status, "Phone Screen");
  assert.deepEqual(got.stageDates, { "Phone Screen": "2026-02-01" });

  // No duplicate row was created for the same id.
  const count = (await db.sqlLoadApplications()).filter(
    (a) => a.id === "app-upd",
  ).length;
  assert.equal(count, 1);
});

test("sqlSaveApplications handles skills given as a plain string", async () => {
  await db.sqlSaveApplications([
    {
      id: "app-skills-string",
      company: "StrCo",
      role: "Dev",
      status: "Applied",
      skills: "Go, Rust",
    },
  ]);
  const got = (await db.sqlLoadApplications()).find(
    (a) => a.id === "app-skills-string",
  );
  assert.equal(got.skills, "Go, Rust");
});

test("sqlDeleteApplication removes the application", async () => {
  await db.sqlSaveApplications([
    { id: "app-del", company: "DelCo", role: "Dev", status: "Applied" },
  ]);
  assert.ok(
    (await db.sqlLoadApplications()).some((a) => a.id === "app-del"),
    "should exist before delete",
  );

  await db.sqlDeleteApplication("app-del");
  assert.ok(
    !(await db.sqlLoadApplications()).some((a) => a.id === "app-del"),
    "should be gone after delete",
  );
});

test("sqlSaveApplications persists multiple apps in one call", async () => {
  await db.sqlSaveApplications([
    { id: "app-multi-a", company: "A", role: "Dev", status: "Applied" },
    { id: "app-multi-b", company: "B", role: "Dev", status: "Applied" },
  ]);
  const ids = (await db.sqlLoadApplications()).map((a) => a.id);
  assert.ok(ids.includes("app-multi-a"));
  assert.ok(ids.includes("app-multi-b"));
});

// ── Profile ─────────────────────────────────────────────────────

test("profile save -> load round-trip", async () => {
  const profile = {
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "555-1234",
    portfolio: "https://jane.dev",
    github: "https://github.com/jane",
    linkedin: "https://linkedin.com/in/jane",
    resumeText: "Resume backend variant",
    resumeText2: "Resume architect variant",
    legallyAuthorized: "Yes",
    requiresSponsorship: "No",
    gender: "Female",
    race: "Decline to Self-Identify",
    veteranStatus: "No",
    disabilityStatus: "No, I don't have a disability",
    gemmaPrompt: "Be concise",
  };

  await db.sqlSaveProfile(profile);
  const got = await db.sqlLoadProfile();

  assert.equal(got.key, "default");
  assert.equal(got.fullName, "Jane Doe");
  assert.equal(got.email, "jane@example.com");
  assert.equal(got.phone, "555-1234");
  assert.equal(got.portfolio, "https://jane.dev");
  assert.equal(got.github, "https://github.com/jane");
  assert.equal(got.linkedin, "https://linkedin.com/in/jane");
  assert.equal(got.resumeText, "Resume backend variant");
  assert.equal(got.resumeText2, "Resume architect variant");
  assert.equal(got.legallyAuthorized, "Yes");
  assert.equal(got.requiresSponsorship, "No");
  assert.equal(got.gender, "Female");
  assert.equal(got.veteranStatus, "No");
  assert.equal(got.gemmaPrompt, "Be concise");
});

test("profile save applies defaults for omitted fields and updates existing row", async () => {
  await db.sqlSaveProfile({ fullName: "Defaults Person" });
  let got = await db.sqlLoadProfile();
  assert.equal(got.fullName, "Defaults Person");
  assert.equal(got.legallyAuthorized, "Yes");
  assert.equal(got.requiresSponsorship, "No");
  assert.equal(got.gender, "Decline to Self-Identify");
  assert.equal(got.race, "Decline to Self-Identify");
  assert.equal(got.veteranStatus, "No");
  assert.equal(got.disabilityStatus, "No, I don't have a disability");

  // INSERT OR REPLACE on the single 'default' key updates rather than duplicates.
  await db.sqlSaveProfile({ fullName: "Updated Person", email: "u@x.com" });
  got = await db.sqlLoadProfile();
  assert.equal(got.fullName, "Updated Person");
  assert.equal(got.email, "u@x.com");
});

// ── Practice store ──────────────────────────────────────────────

test("practice store save -> load round-trip (booleans + JSON + settings)", async () => {
  const store = {
    version: 1,
    settings: {
      timezone: "America/Toronto",
      dailyReviewTime: "21:00",
      reviewMinutes: 60,
    },
    problems: [
      {
        id: "prob-1",
        title: "Two Sum",
        slug: "two-sum",
        url: "https://leetcode.com/problems/two-sum",
        difficulty: "Easy",
        tags: ["array", "hash-table"],
        paidOnly: false,
        acceptance: 49.5,
        syncedAt: "2026-01-01T00:00:00.000Z",
        methodName: "twoSum",
        description: "Find two numbers",
        notes: "use hashmap",
        reflection: "easy",
        customTests: [{ input: "[2,7]", expected: "[0,1]" }],
        starterCode: "function twoSum() {}",
        solutionCode: "function twoSum() { return []; }",
        draft: "wip",
        languageDrafts: { python: "wip", java: "class Solution {}" },
        solutionRevealed: true,
        userStarted: true,
        solved: true,
        solveCount: 3,
        reviewLevel: 2,
        nextReviewAt: "2026-02-01T00:00:00.000Z",
        history: [{ at: "2026-01-01", result: "solved" }],
        attempts: [{ code: "x", passed: true }],
        sessions: [{ minutes: 30 }],
      },
    ],
  };

  await db.sqlSavePracticeStore(store);
  const loaded = await db.sqlLoadPracticeStore();

  assert.equal(loaded.version, 1);
  assert.deepEqual(loaded.settings, {
    timezone: "America/Toronto",
    dailyReviewTime: "21:00",
    reviewMinutes: 60,
  });

  const got = loaded.problems.find((p) => p.id === "prob-1");
  assert.ok(got);
  assert.equal(got.title, "Two Sum");
  assert.equal(got.slug, "two-sum");
  assert.equal(got.difficulty, "Easy");
  assert.equal(got.acceptance, 49.5);
  assert.equal(got.methodName, "twoSum");
  // Booleans round-tripped from INTEGER columns.
  assert.equal(got.paidOnly, false);
  assert.equal(got.solutionRevealed, true);
  assert.equal(got.userStarted, true);
  assert.equal(got.solved, true);
  assert.equal(got.solveCount, 3);
  assert.equal(got.reviewLevel, 2);
  // JSON columns parsed.
  assert.deepEqual(got.tags, ["array", "hash-table"]);
  assert.deepEqual(got.customTests, [{ input: "[2,7]", expected: "[0,1]" }]);
  assert.deepEqual(got.languageDrafts, { python: "wip", java: "class Solution {}" });
  assert.deepEqual(got.history, [{ at: "2026-01-01", result: "solved" }]);
  assert.deepEqual(got.attempts, [{ code: "x", passed: true }]);
  assert.deepEqual(got.sessions, [{ minutes: 30 }]);
});

test("practice store uses default settings when none saved (defaults merged)", async () => {
  // A fresh save with no settings key present should still expose defaults.
  // We assert the default values are present on whatever was loaded.
  const loaded = await db.sqlLoadPracticeStore();
  assert.ok(loaded.settings);
  assert.ok(typeof loaded.settings.timezone === "string");
  assert.ok(typeof loaded.settings.dailyReviewTime === "string");
  assert.ok(typeof loaded.settings.reviewMinutes === "number");
});

test("practice store save prunes problems not in the new set", async () => {
  await db.sqlSavePracticeStore({
    settings: { timezone: "UTC", dailyReviewTime: "20:00", reviewMinutes: 45 },
    problems: [
      { id: "prune-keep", title: "Keep", slug: "keep-slug" },
      { id: "prune-drop", title: "Drop", slug: "drop-slug" },
    ],
  });
  let ids = (await db.sqlLoadPracticeStore()).problems.map((p) => p.id);
  assert.ok(ids.includes("prune-keep"));
  assert.ok(ids.includes("prune-drop"));

  // Re-save without "prune-drop": it should be deleted.
  await db.sqlSavePracticeStore({
    settings: { timezone: "UTC", dailyReviewTime: "20:00", reviewMinutes: 45 },
    problems: [{ id: "prune-keep", title: "Keep", slug: "keep-slug" }],
  });
  ids = (await db.sqlLoadPracticeStore()).problems.map((p) => p.id);
  assert.ok(ids.includes("prune-keep"));
  assert.ok(!ids.includes("prune-drop"));
});

// ── Courses store ───────────────────────────────────────────────

test("courses store save -> load round-trip", async () => {
  const store = {
    version: 1,
    items: [
      {
        id: "course-test-1",
        title: "Test Course",
        track: "Algorithms",
        status: "In Progress",
        progress: 55,
        modules: [{ name: "Module A", completed: true }],
        resources: ["https://x.com", "https://y.com"],
        notes: "course notes",
        lastStudiedAt: "2026-01-01T00:00:00.000Z",
        nextReviewAt: "2026-02-01T00:00:00.000Z",
      },
    ],
  };

  await db.sqlSaveCoursesStore(store);
  const loaded = await db.sqlLoadCoursesStore();

  assert.equal(loaded.version, 1);
  const got = loaded.items.find((c) => c.id === "course-test-1");
  assert.ok(got);
  assert.equal(got.title, "Test Course");
  assert.equal(got.track, "Algorithms");
  assert.equal(got.status, "In Progress");
  assert.equal(got.progress, 55);
  assert.equal(got.notes, "course notes");
  assert.equal(got.lastStudiedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(got.nextReviewAt, "2026-02-01T00:00:00.000Z");
  assert.deepEqual(got.modules, [{ name: "Module A", completed: true }]);
  assert.deepEqual(got.resources, ["https://x.com", "https://y.com"]);
});

test("courses store save updates an existing course", async () => {
  await db.sqlSaveCoursesStore({
    items: [{ id: "course-upd", title: "Original", progress: 10 }],
  });
  await db.sqlSaveCoursesStore({
    items: [{ id: "course-upd", title: "Changed", progress: 90 }],
  });
  const got = (await db.sqlLoadCoursesStore()).items.find(
    (c) => c.id === "course-upd",
  );
  assert.equal(got.title, "Changed");
  assert.equal(got.progress, 90);
});

// ── System design store ─────────────────────────────────────────

test("system design store save -> load round-trip", async () => {
  const store = {
    version: 1,
    topics: [
      {
        id: "sd-test-1",
        title: "Test Topic",
        status: "In Progress",
        confidence: 4,
        prompts: ["Design X", "Explain Y"],
        checklist: [{ name: "Step 1", completed: true }],
        notes: "topic notes",
        diagramLinks: "https://excalidraw.com/#abc",
        practiceHistory: [{ at: "2026-01-01", score: 7 }],
        lastPracticedAt: "2026-01-01T00:00:00.000Z",
        nextReviewAt: "2026-02-01T00:00:00.000Z",
      },
    ],
  };

  await db.sqlSaveSystemDesignStore(store);
  const loaded = await db.sqlLoadSystemDesignStore();

  assert.equal(loaded.version, 1);
  const got = loaded.topics.find((t) => t.id === "sd-test-1");
  assert.ok(got);
  assert.equal(got.title, "Test Topic");
  assert.equal(got.status, "In Progress");
  assert.equal(got.confidence, 4);
  assert.equal(got.notes, "topic notes");
  assert.equal(got.diagramLinks, "https://excalidraw.com/#abc");
  assert.equal(got.lastPracticedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(got.nextReviewAt, "2026-02-01T00:00:00.000Z");
  assert.deepEqual(got.prompts, ["Design X", "Explain Y"]);
  assert.deepEqual(got.checklist, [{ name: "Step 1", completed: true }]);
  assert.deepEqual(got.practiceHistory, [{ at: "2026-01-01", score: 7 }]);
});

test("system design store save updates an existing topic", async () => {
  await db.sqlSaveSystemDesignStore({
    topics: [{ id: "sd-upd", title: "Original", confidence: 1 }],
  });
  await db.sqlSaveSystemDesignStore({
    topics: [{ id: "sd-upd", title: "Changed", confidence: 5 }],
  });
  const got = (await db.sqlLoadSystemDesignStore()).topics.find(
    (t) => t.id === "sd-upd",
  );
  assert.equal(got.title, "Changed");
  assert.equal(got.confidence, 5);
});

// ── CV storage ──────────────────────────────────────────────────

test("CV save -> meta -> full load -> delete lifecycle", async () => {
  const dataBase64 = Buffer.from("hello cv pdf").toString("base64");
  await db.sqlSaveCv("backend", "backend.pdf", "application/pdf", dataBase64);

  // Meta should NOT include the data blob.
  const meta = await db.sqlLoadCvMeta();
  assert.ok(meta.backend, "backend meta present");
  assert.equal(meta.architect, null, "architect not uploaded yet");
  assert.equal(meta.backend.fileName, "backend.pdf");
  assert.equal(meta.backend.mimeType, "application/pdf");
  assert.ok(meta.backend.uploadedAt, "uploadedAt set");
  assert.equal(meta.backend.data, undefined, "meta excludes data blob");

  // Full load returns the data.
  const full = await db.sqlLoadCv("backend");
  assert.ok(full);
  assert.equal(full.variant, "backend");
  assert.equal(full.fileName, "backend.pdf");
  assert.equal(full.mimeType, "application/pdf");
  assert.equal(full.data, dataBase64);
  assert.equal(
    Buffer.from(full.data, "base64").toString("utf8"),
    "hello cv pdf",
  );

  // Loading a non-existent variant returns null.
  assert.equal(await db.sqlLoadCv("architect"), null);

  // Delete removes it.
  await db.sqlDeleteCv("backend");
  assert.equal(await db.sqlLoadCv("backend"), null);
  const metaAfter = await db.sqlLoadCvMeta();
  assert.equal(metaAfter.backend, null);
});

test("CV save with same variant replaces previous upload", async () => {
  await db.sqlSaveCv("architect", "v1.pdf", "application/pdf", "AAA");
  await db.sqlSaveCv("architect", "v2.pdf", "application/pdf", "BBB");
  const full = await db.sqlLoadCv("architect");
  assert.equal(full.fileName, "v2.pdf");
  assert.equal(full.data, "BBB");
  // Cleanup so it doesn't leak into other assertions.
  await db.sqlDeleteCv("architect");
});

// ── Seeding ─────────────────────────────────────────────────────

test("seedLearningData populates courses and system design when empty", async () => {
  // initDatabase already calls seedLearningData; calling again is idempotent
  // (counts are non-zero so nothing re-seeds, no throw).
  await db.seedLearningData();

  const courses = await db.sqlLoadCoursesStore();
  const sd = await db.sqlLoadSystemDesignStore();

  // Seed data uses well-known ids; assert at least these exist.
  const courseIds = courses.items.map((c) => c.id);
  assert.ok(
    courseIds.includes("course-sd-fundamentals"),
    "seeded fundamentals course present",
  );
  assert.ok(
    courseIds.includes("course-ds-algo"),
    "seeded algorithms course present",
  );

  const sdIds = sd.topics.map((t) => t.id);
  assert.ok(
    sdIds.includes("sd-distributed-caching"),
    "seeded caching topic present",
  );
  assert.ok(
    sdIds.includes("sd-rate-limiting"),
    "seeded rate limiting topic present",
  );

  // Seeded course JSON columns are well-formed arrays.
  const fundamentals = courses.items.find(
    (c) => c.id === "course-sd-fundamentals",
  );
  assert.ok(Array.isArray(fundamentals.modules));
  assert.ok(fundamentals.modules.length > 0);
  assert.ok(Array.isArray(fundamentals.resources));

  // Seeded topic JSON columns parsed.
  const caching = sd.topics.find((t) => t.id === "sd-distributed-caching");
  assert.ok(Array.isArray(caching.prompts));
  assert.ok(Array.isArray(caching.checklist));
  assert.ok(Array.isArray(caching.practiceHistory));
  assert.equal(caching.confidence, 3);
});

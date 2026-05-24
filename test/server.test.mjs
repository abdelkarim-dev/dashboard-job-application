import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCalendarReviewEventPayload,
  buildPracticeStats,
  getLocalDateString,
  getDueProblems,
  getStageDate,
  getStageTimestamp,
  markProblemFailed,
  markProblemSolved,
  migrateApplications,
  normalizeApplication,
  normalizeCourseStore,
  normalizePracticeProblem,
  normalizePracticeStore,
  normalizeRoleCategory,
  normalizeSystemDesignStore,
  nextReviewDate,
  recordProblemAttempt,
  runPythonProblem,
  simplifyStatus,
  toCsv,
} from "../server.mjs";

test("normalizeApplication stores precise applied timestamps", () => {
  const appliedAt = "2026-05-21T23:02:19.203Z";
  const app = normalizeApplication({
    company: " Hightouch ",
    role: " Developer Productivity Engineer ",
    status: "Applied",
    appliedAt,
    location: "Remote from Canada, US",
  });

  assert.equal(app.company, "Hightouch");
  assert.equal(app.role, "Developer Productivity Engineer");
  assert.equal(app.status, "Applied");
  assert.equal(app.appliedAt, appliedAt);
  assert.equal(app.dateApplied, "2026-05-21");
  assert.equal(app.stageDateTimes.Applied, appliedAt);
  assert.equal(app.stageDates.Applied, "2026-05-21");
});

test("normalizeApplication records rejectedAt separately when status changes to rejected", () => {
  const existing = normalizeApplication({
    id: "app-hightouch",
    company: "Hightouch",
    role: "Developer Productivity Engineer",
    status: "Applied",
    appliedAt: "2026-05-17T19:16:33.000Z",
  });

  const before = Date.now();
  const rejected = normalizeApplication({ id: existing.id, status: "Rejected" }, existing);
  const after = Date.now();
  const rejectedTime = Date.parse(rejected.rejectedAt);

  assert.equal(rejected.status, "Rejected");
  assert.ok(rejectedTime >= before && rejectedTime <= after);
  assert.equal(rejected.stageDateTimes.Rejected, rejected.rejectedAt);
  assert.equal(rejected.stageDates.Rejected, getLocalDateString(new Date(rejected.rejectedAt)));
  assert.equal(rejected.stageDateTimes.Applied, "2026-05-17T19:16:33.000Z");
});

test("normalizeApplication can clear a rejection timestamp when no longer rejected", () => {
  const existing = normalizeApplication({
    id: "app-example",
    company: "Example",
    role: "Backend Engineer",
    status: "Rejected",
    appliedAt: "2026-05-17T19:16:33.000Z",
    rejectedAt: "2026-05-20T12:08:17.508Z",
  });

  const reopened = normalizeApplication({ id: existing.id, status: "Interview", rejectedAt: "" }, existing);

  assert.equal(reopened.status, "Interview");
  assert.equal(reopened.rejectedAt, "");
  assert.equal(reopened.stageDateTimes.Rejected, undefined);
  assert.equal(reopened.stageDates.Rejected, undefined);
  assert.ok(reopened.stageDateTimes.Interview);
});

test("migrateApplications backfills timestamp fields for existing records", () => {
  const { applications, changed } = migrateApplications([
    {
      id: "app-old",
      company: "Alpaca",
      role: "Staff Site Reliability Engineer",
      status: "Rejected",
      dateApplied: "2026-05-18",
      stageDates: { Applied: "2026-05-18", Rejected: "2026-05-20" },
      createdAt: "2026-05-18T23:46:32.351Z",
      updatedAt: "2026-05-20T12:08:17.508Z",
    },
  ]);

  assert.equal(changed, true);
  assert.equal(applications[0].appliedAt, "2026-05-18T23:46:32.351Z");
  assert.equal(applications[0].rejectedAt, "2026-05-20T12:08:17.508Z");
  assert.equal(applications[0].stageDateTimes.Applied, "2026-05-18T23:46:32.351Z");
  assert.equal(applications[0].stageDateTimes.Rejected, "2026-05-20T12:08:17.508Z");
});

test("role category normalization maps legacy labels into canonical analytics categories", () => {
  assert.equal(normalizeRoleCategory("Platform/DevOps"), "Platform Engineering");
  assert.equal(normalizeRoleCategory("Data/Analytics"), "Data / AI / ML");
  assert.equal(normalizeRoleCategory("Developer Productivity"), "Developer Productivity");
  assert.equal(normalizeRoleCategory("Sales Engineering"), "Solutions / Customer Engineering");
});

test("CSV export includes full timestamp columns", () => {
  const app = normalizeApplication({
    company: "Asana",
    role: "Staff Software Engineer, API",
    status: "Rejected",
    appliedAt: "2026-05-20T18:30:00.000Z",
    rejectedAt: "2026-05-22T16:30:00.000Z",
  });
  const csv = toCsv([app]);

  assert.match(csv, /"Applied At"/);
  assert.match(csv, /"Rejected At"/);
  assert.match(csv, /"2026-05-20T18:30:00.000Z"/);
  assert.match(csv, /"2026-05-22T16:30:00.000Z"/);
  assert.equal(getStageTimestamp(app, "Rejected"), "2026-05-22T16:30:00.000Z");
  assert.equal(getStageDate(app, "Applied"), "2026-05-20");
});

test("simplifyStatus keeps dashboard status vocabulary small", () => {
  assert.equal(simplifyStatus("Recruiter Screen"), "Interview");
  assert.equal(simplifyStatus("withdrawn"), "Rejected");
  assert.equal(simplifyStatus("pending"), "Applied");
});

test("practice problem normalization preserves local metadata and tests", () => {
  const problem = normalizePracticeProblem({
    title: " Two Sum ",
    difficulty: "easy",
    tags: "Array, Hash Table",
    methodName: "twoSum",
    customTests: [{ name: "basic", args: [[2, 7], 9], expected: [0, 1] }],
  });

  assert.equal(problem.title, "Two Sum");
  assert.equal(problem.slug, "two-sum");
  assert.equal(problem.difficulty, "Easy");
  assert.deepEqual(problem.tags, ["Array", "Hash Table"]);
  assert.equal(problem.customTests[0].name, "basic");
});

test("seeded practice problems keep solutions hidden behind starter code", () => {
  const legacySeed = normalizePracticeProblem({
    id: "lc-two-sum",
    title: "Two Sum",
    methodName: "twoSum",
    draft: "class Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        for index, value in enumerate(nums):\n            need = target - value d\n            if need in seen:\n                return [seen[need], index]\n            seen[value] = index\n        return []\n",
    userStarted: true,
  });

  assert.match(legacySeed.starterCode, /pass/);
  assert.match(legacySeed.solutionCode, /seen =/);
  assert.equal(legacySeed.draft, legacySeed.starterCode);
  assert.equal(legacySeed.userStarted, false);

  const revealedSeed = normalizePracticeProblem({
    ...legacySeed,
    draft: legacySeed.solutionCode,
    solutionRevealed: true,
  });
  assert.equal(revealedSeed.draft, legacySeed.solutionCode);
  assert.equal(revealedSeed.solutionRevealed, true);
});

test("SRS scheduling uses fixed review intervals", () => {
  assert.equal(nextReviewDate("2026-05-24T10:00:00.000Z", 0), "2026-05-25");
  assert.equal(nextReviewDate("2026-05-24T10:00:00.000Z", 1), "2026-05-27");
  assert.equal(nextReviewDate("2026-05-24T10:00:00.000Z", 5), "2026-07-23");
});

test("markProblemSolved records attempts, sessions, solve count, and next review", () => {
  const problem = normalizePracticeProblem({
    id: "lc-custom",
    title: "Custom",
    tags: ["Graph"],
    reviewLevel: 0,
  });

  const solved = markProblemSolved(problem, {
    timeSpentMinutes: 35,
    hintsUsed: 1,
    confidence: 4,
    reflection: "Found the invariant.",
  }, "2026-05-24T17:00:00.000Z");

  assert.equal(solved.solved, true);
  assert.equal(solved.solveCount, 1);
  assert.equal(solved.reviewLevel, 1);
  assert.equal(solved.nextReviewAt, "2026-05-25");
  assert.equal(solved.attempts[0].passed, true);
  assert.equal(solved.sessions[0].timeSpentMinutes, 35);
  assert.equal(solved.history[0].type, "solved");
});

test("failed practice attempts reset review level and keep weak-tag signal", () => {
  const problem = normalizePracticeProblem({
    id: "lc-graph",
    title: "Graph Drill",
    tags: ["Graph", "DFS"],
    reviewLevel: 3,
  });

  const failed = markProblemFailed(problem, {
    timeSpentMinutes: 20,
    confidence: 2,
    reflection: "Missed cycle case.",
  }, "2026-05-24T17:00:00.000Z");
  const store = normalizePracticeStore({ problems: [failed] });
  const stats = buildPracticeStats(store, "2026-05-24");

  assert.equal(failed.reviewLevel, 0);
  assert.equal(failed.nextReviewAt, "2026-05-25");
  assert.equal(stats.focusMinutes, 20);
  assert.deepEqual(stats.weakTags.slice(0, 2), [
    { tag: "DFS", count: 2 },
    { tag: "Graph", count: 2 },
  ]);
});

test("due review filtering returns today and overdue problems only", () => {
  const store = normalizePracticeStore({
    problems: [
      { id: "due-old", title: "Old", nextReviewAt: "2026-05-23" },
      { id: "due-today", title: "Today", nextReviewAt: "2026-05-24" },
      { id: "future", title: "Future", nextReviewAt: "2026-05-25" },
    ],
  });

  assert.deepEqual(getDueProblems(store, "2026-05-24").map((problem) => problem.id), ["due-old", "due-today"]);
});

test("recordProblemAttempt tracks focus time without marking solved", () => {
  const problem = normalizePracticeProblem({ id: "p", title: "Practice" });
  const attempted = recordProblemAttempt(problem, {
    passed: false,
    passedTests: 1,
    totalTests: 2,
    timeSpentMinutes: 15,
    confidence: 2,
  }, "2026-05-24T17:00:00.000Z");

  assert.equal(attempted.solveCount, 0);
  assert.equal(attempted.attempts[0].passedTests, 1);
  assert.equal(attempted.sessions[0].timeSpentMinutes, 15);
});

test("practice stats count solved problems, focus minutes, streak, and due queue", () => {
  const solvedToday = markProblemSolved(
    normalizePracticeProblem({ id: "a", title: "A", tags: ["Array"] }),
    { timeSpentMinutes: 25 },
    "2026-05-24T17:00:00.000Z",
  );
  const solvedYesterday = markProblemSolved(
    normalizePracticeProblem({ id: "b", title: "B", tags: ["Stack"] }),
    { timeSpentMinutes: 30 },
    "2026-05-23T17:00:00.000Z",
  );
  const store = normalizePracticeStore({ problems: [solvedToday, solvedYesterday] });
  const stats = buildPracticeStats(store, "2026-05-24");

  assert.equal(stats.solved, 2);
  assert.equal(stats.focusMinutes, 55);
  assert.equal(stats.streak, 2);
  assert.equal(stats.dueToday, 1);
});

test("Python runner reports pass and fail results", async () => {
  const problem = normalizePracticeProblem({
    title: "Add",
    methodName: "add",
    customTests: [
      { name: "passes", args: [2, 3], expected: 5 },
      { name: "fails", args: [2, 2], expected: 5 },
    ],
  });
  const result = await runPythonProblem(problem, "class Solution:\n    def add(self, a, b):\n        return a + b\n");

  assert.equal(result.ok, true);
  assert.equal(result.passed, 1);
  assert.equal(result.total, 2);
  assert.equal(result.results[1].passed, false);
});

test("Python runner reports syntax errors", async () => {
  const problem = normalizePracticeProblem({
    title: "Add",
    methodName: "add",
    customTests: [{ name: "basic", args: [1, 1], expected: 2 }],
  });
  const result = await runPythonProblem(problem, "class Solution\n    def add(self, a, b):\n        return a + b\n");

  assert.equal(result.ok, false);
  assert.match(result.error, /SyntaxError/);
});

test("Python runner times out runaway code", async () => {
  const problem = normalizePracticeProblem({
    title: "Loop",
    methodName: "loop",
    customTests: [{ name: "timeout", args: [], expected: true }],
  });
  const result = await runPythonProblem(problem, "class Solution:\n    def loop(self):\n        while True:\n            pass\n", { timeoutMs: 600 });

  assert.equal(result.ok, false);
  assert.equal(result.error, "Python timed out.");
});

test("calendar review payload summarizes due problems without live credentials", () => {
  const store = normalizePracticeStore({
    settings: { timezone: "America/Vancouver", dailyReviewTime: "19:30", reviewMinutes: 30 },
    problems: [
      { id: "due", title: "Due Problem", url: "https://leetcode.com/problems/example/", nextReviewAt: "2026-05-24" },
      { id: "future", title: "Future Problem", nextReviewAt: "2026-05-25" },
    ],
  });
  const payload = buildCalendarReviewEventPayload(store, "2026-05-24");

  assert.equal(payload.summary, "LeetCode Review");
  assert.match(payload.description, /Due Problem/);
  assert.equal(payload.start.dateTime, "2026-05-24T19:30:00");
  assert.equal(payload.end.dateTime, "2026-05-24T20:00:00");
  assert.deepEqual(payload.dueProblemIds, ["due"]);
});

test("course and system design stores clamp progress fields", () => {
  const courses = normalizeCourseStore({
    items: [{ id: "c", title: "Course", status: "Almost", progress: 150, modules: "A\nB" }],
  });
  const systemDesign = normalizeSystemDesignStore({
    topics: [{ id: "s", title: "Caching", confidence: 8, prompts: "Design cache" }],
  });

  assert.equal(courses.items[0].status, "Not Started");
  assert.equal(courses.items[0].progress, 100);
  assert.deepEqual(courses.items[0].modules, ["A", "B"]);
  assert.equal(systemDesign.topics[0].confidence, 5);
  assert.deepEqual(systemDesign.topics[0].prompts, ["Design cache"]);
});

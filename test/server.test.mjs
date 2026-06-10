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
  runJavaProblem,
  runPythonProblem,
  runSolidJavaExercise,
  sanitizeAutofillMappings,
  simplifyStatus,
  toCsv,
  toJson,
} from "../server.mjs";

test("sanitizeAutofillMappings scrubs fabricated placeholder URLs", () => {
  const mappings = {
    0: "https://www.google.com",
    1: "google.com/",
    2: "https://example.com/portfolio",
    3: "Canada",
    4: "https://github.com/real-user",
    5: "No",
  };
  const cleaned = sanitizeAutofillMappings(mappings);
  assert.equal(cleaned[0], "");
  assert.equal(cleaned[1], "");
  assert.equal(cleaned[2], "");
  assert.equal(cleaned[3], "Canada");
  assert.equal(cleaned[4], "https://github.com/real-user");
  assert.equal(cleaned[5], "No");
  assert.equal(sanitizeAutofillMappings(null), null);
});

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

test("normalizeApplication preserves stored Gemma evaluation metadata", () => {
  const app = normalizeApplication({
    company: "Example",
    role: "Platform Engineer",
    status: "Applied",
    evaluation: {
      ok: true,
      score: 88,
      decision: "Apply",
      analysis: "Strong remote backend/platform fit.",
      rawEvaluation: {
        matchScore: 88,
        applyOrSkip: "Apply",
        finalDecision: "Strong remote backend/platform fit.",
      },
    },
  });

  assert.equal(app.evaluation.ok, true);
  assert.equal(app.evaluation.score, 88);
  assert.equal(app.evaluation.decision, "Apply");
  assert.equal(app.evaluation.rawEvaluation.matchScore, 88);

  const updated = normalizeApplication({ notes: "followed up" }, app);
  assert.equal(updated.evaluation.score, 88);
  assert.equal(updated.evaluation.decision, "Apply");
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
    status: "Online Assessment",
    appliedAt: "2026-05-20T18:30:00.000Z",
    oaDeadline: "2026-05-22T16:30:00.000Z",
  });
  const csv = toCsv([app]);

  assert.match(csv, /"Applied At"/);
  assert.match(csv, /"Online Assessment Timestamp"/);
  assert.match(csv, /"OA Deadline"/);
  assert.match(csv, /"2026-05-20T18:30:00.000Z"/);
  assert.match(csv, /"2026-05-22T16:30:00.000Z"/);
  assert.equal(app.status, "Online Assessment");
  assert.equal(getStageTimestamp(app, "Online Assessment"), app.stageDateTimes["Online Assessment"]);
  assert.equal(getStageDate(app, "Applied"), "2026-05-20");
});

test("CSV export handles legacy string skills", () => {
  const csv = toCsv([
    {
      company: "Legacy Co",
      role: "Backend Engineer",
      status: "Applied",
      skills: "Python, TypeScript; PostgreSQL",
    },
  ]);

  assert.match(csv, /"Python; TypeScript; PostgreSQL"/);
});

test("JSON export includes metadata and full application data", () => {
  const app = normalizeApplication({
    company: "Asana",
    role: "Staff Software Engineer, API",
    status: "Online Assessment",
    appliedAt: "2026-05-20T18:30:00.000Z",
    oaDeadline: "2026-05-22T16:30:00.000Z",
    skills: ["Scala", "TypeScript"],
  });
  const json = toJson([app], { exportedAt: "2026-06-09T12:00:00.000Z" });
  const payload = JSON.parse(json);

  assert.equal(payload.exportedAt, "2026-06-09T12:00:00.000Z");
  assert.equal(payload.count, 1);
  assert.equal(payload.applications[0].company, "Asana");
  assert.equal(payload.applications[0].stageDateTimes.Applied, "2026-05-20T18:30:00.000Z");
  assert.deepEqual(payload.applications[0].skills, ["Scala", "TypeScript"]);
});

test("simplifyStatus keeps dashboard status vocabulary small", () => {
  assert.equal(simplifyStatus("OA"), "Online Assessment");
  assert.equal(simplifyStatus("Recruiter Screen"), "Recruiter Screen");
  assert.equal(simplifyStatus("technical interview"), "Interview");
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

test("practice problem normalization keeps separate Python and Java drafts", () => {
  const problem = normalizePracticeProblem({
    title: "Add",
    methodName: "add",
    draft: "class Solution:\n    def add(self, a, b):\n        return a + b\n",
    languageDrafts: {
      java: "class Solution { public int add(int arg1, int arg2) { return arg1 + arg2; } }",
    },
    customTests: [{ name: "sum", args: [1, 2], expected: 3 }],
  });

  assert.match(problem.languageDrafts.python, /def add/);
  assert.match(problem.languageDrafts.java, /public int add/);

  const updated = recordProblemAttempt(problem, {
    language: "java",
    draft: "class Solution { public int add(int arg1, int arg2) { return 0; } }",
  });

  assert.match(updated.draft, /def add/);
  assert.match(updated.languageDrafts.java, /return 0/);
});

test("seeded practice problems preserve user drafts and solution code", () => {
  const legacySeed = normalizePracticeProblem({
    id: "lc-two-sum",
    title: "Two Sum",
    methodName: "twoSum",
    draft: "class Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        for index, value in enumerate(nums):\n            need = target - value d\n            if need in seen:\n                return [seen[need], index]\n            seen[value] = index\n        return []\n",
    userStarted: true,
  });

  assert.match(legacySeed.starterCode, /pass/);
  assert.match(legacySeed.solutionCode, /seen =/);
  assert.ok(legacySeed.customTests.some((test) => test.name === "negative values"));
  // Verify that correct drafts are fully preserved as intended by our fix
  assert.equal(legacySeed.draft, "class Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        for index, value in enumerate(nums):\n            need = target - value d\n            if need in seen:\n                return [seen[need], index]\n            seen[value] = index\n        return []\n");
  assert.equal(legacySeed.userStarted, true);

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

test("Python runner supports tree fixtures and serialized output", async () => {
  const problem = normalizePracticeProblem({
    title: "Invert Binary Tree",
    methodName: "invertTree",
    customTests: [
      {
        name: "mirror",
        args: [[4, 2, 7, 1, 3, 6, 9]],
        argTypes: ["tree"],
        expected: [4, 7, 2, 9, 6, 3, 1],
        expectedType: "tree",
      },
    ],
  });
  const result = await runPythonProblem(problem, "class Solution:\n    def invertTree(self, root):\n        if not root:\n            return None\n        root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)\n        return root\n");

  assert.equal(result.ok, true);
  assert.equal(result.passed, 1);
  assert.deepEqual(result.results[0].args, [[4, 2, 7, 1, 3, 6, 9]]);
  assert.deepEqual(result.results[0].actual, [4, 7, 2, 9, 6, 3, 1]);
});

test("Python runner accepts validator-style LeetCode equivalent answers", async () => {
  const problem = normalizePracticeProblem({
    id: "lc-two-sum",
    title: "Two Sum",
    methodName: "twoSum",
    customTests: [
      { name: "multiple valid pairs", args: [[1, 5, 9, 2, 8], 10], expected: [3, 4] },
    ],
  });
  const result = await runPythonProblem(problem, "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 2]\n");

  assert.equal(result.ok, true);
  assert.equal(result.passed, result.total);
  assert.match(result.results[0].expected, /Any two distinct indices/);
});

test("Python runner supports operation-style design fixtures", async () => {
  const problem = normalizePracticeProblem({
    title: "LRU Cache",
    methodName: "",
    customTests: [
      {
        name: "eviction",
        className: "LRUCache",
        operations: ["LRUCache", "put", "put", "get", "put", "get"],
        operationArgs: [[2], [1, 1], [2, 2], [1], [3, 3], [2]],
        expected: [null, null, null, 1, null, -1],
      },
    ],
  });
  const code = [
    "from collections import OrderedDict",
    "",
    "class LRUCache:",
    "    def __init__(self, capacity):",
    "        self.capacity = capacity",
    "        self.cache = OrderedDict()",
    "    def get(self, key):",
    "        if key not in self.cache:",
    "            return -1",
    "        self.cache.move_to_end(key)",
    "        return self.cache[key]",
    "    def put(self, key, value):",
    "        if key in self.cache:",
    "            self.cache.move_to_end(key)",
    "        self.cache[key] = value",
    "        if len(self.cache) > self.capacity:",
    "            self.cache.popitem(last=False)",
    "",
  ].join("\n");
  const result = await runPythonProblem(problem, code);

  assert.equal(result.ok, true);
  assert.equal(result.passed, 1);
  assert.deepEqual(result.results[0].actual, [null, null, null, 1, null, -1]);
  assert.deepEqual(result.results[0].operations.slice(0, 2), ["LRUCache", "put"]);
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

test("Java runner reports pass and fail results", async () => {
  const problem = normalizePracticeProblem({
    title: "Add",
    methodName: "add",
    customTests: [
      { name: "passes", args: [2, 3], expected: 5 },
      { name: "fails", args: [2, 2], expected: 5 },
    ],
  });
  const result = await runJavaProblem(problem, "class Solution { public int add(int arg1, int arg2) { return arg1 + arg2; } }");

  assert.equal(result.ok, true);
  assert.equal(result.passed, 1);
  assert.equal(result.total, 2);
  assert.equal(result.results[1].passed, false);
});

test("Java runner accepts validator-style LeetCode equivalent answers", async () => {
  const problem = normalizePracticeProblem({
    id: "lc-two-sum",
    title: "Two Sum",
    methodName: "twoSum",
    customTests: [
      { name: "multiple valid pairs", args: [[1, 5, 9, 2, 8], 10], expected: [3, 4] },
    ],
  });
  const result = await runJavaProblem(problem, "class Solution { public int[] twoSum(int[] arg1, int arg2) { return new int[] {0, 2}; } }");

  assert.equal(result.ok, true);
  assert.equal(result.passed, result.total);
  assert.match(result.results[0].expected, /Any two distinct indices/);
});

test("Java runner supports operation-style design fixtures", async () => {
  const problem = normalizePracticeProblem({
    title: "LRU Cache",
    methodName: "",
    customTests: [
      {
        name: "eviction",
        className: "LRUCache",
        operations: ["LRUCache", "put", "put", "get", "put", "get"],
        operationArgs: [[2], [1, 1], [2, 2], [1], [3, 3], [2]],
        expected: [null, null, null, 1, null, -1],
      },
    ],
  });
  const code = `
import java.util.*;
class LRUCache {
    private final int capacity;
    private final LinkedHashMap<Integer, Integer> cache = new LinkedHashMap<>(16, 0.75f, true);
    public LRUCache(int capacity) { this.capacity = capacity; }
    public int get(int key) { return cache.getOrDefault(key, -1); }
    public void put(int key, int value) {
        cache.put(key, value);
        if (cache.size() > capacity) cache.remove(cache.keySet().iterator().next());
    }
}
`;
  const result = await runJavaProblem(problem, code);

  assert.equal(result.ok, true);
  assert.equal(result.passed, 1);
  assert.deepEqual(result.results[0].actual, [null, null, null, 1, null, -1]);
});

test("seeded practice problems include runnable Java reference solutions", async () => {
  const store = normalizePracticeStore({});
  const missing = store.problems
    .filter((problem) => !(problem.languageSolutions?.java || "").trim())
    .map((problem) => problem.id);

  assert.deepEqual(missing, []);

  const failures = [];
  for (const problem of store.problems) {
    const result = await runJavaProblem(problem, problem.languageSolutions.java, { timeoutMs: 6000 });
    if (!result.ok || result.passed !== result.total || result.total === 0) {
      failures.push({
        id: problem.id,
        error: result.error,
        passed: result.passed,
        total: result.total,
        failedTests: (result.results || []).filter((item) => !item.passed).map((item) => item.name),
      });
    }
  }

  assert.deepEqual(failures, []);
});

test("SOLID Java runner compiles and validates an OCP solution", async () => {
  const code = `interface DiscountPolicy {
    int apply(int subtotal);
}
final class RegularDiscount implements DiscountPolicy {
    public int apply(int subtotal) { return subtotal; }
}
final class VipDiscount implements DiscountPolicy {
    public int apply(int subtotal) { return subtotal * 80 / 100; }
}
public class Solution {
    int total(int subtotal, DiscountPolicy policy) { return policy.apply(subtotal); }
}
`;
  const result = await runSolidJavaExercise("ocp-discounts", code);

  assert.equal(result.ok, true);
  assert.equal(result.passed, result.total);
  assert.ok(result.results.some((item) => item.name === "Checkout delegates to any policy"));
});

test("SOLID Java runner reports compilation failures", async () => {
  const result = await runSolidJavaExercise("ocp-discounts", "public class Solution {");

  assert.equal(result.ok, false);
  assert.match(result.error, /Java compilation failed/);
});

test("SOLID Java runner catches structural LSP violations", async () => {
  const code = `interface Bird { String move(); }
interface FlyingBird extends Bird { String fly(); }
final class Penguin implements FlyingBird {
    public String move() { return "swim"; }
    public String fly() { throw new UnsupportedOperationException(); }
}
final class Sparrow implements FlyingBird {
    public String move() { return "fly"; }
    public String fly() { return "fly"; }
}
public class Solution {}
`;
  const result = await runSolidJavaExercise("lsp-birds", code);

  assert.equal(result.ok, true);
  assert.ok(result.passed < result.total);
  assert.equal(result.results.find((item) => item.name === "Penguin is not forced to fly")?.passed, false);
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
  assert.deepEqual(courses.items[0].modules, [
    { name: "A", completed: false },
    { name: "B", completed: false }
  ]);
  assert.equal(systemDesign.topics[0].confidence, 5);
  assert.deepEqual(systemDesign.topics[0].prompts, ["Design cache"]);
});

test("normalizeApplication persists OA completion independently of pipeline stage", () => {
  const oaCompletedAt = "2026-05-25T18:00:00.000Z";
  const app = normalizeApplication({
    company: "Stripe",
    role: "Backend Engineer",
    status: "Online Assessment",
    oaDeadline: "2026-05-26T23:59:00.000Z",
    oaCompletedAt,
  });
  // Submitted while still in the OA stage (awaiting results) — both are kept.
  assert.equal(app.status, "Online Assessment");
  assert.equal(app.oaCompletedAt, oaCompletedAt);
  assert.equal(app.oaDeadline, "2026-05-26T23:59:00.000Z");

  // An explicit empty string clears completion (the drawer "un-submit").
  const reopened = normalizeApplication({ id: app.id, oaCompletedAt: "" }, app);
  assert.equal(reopened.oaCompletedAt, "");
  // Omitting the field entirely preserves the existing value.
  const untouched = normalizeApplication({ id: app.id, notes: "ping" }, app);
  assert.equal(untouched.oaCompletedAt, oaCompletedAt);
});

test("normalizeApplication validates and persists priority", () => {
  const high = normalizeApplication({ company: "Datadog", role: "SRE", priority: "High" });
  assert.equal(high.priority, "High");
  // Unknown values fall back to Medium rather than being dropped.
  const bogus = normalizeApplication({ company: "Datadog", role: "SRE", priority: "Urgent" });
  assert.equal(bogus.priority, "Medium");
  // Default when unspecified.
  const def = normalizeApplication({ company: "Datadog", role: "SRE" });
  assert.equal(def.priority, "Medium");
  // Existing value is preserved across an unrelated edit.
  const edited = normalizeApplication({ id: high.id, notes: "x" }, high);
  assert.equal(edited.priority, "High");
});

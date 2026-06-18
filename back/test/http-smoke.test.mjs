import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";

// Boot the real Express app against a throwaway DB and point the Gemma proxy at
// closed ports so the offline code paths resolve instantly (ECONNREFUSED). This
// is the safety net for the HTTP dispatch ladder, which the pure-function unit
// tests do not exercise: after the modular refactor, any helper that handleApi
// references but server.mjs forgot to import surfaces here as a 500 / a logged
// "is not defined" error rather than slipping through node --check.
const DB = path.join(os.tmpdir(), `cockpit-smoke-${process.pid}.db`);
process.env.COCKPIT_DB_PATH = DB;
process.env.OLLAMA_URL = "http://127.0.0.1:59321";
process.env.LOCAL_AI_URL = "http://127.0.0.1:59322";
process.env.CLAIRE_ENABLE_CODE_RUNNER = "";

const { startServer } = await import("../server.mjs");

// The global error handler logs unhandled errors with console.error. Capture
// them so we can assert no route blew up on an undefined reference.
const serverErrors = [];
const origError = console.error;
console.error = (...args) => { serverErrors.push(args); };

let server;
let base;

test.before(async () => {
  server = await startServer(0);
  // startServer returns as soon as app.listen is called; wait for the socket to
  // actually bind before reading the ephemeral port.
  if (!server.listening) {
    await new Promise((resolve) => server.once("listening", resolve));
  }
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  console.error = origError;
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(DB, { force: true });
});

// One entry per branch of handleApi. Bodies are minimal — the point is to reach
// the handler and confirm it resolves every symbol it calls, not to test logic.
const ROUTES = [
  ["GET", "/api/health"],
  ["GET", "/api/profile"],
  ["POST", "/api/profile", {}],
  ["GET", "/api/profile/cv"],
  ["GET", "/api/profile/cv/backend"],
  ["GET", "/api/profile/cv/architect"],
  ["POST", "/api/profile/cv/backend", {}],
  ["GET", "/api/skill-analysis"],
  ["POST", "/api/analyze-skills", {}],
  ["GET", "/api/applications"],
  ["POST", "/api/applications", { company: "SmokeCo", role: "Engineer" }],
  ["GET", "/api/practice"],
  ["GET", "/api/practice/problems"],
  ["GET", "/api/practice/reviews/due"],
  ["GET", "/api/practice/stats"],
  ["POST", "/api/practice/sync-leetcode-bank", {}],
  ["GET", "/api/practice/problems/does-not-exist"],
  ["GET", "/api/learning/courses"],
  ["POST", "/api/learning/courses", { title: "Smoke" }],
  ["GET", "/api/learning/system-design"],
  ["POST", "/api/learning/system-design", { title: "Smoke" }],
  ["GET", "/api/calendar/status"],
  ["GET", "/api/calendar/auth-url"],
  ["GET", "/api/calendar/oauth/callback"],
  ["POST", "/api/calendar/sync-reviews", {}],
  ["GET", "/api/calendar/reviews.ics"],
  ["POST", "/api/extract-ai", { text: "x" }],
  ["POST", "/api/categorize-titles", {}],
  ["POST", "/api/evaluate-job", { description: "x" }],
  ["POST", "/api/generate-answer", { question: "x" }],
  ["POST", "/api/autofill-ai", { fields: [] }],
  ["GET", "/api/export.csv"],
  ["GET", "/api/export.json"],
  ["GET", "/api/does-not-exist"],
];

test("every API route responds without a server-side crash", async () => {
  for (const [method, pathname, body] of ROUTES) {
    const res = await fetch(`${base}${pathname}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    await res.text();
    // A clean offline boot never produces a 500: missing imports, undefined
    // helpers, and unhandled throws all land here.
    assert.notEqual(res.status, 500, `${method} ${pathname} returned 500`);
  }

  const undefinedRefs = serverErrors.filter((args) =>
    args.some((a) => a instanceof Error && /is not defined|is not a function/.test(a.message))
  );
  assert.deepEqual(
    undefinedRefs.map((args) => args.map(String).join(" ")),
    [],
    "server logged reference/type errors",
  );
});

test("API rejects browser requests from untrusted origins before mutating data", async () => {
  const before = await fetch(`${base}/api/profile`).then((res) => res.json());
  const blockedWrite = await fetch(`${base}/api/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    body: JSON.stringify({ fullName: "Injected From Cross Site" }),
  });

  assert.equal(blockedWrite.status, 403);
  const after = await fetch(`${base}/api/profile`).then((res) => res.json());
  assert.equal(after.fullName, before.fullName);

  const blockedRead = await fetch(`${base}/api/profile`, {
    headers: { Origin: "https://evil.example" },
  });
  assert.equal(blockedRead.status, 403);
});

test("API allows localhost dashboard/dev origins with scoped CORS", async () => {
  const res = await fetch(`${base}/api/health`, {
    headers: { Origin: "http://127.0.0.1:5173" },
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("access-control-allow-origin"), "http://127.0.0.1:5173");
});

test("HTTP code runner endpoints are disabled unless explicitly enabled", async () => {
  const problems = await fetch(`${base}/api/practice/problems`).then((res) => res.json());
  const problem = problems[0];
  assert.ok(problem?.id, "expected seeded practice problem");

  const res = await fetch(`${base}/api/practice/problems/${encodeURIComponent(problem.id)}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: "python",
      code: "class Solution:\n    pass\n",
    }),
  });

  assert.equal(res.status, 403);
});

test("practice approach + insight round-trip through SQLite", async () => {
  const problems = await fetch(`${base}/api/practice/problems`).then((res) => res.json());
  const problem = problems[0];
  assert.ok(problem?.id, "expected seeded practice problem");

  const approach = {
    pattern: "Hash Table",
    summary: "Scan once. Keep complements in a map. Return when a complement is seen.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  };
  const put = await fetch(`${base}/api/practice/problems/${encodeURIComponent(problem.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approach, insight: "Trade space for time." }),
  });
  assert.equal(put.status, 200);

  // Re-read with a fresh query to prove the columns persist, not just the
  // in-memory normalize of the PUT response.
  const reloaded = await fetch(`${base}/api/practice/problems/${encodeURIComponent(problem.id)}`).then((res) => res.json());
  assert.equal(reloaded.approach.pattern, "Hash Table");
  assert.equal(reloaded.approach.timeComplexity, "O(n)");
  assert.equal(reloaded.approach.spaceComplexity, "O(n)");
  assert.equal(reloaded.insight, "Trade space for time.");
  assert.ok(reloaded.draft, "an approach-only update must not wipe the saved draft");
});

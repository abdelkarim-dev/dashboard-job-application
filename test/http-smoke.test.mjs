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

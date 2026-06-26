import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";

// Pure-domain helpers are imported directly from the domain module (not the
// server.mjs facade) so this suite stands alone. The HTTP round-trip at the
// bottom boots the real server against a throwaway DB.
import {
  defaultInterviewProcessesStore,
  normalizeInterviewProcess,
  normalizeInterviewProcessesStore,
  normalizeApplicationProcess,
  deriveProcessStatus,
  isProcessWaiting,
  stepPhase,
  flattenSteps,
  getDefaultProcess,
} from "../lib/domain/interviewProcesses.mjs";
import { normalizeApplication } from "../lib/domain/applications.mjs";

// ── Template store normalization ──────────────────────────────────────────────

test("normalizeInterviewProcessesStore seeds example processes on first run", () => {
  const store = normalizeInterviewProcessesStore(null);
  assert.equal(store.version, 1);
  const ids = store.processes.map((p) => p.id);
  assert.ok(ids.includes("proc-toast"), "ships the Toast example process");
  const toast = store.processes.find((p) => p.id === "proc-toast");
  // 5 top-level: recruiter + coding + [Onsite Loop group] + manager + offer
  assert.equal(toast.steps.length, 5);
  // flattened: recruiter + coding + 5 loop rounds + manager + offer = 9 leaves
  assert.equal(flattenSteps(toast.steps).length, 9);
  const loop = toast.steps.find((s) => s.type === "group");
  assert.ok(loop && loop.children.length === 5, "the Onsite Loop is an inline group of 5 rounds");
});

test("normalizeInterviewProcessesStore enforces exactly one default process", () => {
  const seeded = normalizeInterviewProcessesStore(null);
  assert.equal(seeded.processes.filter((p) => p.isDefault).length, 1);
  assert.equal(getDefaultProcess(seeded).id, "proc-standard", "Standard is the seeded default");

  // Multiple flagged -> only the first survives.
  const many = normalizeInterviewProcessesStore({
    processes: [
      { id: "a", name: "A", isDefault: true, steps: [] },
      { id: "b", name: "B", isDefault: true, steps: [] },
    ],
  });
  assert.deepEqual(many.processes.map((p) => p.isDefault), [true, false]);

  // None flagged -> the first becomes default.
  const none = normalizeInterviewProcessesStore({
    processes: [{ id: "a", name: "A", steps: [] }, { id: "b", name: "B", steps: [] }],
  });
  assert.equal(none.processes[0].isDefault, true);
});

test("normalizeProcessSteps drops an empty group (it would be an inert stage)", () => {
  const process = normalizeInterviewProcess({
    name: "Has empty group",
    steps: [
      { name: "Recruiter", type: "recruiter" },
      { name: "Empty Loop", type: "group", children: [] },
      { name: "Offer", type: "offer" },
    ],
  });
  assert.equal(process.steps.length, 2, "the empty group is pruned");
  assert.deepEqual(process.steps.map((s) => s.type), ["recruiter", "offer"]);
});

test("normalizeProcessStep supports inline groups with flattenable leaf children", () => {
  const process = normalizeInterviewProcess({
    name: "Grouped",
    steps: [
      { name: "Recruiter", type: "recruiter" },
      { name: "Onsite Loop", type: "group", children: [
        { name: "Round 1", type: "coding" },
        { name: "Round 2", type: "system_design" },
      ] },
      { name: "Offer", type: "offer" },
    ],
  });
  assert.equal(process.steps.length, 3);
  const group = process.steps[1];
  assert.equal(group.type, "group");
  assert.equal(group.children.length, 2);
  const leaves = flattenSteps(process.steps);
  assert.deepEqual(leaves.map((l) => l.name), ["Recruiter", "Round 1", "Round 2", "Offer"]);
  // All leaf + group ids are globally unique (so per-leaf progress never collides).
  const allIds = [process.steps[0].id, group.id, ...group.children.map((c) => c.id), process.steps[2].id];
  assert.equal(new Set(allIds).size, allIds.length);
});

test("normalizeInterviewProcessesStore respects an explicit empty board", () => {
  const store = normalizeInterviewProcessesStore({ processes: [] });
  assert.deepEqual(store.processes, []);
});

test("normalizeInterviewProcessesStore parses a JSON string payload", () => {
  const store = normalizeInterviewProcessesStore(JSON.stringify(defaultInterviewProcessesStore));
  assert.equal(store.processes.length, defaultInterviewProcessesStore.processes.length);
});

test("normalizeInterviewProcessesStore falls back to seed on invalid JSON", () => {
  const store = normalizeInterviewProcessesStore("{not json");
  assert.ok(store.processes.length > 0);
});

test("normalizeInterviewProcessesStore de-duplicates processes sharing an id", () => {
  const store = normalizeInterviewProcessesStore({
    processes: [
      { id: "dupe", name: "A", steps: [] },
      { id: "dupe", name: "B", steps: [] },
    ],
  });
  assert.equal(store.processes.filter((p) => p.id === "dupe").length, 1);
});

test("normalizeInterviewProcess assigns each step a canonical phase + dedupes step ids", () => {
  const process = normalizeInterviewProcess({
    name: "Custom",
    steps: [
      { name: "Coding Interview", type: "coding" },
      { name: "Coding Interview", type: "coding" },
      { name: "Offer", type: "offer" },
    ],
  });
  assert.equal(process.steps.length, 3);
  assert.equal(process.steps[0].phase, "Interview");
  assert.equal(process.steps[2].phase, "Offer");
  const ids = process.steps.map((s) => s.id);
  assert.equal(new Set(ids).size, 3, "duplicate step ids are disambiguated");
});

test("normalizeInterviewProcess defaults an unknown step type to custom/Interview", () => {
  const process = normalizeInterviewProcess({ name: "X", steps: [{ name: "Mystery", type: "bogus" }] });
  assert.equal(process.steps[0].type, "custom");
  assert.equal(process.steps[0].phase, "Interview");
});

test("stepPhase maps known types and falls back to Interview", () => {
  assert.equal(stepPhase("recruiter"), "Recruiter Screen");
  assert.equal(stepPhase("assessment"), "Online Assessment");
  assert.equal(stepPhase("offer"), "Offer");
  assert.equal(stepPhase("nope"), "Interview");
});

// ── Per-application process state ─────────────────────────────────────────────

const TOAST_STEPS = [
  { id: "s1", name: "Recruiter Screen", type: "recruiter" },
  { id: "s2", name: "Coding Challenge", type: "assessment" },
  { id: "s3", name: "Loop 1", type: "loop" },
  { id: "s4", name: "Offer", type: "offer" },
];

test("normalizeApplicationProcess returns the empty shape when no process is assigned", () => {
  const p = normalizeApplicationProcess({}, {});
  assert.deepEqual(p, { processId: "", processName: "", processSteps: [], stepProgress: {}, currentStepId: "" });
});

test("normalizeApplicationProcess snapshots steps and drops stale progress keys", () => {
  const p = normalizeApplicationProcess(
    {
      processId: "proc-toast",
      processName: "Toast",
      processSteps: TOAST_STEPS,
      stepProgress: { s1: { state: "done" }, ghost: { state: "done" } },
    },
    {}
  );
  assert.equal(p.processId, "proc-toast");
  assert.equal(p.processSteps.length, 4);
  assert.equal(p.stepProgress.s1.state, "done");
  assert.equal(p.stepProgress.ghost, undefined, "progress for a removed step is dropped");
});

test("normalizeApplicationProcess defaults currentStepId to the first unresolved step", () => {
  const p = normalizeApplicationProcess(
    { processId: "x", processSteps: TOAST_STEPS, stepProgress: { s1: { state: "done" } } },
    {}
  );
  assert.equal(p.currentStepId, "s2");
});

test("normalizeApplicationProcess clearing processId wipes the snapshot", () => {
  const existing = { processId: "x", processSteps: TOAST_STEPS, stepProgress: { s1: { state: "done" } }, currentStepId: "s2" };
  const p = normalizeApplicationProcess({ processId: "" }, existing);
  assert.equal(p.processId, "");
  assert.deepEqual(p.processSteps, []);
});

test("normalizeApplicationProcess preserves the snapshot when only progress changes", () => {
  const existing = normalizeApplicationProcess({ processId: "x", processSteps: TOAST_STEPS, stepProgress: {} }, {});
  const updated = normalizeApplicationProcess({ stepProgress: { s1: { state: "done" } } }, existing);
  assert.equal(updated.processSteps.length, 4, "steps inherited from existing");
  assert.equal(updated.stepProgress.s1.state, "done");
});

// ── Status derivation + waiting ───────────────────────────────────────────────

test("deriveProcessStatus reports the furthest scheduled/done phase", () => {
  const base = { processId: "x", processSteps: TOAST_STEPS };
  assert.equal(deriveProcessStatus({ ...base, stepProgress: {} }), "", "nothing started yet");
  assert.equal(deriveProcessStatus({ ...base, stepProgress: { s1: { state: "scheduled" } } }), "Recruiter Screen");
  assert.equal(deriveProcessStatus({ ...base, stepProgress: { s1: { state: "done" }, s2: { state: "scheduled" } } }), "Online Assessment");
  assert.equal(deriveProcessStatus({ ...base, stepProgress: { s1: { state: "done" }, s3: { state: "done" } } }), "Interview");
  assert.equal(deriveProcessStatus({ ...base, stepProgress: { s4: { state: "done" } } }), "Offer");
});

test("deriveProcessStatus does NOT report Offer when the offer round is only scheduled", () => {
  const base = { processId: "x", processSteps: TOAST_STEPS };
  // Offer merely scheduled (not received) must not flip the app to terminal Offer.
  assert.equal(deriveProcessStatus({ ...base, stepProgress: { s4: { state: "scheduled" } } }), "");
  assert.equal(deriveProcessStatus({ ...base, stepProgress: { s1: { state: "done" }, s4: { state: "scheduled" } } }), "Recruiter Screen");
});

test("isProcessWaiting is true between a finished round and the next booking", () => {
  const base = { processId: "x", processSteps: TOAST_STEPS };
  assert.equal(isProcessWaiting({ ...base, stepProgress: {} }), false, "nothing done yet");
  assert.equal(isProcessWaiting({ ...base, stepProgress: { s1: { state: "scheduled" } } }), false, "actively scheduled");
  assert.equal(isProcessWaiting({ ...base, stepProgress: { s1: { state: "done" } } }), true, "round done, next not booked");
  assert.equal(isProcessWaiting({ ...base, stepProgress: { s1: { state: "done" }, s2: { state: "scheduled" } } }), false, "next is booked");
  assert.equal(
    isProcessWaiting({ ...base, stepProgress: { s1: { state: "done" }, s2: { state: "done" }, s3: { state: "done" }, s4: { state: "done" } } }),
    false,
    "fully resolved"
  );
  assert.equal(
    isProcessWaiting({ ...base, stepProgress: { s1: { state: "done" }, s2: { state: "failed" } } }),
    false,
    "most recent round failed — not waiting on the company"
  );
});

test("derivation flattens groups: status/current operate on leaf rounds", () => {
  const steps = [
    { id: "rec", name: "Recruiter", type: "recruiter" },
    { id: "loop", name: "Onsite Loop", type: "group", children: [
      { id: "r1", name: "Round 1", type: "coding", phase: "Interview" },
      { id: "r2", name: "Round 2", type: "system_design", phase: "Interview" },
    ] },
    { id: "off", name: "Offer", type: "offer", phase: "Offer" },
  ];
  const p = { processId: "g", processSteps: steps };
  // Recruiter done, first loop round scheduled -> status is Interview, current is r1.
  const prog = { rec: { state: "done" }, r1: { state: "scheduled" } };
  assert.equal(deriveProcessStatus({ ...p, stepProgress: prog }), "Interview");
  // current step is the first unresolved leaf (r1 is scheduled => still unresolved).
  const norm = normalizeApplicationProcess({ processId: "g", processSteps: steps, stepProgress: prog }, {});
  assert.equal(norm.currentStepId, "r1");
  // Progress is keyed by leaf ids only (group id is never a progress key).
  assert.equal(norm.stepProgress.loop, undefined);
  // Finishing every leaf round, including offer, yields Offer.
  assert.equal(deriveProcessStatus({ ...p, stepProgress: { rec: { state: "done" }, r1: { state: "done" }, r2: { state: "done" }, off: { state: "done" } } }), "Offer");
});

// ── normalizeApplication integration ──────────────────────────────────────────

test("normalizeApplication persists assigned process fields", () => {
  const app = normalizeApplication({
    company: "Toast",
    role: "Senior Engineer",
    processId: "proc-toast",
    processName: "Toast",
    processSteps: TOAST_STEPS,
    stepProgress: { s1: { state: "done" } },
  });
  assert.equal(app.processId, "proc-toast");
  assert.equal(app.processSteps.length, 4);
  assert.equal(app.stepProgress.s1.state, "done");
  assert.equal(app.currentStepId, "s2");
});

test("normalizeApplication derives canonical status from process when status omitted", () => {
  const app = normalizeApplication({
    company: "Toast",
    role: "Eng",
    processId: "proc-toast",
    processSteps: TOAST_STEPS,
    stepProgress: { s1: { state: "done" }, s2: { state: "scheduled" } },
  });
  assert.equal(app.status, "Online Assessment");
});

test("normalizeApplication lets an explicit status override the derived one", () => {
  const app = normalizeApplication({
    company: "Toast",
    role: "Eng",
    status: "Interview",
    processId: "proc-toast",
    processSteps: TOAST_STEPS,
    stepProgress: { s1: { state: "done" } },
  });
  assert.equal(app.status, "Interview");
});

test("normalizeApplication does not let process step state demote a terminal Rejected status", () => {
  const existing = normalizeApplication({
    company: "Toast",
    role: "Eng",
    status: "Rejected",
    processId: "proc-toast",
    processSteps: TOAST_STEPS,
    stepProgress: { s1: { state: "done" } },
  });
  assert.equal(existing.status, "Rejected");
  // A status-omitted update advancing a step must NOT resurrect the app from Rejected.
  const updated = normalizeApplication({ stepProgress: { s1: { state: "done" }, s3: { state: "scheduled" } } }, existing);
  assert.equal(updated.status, "Rejected");
});

test("normalizeApplication keeps existing process snapshot across an unrelated edit", () => {
  const existing = normalizeApplication({
    company: "Toast",
    role: "Eng",
    processId: "proc-toast",
    processSteps: TOAST_STEPS,
    stepProgress: { s1: { state: "done" } },
  });
  const updated = normalizeApplication({ notes: "called recruiter" }, existing);
  assert.equal(updated.processId, "proc-toast");
  assert.equal(updated.processSteps.length, 4);
  assert.equal(updated.stepProgress.s1.state, "done");
});

// ── HTTP + persistence round-trip ─────────────────────────────────────────────

const DB = path.join(os.tmpdir(), `cockpit-proc-${process.pid}.db`);
process.env.COCKPIT_DB_PATH = DB;
process.env.OLLAMA_URL = "http://127.0.0.1:59321";
process.env.LOCAL_AI_URL = "http://127.0.0.1:59322";
process.env.CLAIRE_ENABLE_CODE_RUNNER = "";

const { startServer } = await import("../server.mjs");

let server;
let base;

test.before(async () => {
  server = await startServer(0);
  if (!server.listening) await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(DB, { force: true });
  await rm(`${DB}-journal`, { force: true });
  await rm(`${DB}-wal`, { force: true });
  await rm(`${DB}-shm`, { force: true });
});

test("GET /api/interview-processes returns the seeded store", async () => {
  const res = await fetch(`${base}/api/interview-processes`);
  assert.equal(res.status, 200);
  const store = await res.json();
  assert.ok(store.processes.some((p) => p.id === "proc-toast"));
});

test("interview-process CRUD round-trips through the API", async () => {
  const create = await fetch(`${base}/api/interview-processes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Acme Loop", steps: [{ name: "Recruiter", type: "recruiter" }, { name: "Offer", type: "offer" }] }),
  });
  assert.equal(create.status, 201);
  const created = await create.json();
  assert.equal(created.steps.length, 2);

  const update = await fetch(`${base}/api/interview-processes/${encodeURIComponent(created.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Acme Loop v2" }),
  });
  assert.equal(update.status, 200);
  assert.equal((await update.json()).name, "Acme Loop v2");

  const del = await fetch(`${base}/api/interview-processes/${encodeURIComponent(created.id)}`, { method: "DELETE" });
  assert.equal(del.status, 200);

  const after = await (await fetch(`${base}/api/interview-processes`)).json();
  assert.equal(after.processes.some((p) => p.id === created.id), false);
});

test("application process fields persist and round-trip through SQLite", async () => {
  const res = await fetch(`${base}/api/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company: "Toast",
      role: "Senior Engineer",
      processId: "proc-toast",
      processName: "Toast",
      processSteps: TOAST_STEPS,
      stepProgress: { s1: { state: "done" }, s2: { state: "scheduled" } },
    }),
  });
  assert.equal(res.status, 201);
  const created = await res.json();
  assert.equal(created.processId, "proc-toast");
  assert.equal(created.status, "Online Assessment", "status derived from process");

  const list = await (await fetch(`${base}/api/applications`)).json();
  const stored = list.find((a) => a.id === created.id);
  assert.ok(stored, "application is persisted");
  assert.equal(stored.processSteps.length, 4);
  assert.equal(stored.stepProgress.s1.state, "done");
  assert.equal(stored.currentStepId, "s2", "current step is the scheduled OA (first unresolved)");
});

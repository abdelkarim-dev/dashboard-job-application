import test from "node:test";
import assert from "node:assert/strict";

import {
  stepPhase,
  hasProcess,
  deriveCurrentStepId,
  currentStep,
  deriveProcessStatus,
  isProcessWaiting,
  isWaiting,
  lastPassedTimestamp,
  latestProcessActivity,
  isProcessComplete,
  processSummary,
  applyStepState,
  flattenSteps,
  getDefaultProcess,
  processViewForApp,
  setStepDate,
} from "../src/lib/process.mjs";

const STEPS = [
  { id: "s1", name: "Recruiter Screen", type: "recruiter", phase: "Recruiter Screen" },
  { id: "s2", name: "Coding Challenge", type: "assessment", phase: "Online Assessment" },
  { id: "s3", name: "Loop 1", type: "loop", phase: "Interview" },
  { id: "s4", name: "Offer", type: "offer", phase: "Offer" },
];

function appWith(progress) {
  return { processId: "proc-toast", processSteps: STEPS, stepProgress: progress, currentStepId: "" };
}

test("hasProcess detects an assigned process", () => {
  assert.equal(hasProcess(appWith({})), true);
  assert.equal(hasProcess({ processId: "", processSteps: [] }), false);
  assert.equal(hasProcess(null), false);
});

test("stepPhase mirrors the backend mapping", () => {
  assert.equal(stepPhase("recruiter"), "Recruiter Screen");
  assert.equal(stepPhase("assessment"), "Online Assessment");
  assert.equal(stepPhase("offer"), "Offer");
  assert.equal(stepPhase("anything-else"), "Interview");
});

test("deriveCurrentStepId returns the first unresolved step", () => {
  assert.equal(deriveCurrentStepId(appWith({})), "s1");
  assert.equal(deriveCurrentStepId(appWith({ s1: { state: "done" } })), "s2");
  assert.equal(deriveCurrentStepId(appWith({ s1: { state: "done" }, s2: { state: "scheduled" } })), "s2");
  assert.equal(
    deriveCurrentStepId(appWith({ s1: { state: "done" }, s2: { state: "done" }, s3: { state: "done" }, s4: { state: "done" } })),
    "s4",
    "falls back to the last step when all resolved"
  );
});

test("currentStep resolves the step object", () => {
  assert.equal(currentStep(appWith({ s1: { state: "done" } })).id, "s2");
});

test("deriveProcessStatus tracks the furthest scheduled/done phase", () => {
  assert.equal(deriveProcessStatus(appWith({})), "");
  assert.equal(deriveProcessStatus(appWith({ s1: { state: "scheduled" } })), "Recruiter Screen");
  assert.equal(deriveProcessStatus(appWith({ s1: { state: "done" }, s3: { state: "done" } })), "Interview");
  assert.equal(deriveProcessStatus(appWith({ s4: { state: "done" } })), "Offer");
});

test("deriveProcessStatus does not report Offer when the offer round is only scheduled", () => {
  assert.equal(deriveProcessStatus(appWith({ s4: { state: "scheduled" } })), "");
  assert.equal(deriveProcessStatus(appWith({ s1: { state: "done" }, s4: { state: "scheduled" } })), "Recruiter Screen");
});

test("isProcessWaiting flags the gap between rounds", () => {
  assert.equal(isProcessWaiting(appWith({})), false);
  assert.equal(isProcessWaiting(appWith({ s1: { state: "scheduled" } })), false);
  assert.equal(isProcessWaiting(appWith({ s1: { state: "done" } })), true);
  assert.equal(isProcessWaiting(appWith({ s1: { state: "done" }, s2: { state: "scheduled" } })), false);
  assert.equal(isProcessWaiting(appWith({ s1: { state: "done" }, s2: { state: "failed" } })), false, "failed last round is not waiting");
});

test("isWaiting unifies process-waiting and the legacy stagePassedAt flag", () => {
  // process snapshot sitting between rounds → waiting
  assert.equal(isWaiting(appWith({ s1: { state: "done" } })), true);
  assert.equal(isWaiting(appWith({ s1: { state: "done" }, s2: { state: "scheduled" } })), false);
  // a process-less app that marked its current stage passed → waiting
  assert.equal(isWaiting({ status: "Online Assessment", stagePassedAt: { "Online Assessment": "2026-05-01T12:00:00Z" } }), true);
  // the mark is for a different stage than the current one → not waiting
  assert.equal(isWaiting({ status: "Interview", stagePassedAt: { "Online Assessment": "2026-05-01T12:00:00Z" } }), false);
  // terminal statuses are never waiting, even with a stray flag
  assert.equal(isWaiting({ status: "Offer", stagePassedAt: { Offer: "2026-05-01T12:00:00Z" } }), false);
  assert.equal(isWaiting({ status: "Rejected", stagePassedAt: { Rejected: "2026-05-01T12:00:00Z" } }), false);
  assert.equal(isWaiting(null), false);
});

test("lastPassedTimestamp returns the most-recent done leaf's completion", () => {
  assert.equal(lastPassedTimestamp(appWith({})), "");
  assert.equal(lastPassedTimestamp({ status: "Applied" }), "", "no process → empty");
  const ts = lastPassedTimestamp(appWith({
    s1: { state: "done", completedAt: "2026-05-01T12:00:00Z" },
    s2: { state: "done", completedAt: "2026-05-10T12:00:00Z" },
    s3: { state: "scheduled" },
  }));
  assert.equal(ts, "2026-05-10T12:00:00Z");
});

test("latestProcessActivity returns the freshest scheduled-or-completed round date", () => {
  assert.equal(latestProcessActivity({ status: "Applied" }), "", "no process → empty");
  const ts = latestProcessActivity(appWith({
    s1: { state: "done", completedAt: "2026-05-01T12:00:00Z" },
    s2: { state: "scheduled", scheduledAt: "2026-06-10T12:00:00Z" },
  }));
  assert.equal(ts, "2026-06-10T12:00:00Z", "future scheduled round wins over an earlier completion");
});

test("isProcessComplete when every step is resolved", () => {
  assert.equal(isProcessComplete(appWith({ s1: { state: "done" } })), false);
  assert.equal(
    isProcessComplete(appWith({ s1: { state: "done" }, s2: { state: "done" }, s3: { state: "failed" }, s4: { state: "done" } })),
    true
  );
});

test("processSummary bundles counts + flags", () => {
  const s = processSummary(appWith({ s1: { state: "done" }, s2: { state: "done" } }));
  assert.equal(s.hasProcess, true);
  assert.equal(s.total, 4);
  assert.equal(s.doneCount, 2);
  assert.equal(s.current.id, "s3");
  assert.equal(s.currentIndex, 2);
  assert.equal(s.waiting, true);
});

test("applyStepState updates progress, current step, status and stamps completion", () => {
  const app = appWith({ s1: { state: "done" } });
  const next = applyStepState(app, "s2", "done");
  assert.equal(next.stepProgress.s2.state, "done");
  assert.ok(next.stepProgress.s2.completedAt, "completedAt is stamped on done");
  assert.equal(next.currentStepId, "s3");
  assert.equal(next.status, "Online Assessment", "status derives from the furthest done step (s2)");
  // Original app is not mutated.
  assert.equal(app.stepProgress.s2, undefined);
});

test("applyStepState to scheduled records the canonical phase without completion stamp", () => {
  const next = applyStepState(appWith({}), "s1", "scheduled", { scheduledAt: "2026-07-01T12:00:00.000Z" });
  assert.equal(next.stepProgress.s1.state, "scheduled");
  assert.equal(next.stepProgress.s1.scheduledAt, "2026-07-01T12:00:00.000Z");
  assert.equal(next.stepProgress.s1.completedAt, undefined);
  assert.equal(next.status, "Recruiter Screen");
});

test("setStepDate flips a pending step to scheduled and stamps the date", () => {
  const next = setStepDate(appWith({}), "s2", "2026-08-01T12:00:00.000Z");
  assert.equal(next.stepProgress.s2.state, "scheduled");
  assert.equal(next.stepProgress.s2.scheduledAt, "2026-08-01T12:00:00.000Z");
});

// ── Groups (flattening) ───────────────────────────────────────────────────────

const GROUPED_STEPS = [
  { id: "rec", name: "Recruiter", type: "recruiter", phase: "Recruiter Screen" },
  { id: "loop", name: "Onsite Loop", type: "group", children: [
    { id: "r1", name: "Round 1", type: "coding", phase: "Interview" },
    { id: "r2", name: "Round 2", type: "system_design", phase: "Interview" },
  ] },
  { id: "off", name: "Offer", type: "offer", phase: "Offer" },
];

test("flattenSteps expands inline groups to ordered leaves", () => {
  assert.deepEqual(flattenSteps(GROUPED_STEPS).map((l) => l.id), ["rec", "r1", "r2", "off"]);
});

test("derivation flattens groups (status + current operate on leaf rounds)", () => {
  const app = { processId: "g", processSteps: GROUPED_STEPS, stepProgress: { rec: { state: "done" }, r1: { state: "scheduled" } } };
  assert.equal(deriveProcessStatus(app), "Interview");
  assert.equal(deriveCurrentStepId(app), "r1");
  assert.equal(processSummary(app).total, 4);
});

// ── Default process + processViewForApp ───────────────────────────────────────

const STORE = {
  processes: [
    { id: "p-def", name: "Standard", isDefault: true, accent: "sky", steps: GROUPED_STEPS },
    { id: "p-toast", name: "Toast", isDefault: false, accent: "amber", steps: [
      { id: "t1", name: "Recruiter", type: "recruiter", phase: "Recruiter Screen" },
      { id: "t2", name: "Offer", type: "offer", phase: "Offer" },
    ] },
  ],
};

test("getDefaultProcess returns the flagged default", () => {
  assert.equal(getDefaultProcess(STORE).id, "p-def");
});

test("processViewForApp uses the assigned process with real progress", () => {
  const app = { processId: "p-toast", processName: "Toast", processSteps: STORE.processes[1].steps, stepProgress: { t1: { state: "done" } }, status: "Recruiter Screen" };
  const view = processViewForApp(app, STORE);
  assert.equal(view.hasAssigned, true);
  assert.equal(view.processName, "Toast");
  // +1 for the implicit "Applied" stage prepended to every view.
  assert.equal(view.total, 3);
  assert.equal(view.doneCount, 2); // Applied + t1
  assert.equal(view.leaves[0].name, "Applied");
  assert.equal(view.leaves[0].state, "done");
  assert.equal(view.currentLeaf.id, "t2");
});

test("processViewForApp shows an Applied card AT the Applied stage (not the first round)", () => {
  const view = processViewForApp({ status: "Applied" }, STORE); // unassigned
  assert.equal(view.total, 5); // Applied + rec + r1 + r2 + off
  assert.equal(view.currentIndex, 0);
  assert.equal(view.currentLeaf.name, "Applied");
  assert.equal(view.currentLeaf.synthetic, true);
  assert.equal(view.doneCount, 0); // nothing passed yet — including Applied
});

test("processViewForApp falls back to the default process for an unassigned app", () => {
  const app = { status: "Interview" }; // no processId
  const view = processViewForApp(app, STORE);
  assert.equal(view.hasAssigned, false);
  assert.equal(view.processName, "Standard");
  assert.equal(view.total, 5); // Applied + rec + r1 + r2 + off (flattened)
  assert.equal(view.leaves[0].name, "Applied");
  // status Interview -> Applied + recruiter done, first Interview leaf (r1) current
  assert.equal(view.leaves.find((l) => l.id === "rec").state, "done");
  assert.equal(view.leaves.find((l) => l.id === "r1").isCurrent, true);
  // grouped structure is preserved for layout (the Onsite Loop group with 2 children)
  const group = view.groups.find((g) => g.isGroup);
  assert.ok(group && group.children.length === 2);
});

test("processViewForApp positions an unassigned Offer app as fully done", () => {
  const view = processViewForApp({ status: "Offer" }, STORE);
  assert.equal(view.doneCount, 5); // Applied + 4 rounds
  assert.equal(view.complete, true);
});

// Pure, dependency-free helpers for interview processes — the client mirror of
// back/lib/domain/interviewProcesses.mjs. Imported BOTH by the React app
// (Processes editor + dashboard) and the Node test runner, so it must stay free
// of any React/DOM references. Keep STEP_TYPES + the derivation logic in lockstep
// with the backend module.
//
// Steps can be leaves or inline GROUPS (a group holds ordered leaf children, e.g.
// an "Onsite Loop"). For progress/status the tree is FLATTENED to its leaves.

export const STEP_TYPES = [
  { type: "recruiter",     label: "Recruiter Screen",    phase: "Recruiter Screen",  icon: "📞", color: "var(--s-screen-dot, #f5a524)" },
  { type: "assessment",    label: "Online Assessment",   phase: "Online Assessment", icon: "📝", color: "var(--s-oa-dot, #38bdf8)" },
  { type: "take_home",     label: "Take-home",           phase: "Online Assessment", icon: "🏠", color: "var(--s-oa-dot, #38bdf8)" },
  { type: "coding",        label: "Coding Interview",    phase: "Interview",         icon: "💻", color: "var(--s-interview-dot, #c084fc)" },
  { type: "technical",     label: "Technical Interview", phase: "Interview",         icon: "🧠", color: "var(--s-interview-dot, #c084fc)" },
  { type: "system_design", label: "System Design",       phase: "Interview",         icon: "🏗️", color: "var(--s-interview-dot, #c084fc)" },
  { type: "loop",          label: "Onsite Loop Round",   phase: "Interview",         icon: "🔁", color: "var(--s-interview-dot, #c084fc)" },
  { type: "behavioral",    label: "Behavioral",          phase: "Interview",         icon: "💬", color: "var(--s-interview-dot, #c084fc)" },
  { type: "manager",       label: "Hiring Manager",      phase: "Interview",         icon: "👔", color: "var(--s-interview-dot, #c084fc)" },
  { type: "team_match",    label: "Team Match",          phase: "Interview",         icon: "🤝", color: "var(--s-interview-dot, #c084fc)" },
  { type: "offer",         label: "Offer",               phase: "Offer",             icon: "🎉", color: "var(--s-offer-dot, #34d399)" },
  { type: "custom",        label: "Custom Step",         phase: "Interview",         icon: "•",  color: "var(--md-on-surface-variant, #9aa6a0)" },
];

const STEP_TYPE_MAP = new Map(STEP_TYPES.map((entry) => [entry.type, entry]));
export const DEFAULT_STEP_TYPE = "custom";
export const GROUP_TYPE = "group";

export const PROCESS_ACCENTS = ["violet", "sky", "amber", "emerald", "rose", "cyan"];
const ACCENT_COLORS = {
  violet: "#a78bfa", sky: "#38bdf8", amber: "#fbbf24",
  emerald: "#34d399", rose: "#fb7185", cyan: "#22d3ee",
};

export const STEP_STATES = ["pending", "scheduled", "done", "failed"];
export const STEP_STATE_META = {
  pending:   { label: "Not started", icon: "○", color: "var(--md-on-surface-variant, #9aa6a0)" },
  scheduled: { label: "Scheduled",   icon: "◔", color: "var(--s-oa-dot, #38bdf8)" },
  done:      { label: "Passed",      icon: "●", color: "var(--s-offer-dot, #34d399)" },
  failed:    { label: "Did not pass", icon: "✕", color: "var(--s-rejected-dot, #f87171)" },
};

// Canonical pipeline order used to position an UNASSIGNED app's status along the
// default process. OA and Recruiter Screen share a rank (their order varies by
// company), so exact phase-match-in-order wins first; this is the fallback.
const PHASE_RANK = { "Applied": 0, "Recruiter Screen": 1, "Online Assessment": 1, "Interview": 2, "Offer": 3 };

export function stepType(type) {
  return STEP_TYPE_MAP.get(type) || STEP_TYPE_MAP.get(DEFAULT_STEP_TYPE);
}
export function stepPhase(type) {
  return stepType(type).phase;
}
export function stepIcon(type) {
  return stepType(type).icon;
}
export function accentColor(accent) {
  return ACCENT_COLORS[accent] || ACCENT_COLORS.violet;
}
export function isGroupStep(step) {
  return Boolean(step && (step.type === GROUP_TYPE || Array.isArray(step.children)));
}

// Ordered leaf steps of a (one-level) step tree.
export function flattenSteps(steps) {
  const leaves = [];
  for (const step of Array.isArray(steps) ? steps : []) {
    if (isGroupStep(step)) {
      for (const child of Array.isArray(step.children) ? step.children : []) leaves.push(child);
    } else {
      leaves.push(step);
    }
  }
  return leaves;
}

export function hasProcess(app) {
  return Boolean(app && app.processId && Array.isArray(app.processSteps) && flattenSteps(app.processSteps).length);
}

export function getDefaultProcess(store) {
  const processes = store && Array.isArray(store.processes) ? store.processes : [];
  return processes.find((p) => p.isDefault) || processes[0] || null;
}

function leafState(progress, id) {
  return (progress && progress[id] && progress[id].state) || "pending";
}

// The first not-yet-done/failed leaf id (the next thing to happen), or the last
// leaf when everything is resolved.
export function deriveCurrentStepId(app) {
  const leaves = flattenSteps(app && app.processSteps);
  const progress = (app && app.stepProgress) || {};
  for (const leaf of leaves) {
    const state = leafState(progress, leaf.id);
    if (state !== "done" && state !== "failed") return leaf.id;
  }
  return leaves.length ? leaves[leaves.length - 1].id : "";
}

export function currentStep(app) {
  if (!hasProcess(app)) return null;
  const leaves = flattenSteps(app.processSteps);
  const id = (app.currentStepId && leaves.some((s) => s.id === app.currentStepId))
    ? app.currentStepId
    : deriveCurrentStepId(app);
  return leaves.find((s) => s.id === id) || null;
}

// Canonical pipeline status implied by a process snapshot.
export function deriveProcessStatus(app) {
  if (!hasProcess(app)) return "";
  const progress = app.stepProgress || {};
  let phase = "";
  let offerDone = false;
  for (const leaf of flattenSteps(app.processSteps)) {
    const state = leafState(progress, leaf.id);
    const phaseOfStep = leaf.phase || stepPhase(leaf.type);
    if (state === "done" || (state === "scheduled" && phaseOfStep !== "Offer")) phase = phaseOfStep;
    if (phaseOfStep === "Offer" && state === "done") offerDone = true;
  }
  if (offerDone) return "Offer";
  return phase;
}

export function isProcessWaiting(app) {
  if (!hasProcess(app)) return false;
  const progress = app.stepProgress || {};
  const states = flattenSteps(app.processSteps).map((leaf) => leafState(progress, leaf.id));
  if (states.some((state) => state === "scheduled")) return false;
  if (!states.some((state) => state === "done")) return false;
  if (states.every((state) => state === "done" || state === "failed")) return false;
  const lastResolved = states.filter((state) => state === "done" || state === "failed").pop();
  if (lastResolved === "failed") return false;
  return true;
}

// The single, unified "ball is in the company's court" predicate. Reconciles the
// two disjoint mechanisms: a process snapshot sitting between rounds
// (isProcessWaiting), AND the legacy per-stage "mark passed" flag
// (stagePassedAt[status]) used by apps without an assigned process. Terminal
// statuses are never waiting. Pure — reads only fields already on the app.
export function isWaiting(app) {
  if (!app || app.status === "Rejected" || app.status === "Offer") return false;
  if (isProcessWaiting(app)) return true;
  return Boolean(app.stagePassedAt && app.stagePassedAt[app.status]);
}

// ISO timestamp of the most-recently completed process leaf — the moment the
// ball last passed to the company. "" when there's no process or nothing done.
// Used by metrics.daysWaiting to age the Waiting hero. Pure.
export function lastPassedTimestamp(app) {
  if (!hasProcess(app)) return "";
  const progress = app.stepProgress || {};
  let latest = "";
  for (const leaf of flattenSteps(app.processSteps)) {
    const entry = progress[leaf.id];
    if (entry && entry.state === "done" && entry.completedAt) {
      if (!latest || new Date(entry.completedAt).getTime() > new Date(latest).getTime()) {
        latest = entry.completedAt;
      }
    }
  }
  return latest;
}

// The freshest round activity (scheduled OR completed) across a process snapshot
// — the real "current stage" date for a process-tracked app, since round dates
// live in stepProgress, not stageDateTimes. "" when there's no process or no
// dated rounds. Used by metrics to age staleness without false-ghosting an
// app that has an upcoming/recent round.
export function latestProcessActivity(app) {
  if (!hasProcess(app)) return "";
  const progress = app.stepProgress || {};
  let latest = 0;
  let iso = "";
  for (const leaf of flattenSteps(app.processSteps)) {
    const entry = progress[leaf.id];
    if (!entry) continue;
    for (const ts of [entry.completedAt, entry.scheduledAt]) {
      if (!ts) continue;
      const t = new Date(ts).getTime();
      if (Number.isFinite(t) && t > latest) { latest = t; iso = ts; }
    }
  }
  return iso;
}

export function isProcessComplete(app) {
  if (!hasProcess(app)) return false;
  const progress = app.stepProgress || {};
  return flattenSteps(app.processSteps).every((leaf) => {
    const state = leafState(progress, leaf.id);
    return state === "done" || state === "failed";
  });
}

export function processSummary(app) {
  if (!hasProcess(app)) {
    return { hasProcess: false, total: 0, doneCount: 0, current: null, currentIndex: -1, waiting: false, complete: false, status: "" };
  }
  const leaves = flattenSteps(app.processSteps);
  const progress = app.stepProgress || {};
  const doneCount = leaves.filter((s) => leafState(progress, s.id) === "done").length;
  const current = currentStep(app);
  const currentIndex = current ? leaves.findIndex((s) => s.id === current.id) : -1;
  return {
    hasProcess: true,
    total: leaves.length,
    doneCount,
    current,
    currentIndex,
    waiting: isProcessWaiting(app),
    complete: isProcessComplete(app),
    status: deriveProcessStatus(app),
  };
}

// Build the application patch for a step-state change: updates stepProgress,
// recomputes currentStepId, and derives the canonical status. Returns a shallow
// object to merge into the app before PUT.
export function applyStepState(app, stepId, state, { scheduledAt, completedAt } = {}) {
  const prev = (app.stepProgress && app.stepProgress[stepId]) || {};
  const entry = { ...prev, state };
  if (scheduledAt !== undefined) entry.scheduledAt = scheduledAt;
  if (completedAt !== undefined) entry.completedAt = completedAt;
  if (state === "done" && !entry.completedAt) entry.completedAt = new Date().toISOString();
  const stepProgress = { ...(app.stepProgress || {}), [stepId]: entry };
  const next = { ...app, stepProgress };
  next.currentStepId = deriveCurrentStepId(next);
  const derived = deriveProcessStatus(next);
  // Never let step progress demote a terminal status — a Rejected/Offer app must
  // not be silently un-rejected / un-offered by ticking a stage.
  if (derived && app.status !== "Rejected" && app.status !== "Offer") next.status = derived;
  return next;
}

// Set/clear a leaf's scheduled date without changing its state's intent. If the
// leaf is still pending, scheduling a date flips it to "scheduled".
export function setStepDate(app, stepId, scheduledAt) {
  const prev = (app.stepProgress && app.stepProgress[stepId]) || {};
  const state = (prev.state === "done" || prev.state === "failed") ? prev.state
    : (scheduledAt ? "scheduled" : "pending");
  return applyStepState(app, stepId, state, { scheduledAt: scheduledAt || "" });
}

// Synthesize a leaf-keyed progress map for an UNASSIGNED app from its canonical
// status, positioned along the given (default) process leaves — so the card can
// show "what stage we arrived at" even before a process is explicitly assigned.
function syntheticProgress(leaves, status) {
  const prog = {};
  if (!leaves.length) return prog;
  if (status === "Offer") { leaves.forEach((l) => { prog[l.id] = { state: "done" }; }); return prog; }
  if (!status || status === "Applied" || status === "Saved" || status === "Rejected") return prog;
  const phaseOf = (l) => l.phase || stepPhase(l.type);
  let idx = leaves.findIndex((l) => phaseOf(l) === status);
  if (idx === -1) {
    const rank = PHASE_RANK[status] ?? 0;
    let last = -1;
    leaves.forEach((l, i) => { if ((PHASE_RANK[phaseOf(l)] ?? 0) < rank) last = i; });
    for (let i = 0; i <= last; i += 1) prog[leaves[i].id] = { state: "done" };
    if (last + 1 < leaves.length) prog[leaves[last + 1].id] = { state: "scheduled" };
    return prog;
  }
  for (let i = 0; i < idx; i += 1) prog[leaves[i].id] = { state: "done" };
  prog[leaves[idx].id] = { state: "scheduled" };
  return prog;
}

// Materialize the store's default process onto an application (positioned at its
// current canonical status) — used when an unassigned card is interacted with
// (e.g. a date is set), so the inherited default becomes a real, persisted
// snapshot. Returns the process-field patch, or null when there's no default.
export function adoptDefaultProcess(app, store) {
  const def = getDefaultProcess(store);
  if (!def || !Array.isArray(def.steps)) return null;
  const steps = JSON.parse(JSON.stringify(def.steps));
  const stepProgress = syntheticProgress(flattenSteps(steps), app && app.status);
  const probe = { processId: def.id, processSteps: steps, stepProgress };
  return {
    processId: def.id,
    processName: def.name || "",
    processSteps: steps,
    stepProgress,
    currentStepId: deriveCurrentStepId(probe),
  };
}

// Ensure an app has a concrete process snapshot: returns the app unchanged when
// one is assigned, else a shallow copy with the default process adopted.
export function ensureProcess(app, store) {
  if (hasProcess(app)) return app;
  const patch = adoptDefaultProcess(app, store);
  return patch ? { ...app, ...patch } : app;
}

// Unified, render-ready view of an application's process — the assigned one, or
// (when none is assigned) the store's default process positioned from the app's
// canonical status. Returns null when there's no process to show at all.
//
// Returns:
//   { hasAssigned, processId, processName, accent,
//     groups: [ ...step, state?, leafStates? ],   // grouped structure for layout
//     leaves: [ ...leaf, state, isCurrent ],       // flattened, with display state
//     doneCount, total, currentIndex, currentLeaf, waiting, complete, statusPhase }
export function processViewForApp(app, store) {
  const assigned = hasProcess(app);
  let steps;
  let progress;
  let processName;
  let processId;
  let accent;
  if (assigned) {
    steps = app.processSteps;
    progress = app.stepProgress || {};
    processName = app.processName || "";
    processId = app.processId;
    accent = "";
  } else {
    const def = getDefaultProcess(store);
    if (!def) return null;
    steps = def.steps || [];
    processName = def.name || "";
    processId = def.id;
    accent = def.accent || "";
    progress = syntheticProgress(flattenSteps(steps), app && app.status);
  }

  const leaves = flattenSteps(steps);
  if (!leaves.length) return null;

  const probe = { processId: processId || "x", processSteps: steps, stepProgress: progress, currentStepId: assigned ? app.currentStepId : "" };
  const currentId = deriveCurrentStepId(probe);

  const leafView = leaves.map((leaf, index) => {
    const entry = progress[leaf.id] || {};
    const state = STEP_STATES.includes(entry.state) ? entry.state : "pending";
    return {
      ...leaf,
      index,
      state,
      scheduledAt: entry.scheduledAt || "",
      completedAt: entry.completedAt || "",
      isCurrent: leaf.id === currentId,
    };
  });
  const stateById = new Map(leafView.map((l) => [l.id, l]));

  // Grouped structure for layout: each top-level step gets a derived display
  // state; groups expose their children's states + an aggregate.
  const groups = (Array.isArray(steps) ? steps : []).map((step) => {
    if (isGroupStep(step)) {
      const children = (step.children || []).map((c) => stateById.get(c.id) || { ...c, state: "pending", isCurrent: false });
      const states = children.map((c) => c.state);
      let aggregate = "pending";
      if (children.some((c) => c.isCurrent)) aggregate = "current";
      else if (states.length && states.every((s) => s === "done")) aggregate = "done";
      else if (states.some((s) => s === "failed")) aggregate = "failed";
      else if (states.some((s) => s === "scheduled" || s === "done")) aggregate = "active";
      return { ...step, isGroup: true, children, aggregate, hasCurrent: children.some((c) => c.isCurrent) };
    }
    const v = stateById.get(step.id) || { ...step, state: "pending", isCurrent: false };
    return { ...v, isGroup: false };
  });

  const probeApp = { processId: probe.processId, processSteps: steps, stepProgress: progress, currentStepId: currentId };

  // "Applied" is the implicit first stage of EVERY process — an application is
  // Applied before any defined round runs. Prepend it (display-only; never part
  // of the editor or persisted steps) so an Applied card reads "1/N · Applied",
  // not "1/N · <first interview round>". It is done once the app has moved past
  // Applied (a later phase, or any round started).
  const status = app && app.status;
  const PHASES_PAST_APPLIED = new Set(["Recruiter Screen", "Online Assessment", "Interview", "Offer"]);
  const appliedDone = status !== "Saved"
    && (PHASES_PAST_APPLIED.has(status) || leafView.some((l) => l.state === "done" || l.state === "scheduled"));
  const appliedLeaf = {
    id: "__applied__", name: "Applied", type: "applied", phase: "Applied", synthetic: true,
    state: appliedDone ? "done" : "pending", scheduledAt: "", completedAt: "", isCurrent: false,
  };

  const allLeaves = [appliedLeaf, ...leafView];
  let curIdx = allLeaves.findIndex((l) => l.state !== "done" && l.state !== "failed");
  if (curIdx === -1) curIdx = allLeaves.length - 1;
  allLeaves.forEach((l, i) => { l.index = i; l.isCurrent = i === curIdx; });
  const currentLeaf = allLeaves[curIdx] || null;
  const doneCount = allLeaves.filter((l) => l.state === "done").length;

  return {
    hasAssigned: assigned,
    processId,
    processName,
    accent,
    groups: [{ ...appliedLeaf, isGroup: false }, ...groups],
    leaves: allLeaves,
    doneCount,
    total: allLeaves.length,
    currentIndex: currentLeaf ? currentLeaf.index : -1,
    currentLeaf,
    waiting: assigned ? isProcessWaiting(app) : false,
    complete: isProcessComplete(probeApp),
    statusPhase: deriveProcessStatus(probeApp),
  };
}

// Pure, dependency-free helpers for interview processes — the client mirror of
// back/lib/domain/interviewProcesses.mjs. Imported BOTH by the React app
// (management page + dashboard) and the Node test runner, so it must stay free
// of any React/DOM references. Keep STEP_TYPES + the derivation logic in lockstep
// with the backend module.

// Step-type vocabulary. `phase` is the canonical pipeline stage the step counts
// as for analytics; `color` keys into the dashboard's CSS status palette.
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

export const PROCESS_ACCENTS = ["violet", "sky", "amber", "emerald", "rose", "cyan"];
const ACCENT_COLORS = {
  violet: "#a78bfa",
  sky: "#38bdf8",
  amber: "#fbbf24",
  emerald: "#34d399",
  rose: "#fb7185",
  cyan: "#22d3ee",
};

// Per-step progress states (mirror the backend).
export const STEP_STATES = ["pending", "scheduled", "done", "failed"];
export const STEP_STATE_META = {
  pending:   { label: "Not started", icon: "○", color: "var(--md-on-surface-variant, #9aa6a0)" },
  scheduled: { label: "Scheduled",   icon: "◔", color: "var(--s-oa-dot, #38bdf8)" },
  done:      { label: "Passed",      icon: "●", color: "var(--s-offer-dot, #34d399)" },
  failed:    { label: "Did not pass", icon: "✕", color: "var(--s-rejected-dot, #f87171)" },
};

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

export function hasProcess(app) {
  return Boolean(app && app.processId && Array.isArray(app.processSteps) && app.processSteps.length);
}

function stepState(app, stepId) {
  return (app && app.stepProgress && app.stepProgress[stepId] && app.stepProgress[stepId].state) || "pending";
}

// The "current" step is the first not yet done/failed (the next thing to
// happen), or the last step when everything is resolved. Returns the step id.
export function deriveCurrentStepId(app) {
  const steps = (app && app.processSteps) || [];
  for (const step of steps) {
    const state = stepState(app, step.id);
    if (state !== "done" && state !== "failed") return step.id;
  }
  return steps.length ? steps[steps.length - 1].id : "";
}

export function currentStep(app) {
  if (!hasProcess(app)) return null;
  const id = (app.currentStepId && app.processSteps.some((s) => s.id === app.currentStepId))
    ? app.currentStepId
    : deriveCurrentStepId(app);
  return app.processSteps.find((s) => s.id === id) || null;
}

// Canonical pipeline status implied by the process: phase of the furthest step
// scheduled or done. "" when nothing has started, "Offer" once the offer is done.
export function deriveProcessStatus(app) {
  if (!hasProcess(app)) return "";
  let phase = "";
  let offerDone = false;
  for (const step of app.processSteps) {
    const state = stepState(app, step.id);
    const phaseOfStep = step.phase || stepPhase(step.type);
    // Advance on scheduled/done — but never promote to terminal "Offer" on a
    // merely-scheduled offer round (an offer must be marked done to count).
    if (state === "done" || (state === "scheduled" && phaseOfStep !== "Offer")) phase = phaseOfStep;
    if (phaseOfStep === "Offer" && state === "done") offerDone = true;
  }
  if (offerDone) return "Offer";
  return phase;
}

// "Waiting" = a round was completed but the next isn't booked yet and the
// process isn't finished. False when something is scheduled, when nothing has
// happened, or when every step is resolved.
export function isProcessWaiting(app) {
  if (!hasProcess(app)) return false;
  const states = app.processSteps.map((step) => stepState(app, step.id));
  if (states.some((state) => state === "scheduled")) return false;
  if (!states.some((state) => state === "done")) return false;
  if (states.every((state) => state === "done" || state === "failed")) return false;
  // A failed most-recent round isn't "waiting on the company" — don't claim it.
  const lastResolved = states.filter((state) => state === "done" || state === "failed").pop();
  if (lastResolved === "failed") return false;
  return true;
}

export function isProcessComplete(app) {
  if (!hasProcess(app)) return false;
  return app.processSteps.every((step) => {
    const state = stepState(app, step.id);
    return state === "done" || state === "failed";
  });
}

// One bundle the dashboard/panel can render from.
export function processSummary(app) {
  if (!hasProcess(app)) {
    return { hasProcess: false, total: 0, doneCount: 0, current: null, currentIndex: -1, waiting: false, complete: false, status: "" };
  }
  const steps = app.processSteps;
  const doneCount = steps.filter((s) => stepState(app, s.id) === "done").length;
  const current = currentStep(app);
  const currentIndex = current ? steps.findIndex((s) => s.id === current.id) : -1;
  return {
    hasProcess: true,
    total: steps.length,
    doneCount,
    current,
    currentIndex,
    waiting: isProcessWaiting(app),
    complete: isProcessComplete(app),
    status: deriveProcessStatus(app),
  };
}

// Build the application patch for a step-state change: updates stepProgress,
// recomputes currentStepId, and derives the canonical status so the dashboard
// stays in sync. Returns a shallow object to merge into the app before PUT.
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
  if (derived) next.status = derived;
  return next;
}

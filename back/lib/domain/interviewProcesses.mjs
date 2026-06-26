// Interview processes: reusable, ordered step templates ("Toast = recruiter →
// coding → 5-round loop → manager → offer"). A process is assigned to an
// application, which then carries a SNAPSHOT of its steps plus per-step progress
// so editing a template later never rewrites history already in flight.
//
// Each step has a `type` drawn from STEP_TYPES; every type maps to one of the
// canonical pipeline phases ("Recruiter Screen" / "Online Assessment" /
// "Interview" / "Offer"). That mapping is what keeps the existing analytics,
// board, stale detection and CSV export working unchanged: an application's
// canonical `status` is derived from how far it has advanced through its steps.
//
// Stored as a single JSON blob in app_settings ("interviewProcesses"), mirroring
// the study-plans store.
import { cleanTimestamp } from "../core/dates.mjs";
import { clean, slugify } from "../core/util.mjs";

// Step-type vocabulary. `phase` is the canonical pipeline stage the step counts
// as for analytics. Keep this list in sync with front/src/lib/process.mjs
// (the client mirror used by the management UI and dashboard).
const STEP_TYPES = [
  { type: "recruiter",     label: "Recruiter Screen",   phase: "Recruiter Screen",  icon: "📞" },
  { type: "assessment",    label: "Online Assessment",  phase: "Online Assessment", icon: "📝" },
  { type: "take_home",     label: "Take-home",          phase: "Online Assessment", icon: "🏠" },
  { type: "coding",        label: "Coding Interview",   phase: "Interview",         icon: "💻" },
  { type: "technical",     label: "Technical Interview", phase: "Interview",        icon: "🧠" },
  { type: "system_design", label: "System Design",      phase: "Interview",         icon: "🏗️" },
  { type: "loop",          label: "Onsite Loop Round",  phase: "Interview",         icon: "🔁" },
  { type: "behavioral",    label: "Behavioral",         phase: "Interview",         icon: "💬" },
  { type: "manager",       label: "Hiring Manager",     phase: "Interview",         icon: "👔" },
  { type: "team_match",    label: "Team Match",         phase: "Interview",         icon: "🤝" },
  { type: "offer",         label: "Offer",              phase: "Offer",             icon: "🎉" },
  { type: "custom",        label: "Custom Step",        phase: "Interview",         icon: "•" },
];
const STEP_TYPE_MAP = new Map(STEP_TYPES.map((entry) => [entry.type, entry]));
const DEFAULT_STEP_TYPE = "custom";

const PROCESS_ACCENTS = ["violet", "sky", "amber", "emerald", "rose", "cyan"];

// Per-application step progress states.
//   pending   — not yet scheduled (the round hasn't been booked)
//   scheduled — booked / actively in progress (has or will have a date)
//   done      — completed and passed
//   failed    — completed but did not pass (often precedes a rejection)
const STEP_STATES = ["pending", "scheduled", "done", "failed"];

function stepType(type) {
  return STEP_TYPE_MAP.get(clean(type)) || STEP_TYPE_MAP.get(DEFAULT_STEP_TYPE);
}

function stepPhase(type) {
  return stepType(type).phase;
}

const defaultInterviewProcessesStore = {
  version: 1,
  processes: [
    {
      id: "proc-standard",
      name: "Standard",
      description: "Recruiter screen → online assessment → onsite loop → offer.",
      accent: "sky",
      seeded: true,
      steps: [
        { id: "std-recruiter", name: "Recruiter Screen", type: "recruiter" },
        { id: "std-assessment", name: "Online Assessment", type: "assessment" },
        { id: "std-loop", name: "Onsite Loop", type: "loop" },
        { id: "std-offer", name: "Offer", type: "offer" },
      ],
    },
    {
      id: "proc-toast",
      name: "Toast",
      description: "Recruiter → coding challenge → 5-round loop → hiring manager → offer.",
      accent: "amber",
      seeded: true,
      steps: [
        { id: "toast-recruiter", name: "Recruiter Screen", type: "recruiter" },
        { id: "toast-coding", name: "Coding Challenge", type: "assessment" },
        { id: "toast-loop-1", name: "Loop 1 — Coding", type: "coding" },
        { id: "toast-loop-2", name: "Loop 2 — Coding", type: "coding" },
        { id: "toast-loop-3", name: "Loop 3 — System Design", type: "system_design" },
        { id: "toast-loop-4", name: "Loop 4 — Behavioral", type: "behavioral" },
        { id: "toast-loop-5", name: "Loop 5 — Values & Craft", type: "loop" },
        { id: "toast-manager", name: "Hiring Manager", type: "manager" },
        { id: "toast-offer", name: "Offer", type: "offer" },
      ],
    },
  ],
};

// ── Template normalization ────────────────────────────────────────────────────

function normalizeProcessStep(input = {}, index = 0) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const name = clean(source.name) || stepType(source.type).label;
  const type = STEP_TYPE_MAP.has(clean(source.type)) ? clean(source.type) : DEFAULT_STEP_TYPE;
  const slug = slugify(name);
  const id = clean(source.id) || `step-${slug}-${index}`;
  return { id, name, type, phase: stepPhase(type) };
}

function normalizeProcessSteps(value) {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  const steps = [];
  list.forEach((raw, index) => {
    const step = normalizeProcessStep(raw, index);
    // Disambiguate duplicate ids (e.g. two "Coding Interview" steps) so per-step
    // progress never collides.
    let id = step.id;
    let suffix = 1;
    while (seen.has(id)) {
      id = `${step.id}-${suffix}`;
      suffix += 1;
    }
    seen.add(id);
    steps.push({ ...step, id });
  });
  return steps;
}

function normalizeInterviewProcess(input = {}, existing = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const base = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  const name = clean(source.name ?? base.name) || "Untitled process";
  const slug = slugify(name) || "process";
  const id = clean(source.id ?? base.id) || `proc-${slug}-${Date.now()}`;
  const accent = PROCESS_ACCENTS.includes(source.accent)
    ? source.accent
    : (PROCESS_ACCENTS.includes(base.accent) ? base.accent : PROCESS_ACCENTS[0]);
  const steps = source.steps !== undefined
    ? normalizeProcessSteps(source.steps)
    : normalizeProcessSteps(base.steps);
  return {
    id,
    name,
    description: String(source.description ?? base.description ?? ""),
    accent,
    seeded: Boolean(source.seeded ?? base.seeded ?? false),
    steps,
    createdAt: cleanTimestamp(source.createdAt) || cleanTimestamp(base.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeInterviewProcessesStore(input = {}) {
  let source = input;
  if (typeof input === "string") {
    try {
      source = JSON.parse(input);
    } catch {
      source = {};
    }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) source = {};
  const rawProcesses = Array.isArray(source.processes) ? source.processes : null;
  // First run (no stored value): seed the example processes. An explicit empty
  // array is respected so a user who deletes every process keeps an empty board.
  const processes = (rawProcesses === null ? defaultInterviewProcessesStore.processes : rawProcesses)
    .map((process) => normalizeInterviewProcess(process))
    .filter(Boolean);
  const seen = new Set();
  const deduped = processes.filter((process) => {
    if (seen.has(process.id)) return false;
    seen.add(process.id);
    return true;
  });
  return { version: 1, processes: deduped };
}

// ── Per-application process state ─────────────────────────────────────────────

function normalizeStepProgressEntry(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const state = STEP_STATES.includes(source.state) ? source.state : "pending";
  return {
    state,
    scheduledAt: cleanTimestamp(source.scheduledAt) || "",
    completedAt: cleanTimestamp(source.completedAt) || "",
    notes: String(source.notes ?? "").slice(0, 2000),
  };
}

// Builds the per-application process snapshot + progress from the (possibly
// partial) input, falling back to the existing stored value. Returns the empty
// shape when no process is assigned.
function normalizeApplicationProcess(input = {}, existing = {}) {
  const inProcessId = input.processId !== undefined ? clean(input.processId) : undefined;
  const processId = inProcessId !== undefined ? inProcessId : clean(existing.processId);
  if (!processId) {
    return { processId: "", processName: "", processSteps: [], stepProgress: {}, currentStepId: "" };
  }

  const rawSteps = input.processSteps !== undefined ? input.processSteps : existing.processSteps;
  const processSteps = normalizeProcessSteps(rawSteps);
  const stepIds = new Set(processSteps.map((step) => step.id));

  const rawProgress = input.stepProgress !== undefined ? input.stepProgress : existing.stepProgress;
  const stepProgress = {};
  if (rawProgress && typeof rawProgress === "object" && !Array.isArray(rawProgress)) {
    for (const [stepId, entry] of Object.entries(rawProgress)) {
      if (!stepIds.has(stepId)) continue; // drop progress for steps no longer present
      stepProgress[stepId] = normalizeStepProgressEntry(entry);
    }
  }

  const inCurrent = input.currentStepId !== undefined ? clean(input.currentStepId) : clean(existing.currentStepId);
  const currentStepId = stepIds.has(inCurrent)
    ? inCurrent
    : (deriveCurrentStepId(processSteps, stepProgress) || (processSteps[0]?.id ?? ""));

  return {
    processId,
    processName: clean(input.processName ?? existing.processName),
    processSteps,
    stepProgress,
    currentStepId,
  };
}

// The "current" step is the first one not yet done/failed (i.e. the next thing
// to happen), or the last step when everything is resolved.
function deriveCurrentStepId(steps, progress) {
  for (const step of steps) {
    const state = progress[step.id]?.state;
    if (state !== "done" && state !== "failed") return step.id;
  }
  return steps.length ? steps[steps.length - 1].id : "";
}

// Canonical pipeline status implied by a process snapshot: the phase of the
// furthest step that has been scheduled or completed. Returns "" when nothing
// has started yet (caller keeps the existing status, typically "Applied"), or
// "Offer" once the offer step is done.
function deriveProcessStatus(p) {
  if (!p || !p.processId || !Array.isArray(p.processSteps) || !p.processSteps.length) return "";
  const progress = p.stepProgress || {};
  let phase = "";
  let offerDone = false;
  for (const step of p.processSteps) {
    const state = progress[step.id]?.state;
    const phaseOfStep = step.phase || stepPhase(step.type);
    // Advance on scheduled/done — except never promote to the terminal "Offer"
    // phase on a merely-scheduled offer round (an offer must be *received*, i.e.
    // marked done, to count as an Offer).
    if (state === "done" || (state === "scheduled" && phaseOfStep !== "Offer")) phase = phaseOfStep;
    if (phaseOfStep === "Offer" && state === "done") offerDone = true;
  }
  if (offerDone) return "Offer";
  return phase;
}

// "Waiting" = a round was completed but the next one isn't booked yet, and the
// process isn't finished — the ball is in the company's court. False when
// something is currently scheduled, when nothing has happened, or when every
// step is resolved.
function isProcessWaiting(p) {
  if (!p || !p.processId || !Array.isArray(p.processSteps) || !p.processSteps.length) return false;
  const progress = p.stepProgress || {};
  const states = p.processSteps.map((step) => progress[step.id]?.state || "pending");
  if (states.some((state) => state === "scheduled")) return false;
  if (!states.some((state) => state === "done")) return false;
  if (states.every((state) => state === "done" || state === "failed")) return false;
  // If the most-recently resolved round was a failure, the app isn't "waiting on
  // the company for the next step" — it likely fell out. Don't claim Waiting.
  const lastResolved = states.filter((state) => state === "done" || state === "failed").pop();
  if (lastResolved === "failed") return false;
  return true;
}

export {
  STEP_TYPES,
  STEP_TYPE_MAP,
  STEP_STATES,
  PROCESS_ACCENTS,
  DEFAULT_STEP_TYPE,
  defaultInterviewProcessesStore,
  stepType,
  stepPhase,
  normalizeProcessStep,
  normalizeProcessSteps,
  normalizeInterviewProcess,
  normalizeInterviewProcessesStore,
  normalizeStepProgressEntry,
  normalizeApplicationProcess,
  deriveCurrentStepId,
  deriveProcessStatus,
  isProcessWaiting,
};

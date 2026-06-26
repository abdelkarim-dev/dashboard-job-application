// Interview processes: reusable, ordered step templates ("Toast = recruiter →
// coding → 5-round loop → manager → offer"). A process is assigned to an
// application, which then carries a SNAPSHOT of its steps plus per-step progress
// so editing a template later never rewrites history already in flight.
//
// Steps can be leaves OR inline GROUPS (a "group" step holds an ordered list of
// child leaf steps — e.g. an "Onsite Loop" containing 5 rounds). Groups nest one
// level only. For progress/status the tree is FLATTENED to its leaves: progress
// is keyed by leaf id, and the canonical pipeline `status` derives from how far
// the application has advanced through those leaves.
//
// One process is the DEFAULT (isDefault): applications with no explicitly
// assigned process inherit it for display in the dashboard.
//
// Each leaf `type` is drawn from STEP_TYPES; every type maps to one of the
// canonical pipeline phases ("Recruiter Screen" / "Online Assessment" /
// "Interview" / "Offer"). That mapping keeps the existing analytics, board,
// stale detection and CSV export working unchanged.
//
// Stored as a single JSON blob in app_settings ("interviewProcesses").
import { cleanTimestamp } from "../core/dates.mjs";
import { clean, slugify } from "../core/util.mjs";

// Step-type vocabulary. `phase` is the canonical pipeline stage the step counts
// as for analytics. Keep this list in sync with front/src/lib/process.mjs.
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
const GROUP_TYPE = "group";

const PROCESS_ACCENTS = ["violet", "sky", "amber", "emerald", "rose", "cyan"];

// Per-application step progress states.
const STEP_STATES = ["pending", "scheduled", "done", "failed"];

function stepType(type) {
  return STEP_TYPE_MAP.get(clean(type)) || STEP_TYPE_MAP.get(DEFAULT_STEP_TYPE);
}

function stepPhase(type) {
  return stepType(type).phase;
}

function isGroupStep(step) {
  return Boolean(step && (step.type === GROUP_TYPE || Array.isArray(step.children)));
}

// Flatten the (one-level) step tree into its ordered leaf steps — the unit that
// progress + status derivation operate on. Empty groups contribute nothing.
function flattenSteps(steps) {
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

const defaultInterviewProcessesStore = {
  version: 1,
  processes: [
    {
      id: "proc-standard",
      name: "Standard",
      description: "Recruiter screen → online assessment → onsite loop → offer.",
      accent: "sky",
      seeded: true,
      isDefault: true,
      steps: [
        { id: "std-recruiter", name: "Recruiter Screen", type: "recruiter" },
        { id: "std-assessment", name: "Online Assessment", type: "assessment" },
        {
          id: "std-loop", name: "Onsite Loop", type: GROUP_TYPE, children: [
            { id: "std-loop-1", name: "Coding", type: "coding" },
            { id: "std-loop-2", name: "System Design", type: "system_design" },
            { id: "std-loop-3", name: "Behavioral", type: "behavioral" },
          ],
        },
        { id: "std-offer", name: "Offer", type: "offer" },
      ],
    },
    {
      id: "proc-toast",
      name: "Toast",
      description: "Recruiter → coding challenge → 5-round loop → hiring manager → offer.",
      accent: "amber",
      seeded: true,
      isDefault: false,
      steps: [
        { id: "toast-recruiter", name: "Recruiter Screen", type: "recruiter" },
        { id: "toast-coding", name: "Coding Challenge", type: "assessment" },
        {
          id: "toast-loop", name: "Onsite Loop", type: GROUP_TYPE, children: [
            { id: "toast-loop-1", name: "Loop 1 — Coding", type: "coding" },
            { id: "toast-loop-2", name: "Loop 2 — Coding", type: "coding" },
            { id: "toast-loop-3", name: "Loop 3 — System Design", type: "system_design" },
            { id: "toast-loop-4", name: "Loop 4 — Behavioral", type: "behavioral" },
            { id: "toast-loop-5", name: "Loop 5 — Values & Craft", type: "loop" },
          ],
        },
        { id: "toast-manager", name: "Hiring Manager", type: "manager" },
        { id: "toast-offer", name: "Offer", type: "offer" },
      ],
    },
  ],
};

// ── Template normalization ────────────────────────────────────────────────────

function makeUniqueId(candidate, seen) {
  let id = candidate;
  let suffix = 1;
  while (seen.has(id)) {
    id = `${candidate}-${suffix}`;
    suffix += 1;
  }
  seen.add(id);
  return id;
}

function normalizeLeafStep(input = {}, index = 0) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const type = STEP_TYPE_MAP.has(clean(source.type)) ? clean(source.type) : DEFAULT_STEP_TYPE;
  const name = clean(source.name) || stepType(type).label;
  const id = clean(source.id) || `step-${slugify(name)}-${index}`;
  return { id, name, type, phase: stepPhase(type) };
}

// A single top-level step: either a group (with leaf children) or a leaf.
function normalizeProcessStep(input = {}, index = 0, allowGroups = true) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  if (allowGroups && isGroupStep(source)) {
    const name = clean(source.name) || "Onsite Loop";
    const id = clean(source.id) || `group-${slugify(name)}-${index}`;
    const children = (Array.isArray(source.children) ? source.children : [])
      .map((child, childIndex) => normalizeLeafStep(child, childIndex));
    return { id, name, type: GROUP_TYPE, children };
  }
  return normalizeLeafStep(source, index);
}

function normalizeProcessSteps(value) {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  return list
    .map((raw, index) => {
      const step = normalizeProcessStep(raw, index);
      step.id = makeUniqueId(step.id, seen);
      if (step.type === GROUP_TYPE && Array.isArray(step.children)) {
        step.children = step.children.map((child) => ({ ...child, id: makeUniqueId(child.id, seen) }));
      }
      return step;
    })
    // Drop empty groups: a group with no leaf children would flatten to nothing
    // and could never advance the pipeline, yet still show as a stage.
    .filter((step) => !(step.type === GROUP_TYPE && (!step.children || step.children.length === 0)));
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
    isDefault: Boolean(source.isDefault ?? base.isDefault ?? false),
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
  // Exactly one default. First flagged wins; if none flagged, the first process
  // becomes the default so unassigned applications always inherit something.
  let defaultSeen = false;
  for (const process of deduped) {
    if (process.isDefault && !defaultSeen) defaultSeen = true;
    else process.isDefault = false;
  }
  if (!defaultSeen && deduped.length) deduped[0].isDefault = true;
  return { version: 1, processes: deduped };
}

function getDefaultProcess(store) {
  const processes = store && Array.isArray(store.processes) ? store.processes : [];
  return processes.find((process) => process.isDefault) || processes[0] || null;
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
// shape when no process is assigned. Progress is keyed by LEAF step ids.
function normalizeApplicationProcess(input = {}, existing = {}) {
  const inProcessId = input.processId !== undefined ? clean(input.processId) : undefined;
  const processId = inProcessId !== undefined ? inProcessId : clean(existing.processId);
  if (!processId) {
    return { processId: "", processName: "", processSteps: [], stepProgress: {}, currentStepId: "" };
  }

  const rawSteps = input.processSteps !== undefined ? input.processSteps : existing.processSteps;
  const processSteps = normalizeProcessSteps(rawSteps);
  const leafIds = new Set(flattenSteps(processSteps).map((step) => step.id));

  const rawProgress = input.stepProgress !== undefined ? input.stepProgress : existing.stepProgress;
  const stepProgress = {};
  if (rawProgress && typeof rawProgress === "object" && !Array.isArray(rawProgress)) {
    for (const [stepId, entry] of Object.entries(rawProgress)) {
      if (!leafIds.has(stepId)) continue; // drop progress for steps no longer present
      stepProgress[stepId] = normalizeStepProgressEntry(entry);
    }
  }

  const inCurrent = input.currentStepId !== undefined ? clean(input.currentStepId) : clean(existing.currentStepId);
  const firstLeaf = flattenSteps(processSteps)[0];
  const currentStepId = leafIds.has(inCurrent)
    ? inCurrent
    : (deriveCurrentStepId({ processSteps, stepProgress }) || (firstLeaf ? firstLeaf.id : ""));

  return {
    processId,
    processName: clean(input.processName ?? existing.processName),
    processSteps,
    stepProgress,
    currentStepId,
  };
}

// The "current" leaf is the first one not yet done/failed, or the last leaf when
// everything is resolved. Accepts either an app-like ({processSteps,stepProgress})
// or a process snapshot.
function deriveCurrentStepId(p) {
  const leaves = flattenSteps(p && p.processSteps);
  const progress = (p && p.stepProgress) || {};
  for (const leaf of leaves) {
    const state = progress[leaf.id]?.state;
    if (state !== "done" && state !== "failed") return leaf.id;
  }
  return leaves.length ? leaves[leaves.length - 1].id : "";
}

// Canonical pipeline status implied by a process snapshot: the phase of the
// furthest leaf that has been scheduled or completed. "" when nothing started,
// "Offer" once an offer leaf is done.
function deriveProcessStatus(p) {
  const leaves = flattenSteps(p && p.processSteps);
  if (!p || !p.processId || !leaves.length) return "";
  const progress = p.stepProgress || {};
  let phase = "";
  let offerDone = false;
  for (const leaf of leaves) {
    const state = progress[leaf.id]?.state;
    const phaseOfStep = leaf.phase || stepPhase(leaf.type);
    // Advance on scheduled/done — except never promote to terminal "Offer" on a
    // merely-scheduled offer round (an offer must be marked done to count).
    if (state === "done" || (state === "scheduled" && phaseOfStep !== "Offer")) phase = phaseOfStep;
    if (phaseOfStep === "Offer" && state === "done") offerDone = true;
  }
  if (offerDone) return "Offer";
  return phase;
}

// "Waiting" = a round was completed but the next isn't booked yet and the
// process isn't finished. False when something is scheduled, nothing has
// happened, every leaf is resolved, or the most-recent resolved leaf failed.
function isProcessWaiting(p) {
  const leaves = flattenSteps(p && p.processSteps);
  if (!p || !p.processId || !leaves.length) return false;
  const progress = p.stepProgress || {};
  const states = leaves.map((leaf) => progress[leaf.id]?.state || "pending");
  if (states.some((state) => state === "scheduled")) return false;
  if (!states.some((state) => state === "done")) return false;
  if (states.every((state) => state === "done" || state === "failed")) return false;
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
  GROUP_TYPE,
  defaultInterviewProcessesStore,
  stepType,
  stepPhase,
  isGroupStep,
  flattenSteps,
  normalizeLeafStep,
  normalizeProcessStep,
  normalizeProcessSteps,
  normalizeInterviewProcess,
  normalizeInterviewProcessesStore,
  getDefaultProcess,
  normalizeStepProgressEntry,
  normalizeApplicationProcess,
  deriveCurrentStepId,
  deriveProcessStatus,
  isProcessWaiting,
};

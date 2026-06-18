// Daily points + streak engine for the prep habit. Pure helpers over a small
// localStorage ledger, mirroring metrics.mjs: time-based functions take an
// injectable `now` so the Node test runner stays deterministic. Browser code
// calls the localStorage-backed wrappers; tests call the pure core.
//
// Ledger shape (localStorage key "learnPoints"):
//   { total, streak, lastDay, days: { "YYYY-MM-DD": points }, log: [{at, kind, pts}] }

const POINTS_KEY = "learnPoints";

// What each kind of study action is worth. Keep these small and roughly equal
// so the score reflects EFFORT done, not which surface you happened to use.
export const POINT_VALUES = {
  problemSolved: 10, // solved a coding problem
  problemAttempt: 2, // ran tests on a problem (capped per day, see awardPoints)
  patternRecalled: 6, // rewrote a pattern from blank (recall drill)
  conceptReviewed: 5, // marked a concept page reviewed
  drillQuiz: 4, // finished a drill quiz
  drillCard: 1, // rated a flashcard
};

export function dayString(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a, b) {
  // Whole-day difference between two YYYY-MM-DD strings (b - a).
  const da = Date.parse(`${a}T00:00:00`);
  const db = Date.parse(`${b}T00:00:00`);
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round((db - da) / 86400000);
}

function emptyLedger() {
  return { total: 0, streak: 0, lastDay: "", days: {}, log: [] };
}

// PURE core: apply an award to a ledger and return the next ledger. Streak rules:
// first activity of a new day that is exactly one day after lastDay continues the
// streak (+1); a gap resets it to 1; same-day awards don't change the streak.
export function applyAward(ledger, kind, now = new Date(), value) {
  const base = ledger && typeof ledger === "object" ? ledger : emptyLedger();
  const pts = Number.isFinite(value) ? value : POINT_VALUES[kind] || 0;
  if (pts <= 0) return base;
  const today = dayString(now);
  let streak = base.streak || 0;
  if (base.lastDay !== today) {
    const gap = base.lastDay ? daysBetween(base.lastDay, today) : null;
    streak = gap === 1 ? streak + 1 : 1;
  } else if (streak === 0) {
    streak = 1;
  }
  const days = { ...(base.days || {}) };
  days[today] = (days[today] || 0) + pts;
  const log = [{ at: now instanceof Date ? now.toISOString() : new Date(now).toISOString(), kind, pts }, ...(base.log || [])].slice(0, 200);
  return { total: (base.total || 0) + pts, streak, lastDay: today, days, log };
}

// PURE: streak as of `now` — a streak that wasn't touched today or yesterday is
// stale and reads as 0 (you broke it), without mutating storage.
export function effectiveStreak(ledger, now = new Date()) {
  if (!ledger || !ledger.lastDay) return 0;
  const gap = daysBetween(ledger.lastDay, dayString(now));
  if (gap === null || gap > 1) return 0;
  return ledger.streak || 0;
}

export function pointsToday(ledger, now = new Date()) {
  return (ledger?.days?.[dayString(now)]) || 0;
}

// PURE: a short reminder line based on activity recency.
export function reminderFor(ledger, now = new Date()) {
  const today = dayString(now);
  const streak = effectiveStreak(ledger, now);
  if (ledger?.lastDay === today) {
    return { tone: "good", text: streak > 1 ? `${streak}-day streak — nice. Keep it rolling.` : "You're on the board today. Keep going." };
  }
  if (streak >= 1) {
    return { tone: "warn", text: `Practice today to keep your ${streak}-day streak alive.` };
  }
  return { tone: "idle", text: "Do one drill today to start a streak." };
}

// ---- localStorage-backed wrappers (browser) --------------------------------
export function loadPoints() {
  try {
    const raw = localStorage.getItem(POINTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? { ...emptyLedger(), ...parsed } : emptyLedger();
  } catch {
    return emptyLedger();
  }
}

// Award points for an action and persist; broadcasts "learn:points" so any
// mounted banner refreshes. Returns the new ledger.
export function awardPoints(kind, value) {
  const next = applyAward(loadPoints(), kind, new Date(), value);
  try {
    localStorage.setItem(POINTS_KEY, JSON.stringify(next));
  } catch {}
  try {
    document.dispatchEvent(new CustomEvent("learn:points"));
  } catch {}
  return next;
}

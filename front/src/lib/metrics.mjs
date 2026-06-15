// Pure, dependency-free analytics + tracking helpers for Claire (job hunt copilot).
//
// This module is imported BOTH by the React dashboard (Dashboard, Analytics) and by
// the Node test runner (`node --test`), so it must stay free of any React/DOM
// references. Every time-based helper takes an injectable `now` so the behaviour
// is deterministic under test.

// Pipeline stages that mean "the application advanced past Applied". A rejection
// is tracked separately because it is a response but not a positive one.
export const RESPONSE_STAGES = ["Online Assessment", "Recruiter Screen", "Interview", "Offer"];
const RESPONSE_STAGE_SET = new Set(RESPONSE_STAGES);

// Parse a date-only ("2026-05-21") or full ISO string into a local Date. Returns
// null for empty/unparseable input. Date-only strings are pinned to local
// midnight so day-boundary math doesn't drift across timezones.
export function parseDateValue(value) {
  if (!value) return null;
  const raw = String(value);
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function parseTime(value) {
  const date = parseDateValue(value);
  return date ? date.getTime() : 0;
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function localDateString(date) {
  const d = date instanceof Date ? date : parseDateValue(date);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Whole calendar days between two values (local midnight to local midnight).
// Returns null when either side is unparseable.
export function dayDiff(fromValue, toValue) {
  const from = parseDateValue(fromValue);
  const to = parseDateValue(toValue);
  if (!from || !to) return null;
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

export function getAppliedTimestamp(app) {
  return (app && (app.appliedAt || app.stageDateTimes?.Applied || app.dateApplied)) || "";
}

export function getRejectedTimestamp(app) {
  return (app && (app.rejectedAt || app.stageDateTimes?.Rejected)) || "";
}

// ── Stale detection (shared by Dashboard + Analytics) ──
// An application is "stale" when its CURRENT stage has not moved for
// STALE_THRESHOLD_DAYS+ days. Terminal stages (Offer/Rejected) are never stale.
// Both views import these so "stale" means exactly one thing across the app.
export const STALE_THRESHOLD_DAYS = 10;
export const NON_STALE_STATUSES = new Set(["Rejected", "Offer"]);

// Best timestamp for the stage the application is currently sitting in, falling
// back to applied time / rejection time / last-touched metadata.
export function getCurrentStageTimestamp(app) {
  if (!app) return "";
  const status = app.status || "Applied";
  return (app.stageDateTimes && app.stageDateTimes[status])
    || (status === "Applied" ? getAppliedTimestamp(app) : "")
    || (status === "Rejected" ? getRejectedTimestamp(app) : "")
    || "";
}

// Whole days since the current stage was reached. null when nothing usable.
export function daysSinceCurrentStage(app, now = new Date()) {
  const stamp = getCurrentStageTimestamp(app) || getAppliedTimestamp(app) || (app && (app.updatedAt || app.createdAt));
  const date = parseDateValue(stamp);
  if (!date) return null;
  return Math.floor((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86400000);
}

export function isStale(app, { thresholdDays = STALE_THRESHOLD_DAYS, now = new Date() } = {}) {
  if (!app || NON_STALE_STATUSES.has(app.status)) return false;
  const days = daysSinceCurrentStage(app, now);
  return days !== null && days >= thresholdDays;
}

// True if the application ever reached a post-Applied stage — either its current
// status is one, or a timestamp/date was recorded for one (so a since-rejected
// app that once interviewed still counts as "advanced").
export function everAdvanced(app) {
  if (!app) return false;
  if (RESPONSE_STAGE_SET.has(app.status)) return true;
  const times = app.stageDateTimes || {};
  const dates = app.stageDates || {};
  return RESPONSE_STAGES.some((stage) => times[stage] || dates[stage]);
}

// ── Momentum: applications submitted per week, oldest → newest ──
// Weeks are Monday-anchored. Returns `weeks` buckets ending with the current
// week. Each bucket: { weekStart: "YYYY-MM-DD", count }.
export function weeklyApplicationCounts(applications = [], { weeks = 8, now = new Date() } = {}) {
  const anchor = startOfDay(now);
  const mondayOffset = (anchor.getDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  anchor.setDate(anchor.getDate() - mondayOffset);

  const buckets = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = new Date(anchor);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    buckets.push({ start: start.getTime(), end: end.getTime(), weekStart: localDateString(start), count: 0 });
  }
  const windowStart = buckets[0].start;
  const windowEnd = buckets[buckets.length - 1].end;

  for (const app of applications) {
    const t = parseTime(getAppliedTimestamp(app));
    if (!t || t < windowStart || t >= windowEnd) continue;
    const bucket = buckets.find((b) => t >= b.start && t < b.end);
    if (bucket) bucket.count += 1;
  }
  return buckets.map(({ weekStart, count }) => ({ weekStart, count }));
}

// ── Response funnel + rates (per application) ──
// "Heard back" = advanced past Applied OR explicitly rejected.
// "Ghosted" = still sitting in Applied with no movement for ghostDays+.
export function computeResponseStats(applications = [], { ghostDays = 14, now = new Date() } = {}) {
  const today = startOfDay(now);
  let advanced = 0;
  let rejected = 0;
  let waiting = 0;
  let ghosted = 0;

  for (const app of applications) {
    const status = (app && app.status) || "Applied";
    const didAdvance = everAdvanced(app);
    if (didAdvance) advanced += 1;
    if (status === "Rejected") {
      rejected += 1;
      continue;
    }
    if (!didAdvance) {
      // Still in Applied and never moved — waiting, possibly ghosted.
      const appliedTime = parseTime(getAppliedTimestamp(app));
      const ageDays = appliedTime
        ? Math.round((today.getTime() - startOfDay(new Date(appliedTime)).getTime()) / 86400000)
        : null;
      if (ageDays !== null && ageDays >= ghostDays) ghosted += 1;
      else waiting += 1;
    }
  }

  const total = applications.length;
  const heardBack = advanced + rejected;
  return {
    total,
    advanced,
    rejected,
    waiting,
    ghosted,
    heardBack,
    responseRate: total > 0 ? Math.round((heardBack / total) * 100) : 0,
    positiveRate: total > 0 ? Math.round((advanced / total) * 100) : 0,
  };
}

// Average whole days from applied → first post-Applied stage, across every
// application that recorded both. Returns null when none qualify.
export function avgDaysToFirstResponse(applications = []) {
  const spans = [];
  for (const app of applications) {
    const appliedTime = parseTime(getAppliedTimestamp(app));
    if (!appliedTime) continue;
    const times = (app && app.stageDateTimes) || {};
    const dates = (app && app.stageDates) || {};
    let earliest = Infinity;
    for (const stage of RESPONSE_STAGES) {
      const t = parseTime(times[stage] || dates[stage]);
      if (t && t < earliest) earliest = t;
    }
    if (earliest === Infinity || earliest < appliedTime) continue;
    const days = Math.round((startOfDay(new Date(earliest)).getTime() - startOfDay(new Date(appliedTime)).getTime()) / 86400000);
    spans.push(Math.max(0, days));
  }
  if (!spans.length) return null;
  const avg = spans.reduce((sum, n) => sum + n, 0) / spans.length;
  return Math.round(avg * 10) / 10;
}

// ── Next-action tracker ──
// Buckets applications that carry a `nextAction`/`nextActionAt` into
// overdue / today / upcoming / someday (no date), sorted soonest-first.
export function nextActionStats(applications = [], { now = new Date() } = {}) {
  const today = startOfDay(now);
  const items = [];
  let overdue = 0;
  let dueToday = 0;
  let upcoming = 0;
  let undated = 0;

  for (const app of applications) {
    if (!app) continue;
    const hasAction = Boolean((app.nextAction && String(app.nextAction).trim()) || app.nextActionAt);
    if (!hasAction) continue;
    const due = parseDateValue(app.nextActionAt);
    let daysUntil = null;
    let bucket = "someday";
    if (due) {
      daysUntil = Math.round((startOfDay(due).getTime() - today.getTime()) / 86400000);
      if (daysUntil < 0) {
        bucket = "overdue";
        overdue += 1;
      } else if (daysUntil === 0) {
        bucket = "today";
        dueToday += 1;
      } else {
        bucket = "upcoming";
        upcoming += 1;
      }
    } else {
      undated += 1;
    }
    items.push({
      id: app.id,
      company: app.company || "",
      role: app.role || "",
      status: app.status || "",
      action: (app.nextAction && String(app.nextAction).trim()) || "",
      date: app.nextActionAt || "",
      daysUntil,
      bucket,
    });
  }

  items.sort((a, b) => {
    const ax = a.daysUntil === null ? Infinity : a.daysUntil;
    const bx = b.daysUntil === null ? Infinity : b.daysUntil;
    if (ax !== bx) return ax - bx;
    return (a.company || "").localeCompare(b.company || "");
  });

  return {
    total: items.length,
    overdue,
    dueToday,
    upcoming,
    undated,
    actionable: overdue + dueToday,
    items,
  };
}

// ── Needs-attention feed (Dashboard pulse strip) ──
// One ranked list of everything that needs the user's hand today:
//   rank 0 — OAs not yet submitted (status Online Assessment, no oaCompletedAt)
//   rank 1 — Phone/Loop interviews coming up within `horizonDays`
//   rank 2 — next actions that are overdue or due today
// Each item: { id, kind: "oa"|"interview"|"action", label, company, role,
// date, daysUntil? }. One item per application (highest urgency wins).
export function buildAttentionItems(applications = [], { now = new Date(), horizonDays = 7 } = {}) {
  const items = [];
  for (const app of applications) {
    if (!app || app.status === "Rejected") continue;
    // A stage the user already marked as passed needs nothing from them —
    // the ball is in the company's court.
    if (app.stagePassedAt && app.stagePassedAt[app.status]) continue;
    if (app.status === "Online Assessment" && !app.oaCompletedAt) {
      const date = (app.stageDateTimes && app.stageDateTimes["Online Assessment"]) || "";
      items.push({
        id: app.id, kind: "oa", label: "OA to submit",
        company: app.company || "", role: app.role || "",
        date, daysUntil: date ? dayDiff(now, date) : null, rank: 0,
      });
      continue;
    }
    if (app.status === "Recruiter Screen" || app.status === "Interview") {
      const stamp = (app.stageDateTimes && app.stageDateTimes[app.status])
        || (app.status === "Interview" ? app.interviewDate : "") || "";
      const days = dayDiff(now, stamp);
      if (days !== null && days >= 0 && days <= horizonDays) {
        items.push({
          id: app.id, kind: "interview",
          label: app.status === "Interview" ? "Loop interview" : "Phone interview",
          company: app.company || "", role: app.role || "",
          date: stamp, daysUntil: days, rank: 1,
        });
      }
    }
  }

  const seen = new Set(items.map((item) => item.id));
  for (const item of nextActionStats(applications, { now }).items) {
    if (item.bucket !== "overdue" && item.bucket !== "today") continue;
    if (item.status === "Rejected" || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push({
      id: item.id, kind: "action", label: item.action || "Follow up",
      company: item.company, role: item.role,
      date: item.date, daysUntil: item.daysUntil, rank: 2,
    });
  }

  items.sort((a, b) =>
    a.rank - b.rank
    || (a.daysUntil ?? Infinity) - (b.daysUntil ?? Infinity)
    || a.company.localeCompare(b.company)
  );
  return items.map(({ rank, ...item }) => item);
}

// Short human label for a next-action due date relative to `now`.
export function formatNextActionDue(dateValue, now = new Date()) {
  const days = (() => {
    const due = parseDateValue(dateValue);
    if (!due) return null;
    return Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / 86400000);
  })();
  if (days === null) return "";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `in ${days}d`;
}

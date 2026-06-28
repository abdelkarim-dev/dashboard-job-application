import test from "node:test";
import assert from "node:assert/strict";

import {
  parseDateValue,
  parseTime,
  startOfDay,
  localDateString,
  dayDiff,
  getAppliedTimestamp,
  getRejectedTimestamp,
  everAdvanced,
  isStale,
  daysSinceCurrentStage,
  getCurrentStageTimestamp,
  STALE_THRESHOLD_DAYS,
  GHOST_THRESHOLD_DAYS,
  FOLLOWUP_FRESH_DAYS,
  daysWaiting,
  isGhosting,
  ageBand,
  waitingTier,
  NON_STALE_STATUSES,
  weeklyApplicationCounts,
  computeResponseStats,
  avgDaysToFirstResponse,
  nextActionStats,
  formatNextActionDue,
  buildAttentionItems,
} from "../src/lib/metrics.mjs";

// A fixed "now" so every relative-time assertion is deterministic.
const NOW = new Date("2026-05-31T12:00:00.000Z");

test("parseDateValue handles date-only, ISO, and bad input", () => {
  assert.equal(parseDateValue(""), null);
  assert.equal(parseDateValue("not-a-date"), null);
  const dateOnly = parseDateValue("2026-05-21");
  assert.equal(dateOnly.getFullYear(), 2026);
  assert.equal(dateOnly.getMonth(), 4); // 0-indexed May
  assert.equal(dateOnly.getDate(), 21);
  assert.ok(parseTime("2026-05-21") > 0);
  assert.equal(parseTime(""), 0);
});

test("localDateString and startOfDay normalize to local midnight", () => {
  const d = new Date("2026-05-21T23:30:00");
  assert.equal(localDateString(d), "2026-05-21");
  const start = startOfDay(d);
  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
});

test("dayDiff counts whole calendar days and tolerates bad input", () => {
  assert.equal(dayDiff("2026-05-20", "2026-05-25"), 5);
  assert.equal(dayDiff("2026-05-25", "2026-05-20"), -5);
  assert.equal(dayDiff("", "2026-05-25"), null);
});

test("getAppliedTimestamp and getRejectedTimestamp prefer precise fields", () => {
  assert.equal(
    getAppliedTimestamp({ appliedAt: "2026-05-21T10:00:00.000Z", dateApplied: "2026-05-01" }),
    "2026-05-21T10:00:00.000Z",
  );
  assert.equal(
    getAppliedTimestamp({ stageDateTimes: { Applied: "2026-05-02T00:00:00.000Z" } }),
    "2026-05-02T00:00:00.000Z",
  );
  assert.equal(getAppliedTimestamp({ dateApplied: "2026-05-01" }), "2026-05-01");
  assert.equal(getAppliedTimestamp(null), "");
  assert.equal(getRejectedTimestamp({ rejectedAt: "2026-05-22T00:00:00.000Z" }), "2026-05-22T00:00:00.000Z");
  assert.equal(getRejectedTimestamp({}), "");
});

test("everAdvanced detects current stage and historical stage records", () => {
  assert.equal(everAdvanced({ status: "Interview" }), true);
  assert.equal(everAdvanced({ status: "Applied" }), false);
  // Since-rejected app that once interviewed still counts as advanced.
  assert.equal(
    everAdvanced({ status: "Rejected", stageDateTimes: { Interview: "2026-05-10T00:00:00.000Z" } }),
    true,
  );
  assert.equal(everAdvanced({ status: "Rejected", stageDates: { "Online Assessment": "2026-05-10" } }), true);
  assert.equal(everAdvanced(null), false);
});

test("getCurrentStageTimestamp resolves the timestamp of the app's current stage", () => {
  const app = {
    status: "Interview",
    appliedAt: "2026-05-01T00:00:00.000Z",
    stageDateTimes: { Applied: "2026-05-01T00:00:00.000Z", Interview: "2026-05-10T00:00:00.000Z" },
  };
  assert.equal(getCurrentStageTimestamp(app), "2026-05-10T00:00:00.000Z");
  assert.equal(
    getCurrentStageTimestamp({ status: "Applied", appliedAt: "2026-05-01T00:00:00.000Z" }),
    "2026-05-01T00:00:00.000Z",
  );
  assert.equal(getCurrentStageTimestamp(null), "");
});

test("isStale matches the dashboard definition: active roles idle for the threshold", () => {
  assert.equal(STALE_THRESHOLD_DAYS, 10);
  assert.ok(NON_STALE_STATUSES.has("Offer") && NON_STALE_STATUSES.has("Rejected"));

  const stale = { status: "Applied", appliedAt: "2026-05-19T12:00:00" };
  assert.equal(isStale(stale, { now: NOW }), true);
  assert.equal(daysSinceCurrentStage(stale, NOW), 12);

  // A role at Interview that moved 12 days ago is ALSO stale — the old Analytics
  // logic (Applied-only) missed this; this regression test pins the fix.
  const staleInterview = {
    status: "Interview",
    appliedAt: "2026-04-01T12:00:00",
    stageDateTimes: { Interview: "2026-05-19T12:00:00" },
  };
  assert.equal(isStale(staleInterview, { now: NOW }), true);

  const fresh = { status: "Recruiter Screen", stageDateTimes: { "Recruiter Screen": "2026-05-29T12:00:00" } };
  assert.equal(isStale(fresh, { now: NOW }), false);

  assert.equal(isStale({ status: "Offer", appliedAt: "2026-01-01T12:00:00" }, { now: NOW }), false);
  assert.equal(isStale({ status: "Rejected", rejectedAt: "2026-01-01T12:00:00" }, { now: NOW }), false);
  assert.equal(isStale({ status: "Applied" }, { now: NOW }), false);
});

test("ghosting tier sits above stalled and spans every non-terminal stage", () => {
  assert.equal(GHOST_THRESHOLD_DAYS, 30);
  assert.equal(FOLLOWUP_FRESH_DAYS, 3);

  const active = { status: "Recruiter Screen", stageDateTimes: { "Recruiter Screen": "2026-05-29T12:00:00" } }; // 2d
  const stalled = { status: "Applied", appliedAt: "2026-05-19T12:00:00" };                                       // 12d
  const ghosted = { status: "Interview", appliedAt: "2026-03-01T12:00:00", stageDateTimes: { Interview: "2026-04-20T12:00:00" } }; // 41d

  assert.equal(ageBand(active, NOW), "active");
  assert.equal(ageBand(stalled, NOW), "stalled");
  assert.equal(ageBand(ghosted, NOW), "ghosting");
  assert.equal(ageBand({ status: "Offer", appliedAt: "2026-01-01T12:00:00" }, NOW), "terminal");

  assert.equal(isGhosting(ghosted, { now: NOW }), true);
  assert.equal(isGhosting(stalled, { now: NOW }), false, "12d is stalled, not ghosting");

  // Waiting beats ghosting: a passed-round app silent 40+ days stays in the hero,
  // it is never archived as ghosted.
  const waitingButOld = {
    status: "Interview",
    stageDateTimes: { Interview: "2026-04-20T12:00:00" },
    stagePassedAt: { Interview: "2026-04-20T12:00:00" },
  };
  assert.equal(isGhosting(waitingButOld, { now: NOW }), false);
});

test("staleness ages a process app from its round dates, not the application date", () => {
  // Applied long ago, but the next round is scheduled in the (near) future:
  // actively progressing, must NOT be stale/ghosted even though appliedAt is old.
  const procActive = {
    status: "Interview",
    appliedAt: "2026-01-01T12:00:00",
    processId: "p",
    processSteps: [{ id: "a", type: "recruiter" }, { id: "b", type: "loop" }],
    stepProgress: { a: { state: "done", completedAt: "2026-03-01T12:00:00" }, b: { state: "scheduled", scheduledAt: "2026-06-02T12:00:00" } },
  };
  assert.equal(isStale(procActive, { now: NOW }), false);
  assert.equal(isGhosting(procActive, { now: NOW }), false);
  assert.equal(ageBand(procActive, NOW), "active");

  // A process whose last activity was 90 days ago and nothing is scheduled IS cold.
  const procCold = {
    status: "Interview",
    appliedAt: "2026-01-01T12:00:00",
    processId: "p",
    processSteps: [{ id: "a", type: "recruiter" }, { id: "b", type: "loop" }],
    stepProgress: { a: { state: "done", completedAt: "2026-03-01T12:00:00" }, b: { state: "failed" } },
  };
  assert.equal(isGhosting(procCold, { now: NOW }), true);
});

test("Saved (never-applied) leads are never stalled or ghosted", () => {
  assert.ok(NON_STALE_STATUSES.has("Saved"));
  const saved = { status: "Saved", createdAt: "2026-01-01T12:00:00" };
  assert.equal(isStale(saved, { now: NOW }), false);
  assert.equal(isGhosting(saved, { now: NOW }), false);
  assert.equal(ageBand(saved, NOW), "terminal");
});

test("daysWaiting prefers the last passed round, then stagePassedAt, then current stage", () => {
  // (1) most-recent completed process leaf wins
  const proc = {
    status: "Interview",
    processId: "p",
    processSteps: [{ id: "a", type: "recruiter" }, { id: "b", type: "assessment" }],
    stepProgress: {
      a: { state: "done", completedAt: "2026-05-15T12:00:00" },
      b: { state: "done", completedAt: "2026-05-25T12:00:00" },
    },
  };
  assert.equal(daysWaiting(proc, NOW), 6);

  // (2) legacy per-stage flag, no process
  const flagged = { status: "Online Assessment", stagePassedAt: { "Online Assessment": "2026-05-21T12:00:00" } };
  assert.equal(daysWaiting(flagged, NOW), 10);

  // (3) fall back to the current-stage timestamp
  const plain = { status: "Recruiter Screen", stageDateTimes: { "Recruiter Screen": "2026-05-29T12:00:00" } };
  assert.equal(daysWaiting(plain, NOW), 2);
});

test("waitingTier nudge cadence boundaries land at 3 / 10 / 30 days", () => {
  const at = (days) => ({ status: "Online Assessment", stagePassedAt: { "Online Assessment": new Date(NOW.getTime() - days * 86400000).toISOString() } });
  assert.equal(waitingTier(at(1), NOW), "fresh");    // 0–3d held back
  assert.equal(waitingTier(at(3), NOW), "fresh");
  assert.equal(waitingTier(at(6), NOW), "nudge");    // 4–9d prime
  assert.equal(waitingTier(at(12), NOW), "overdue"); // 10–29d
  assert.equal(waitingTier(at(40), NOW), "cold");    // 30d+ going cold
});

test("weeklyApplicationCounts buckets recent applications and drops out-of-window ones", () => {
  // Use midday-local timestamps so bucket placement does not hinge on the
  // runner's timezone (the module buckets by local-midnight week boundaries).
  const apps = [
    { appliedAt: "2026-05-25T12:00:00" }, // within window
    { appliedAt: "2026-05-26T12:00:00" }, // within window
    { appliedAt: "2026-05-18T12:00:00" }, // within window
    { appliedAt: "2020-01-01T12:00:00" }, // far outside the window — ignored
  ];
  const weeks = weeklyApplicationCounts(apps, { weeks: 8, now: NOW });
  assert.equal(weeks.length, 8);
  // Buckets are ordered oldest → newest by weekStart.
  const sorted = [...weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  assert.deepEqual(weeks.map((w) => w.weekStart), sorted.map((w) => w.weekStart));
  // Three of the four applications fall inside the 8-week window; the 2020 one
  // is excluded regardless of timezone.
  const total = weeks.reduce((sum, w) => sum + w.count, 0);
  assert.equal(total, 3);
});

test("computeResponseStats splits advanced / rejected / waiting / ghosted", () => {
  const apps = [
    { status: "Interview", appliedAt: "2026-05-01T00:00:00.000Z" },                 // advanced
    { status: "Offer", appliedAt: "2026-05-02T00:00:00.000Z" },                     // advanced
    { status: "Rejected", appliedAt: "2026-05-03T00:00:00.000Z" },                  // rejected
    { status: "Applied", appliedAt: "2026-05-01T00:00:00.000Z" },                   // old → ghosted (>=14d)
    { status: "Applied", appliedAt: "2026-05-30T00:00:00.000Z" },                   // recent → waiting
  ];
  const stats = computeResponseStats(apps, { ghostDays: 14, now: NOW });
  assert.equal(stats.total, 5);
  assert.equal(stats.advanced, 2);
  assert.equal(stats.rejected, 1);
  assert.equal(stats.ghosted, 1);
  assert.equal(stats.waiting, 1);
  assert.equal(stats.heardBack, 3);
  assert.equal(stats.responseRate, 60); // 3/5
  assert.equal(stats.positiveRate, 40); // 2/5
});

test("computeResponseStats is safe on an empty list", () => {
  const stats = computeResponseStats([], { now: NOW });
  assert.equal(stats.total, 0);
  assert.equal(stats.responseRate, 0);
  assert.equal(stats.positiveRate, 0);
});

test("avgDaysToFirstResponse averages applied → first post-applied stage", () => {
  const apps = [
    {
      appliedAt: "2026-05-01T00:00:00.000Z",
      stageDateTimes: { Applied: "2026-05-01T00:00:00.000Z", "Online Assessment": "2026-05-06T00:00:00.000Z" },
    }, // 5 days
    {
      appliedAt: "2026-05-01T00:00:00.000Z",
      stageDateTimes: { Applied: "2026-05-01T00:00:00.000Z", Interview: "2026-05-04T00:00:00.000Z" },
    }, // 3 days
    { appliedAt: "2026-05-01T00:00:00.000Z", status: "Applied" }, // never advanced — excluded
  ];
  assert.equal(avgDaysToFirstResponse(apps), 4); // (5 + 3) / 2
  assert.equal(avgDaysToFirstResponse([]), null);
});

test("nextActionStats buckets overdue / today / upcoming / someday", () => {
  const apps = [
    { id: "a", company: "A", nextAction: "Follow up", nextActionAt: "2026-05-20" }, // overdue
    { id: "b", company: "B", nextAction: "Call", nextActionAt: "2026-05-31" },      // today
    { id: "c", company: "C", nextAction: "Email", nextActionAt: "2026-06-05" },     // upcoming
    { id: "d", company: "D", nextAction: "Someday task" },                          // undated
    { id: "e", company: "E" },                                                      // no action — ignored
  ];
  const stats = nextActionStats(apps, { now: NOW });
  assert.equal(stats.total, 4);
  assert.equal(stats.overdue, 1);
  assert.equal(stats.dueToday, 1);
  assert.equal(stats.upcoming, 1);
  assert.equal(stats.undated, 1);
  assert.equal(stats.actionable, 2); // overdue + dueToday
  // Sorted soonest-first, undated last.
  assert.deepEqual(stats.items.map((i) => i.id), ["a", "b", "c", "d"]);
});

test("formatNextActionDue renders relative labels", () => {
  assert.equal(formatNextActionDue("2026-05-20", NOW), "11d overdue");
  assert.equal(formatNextActionDue("2026-05-31", NOW), "due today");
  assert.equal(formatNextActionDue("2026-06-01", NOW), "due tomorrow");
  assert.equal(formatNextActionDue("2026-06-05", NOW), "in 5d");
  assert.equal(formatNextActionDue("", NOW), "");
});

test("buildAttentionItems surfaces pending OAs, upcoming interviews, and due actions", () => {
  const apps = [
    // Pending OA → rank 0, regardless of stage date
    { id: "oa1", company: "OaCo", role: "BE", status: "Online Assessment", stageDateTimes: { "Online Assessment": "2026-06-02" } },
    // Submitted OA → not surfaced
    { id: "oa2", company: "DoneCo", role: "BE", status: "Online Assessment", oaCompletedAt: "2026-05-30" },
    // Phone interview in 2 days → rank 1
    { id: "ph1", company: "PhoneCo", role: "BE", status: "Recruiter Screen", stageDateTimes: { "Recruiter Screen": "2026-06-02" } },
    // Loop interview beyond the 7-day horizon → not surfaced
    { id: "lp1", company: "FarCo", role: "BE", status: "Interview", stageDateTimes: { Interview: "2026-06-20" } },
    // Overdue next action → rank 2
    { id: "na1", company: "ActCo", role: "BE", status: "Applied", nextAction: "Ping recruiter", nextActionAt: "2026-05-29" },
    // Upcoming (not due) next action → not surfaced
    { id: "na2", company: "LaterCo", role: "BE", status: "Applied", nextAction: "Email", nextActionAt: "2026-06-05" },
    // Rejected apps never surface, even with due actions
    { id: "rj1", company: "RejCo", role: "BE", status: "Rejected", nextAction: "x", nextActionAt: "2026-05-29" },
  ];
  const items = buildAttentionItems(apps, { now: NOW });
  assert.deepEqual(items.map((i) => i.id), ["oa1", "ph1", "na1"]);
  assert.deepEqual(items.map((i) => i.kind), ["oa", "interview", "action"]);
  assert.equal(items[1].daysUntil, 2);
  assert.equal(items[2].label, "Ping recruiter");
});

test("buildAttentionItems skips stages already marked as passed", () => {
  const apps = [
    // OA marked passed (awaiting next step) → not surfaced even without oaCompletedAt
    { id: "p1", company: "A", role: "x", status: "Online Assessment", stagePassedAt: { "Online Assessment": "2026-05-30T12:00:00.000Z" } },
    // Upcoming loop already marked passed → not surfaced
    { id: "p2", company: "B", role: "x", status: "Interview", stagePassedAt: { Interview: "2026-05-30T12:00:00.000Z" }, stageDateTimes: { Interview: "2026-06-02" } },
    // A PRIOR stage marked passed doesn't suppress the current stage's items
    { id: "p3", company: "C", role: "x", status: "Recruiter Screen", stagePassedAt: { "Online Assessment": "2026-05-20T12:00:00.000Z" }, stageDateTimes: { "Recruiter Screen": "2026-06-03" } },
  ];
  const items = buildAttentionItems(apps, { now: NOW });
  assert.deepEqual(items.map((i) => i.id), ["p3"]);
});

test("buildAttentionItems dedupes per application, keeping the most urgent kind", () => {
  const apps = [
    // Pending OA that ALSO has an overdue next action → appears once, as OA
    { id: "both", company: "BothCo", role: "BE", status: "Online Assessment", nextAction: "Do the OA", nextActionAt: "2026-05-29" },
  ];
  const items = buildAttentionItems(apps, { now: NOW });
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, "oa");
});

test("buildAttentionItems sorts interviews soonest-first within rank", () => {
  const apps = [
    { id: "late", company: "B", role: "x", status: "Interview", stageDateTimes: { Interview: "2026-06-05" } },
    { id: "soon", company: "A", role: "x", status: "Recruiter Screen", stageDateTimes: { "Recruiter Screen": "2026-06-01" } },
  ];
  const items = buildAttentionItems(apps, { now: NOW });
  assert.deepEqual(items.map((i) => i.id), ["soon", "late"]);
});

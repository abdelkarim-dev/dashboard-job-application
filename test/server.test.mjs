import test from "node:test";
import assert from "node:assert/strict";

import {
  getLocalDateString,
  getStageDate,
  getStageTimestamp,
  migrateApplications,
  normalizeApplication,
  normalizeRoleCategory,
  simplifyStatus,
  toCsv,
} from "../server.mjs";

test("normalizeApplication stores precise applied timestamps", () => {
  const appliedAt = "2026-05-21T23:02:19.203Z";
  const app = normalizeApplication({
    company: " Hightouch ",
    role: " Developer Productivity Engineer ",
    status: "Applied",
    appliedAt,
    location: "Remote from Canada, US",
  });

  assert.equal(app.company, "Hightouch");
  assert.equal(app.role, "Developer Productivity Engineer");
  assert.equal(app.status, "Applied");
  assert.equal(app.appliedAt, appliedAt);
  assert.equal(app.dateApplied, "2026-05-21");
  assert.equal(app.stageDateTimes.Applied, appliedAt);
  assert.equal(app.stageDates.Applied, "2026-05-21");
});

test("normalizeApplication records rejectedAt separately when status changes to rejected", () => {
  const existing = normalizeApplication({
    id: "app-hightouch",
    company: "Hightouch",
    role: "Developer Productivity Engineer",
    status: "Applied",
    appliedAt: "2026-05-17T19:16:33.000Z",
  });

  const before = Date.now();
  const rejected = normalizeApplication({ id: existing.id, status: "Rejected" }, existing);
  const after = Date.now();
  const rejectedTime = Date.parse(rejected.rejectedAt);

  assert.equal(rejected.status, "Rejected");
  assert.ok(rejectedTime >= before && rejectedTime <= after);
  assert.equal(rejected.stageDateTimes.Rejected, rejected.rejectedAt);
  assert.equal(rejected.stageDates.Rejected, getLocalDateString(new Date(rejected.rejectedAt)));
  assert.equal(rejected.stageDateTimes.Applied, "2026-05-17T19:16:33.000Z");
});

test("normalizeApplication can clear a rejection timestamp when no longer rejected", () => {
  const existing = normalizeApplication({
    id: "app-example",
    company: "Example",
    role: "Backend Engineer",
    status: "Rejected",
    appliedAt: "2026-05-17T19:16:33.000Z",
    rejectedAt: "2026-05-20T12:08:17.508Z",
  });

  const reopened = normalizeApplication({ id: existing.id, status: "Interview", rejectedAt: "" }, existing);

  assert.equal(reopened.status, "Interview");
  assert.equal(reopened.rejectedAt, "");
  assert.equal(reopened.stageDateTimes.Rejected, undefined);
  assert.equal(reopened.stageDates.Rejected, undefined);
  assert.ok(reopened.stageDateTimes.Interview);
});

test("migrateApplications backfills timestamp fields for existing records", () => {
  const { applications, changed } = migrateApplications([
    {
      id: "app-old",
      company: "Alpaca",
      role: "Staff Site Reliability Engineer",
      status: "Rejected",
      dateApplied: "2026-05-18",
      stageDates: { Applied: "2026-05-18", Rejected: "2026-05-20" },
      createdAt: "2026-05-18T23:46:32.351Z",
      updatedAt: "2026-05-20T12:08:17.508Z",
    },
  ]);

  assert.equal(changed, true);
  assert.equal(applications[0].appliedAt, "2026-05-18T23:46:32.351Z");
  assert.equal(applications[0].rejectedAt, "2026-05-20T12:08:17.508Z");
  assert.equal(applications[0].stageDateTimes.Applied, "2026-05-18T23:46:32.351Z");
  assert.equal(applications[0].stageDateTimes.Rejected, "2026-05-20T12:08:17.508Z");
});

test("role category normalization maps legacy labels into canonical analytics categories", () => {
  assert.equal(normalizeRoleCategory("Platform/DevOps"), "Platform Engineering");
  assert.equal(normalizeRoleCategory("Data/Analytics"), "Data / AI / ML");
  assert.equal(normalizeRoleCategory("Developer Productivity"), "Developer Productivity");
  assert.equal(normalizeRoleCategory("Sales Engineering"), "Solutions / Customer Engineering");
});

test("CSV export includes full timestamp columns", () => {
  const app = normalizeApplication({
    company: "Asana",
    role: "Staff Software Engineer, API",
    status: "Rejected",
    appliedAt: "2026-05-20T18:30:00.000Z",
    rejectedAt: "2026-05-22T16:30:00.000Z",
  });
  const csv = toCsv([app]);

  assert.match(csv, /"Applied At"/);
  assert.match(csv, /"Rejected At"/);
  assert.match(csv, /"2026-05-20T18:30:00.000Z"/);
  assert.match(csv, /"2026-05-22T16:30:00.000Z"/);
  assert.equal(getStageTimestamp(app, "Rejected"), "2026-05-22T16:30:00.000Z");
  assert.equal(getStageDate(app, "Applied"), "2026-05-20");
});

test("simplifyStatus keeps dashboard status vocabulary small", () => {
  assert.equal(simplifyStatus("Recruiter Screen"), "Interview");
  assert.equal(simplifyStatus("withdrawn"), "Rejected");
  assert.equal(simplifyStatus("pending"), "Applied");
});

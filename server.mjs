// Facade — server.mjs stays at the repo root as the stable entry point and the
// test contract. The Express transport layer now lives in server/ (TypeScript),
// resolved at runtime by tsx (npm start / npm test):
//
//   server/config.ts     — port / role-category batch size (+ .env loading)
//   server/app.ts        — createApp() + startServer() + Express wiring
//   server/router.ts     — handleApi dispatch over the route modules
//   server/routes/*.ts   — one RouteHandler per domain (health, profile,
//                          applications, practice, solid, study-plans,
//                          learning, calendar, ai)
//
// This file re-exports startServer plus the pure domain helpers that
// test/server.test.mjs imports from "../server.mjs" — keep this block in sync
// with that test's import list (the symbols still live in lib/, unchanged).
import path from "node:path";
import { fileURLToPath } from "node:url";

import { startServer } from "./server/app.ts";

import { buildCalendarReviewEventPayload } from "./lib/domain/calendar.mjs";
import {
  buildPracticeStats,
  getDueProblems,
  markProblemFailed,
  markProblemSolved,
  nextReviewDate,
  normalizeCourseStore,
  normalizePracticeProblem,
  normalizePracticeStore,
  normalizeSystemDesignStore,
  recordProblemAttempt,
} from "./lib/domain/practice.mjs";
import {
  getStageDate,
  getStageTimestamp,
  migrateApplications,
  normalizeApplication,
  normalizeRoleCategory,
  normalizeStagePassedAt,
  sanitizeAutofillMappings,
  simplifyStatus,
  toCsv,
  toJson,
} from "./lib/domain/applications.mjs";
import { normalizeStudyPlan, normalizeStudyPlansStore } from "./lib/domain/studyPlans.mjs";
import { getLocalDateString } from "./lib/core/dates.mjs";
import { runJavaProblem } from "./lib/code-runner/java.mjs";
import { runPythonProblem } from "./lib/code-runner/python.mjs";
import { runSolidJavaExercise } from "./lib/code-runner/solid.mjs";

export {
  buildCalendarReviewEventPayload,
  buildPracticeStats,
  getLocalDateString,
  getDueProblems,
  getStageDate,
  getStageTimestamp,
  markProblemFailed,
  markProblemSolved,
  migrateApplications,
  normalizeApplication,
  normalizeCourseStore,
  normalizePracticeProblem,
  normalizePracticeStore,
  normalizeRoleCategory,
  normalizeStagePassedAt,
  normalizeStudyPlan,
  normalizeStudyPlansStore,
  normalizeSystemDesignStore,
  nextReviewDate,
  recordProblemAttempt,
  runJavaProblem,
  runPythonProblem,
  runSolidJavaExercise,
  sanitizeAutofillMappings,
  simplifyStatus,
  startServer,
  toCsv,
  toJson,
};

// Boot only when run directly (tsx server.mjs), never when imported by a test.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startServer();
}

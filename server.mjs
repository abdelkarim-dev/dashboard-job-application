import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  initDatabase,
  sqlLoadCvMeta,
  sqlLoadCv,
  sqlSaveCv,
  sqlDeleteCv,
  sqlLoadSetting,
  sqlSaveSetting,
} from "./database.mjs";
import {
  analyzeSkillsWithLocalGemma,
  askLearnTutorWithLocalGemma,
  autofillWithLocalGemma,
  categorizeWithLocalGemma,
  evaluateWithLocalGemma,
  extractWithLocalGemma,
  gemmaStatus,
  generateAnswerWithLocalGemma,
} from "./lib/gemma.mjs";
import {
  deleteApplication,
  googleCalendarTokenFile,
  loadApplications,
  loadCoursesStore,
  loadPracticeStore,
  loadStudyPlansStore,
  loadSystemDesignStore,
  saveApplications,
  saveCoursesStore,
  savePracticeStore,
  saveStudyPlansStore,
  saveSystemDesignStore,
  writeJsonFile,
} from "./lib/data/storage.mjs";
import { runSolidJavaExercise } from "./lib/code-runner/solid.mjs";
import { runJavaProblem } from "./lib/code-runner/java.mjs";
import { runPythonProblem } from "./lib/code-runner/python.mjs";

import { buildCalendarReviewEventPayload, buildIcsReviewEvent } from "./lib/domain/calendar.mjs";
import {
  buildPracticeStats,
  getDueProblems,
  markProblemFailed,
  markProblemSolved,
  mergeSeededPracticeProblems,
  nextReviewDate,
  normalizeCourseItem,
  normalizeCourseStore,
  normalizePracticeProblem,
  normalizePracticeStore,
  normalizeSystemDesignStore,
  normalizeSystemDesignTopic,
  recordProblemAttempt,
} from "./lib/domain/practice.mjs";
import { loadProfile, saveProfile } from "./lib/domain/profile.mjs";
import {
  getStageDate,
  getStageTimestamp,
  inferCompanyFromSourceUrl,
  migrateApplications,
  normalizeApplication,
  normalizeRoleCategory,
  normalizeStagePassedAt,
  sanitizeAutofillMappings,
  sanitizeJobIdentityValue,
  simplifyStatus,
  toCsv,
  toJson,
} from "./lib/domain/applications.mjs";
import { makeStarterCode, normalizePracticeLanguage } from "./lib/domain/problems.mjs";
import { normalizeStudyPlan, normalizeStudyPlansStore } from "./lib/domain/studyPlans.mjs";

import { readBody, send, sendJson } from "./lib/core/http.mjs";
import { cleanStageDate, getLocalDateString } from "./lib/core/dates.mjs";
import { clean } from "./lib/core/util.mjs";
import { createApiSecurityMiddleware, isLocalCodeRunnerEnabled } from "./lib/core/security.mjs";

// Load a local .env (Node 20.12+) so flags like CLAIRE_ENABLE_CODE_RUNNER can live
// in a file at the repo root. Shell-provided env vars still work without one; a
// missing .env is ignored.
try {
  process.loadEnvFile();
} catch {}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const aceDir = path.join(__dirname, "node_modules", "ace-builds", "src-min-noconflict");
const port = Number(process.env.PORT || process.argv[2] || 8787);
const configuredRoleCategoryBatchSize = Number(process.env.ROLE_CATEGORY_BATCH_SIZE || 10);
const roleCategoryBatchSize = Number.isFinite(configuredRoleCategoryBatchSize) && configuredRoleCategoryBatchSize > 0
  ? Math.floor(configuredRoleCategoryBatchSize)
  : 10;
async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") return send(res, 204, "");

  if (url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, app: "Claire" });
  }

  if (url.pathname === "/api/profile" && req.method === "GET") {
    return sendJson(res, 200, await loadProfile());
  }

  if (url.pathname === "/api/profile" && req.method === "POST") {
    const input = await readBody(req);
    await saveProfile(input);
    return sendJson(res, 200, { ok: true });
  }

  // CV file endpoints — stored separately from the main profile row
  if (url.pathname === "/api/profile/cv" && req.method === "GET") {
    return sendJson(res, 200, await sqlLoadCvMeta());
  }

  const cvVariantMatch = url.pathname.match(/^\/api\/profile\/cv\/(backend|architect)$/);
  if (cvVariantMatch) {
    const variant = cvVariantMatch[1];
    if (req.method === "GET") {
      const row = await sqlLoadCv(variant);
      if (!row) return sendJson(res, 404, { error: "No CV uploaded for this variant" });
      return sendJson(res, 200, { variant: row.variant, fileName: row.fileName, mimeType: row.mimeType, data: row.data, uploadedAt: row.uploadedAt });
    }
    if (req.method === "POST") {
      const input = await readBody(req);
      const { fileName, mimeType, data } = input || {};
      if (!fileName || !mimeType || !data) return sendJson(res, 400, { error: "fileName, mimeType and data are required" });
      await sqlSaveCv(variant, fileName, mimeType, data);
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === "DELETE") {
      await sqlDeleteCv(variant);
      return sendJson(res, 200, { ok: true });
    }
  }

  if (url.pathname === "/api/skill-analysis" && req.method === "GET") {
    const value = await sqlLoadSetting("skill_analysis");
    if (value) {
      try {
        return sendJson(res, 200, JSON.parse(value));
      } catch {}
    }
    return sendJson(res, 200, { cached: false });
  }

  if (url.pathname === "/api/analyze-skills" && req.method === "POST") {
    const result = await analyzeSkillsWithLocalGemma();
    if (result.ok) {
      await sqlSaveSetting("skill_analysis", JSON.stringify(result));
    }
    return sendJson(res, gemmaStatus(result), result);
  }

  if (url.pathname === "/api/applications" && req.method === "GET") {
    return sendJson(res, 200, await loadApplications());
  }

  if (url.pathname === "/api/applications" && req.method === "POST") {
    const input = await readBody(req);
    const applications = await loadApplications();
    const inputSourceUrl = clean(input.sourceUrl);
    const inputCompany = (sanitizeJobIdentityValue(input.company) || inferCompanyFromSourceUrl(inputSourceUrl)).toLowerCase();
    const inputRole = sanitizeJobIdentityValue(input.role).toLowerCase();
    const duplicate = applications.find((app) => {
      const sameUrl = inputSourceUrl && app.sourceUrl && app.sourceUrl === inputSourceUrl;
      // Only treat company+role as a match when BOTH are present. Otherwise two
      // unrelated captures with blank fields (e.g. a page the extractor couldn't
      // read) collapse onto the same row, and saves silently overwrite instead of
      // creating — the "it said done but nothing appeared" bug.
      const sameRole =
        inputCompany && inputRole &&
        clean(app.company).toLowerCase() === inputCompany &&
        clean(app.role).toLowerCase() === inputRole;
      return sameUrl || sameRole;
    });
    const app = normalizeApplication(input, duplicate || {});
    const next = duplicate
      ? applications.map((item) => (item.id === duplicate.id ? app : item))
      : [app, ...applications];
    await saveApplications(next);
    return sendJson(res, duplicate ? 200 : 201, app);
  }

  const solidJavaExerciseMatch = url.pathname.match(/^\/api\/solid-java\/exercises\/([^/]+)\/run$/);
  if (solidJavaExerciseMatch && req.method === "POST") {
    if (!isLocalCodeRunnerEnabled()) {
      return sendJson(res, 403, { error: "Local code runner is disabled. Set CLAIRE_ENABLE_CODE_RUNNER=1 to enable it for trusted local use." });
    }
    const exerciseId = decodeURIComponent(solidJavaExerciseMatch[1]);
    const input = await readBody(req);
    const result = await runSolidJavaExercise(exerciseId, input.code);
    return sendJson(res, 200, result);
  }

  if (url.pathname === "/api/practice" && req.method === "GET") {
    const store = await loadPracticeStore();
    return sendJson(res, 200, {
      ...store,
      stats: buildPracticeStats(store),
      due: getDueProblems(store),
    });
  }

  if (url.pathname === "/api/practice/problems" && req.method === "GET") {
    const store = await loadPracticeStore();
    return sendJson(res, 200, store.problems);
  }

  if (url.pathname === "/api/practice/problems" && req.method === "POST") {
    const input = await readBody(req);
    const store = await loadPracticeStore();
    const problem = normalizePracticeProblem(input);
    const withoutDuplicate = store.problems.filter((item) => item.id !== problem.id && item.slug !== problem.slug);
    store.problems = [problem, ...withoutDuplicate];
    await savePracticeStore(store);
    return sendJson(res, 201, problem);
  }

  if (url.pathname === "/api/practice/reviews/due" && req.method === "GET") {
    const store = await loadPracticeStore();
    const date = cleanStageDate(url.searchParams.get("date")) || getLocalDateString(new Date());
    return sendJson(res, 200, getDueProblems(store, date));
  }

  if (url.pathname === "/api/practice/stats" && req.method === "GET") {
    const store = await loadPracticeStore();
    const date = cleanStageDate(url.searchParams.get("date")) || getLocalDateString(new Date());
    return sendJson(res, 200, buildPracticeStats(store, date));
  }

  if (url.pathname === "/api/practice/sync-leetcode-bank" && req.method === "POST") {
    const store = await loadPracticeStore();
    const merged = mergeSeededPracticeProblems(store);
    await savePracticeStore(merged.store);
    return sendJson(res, 200, {
      ok: true,
      added: merged.added,
      totalProblems: merged.store.problems.length,
      syncedAt: new Date().toISOString(),
    });
  }

  // Study plans — curated, ordered lists of bank problems to train on as a flow.
  if (url.pathname === "/api/practice/plans" && req.method === "GET") {
    const store = await loadStudyPlansStore();
    return sendJson(res, 200, store);
  }

  if (url.pathname === "/api/practice/plans" && req.method === "POST") {
    const input = await readBody(req);
    const store = await loadStudyPlansStore();
    const plan = normalizeStudyPlan(input);
    store.plans = [plan, ...store.plans.filter((existing) => existing.id !== plan.id)];
    const saved = await saveStudyPlansStore(store);
    return sendJson(res, 201, saved.plans.find((existing) => existing.id === plan.id) || plan);
  }

  const studyPlanMatch = url.pathname.match(/^\/api\/practice\/plans\/([^/]+)$/);
  if (studyPlanMatch) {
    const id = decodeURIComponent(studyPlanMatch[1]);
    const store = await loadStudyPlansStore();
    const index = store.plans.findIndex((plan) => plan.id === id);
    if (index < 0) return sendJson(res, 404, { error: "Study plan not found" });
    if (req.method === "PUT") {
      const input = await readBody(req);
      const updated = normalizeStudyPlan({ ...input, id }, store.plans[index]);
      store.plans[index] = updated;
      await saveStudyPlansStore(store);
      return sendJson(res, 200, updated);
    }
    if (req.method === "DELETE") {
      store.plans.splice(index, 1);
      await saveStudyPlansStore(store);
      return sendJson(res, 200, { ok: true });
    }
  }

  const practiceProblemMatch = url.pathname.match(/^\/api\/practice\/problems\/([^/]+)(?:\/(run|attempts|mark-solved|mark-failed))?$/);
  if (practiceProblemMatch) {
    const id = decodeURIComponent(practiceProblemMatch[1]);
    const action = practiceProblemMatch[2] || "";
    const store = await loadPracticeStore();
    const index = store.problems.findIndex((problem) => problem.id === id);
    if (index < 0) return sendJson(res, 404, { error: "Problem not found" });
    const existing = store.problems[index];

    if (!action && req.method === "GET") {
      return sendJson(res, 200, existing);
    }

    if (!action && req.method === "PUT") {
      const input = await readBody(req);
      const updated = normalizePracticeProblem({ ...input, id }, existing);
      store.problems[index] = updated;
      await savePracticeStore(store);
      return sendJson(res, 200, updated);
    }

    if (!action && req.method === "DELETE") {
      store.problems.splice(index, 1);
      await savePracticeStore(store);
      return sendJson(res, 200, { ok: true });
    }

    if (action === "run" && req.method === "POST") {
      if (!isLocalCodeRunnerEnabled()) {
        return sendJson(res, 403, { error: "Local code runner is disabled. Set CLAIRE_ENABLE_CODE_RUNNER=1 to enable it for trusted local use." });
      }
      const input = await readBody(req);
      const language = normalizePracticeLanguage(input.language);
      const existingDraft = existing.languageDrafts?.[language]
        ?? (language === "python" ? existing.draft : makeStarterCode(existing, "java"))
        ?? "";
      const code = String(input.code ?? existingDraft ?? "");
      const runnable = normalizePracticeProblem({
        ...existing,
        language,
        draft: code,
        solutionRevealed: input.solutionRevealed,
        customTests: Array.isArray(input.customTests) ? input.customTests : existing.customTests,
        methodName: input.methodName ?? existing.methodName,
      });
      const result = language === "java"
        ? await runJavaProblem(runnable, code)
        : await runPythonProblem(runnable, code);
      const updated = recordProblemAttempt(runnable, {
        source: "runner",
        language,
        passed: result.ok && result.total > 0 && result.passed === result.total,
        passedTests: result.passed || 0,
        totalTests: result.total || 0,
        timeSpentMinutes: input.timeSpentMinutes || 0,
        notes: input.notes || result.error || "",
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        error: result.error || "",
        draft: code,
        solutionRevealed: input.solutionRevealed,
      });
      store.problems[index] = updated;
      await savePracticeStore(store);
      return sendJson(res, 200, { ...result, problem: updated });
    }

    if (action === "attempts" && req.method === "POST") {
      const input = await readBody(req);
      const updated = recordProblemAttempt(existing, input);
      store.problems[index] = updated;
      await savePracticeStore(store);
      return sendJson(res, 201, updated);
    }

    if (action === "mark-solved" && req.method === "POST") {
      const input = await readBody(req);
      const base = input.draft !== undefined
        ? normalizePracticeProblem({ ...existing, language: input.language, draft: input.draft, solutionRevealed: input.solutionRevealed })
        : existing;
      const updated = markProblemSolved(base, input);
      store.problems[index] = updated;
      await savePracticeStore(store);
      return sendJson(res, 200, updated);
    }

    if (action === "mark-failed" && req.method === "POST") {
      const input = await readBody(req);
      const base = input.draft !== undefined
        ? normalizePracticeProblem({ ...existing, language: input.language, draft: input.draft, solutionRevealed: input.solutionRevealed })
        : existing;
      const updated = markProblemFailed(base, input);
      store.problems[index] = updated;
      await savePracticeStore(store);
      return sendJson(res, 200, updated);
    }
  }

  if (url.pathname === "/api/learning/courses" && req.method === "GET") {
    return sendJson(res, 200, await loadCoursesStore());
  }

  if (url.pathname === "/api/learning/courses" && req.method === "POST") {
    const input = await readBody(req);
    const store = await loadCoursesStore();
    const item = normalizeCourseItem(input);
    store.items = [item, ...store.items.filter((existing) => existing.id !== item.id)];
    await saveCoursesStore(store);
    return sendJson(res, 201, item);
  }

  const courseMatch = url.pathname.match(/^\/api\/learning\/courses\/([^/]+)$/);
  if (courseMatch) {
    const id = decodeURIComponent(courseMatch[1]);
    const store = await loadCoursesStore();
    const index = store.items.findIndex((item) => item.id === id);
    if (index < 0) return sendJson(res, 404, { error: "Course not found" });
    if (req.method === "PUT") {
      const input = await readBody(req);
      const updated = normalizeCourseItem({ ...store.items[index], ...input, id });
      store.items[index] = updated;
      await saveCoursesStore(store);
      return sendJson(res, 200, updated);
    }
    if (req.method === "DELETE") {
      store.items.splice(index, 1);
      await saveCoursesStore(store);
      return sendJson(res, 200, { ok: true });
    }
  }

  if (url.pathname === "/api/learning/system-design" && req.method === "GET") {
    return sendJson(res, 200, await loadSystemDesignStore());
  }

  if (url.pathname === "/api/learning/system-design" && req.method === "POST") {
    const input = await readBody(req);
    const store = await loadSystemDesignStore();
    const topic = normalizeSystemDesignTopic(input);
    store.topics = [topic, ...store.topics.filter((existing) => existing.id !== topic.id)];
    await saveSystemDesignStore(store);
    return sendJson(res, 201, topic);
  }

  const systemDesignMatch = url.pathname.match(/^\/api\/learning\/system-design\/([^/]+)$/);
  if (systemDesignMatch) {
    const id = decodeURIComponent(systemDesignMatch[1]);
    const store = await loadSystemDesignStore();
    const index = store.topics.findIndex((topic) => topic.id === id);
    if (index < 0) return sendJson(res, 404, { error: "System design topic not found" });
    if (req.method === "PUT") {
      const input = await readBody(req);
      const updated = normalizeSystemDesignTopic({ ...store.topics[index], ...input, id });
      store.topics[index] = updated;
      await saveSystemDesignStore(store);
      return sendJson(res, 200, updated);
    }
    if (req.method === "DELETE") {
      store.topics.splice(index, 1);
      await saveSystemDesignStore(store);
      return sendJson(res, 200, { ok: true });
    }
  }

  if (url.pathname === "/api/calendar/status" && req.method === "GET") {
    let hasLocalToken = false;
    try {
      await readFile(googleCalendarTokenFile, "utf8");
      hasLocalToken = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    return sendJson(res, 200, {
      configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      hasLocalToken,
      fallback: "in-app reminders",
    });
  }

  if (url.pathname === "/api/calendar/auth-url" && req.method === "GET") {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    if (!clientId || !clientSecret) {
      return sendJson(res, 200, {
        configured: false,
        error: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google Calendar OAuth.",
      });
    }
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://127.0.0.1:${port}/api/calendar/oauth/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: "https://www.googleapis.com/auth/calendar.events",
    });
    return sendJson(res, 200, {
      configured: true,
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      redirectUri,
    });
  }

  if (url.pathname === "/api/calendar/oauth/callback" && req.method === "GET") {
    const code = clean(url.searchParams.get("code"));
    if (!code) return sendJson(res, 400, { error: "Missing OAuth code." });
    await writeJsonFile(googleCalendarTokenFile, {
      code,
      savedAt: new Date().toISOString(),
      note: "Local-only placeholder. Exchange this code for tokens before enabling live Calendar writes.",
    });
    return sendJson(res, 200, {
      ok: true,
      message: "OAuth code saved locally. Live token exchange is intentionally left disabled until credentials are configured.",
    });
  }

  if (url.pathname === "/api/calendar/sync-reviews" && req.method === "POST") {
    const input = await readBody(req);
    const store = await loadPracticeStore();
    const date = cleanStageDate(input.date) || getLocalDateString(new Date());
    const payload = buildCalendarReviewEventPayload(store, date, input.settings || {});
    const status = {
      configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    };
    return sendJson(res, 200, {
      ok: true,
      configured: false,
      fallback: status.configured
        ? "Calendar credentials detected, but live writes are disabled in this local-only v1. Review the payload before enabling."
        : "Google Calendar credentials are missing, so the in-app due queue remains the reminder.",
      payload,
    });
  }

  if (url.pathname === "/api/calendar/reviews.ics" && req.method === "GET") {
    const store = await loadPracticeStore();
    const date = cleanStageDate(url.searchParams.get("date")) || getLocalDateString(new Date());
    const payload = buildCalendarReviewEventPayload(store, date, {});
    return send(res, 200, buildIcsReviewEvent(payload), {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leetcode-review.ics"',
    });
  }

  if (url.pathname === "/api/extract-ai" && req.method === "POST") {
    const input = await readBody(req);
    const result = await extractWithLocalGemma(input);
    return sendJson(res, gemmaStatus(result), result);
  } else if (req.method === "POST" && url.pathname === "/api/categorize-titles") {
    try {
      const input = await readBody(req);
      const apps = await loadApplications();
      const force = input.force !== false;
      const appsToCategorize = apps.filter((app) => app.role && (force || !app.group));

      if (appsToCategorize.length > 0) {
        const mappings = {};
        for (let i = 0; i < appsToCategorize.length; i += roleCategoryBatchSize) {
          const batch = appsToCategorize.slice(i, i + roleCategoryBatchSize);
          const aiResult = await categorizeWithLocalGemma(batch);
          if (!aiResult.ok) break;
          Object.assign(mappings, aiResult.mappings || {});
        }

        let updated = false;
        const categorizedAt = new Date().toISOString();
        apps.forEach((a) => {
          const category = mappings[a.id];
          if (category && (force || !a.group || a.group !== category)) {
            a.group = category;
            a.groupSource = "Gemma";
            a.groupUpdatedAt = categorizedAt;
            a.updatedAt = categorizedAt;
            updated = true;
          }
        });
        if (updated) {
          await saveApplications(apps);
        }
      }
      return sendJson(res, 200, apps);
    } catch (error) {
      return sendJson(res, 500, { error: String(error) });
    }
  }

  if (url.pathname === "/api/evaluate-job" && req.method === "POST") {
    const input = await readBody(req);
    const result = await evaluateWithLocalGemma(input);
    return sendJson(res, gemmaStatus(result), result);
  }

  if (url.pathname === "/api/generate-answer" && req.method === "POST") {
    const input = await readBody(req);
    const result = await generateAnswerWithLocalGemma(input);
    return sendJson(res, gemmaStatus(result), result);
  }

  if (url.pathname === "/api/learn-ask" && req.method === "POST") {
    const input = await readBody(req);
    const result = await askLearnTutorWithLocalGemma(input);
    return sendJson(res, gemmaStatus(result), result);
  }

  if (url.pathname === "/api/autofill-ai" && req.method === "POST") {
    const input = await readBody(req);
    const result = await autofillWithLocalGemma(input);
    // Scrub placeholder URLs at the boundary too: the in-memory Gemma cache can
    // hold entries produced before the in-producer scrub existed (long-lived
    // server process), and those must never reach the form.
    if (result && result.mappings) result.mappings = sanitizeAutofillMappings(result.mappings);
    return sendJson(res, gemmaStatus(result), result);
  }

  const match = url.pathname.match(/^\/api\/applications\/([^/]+)$/);
  if (match && req.method === "PUT") {
    const id = decodeURIComponent(match[1]);
    const input = await readBody(req);
    const applications = await loadApplications();
    const existing = applications.find((app) => app.id === id);
    if (!existing) return sendJson(res, 404, { error: "Application not found" });
    const app = normalizeApplication({ ...input, id }, existing);
    await saveApplications(applications.map((item) => (item.id === id ? app : item)));
    return sendJson(res, 200, app);
  }

  if (match && req.method === "DELETE") {
    const id = decodeURIComponent(match[1]);
    await deleteApplication(id);
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === "/api/export.csv" && req.method === "GET") {
    const csv = toCsv(await loadApplications());
    // Prepend a UTF-8 BOM so Excel auto-detects the encoding and renders accented
    // characters / non-ASCII company names correctly instead of mojibake.
    const stamp = getLocalDateString(new Date());
    return send(res, 200, `﻿${csv}`, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-applications-${stamp}.csv"`,
    });
  }

  if (url.pathname === "/api/export.json" && req.method === "GET") {
    const json = toJson(await loadApplications());
    const stamp = getLocalDateString(new Date());
    return send(res, 200, json, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-applications-${stamp}.json"`,
    });
  }

  return sendJson(res, 404, { error: "Not found" });
}

const app = express();

app.use("/api", createApiSecurityMiddleware({ port }));
app.use(express.json({ limit: "10mb" }));

// Express static serving
app.use("/vendor/ace", express.static(aceDir));
app.use(express.static(path.join(__dirname, "dist")));

// API handler
app.use("/api", async (req, res, next) => {
  try {
    const url = new URL(req.originalUrl || req.url, `http://${req.headers.host || "127.0.0.1"}`);
    await handleApi(req, res, url);
  } catch (error) {
    next(error);
  }
});

// Single Page App wildcard fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  const status = err.status || err.statusCode || 500;
  const message = status === 413 ? "Request body too large" : "Server error";
  sendJson(res, status, { error: message });
});

let serverInstance = null;
async function startServer(listenPort = port) {
  await initDatabase();
  serverInstance = app.listen(listenPort, "127.0.0.1", () => {
    const actual = serverInstance.address()?.port ?? listenPort;
    console.log(`Claire (job hunt copilot) running at http://127.0.0.1:${actual}`);
  });
  return serverInstance;
}

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

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startServer();
}

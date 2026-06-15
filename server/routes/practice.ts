import { loadPracticeStore, savePracticeStore } from "../../lib/data/storage.mjs";
import {
  buildPracticeStats,
  getDueProblems,
  normalizePracticeProblem,
  mergeSeededPracticeProblems,
  recordProblemAttempt,
  markProblemSolved,
  markProblemFailed,
} from "../../lib/domain/practice.mjs";
import { makeStarterCode, normalizePracticeLanguage } from "../../lib/domain/problems.mjs";
import { runJavaProblem } from "../../lib/code-runner/java.mjs";
import { runPythonProblem } from "../../lib/code-runner/python.mjs";
import { isLocalCodeRunnerEnabled } from "../../lib/core/security.mjs";
import { cleanStageDate, getLocalDateString } from "../../lib/core/dates.mjs";
import { readBody, sendJson } from "../../lib/core/http.mjs";
import type { RouteHandler } from "../types";

export const practiceRoutes: RouteHandler = async (req, res, url) => {
  if (url.pathname === "/api/practice" && req.method === "GET") {
    const store = await loadPracticeStore();
    sendJson(res, 200, {
      ...store,
      stats: buildPracticeStats(store),
      due: getDueProblems(store),
    });
    return true;
  }

  if (url.pathname === "/api/practice/problems" && req.method === "GET") {
    const store = await loadPracticeStore();
    sendJson(res, 200, store.problems);
    return true;
  }

  if (url.pathname === "/api/practice/problems" && req.method === "POST") {
    const input = await readBody(req);
    const store = await loadPracticeStore();
    const problem = normalizePracticeProblem(input);
    const withoutDuplicate = store.problems.filter((item: any) => item.id !== problem.id && item.slug !== problem.slug);
    store.problems = [problem, ...withoutDuplicate];
    await savePracticeStore(store);
    sendJson(res, 201, problem);
    return true;
  }

  if (url.pathname === "/api/practice/reviews/due" && req.method === "GET") {
    const store = await loadPracticeStore();
    const date = cleanStageDate(url.searchParams.get("date")) || getLocalDateString(new Date());
    sendJson(res, 200, getDueProblems(store, date));
    return true;
  }

  if (url.pathname === "/api/practice/stats" && req.method === "GET") {
    const store = await loadPracticeStore();
    const date = cleanStageDate(url.searchParams.get("date")) || getLocalDateString(new Date());
    sendJson(res, 200, buildPracticeStats(store, date));
    return true;
  }

  if (url.pathname === "/api/practice/sync-leetcode-bank" && req.method === "POST") {
    const store = await loadPracticeStore();
    const merged = mergeSeededPracticeProblems(store);
    await savePracticeStore(merged.store);
    sendJson(res, 200, {
      ok: true,
      added: merged.added,
      totalProblems: merged.store.problems.length,
      syncedAt: new Date().toISOString(),
    });
    return true;
  }

  const practiceProblemMatch = url.pathname.match(/^\/api\/practice\/problems\/([^/]+)(?:\/(run|attempts|mark-solved|mark-failed))?$/);
  if (practiceProblemMatch) {
    const id = decodeURIComponent(practiceProblemMatch[1]!);
    const action = practiceProblemMatch[2] || "";
    const store = await loadPracticeStore();
    const index = store.problems.findIndex((problem: any) => problem.id === id);
    if (index < 0) {
      sendJson(res, 404, { error: "Problem not found" });
      return true;
    }
    const existing = store.problems[index];

    if (!action && req.method === "GET") {
      sendJson(res, 200, existing);
      return true;
    }

    if (!action && req.method === "PUT") {
      const input = await readBody(req);
      const updated = normalizePracticeProblem({ ...input, id }, existing);
      store.problems[index] = updated;
      await savePracticeStore(store);
      sendJson(res, 200, updated);
      return true;
    }

    if (!action && req.method === "DELETE") {
      store.problems.splice(index, 1);
      await savePracticeStore(store);
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (action === "run" && req.method === "POST") {
      if (!isLocalCodeRunnerEnabled()) {
        sendJson(res, 403, { error: "Local code runner is disabled. Set CLAIRE_ENABLE_CODE_RUNNER=1 to enable it for trusted local use." });
        return true;
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
      sendJson(res, 200, { ...result, problem: updated });
      return true;
    }

    if (action === "attempts" && req.method === "POST") {
      const input = await readBody(req);
      const updated = recordProblemAttempt(existing, input);
      store.problems[index] = updated;
      await savePracticeStore(store);
      sendJson(res, 201, updated);
      return true;
    }

    if (action === "mark-solved" && req.method === "POST") {
      const input = await readBody(req);
      const base = input.draft !== undefined
        ? normalizePracticeProblem({ ...existing, language: input.language, draft: input.draft, solutionRevealed: input.solutionRevealed })
        : existing;
      const updated = markProblemSolved(base, input);
      store.problems[index] = updated;
      await savePracticeStore(store);
      sendJson(res, 200, updated);
      return true;
    }

    if (action === "mark-failed" && req.method === "POST") {
      const input = await readBody(req);
      const base = input.draft !== undefined
        ? normalizePracticeProblem({ ...existing, language: input.language, draft: input.draft, solutionRevealed: input.solutionRevealed })
        : existing;
      const updated = markProblemFailed(base, input);
      store.problems[index] = updated;
      await savePracticeStore(store);
      sendJson(res, 200, updated);
      return true;
    }
  }

  return false;
};

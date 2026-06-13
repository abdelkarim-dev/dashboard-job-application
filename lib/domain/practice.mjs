// Practice + learning domain logic: store/problem/course/system-design
// normalization, attempt recording, spaced-repetition scheduling and stats.
import { cleanStageDate, cleanTimestamp, getLocalDateString } from "../core/dates.mjs";
import { choice, clampInt, clean, isPlaceholderSolutionCode, normalizeOptionalNumber, slugify, stringList } from "../core/util.mjs";
import { defaultCoursesStore, defaultPracticeProblemById, defaultPracticeProblems, defaultPracticeStore, defaultSystemDesignStore, getCompanyTagsForProblem, javaPracticeSolutions, makeStarterCode, normalizePracticeLanguage, supplementalPracticeTests } from "./problems.mjs";

const LEARNING_REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

function normalizePracticeStore(input = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const settings = {
    ...defaultPracticeStore.settings,
    ...(source.settings && typeof source.settings === "object" && !Array.isArray(source.settings) ? source.settings : {}),
  };
  const rawProblems = Array.isArray(source.problems) ? source.problems : defaultPracticeProblems;
  const seen = new Set();
  const problems = rawProblems
    .map((problem) => normalizePracticeProblem(problem))
    .filter((problem) => {
      if (seen.has(problem.id)) return false;
      seen.add(problem.id);
      return true;
    });
  return { version: 1, settings, problems };
}

function normalizePracticeLanguageDrafts(value = {}) {
  let source = value;
  if (typeof value === "string") {
    try {
      source = JSON.parse(value);
    } catch {
      source = {};
    }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const drafts = {};
  for (const [key, draft] of Object.entries(source)) {
    const language = normalizePracticeLanguage(key);
    if (draft !== undefined && draft !== null) drafts[language] = String(draft);
  }
  return drafts;
}

function normalizePracticeLanguageCodeMap(value = {}) {
  let source = value;
  if (typeof value === "string") {
    try {
      source = JSON.parse(value);
    } catch {
      source = {};
    }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const codeByLanguage = {};
  for (const [key, code] of Object.entries(source)) {
    const language = normalizePracticeLanguage(key);
    if (code !== undefined && code !== null) codeByLanguage[language] = String(code);
  }
  return codeByLanguage;
}

function normalizePracticeProblem(input = {}, existing = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const base = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  const title = clean(source.title ?? base.title) || "Untitled Problem";
  const slug = clean(source.slug ?? base.slug) || slugify(title);
  const id = clean(source.id ?? base.id) || `problem-${slug}-${Date.now()}`;
  const seededProblem = defaultPracticeProblemById.get(id);
  const customTests = Array.isArray(source.customTests)
    ? source.customTests
    : (Array.isArray(source.tests) ? source.tests : (Array.isArray(base.customTests) ? base.customTests : []));
  const normalizedCustomTests = augmentPracticeTests(id, customTests.map(normalizePracticeTest).filter(Boolean));
  const attempts = Array.isArray(source.attempts) ? source.attempts : (Array.isArray(base.attempts) ? base.attempts : []);
  const sessions = Array.isArray(source.sessions) ? source.sessions : (Array.isArray(base.sessions) ? base.sessions : []);
  const history = Array.isArray(source.history) ? source.history : (Array.isArray(base.history) ? base.history : []);
  const reviewLevel = clampInt(source.reviewLevel ?? base.reviewLevel ?? 0, 0, LEARNING_REVIEW_INTERVALS.length - 1);
  const solveCount = Math.max(0, Number(source.solveCount ?? base.solveCount ?? 0) || 0);
  const lastSolvedAt = cleanTimestamp(source.lastSolvedAt) || cleanTimestamp(base.lastSolvedAt);
  const nextReviewAt = cleanStageDate(source.nextReviewAt) || cleanStageDate(base.nextReviewAt);
  const methodName = clean(source.methodName ?? base.methodName);
  const seededSolutionCode = String(seededProblem?.solutionCode || "");
  const storedSolutionCode = source.solutionCode ?? base.solutionCode;
  const solutionCode = String(
    storedSolutionCode !== undefined && !isPlaceholderSolutionCode(storedSolutionCode)
      ? storedSolutionCode
      : (seededSolutionCode || storedSolutionCode || "")
  );
  const seededLanguageSolutions = normalizePracticeLanguageCodeMap(seededProblem?.languageSolutions);
  if (javaPracticeSolutions[id]) seededLanguageSolutions.java = javaPracticeSolutions[id];
  const languageSolutions = {
    ...seededLanguageSolutions,
    ...normalizePracticeLanguageCodeMap(base.languageSolutions),
    ...normalizePracticeLanguageCodeMap(source.languageSolutions),
  };
  languageSolutions.python = String(languageSolutions.python ?? solutionCode ?? "");
  const starterInput = { id, title, methodName, customTests: normalizedCustomTests };
  const starterCode = String(source.starterCode ?? base.starterCode ?? seededProblem?.starterCode ?? makeStarterCode(starterInput, "python"));
  const javaStarterCode = makeStarterCode(starterInput, "java");
  const draftLanguage = normalizePracticeLanguage(source.language);
  const sourceDraft = source.draft ?? source.codeDraft;
  const languageDrafts = {
    ...normalizePracticeLanguageDrafts(base.languageDrafts),
    ...normalizePracticeLanguageDrafts(source.languageDrafts),
  };
  let draft = String(
    draftLanguage === "python" && sourceDraft !== undefined
      ? sourceDraft
      : (base.draft ?? base.codeDraft ?? languageDrafts.python ?? starterCode)
  );
  if (sourceDraft !== undefined) {
    languageDrafts[draftLanguage] = String(sourceDraft);
    if (draftLanguage === "python") draft = String(sourceDraft);
  }
  languageDrafts.python = String(languageDrafts.python ?? draft ?? starterCode);
  languageDrafts.java = String(languageDrafts.java ?? javaStarterCode);
  if (!draft) draft = languageDrafts.python || starterCode;
  const hasStartedDraft = draft !== starterCode || languageDrafts.java !== javaStarterCode;
  const userStarted = Boolean(source.userStarted ?? base.userStarted ?? (!seededProblem && (source.draft || base.draft)) ?? hasStartedDraft);
  const solutionRevealed = Boolean(source.solutionRevealed ?? base.solutionRevealed ?? false);
  return {
    id,
    title,
    slug,
    url: clean(source.url ?? base.url),
    difficulty: choice(source.difficulty ?? base.difficulty, ["Easy", "Medium", "Hard"], "Medium"),
    tags: stringList(source.tags ?? base.tags),
    paidOnly: Boolean(source.paidOnly ?? base.paidOnly ?? false),
    acceptance: normalizeOptionalNumber(source.acceptance ?? base.acceptance),
    syncedAt: cleanTimestamp(source.syncedAt) || cleanTimestamp(base.syncedAt) || new Date().toISOString(),
    methodName,
    description: String(source.description || base.description || seededProblem?.description || ""),
    examples: String(source.examples ?? base.examples ?? ""),
    constraints: String(source.constraints ?? base.constraints ?? ""),
    notes: String(source.notes ?? base.notes ?? ""),
    customTests: normalizedCustomTests,
    companies: Array.isArray(source.companies) && source.companies.length
      ? source.companies
      : getCompanyTagsForProblem(clean(source.slug ?? base.slug) || slugify(title)),
    starterCode,
    solutionCode,
    languageSolutions,
    solutionRevealed,
    userStarted: hasStartedDraft ? true : userStarted,
    draft,
    languageDrafts,
    solved: Boolean((source.solved ?? base.solved ?? (solveCount > 0)) || lastSolvedAt),
    solveCount,
    reviewLevel,
    lastSolvedAt,
    nextReviewAt,
    attempts: attempts.map(normalizeAttempt).filter(Boolean),
    sessions: sessions.map(normalizeSession).filter(Boolean),
    history: history.map(normalizeHistoryItem).filter(Boolean),
    createdAt: cleanTimestamp(source.createdAt) || cleanTimestamp(base.createdAt) || new Date().toISOString(),
    updatedAt: cleanTimestamp(source.updatedAt) || cleanTimestamp(base.updatedAt) || new Date().toISOString(),
  };
}

function normalizePracticeTest(test) {
  if (!test || typeof test !== "object" || Array.isArray(test)) return null;
  const normalized = {
    name: clean(test.name) || "test",
    args: Array.isArray(test.args) ? test.args : [],
    kwargs: test.kwargs && typeof test.kwargs === "object" && !Array.isArray(test.kwargs) ? test.kwargs : {},
    expected: test.expected,
  };
  if (Array.isArray(test.argTypes)) normalized.argTypes = stringList(test.argTypes);
  if (clean(test.expectedType)) normalized.expectedType = clean(test.expectedType);
  if (clean(test.className)) normalized.className = clean(test.className);
  if (Array.isArray(test.operations)) normalized.operations = stringList(test.operations);
  if (Array.isArray(test.operationArgs)) normalized.operationArgs = test.operationArgs;
  if (clean(test.validator)) normalized.validator = clean(test.validator);
  if (clean(test.expectedDescription)) normalized.expectedDescription = clean(test.expectedDescription);
  return normalized;
}

function augmentPracticeTests(problemId, tests = []) {
  const extras = supplementalPracticeTests[problemId] || [];
  const decorate = (test) => decoratePracticeTest(problemId, test);
  if (!extras.length) return tests.map(decorate);
  const seen = new Set(tests.map((test) => `${test.name}::${JSON.stringify(test.args)}::${JSON.stringify(test.kwargs)}`));
  const augmented = tests.map(decorate);
  extras.map(normalizePracticeTest).filter(Boolean).forEach((test) => {
    const key = `${test.name}::${JSON.stringify(test.args)}::${JSON.stringify(test.kwargs)}`;
    if (!seen.has(key)) {
      seen.add(key);
      augmented.push(decorate(test));
    }
  });
  return augmented;
}

function decoratePracticeTest(problemId, test) {
  if (!test) return test;
  if (problemId === "lc-two-sum") {
    return {
      ...test,
      validator: test.validator || "twoSumIndices",
      expectedDescription: test.expectedDescription || "Any two distinct indices whose values add to the target.",
    };
  }
  if (problemId === "lc-top-k-frequent-elements") {
    return {
      ...test,
      validator: test.validator || "unorderedList",
      expectedDescription: test.expectedDescription || "The expected values in any order.",
    };
  }
  if (problemId === "lc-three-sum") {
    return {
      ...test,
      validator: test.validator || "unorderedNestedList",
      expectedDescription: test.expectedDescription || "The expected triplets in any order.",
    };
  }
  return test;
}

function normalizeAttempt(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const createdAt = cleanTimestamp(input.createdAt) || new Date().toISOString();
  return {
    id: clean(input.id) || `attempt-${Date.parse(createdAt) || Date.now()}`,
    createdAt,
    source: clean(input.source) || "manual",
    language: normalizePracticeLanguage(input.language),
    passed: Boolean(input.passed),
    passedTests: Math.max(0, Number(input.passedTests) || 0),
    totalTests: Math.max(0, Number(input.totalTests) || 0),
    timeSpentMinutes: Math.max(0, Number(input.timeSpentMinutes) || 0),
    notes: clean(input.notes),
    stdout: String(input.stdout || ""),
    stderr: String(input.stderr || ""),
    error: clean(input.error),
  };
}

function normalizeSession(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const endedAt = cleanTimestamp(input.endedAt) || cleanTimestamp(input.createdAt) || new Date().toISOString();
  return {
    id: clean(input.id) || `session-${Date.parse(endedAt) || Date.now()}`,
    startedAt: cleanTimestamp(input.startedAt) || endedAt,
    endedAt,
    timeSpentMinutes: Math.max(0, Number(input.timeSpentMinutes) || 0),
    focus: clean(input.focus) || "practice",
  };
}

function normalizeHistoryItem(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  return {
    at: cleanTimestamp(input.at) || new Date().toISOString(),
    type: clean(input.type) || "note",
    note: clean(input.note),
  };
}

function normalizeCourseStore(input = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const items = (Array.isArray(source.items) ? source.items : defaultCoursesStore.items)
    .map(normalizeCourseItem)
    .filter(Boolean);
  return { version: 1, items };
}

function normalizeCourseItem(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const title = clean(input.title) || "Untitled Course";
  const rawModules = Array.isArray(input.modules)
    ? input.modules
    : String(input.modules || "").split(/[\n,;]+/);
  const modules = rawModules.map((m) => {
    if (m && typeof m === "object") {
      return { name: clean(m.name), completed: Boolean(m.completed) };
    }
    return { name: clean(m), completed: false };
  }).filter((m) => m.name);
  return {
    id: clean(input.id) || `course-${slugify(title)}-${Date.now()}`,
    title,
    track: clean(input.track) || "General",
    status: choice(input.status, ["Not Started", "In Progress", "Completed", "Done"], "Not Started"),
    progress: clampInt(input.progress ?? 0, 0, 100),
    modules,
    resources: stringList(input.resources),
    notes: String(input.notes || ""),
    lastStudiedAt: cleanTimestamp(input.lastStudiedAt) || "",
    nextReviewAt: cleanStageDate(input.nextReviewAt) || "",
  };
}

function normalizeSystemDesignStore(input = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const topics = (Array.isArray(source.topics) ? source.topics : defaultSystemDesignStore.topics)
    .map(normalizeSystemDesignTopic)
    .filter(Boolean);
  return { version: 1, topics };
}

function normalizeSystemDesignTopic(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const title = clean(input.title) || "Untitled Topic";
  const history = Array.isArray(input.practiceHistory) ? input.practiceHistory : [];
  const rawChecklist = Array.isArray(input.checklist)
    ? input.checklist
    : String(input.checklist || "").split(/[\n,;]+/);
  const checklist = rawChecklist.map((c) => {
    if (c && typeof c === "object") {
      return { name: clean(c.name), completed: Boolean(c.completed) };
    }
    return { name: clean(c), completed: false };
  }).filter((c) => c.name);
  return {
    id: clean(input.id) || `sd-${slugify(title)}-${Date.now()}`,
    title,
    status: choice(input.status, ["Not Started", "In Progress", "Reviewing", "Mastered", "Done"], "Not Started"),
    confidence: clampInt(input.confidence ?? 1, 1, 5),
    prompts: stringList(input.prompts),
    checklist,
    notes: String(input.notes || ""),
    diagramLinks: String(input.diagramLinks || ""),
    practiceHistory: history.map(normalizeHistoryItem).filter(Boolean),
    lastPracticedAt: cleanTimestamp(input.lastPracticedAt) || "",
    nextReviewAt: cleanStageDate(input.nextReviewAt) || "",
  };
}

function mergeSeededPracticeProblems(store, now = new Date().toISOString()) {
  const existingById = new Map(store.problems.map((problem) => [problem.id, problem]));
  const existingBySlug = new Map(store.problems.map((problem) => [problem.slug, problem]));
  let added = 0;
  defaultPracticeProblems.forEach((seedProblem) => {
    if (existingById.has(seedProblem.id) || existingBySlug.has(seedProblem.slug)) return;
    store.problems.push(normalizePracticeProblem({ ...seedProblem, syncedAt: now }));
    added += 1;
  });
  return { store: normalizePracticeStore(store), added };
}

function recordProblemAttempt(problem, attemptInput = {}, now = new Date().toISOString()) {
  const next = normalizePracticeProblem(problem);
  const language = normalizePracticeLanguage(attemptInput.language);
  const timeSpentMinutes = Math.max(0, Number(attemptInput.timeSpentMinutes) || 0);
  const attempt = normalizeAttempt({
    id: `attempt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: now,
    language,
    ...attemptInput,
    timeSpentMinutes,
  });
  next.attempts = [attempt, ...next.attempts].slice(0, 200);
  if (timeSpentMinutes > 0) {
    next.sessions = [
      normalizeSession({
        id: `session-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        startedAt: cleanTimestamp(attemptInput.startedAt) || now,
        endedAt: now,
        timeSpentMinutes,
        focus: attemptInput.focus || "practice",
      }),
      ...next.sessions,
    ].slice(0, 300);
  }
  if (attemptInput.draft !== undefined || attemptInput.codeDraft !== undefined) {
    const code = String(attemptInput.draft ?? attemptInput.codeDraft ?? "");
    next.languageDrafts = {
      ...normalizePracticeLanguageDrafts(next.languageDrafts),
      [language]: code,
    };
    if (language === "python") {
      next.draft = code;
    }
    next.userStarted = true;
  }
  if (attemptInput.solutionRevealed !== undefined) {
    next.solutionRevealed = Boolean(attemptInput.solutionRevealed);
  }
  next.updatedAt = now;
  return next;
}

function markProblemSolved(problem, input = {}, now = new Date().toISOString()) {
  let next = recordProblemAttempt(problem, { ...input, passed: true, source: input.source || "manual" }, now);
  const currentLevel = clampInt(problem.reviewLevel ?? 0, 0, LEARNING_REVIEW_INTERVALS.length - 1);
  next.solved = true;
  next.solveCount = Math.max(0, Number(problem.solveCount) || 0) + 1;
  next.lastSolvedAt = now;
  next.nextReviewAt = nextReviewDate(now, currentLevel);
  next.reviewLevel = Math.min(currentLevel + 1, LEARNING_REVIEW_INTERVALS.length - 1);
  next.history = [
    normalizeHistoryItem({ at: now, type: "solved", note: input.reflection || input.notes || "" }),
    ...next.history,
  ].slice(0, 200);
  next.updatedAt = now;
  return next;
}

function markProblemFailed(problem, input = {}, now = new Date().toISOString()) {
  let next = recordProblemAttempt(problem, { ...input, passed: false, source: input.source || "manual" }, now);
  next.reviewLevel = 0;
  next.nextReviewAt = nextReviewDate(now, 0);
  next.history = [
    normalizeHistoryItem({ at: now, type: "failed", note: input.reflection || input.notes || "" }),
    ...next.history,
  ].slice(0, 200);
  next.updatedAt = now;
  return next;
}

function nextReviewDate(reference = new Date(), reviewLevel = 0) {
  const date = reference instanceof Date ? new Date(reference) : new Date(reference);
  if (!Number.isFinite(date.getTime())) return "";
  const index = clampInt(reviewLevel, 0, LEARNING_REVIEW_INTERVALS.length - 1);
  date.setDate(date.getDate() + LEARNING_REVIEW_INTERVALS[index]);
  return getLocalDateString(date);
}

function getDueProblems(store, today = getLocalDateString(new Date())) {
  const normalized = normalizePracticeStore(store);
  const date = cleanStageDate(today) || getLocalDateString(new Date());
  return normalized.problems
    .filter((problem) => problem.nextReviewAt && problem.nextReviewAt <= date)
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt) || a.title.localeCompare(b.title));
}

function buildPracticeStats(store, today = getLocalDateString(new Date())) {
  const normalized = normalizePracticeStore(store);
  const due = getDueProblems(normalized, today);
  const solved = normalized.problems.filter((problem) => problem.solveCount > 0).length;
  const focusMinutes = normalized.problems.reduce((sum, problem) => (
    sum + problem.sessions.reduce((sessionSum, session) => sessionSum + (Number(session.timeSpentMinutes) || 0), 0)
  ), 0);
  const solveDates = new Set();
  const weakTags = new Map();
  normalized.problems.forEach((problem) => {
    problem.history.forEach((item) => {
      if (item.type === "solved" || item.type === "failed") {
        const date = getLocalDateString(new Date(item.at));
        if (date) solveDates.add(date);
      }
      if (item.type === "failed") {
        problem.tags.forEach((tag) => weakTags.set(tag, (weakTags.get(tag) || 0) + 1));
      }
    });
    problem.attempts.forEach((attempt) => {
      if (!attempt.passed) {
        problem.tags.forEach((tag) => weakTags.set(tag, (weakTags.get(tag) || 0) + 1));
      }
    });
  });

  let streak = 0;
  const cursor = new Date(`${today}T12:00:00`);
  while (Number.isFinite(cursor.getTime())) {
    const date = getLocalDateString(cursor);
    if (!solveDates.has(date)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalProblems: normalized.problems.length,
    solved,
    dueToday: due.length,
    focusMinutes,
    streak,
    weakTags: [...weakTags.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 8),
  };
}

export {
  LEARNING_REVIEW_INTERVALS,
  normalizePracticeStore,
  normalizePracticeLanguageDrafts,
  normalizePracticeLanguageCodeMap,
  normalizePracticeProblem,
  normalizePracticeTest,
  augmentPracticeTests,
  decoratePracticeTest,
  normalizeAttempt,
  normalizeSession,
  normalizeHistoryItem,
  normalizeCourseStore,
  normalizeCourseItem,
  normalizeSystemDesignStore,
  normalizeSystemDesignTopic,
  mergeSeededPracticeProblems,
  recordProblemAttempt,
  markProblemSolved,
  markProblemFailed,
  nextReviewDate,
  getDueProblems,
  buildPracticeStats,
};

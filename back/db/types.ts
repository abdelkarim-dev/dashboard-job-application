// Lightweight shapes for the SQLite boundary. *Row types describe what comes
// back from a SELECT (JSON columns are still strings, booleans are 0/1 ints);
// repositories cast .all()/.get() results to these and then parse/coerce.
// *Input types describe the already-normalized domain objects that callers pass
// to the save functions — company/role/status mirror NOT NULL columns.

export interface ApplicationRow {
  id: string;
  company: string;
  role: string;
  status: string;
  dateApplied: string | null;
  appliedAt: string | null;
  rejectedAt: string | null;
  location: string | null;
  salary: string | null;
  equity: string | null;
  oaDeadline: string | null;
  oaCompletedAt: string | null;
  stagePassedAt: string | null;
  priority: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  skills: string | null;
  group: string | null;
  sourceUrl: string | null;
  notes: string | null;
  description: string | null;
  stageDates: string | null;
  stageDateTimes: string | null;
  evaluation: string | null;
  attachments: string | null;
  level: string | null;
  source: string | null;
  interviewDate: string | null;
  processId: string | null;
  processName: string | null;
  processSteps: string | null;
  stepProgress: string | null;
  currentStepId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationInput {
  id: string;
  company: string;
  role: string;
  status: string;
  dateApplied?: string;
  appliedAt?: string;
  rejectedAt?: string;
  location?: string;
  salary?: string;
  equity?: string;
  oaDeadline?: string;
  oaCompletedAt?: string;
  stagePassedAt?: unknown;
  priority?: string;
  nextAction?: string;
  nextActionAt?: string;
  skills?: string | string[];
  group?: string;
  sourceUrl?: string;
  notes?: string;
  description?: string;
  stageDates?: unknown;
  stageDateTimes?: unknown;
  evaluation?: unknown;
  attachments?: unknown;
  level?: string;
  source?: string;
  interviewDate?: string;
  processId?: string;
  processName?: string;
  processSteps?: unknown;
  stepProgress?: unknown;
  currentStepId?: string;
}

export interface PracticeSettings {
  timezone: string;
  dailyReviewTime: string;
  reviewMinutes: number;
  [key: string]: unknown;
}

export interface PracticeProblemRow {
  id: string;
  title: string;
  slug: string;
  url: string | null;
  difficulty: string | null;
  tags: string | null;
  paidOnly: number | null;
  acceptance: number | null;
  syncedAt: string | null;
  methodName: string | null;
  description: string | null;
  notes: string | null;
  reflection: string | null;
  customTests: string | null;
  starterCode: string | null;
  solutionCode: string | null;
  draft: string | null;
  languageDrafts: string | null;
  solutionRevealed: number | null;
  userStarted: number | null;
  solved: number | null;
  solveCount: number | null;
  reviewLevel: number | null;
  nextReviewAt: string | null;
  history: string | null;
  attempts: string | null;
  sessions: string | null;
  approach: string | null;
  insight: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeProblemInput {
  id: string;
  title: string;
  slug: string;
  url?: string;
  difficulty?: string;
  tags?: unknown[];
  paidOnly?: boolean;
  acceptance?: number | null;
  syncedAt?: string;
  methodName?: string;
  description?: string;
  notes?: string;
  reflection?: string;
  customTests?: unknown[];
  starterCode?: string;
  solutionCode?: string;
  draft?: string;
  languageDrafts?: Record<string, unknown>;
  solutionRevealed?: boolean;
  userStarted?: boolean;
  solved?: boolean;
  solveCount?: number;
  reviewLevel?: number;
  nextReviewAt?: string;
  history?: unknown[];
  attempts?: unknown[];
  sessions?: unknown[];
  approach?: Record<string, unknown>;
  insight?: string;
}

export interface PracticeStoreInput {
  settings?: PracticeSettings | Record<string, unknown>;
  problems: PracticeProblemInput[];
}

export interface CourseRow {
  id: string;
  title: string;
  track: string | null;
  status: string | null;
  progress: number | null;
  modules: string | null;
  resources: string | null;
  notes: string | null;
  lastStudiedAt: string | null;
  nextReviewAt: string | null;
}

export interface CourseInput {
  id: string;
  title: string;
  track?: string;
  status?: string;
  progress?: number;
  modules?: unknown[];
  resources?: unknown[];
  notes?: string;
  lastStudiedAt?: string;
  nextReviewAt?: string;
}

export interface CourseStoreInput {
  items: CourseInput[];
}

export interface SystemDesignRow {
  id: string;
  title: string;
  status: string | null;
  confidence: number | null;
  prompts: string | null;
  checklist: string | null;
  notes: string | null;
  diagramLinks: string | null;
  practiceHistory: string | null;
  lastPracticedAt: string | null;
  nextReviewAt: string | null;
}

export interface SystemDesignInput {
  id: string;
  title: string;
  status?: string;
  confidence?: number;
  prompts?: unknown[];
  checklist?: unknown[];
  notes?: string;
  diagramLinks?: string;
  practiceHistory?: unknown[];
  lastPracticedAt?: string;
  nextReviewAt?: string;
}

export interface SystemDesignStoreInput {
  topics: SystemDesignInput[];
}

export interface ProfileRow {
  [key: string]: string | number | null;
}

export interface ProfileInput {
  [key: string]: string | undefined;
}

export interface CvRow {
  variant: string;
  fileName: string | null;
  mimeType: string | null;
  data: string | null;
  uploadedAt: string;
}

export type CvVariant = "backend" | "architect";

/** A single column descriptor from `PRAGMA table_info(...)`. */
export interface TableInfoRow {
  name: string;
}

/** Generic `SELECT COUNT(*) as count` result. */
export interface CountRow {
  count: number;
}

// Persistence layer: JSON-store dispatch over SQLite (database.mjs) and the
// typed load/save accessors for applications and the practice/learning stores.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sqlDeleteApplication, sqlLoadApplications, sqlLoadCoursesStore, sqlLoadPracticeStore, sqlLoadSetting, sqlLoadSystemDesignStore, sqlSaveApplications, sqlSaveCoursesStore, sqlSavePracticeStore, sqlSaveSetting, sqlSaveSystemDesignStore } from "../../database.mjs";
import { migrateApplications } from "../domain/applications.mjs";
import { mergeSeededPracticeProblems, normalizeCourseStore, normalizePracticeStore, normalizeSystemDesignStore } from "../domain/practice.mjs";
import { normalizeStudyPlansStore } from "../domain/studyPlans.mjs";
import { normalizeInterviewProcessesStore } from "../domain/interviewProcesses.mjs";
import { defaultCoursesStore, defaultPracticeStore, defaultSystemDesignStore } from "../domain/problems.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// data/ lives at the repo root; this module sits in back/lib/data/, three levels down.
const dataDir = path.join(__dirname, "..", "..", "..", "data");

// Applications + profile are persisted in SQLite (database.mjs). These remaining
// *File paths are still used as dispatch keys by readJsonFile/writeJsonFile for the
// practice/courses/system-design stores and the calendar token.
const practiceFile = path.join(dataDir, "practice.json");

const coursesFile = path.join(dataDir, "courses.json");

const systemDesignFile = path.join(dataDir, "system-design.json");

const googleCalendarTokenFile = path.join(dataDir, "google-calendar-token.json");

async function loadApplications() {
  const applications = await sqlLoadApplications();
  const migrated = migrateApplications(applications);
  if (migrated.changed) {
    await saveApplications(migrated.applications);
  }
  return migrated.applications;
}

async function saveApplications(applications) {
  return sqlSaveApplications(applications);
}

async function deleteApplication(id) {
  return sqlDeleteApplication(id);
}

async function readJsonFile(filePath, fallback) {
  // Gracefully fallback to SQL load matching the file path to prevent breaks in other legacy functions
  if (filePath.includes("practice")) {
    const store = await sqlLoadPracticeStore();
    return store;
  }
  if (filePath.includes("courses")) {
    const store = await sqlLoadCoursesStore();
    return store;
  }
  if (filePath.includes("system-design")) {
    const store = await sqlLoadSystemDesignStore();
    return store;
  }
  return fallback;
}

async function writeJsonFile(filePath, value) {
  if (filePath.includes("practice")) {
    return sqlSavePracticeStore(value);
  }
  if (filePath.includes("courses")) {
    return sqlSaveCoursesStore(value);
  }
  if (filePath.includes("system-design")) {
    return sqlSaveSystemDesignStore(value);
  }
}

async function loadPracticeStore() {
  const raw = await readJsonFile(practiceFile, defaultPracticeStore);
  const store = normalizePracticeStore(raw);
  const merged = mergeSeededPracticeProblems(store);
  if (merged.added > 0 || JSON.stringify(raw) !== JSON.stringify(merged.store)) {
    await writeJsonFile(practiceFile, merged.store);
    return merged.store;
  }
  return store;
}

async function savePracticeStore(store) {
  const normalized = normalizePracticeStore(store);
  await writeJsonFile(practiceFile, normalized);
  return normalized;
}

async function loadCoursesStore() {
  return normalizeCourseStore(await readJsonFile(coursesFile, defaultCoursesStore));
}

async function saveCoursesStore(store) {
  const normalized = normalizeCourseStore(store);
  await writeJsonFile(coursesFile, normalized);
  return normalized;
}

async function loadSystemDesignStore() {
  return normalizeSystemDesignStore(await readJsonFile(systemDesignFile, defaultSystemDesignStore));
}

async function saveSystemDesignStore(store) {
  const normalized = normalizeSystemDesignStore(store);
  await writeJsonFile(systemDesignFile, normalized);
  return normalized;
}

// Study plans live in app_settings under the "studyPlans" key as a JSON blob.
const STUDY_PLANS_SETTING_KEY = "studyPlans";

async function loadStudyPlansStore() {
  const raw = await sqlLoadSetting(STUDY_PLANS_SETTING_KEY);
  return normalizeStudyPlansStore(raw);
}

async function saveStudyPlansStore(store) {
  const normalized = normalizeStudyPlansStore(store);
  await sqlSaveSetting(STUDY_PLANS_SETTING_KEY, JSON.stringify(normalized));
  return normalized;
}

// Interview processes live in app_settings under "interviewProcesses" as a JSON
// blob, mirroring the study-plans store.
const INTERVIEW_PROCESSES_SETTING_KEY = "interviewProcesses";

async function loadInterviewProcessesStore() {
  const raw = await sqlLoadSetting(INTERVIEW_PROCESSES_SETTING_KEY);
  return normalizeInterviewProcessesStore(raw);
}

async function saveInterviewProcessesStore(store) {
  const normalized = normalizeInterviewProcessesStore(store);
  await sqlSaveSetting(INTERVIEW_PROCESSES_SETTING_KEY, JSON.stringify(normalized));
  return normalized;
}

export {
  dataDir,
  practiceFile,
  coursesFile,
  systemDesignFile,
  googleCalendarTokenFile,
  readJsonFile,
  writeJsonFile,
  loadApplications,
  saveApplications,
  deleteApplication,
  loadPracticeStore,
  savePracticeStore,
  loadCoursesStore,
  saveCoursesStore,
  loadSystemDesignStore,
  saveSystemDesignStore,
  loadStudyPlansStore,
  saveStudyPlansStore,
  loadInterviewProcessesStore,
  saveInterviewProcessesStore,
};

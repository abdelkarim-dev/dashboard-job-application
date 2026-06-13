// The application domain model: normalization, legacy migration, pipeline-stage
// date/timestamp handling, status simplification, role categorization, job-identity
// inference and CSV/JSON export.
import { cleanStageDate, cleanTimestamp, dateFromLegacyUtcMidnightTimestamp, dateOnlyToTimestamp, getLocalDateString } from "../core/dates.mjs";
import { choice, clampScore, clean, makeId } from "../core/util.mjs";

const PIPELINE_STATUSES = ["Applied", "Online Assessment", "Recruiter Screen", "Interview", "Offer", "Rejected"];

const ROLE_CATEGORY_OPTIONS = [
  "Backend Engineering",
  "Platform Engineering",
  "Developer Productivity",
  "Infrastructure / SRE",
  "Staff / Principal IC",
  "Cloud / Architecture",
  "Solutions / Customer Engineering",
  "Product Management",
  "Data / AI / ML",
  "Frontend / Fullstack",
  "Security",
  "Leadership / Management",
  "Mobile",
  "Other / Poor Fit",
];

const GENERIC_JOB_IDENTITY_RE =
  /^(embed|embedded|iframe|job app|job application|application form|apply|apply now|application|job board|jobs board|job posting|posting|open role|opening|careers?|jobs?|job|greenhouse|lever|ashby|ashbyhq|workday|smartrecruiters|bamboohr|workable|jobvite|icims|taleo|successfactors|recruitee|teamtailor|dover|pinpoint|rippling|careerpuck|gem)$/i;

function normalizeStoredEvaluation(value, existing = null) {
  const source = value !== undefined ? value : existing;
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  const raw = source.rawEvaluation && typeof source.rawEvaluation === "object"
    ? source.rawEvaluation
    : source.evaluation && typeof source.evaluation === "object"
      ? source.evaluation
      : null;
  const score = clampScore(source.score ?? source.matchScore ?? raw?.matchScore);
  const decision = clean(source.decision ?? source.applyOrSkip ?? raw?.applyOrSkip) || "Maybe";
  const analysis = clean(source.analysis ?? source.explanation ?? raw?.finalDecision);
  return {
    ...source,
    ok: source.ok !== false,
    score,
    decision,
    analysis,
    explanation: clean(source.explanation ?? analysis),
    evaluatedAt: cleanTimestamp(source.evaluatedAt) || new Date().toISOString(),
    rawEvaluation: raw,
  };
}

// Stages whose outcome can be marked "passed" while the card stays put —
// passing an OA / phone screen / loop tells you the result, not the next step.
const PASSABLE_STAGES = new Set(["Online Assessment", "Recruiter Screen", "Interview"]);

const DATE_INPUT_STAGES = new Set(["Online Assessment", "Recruiter Screen", "Interview"]);

function normalizeStagePassedAt(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const cleaned = {};
  for (const [stage, stamp] of Object.entries(value)) {
    if (!PASSABLE_STAGES.has(stage)) continue;
    const ts = cleanTimestamp(stamp);
    if (ts) cleaned[stage] = ts;
  }
  return cleaned;
}

function normalizeApplication(input, existing = {}) {
  const now = new Date().toISOString();
  const sourceUrl = clean(input.sourceUrl ?? existing.sourceUrl);
  const company =
    sanitizeJobIdentityValue(input.company) ||
    sanitizeJobIdentityValue(existing.company) ||
    inferCompanyFromSourceUrl(sourceUrl);
  const role =
    sanitizeJobIdentityValue(input.role) ||
    sanitizeJobIdentityValue(existing.role);
  const previousStatus = existing.status ? simplifyStatus(existing.status) : "";
  // Empty dateApplied is meaningful: "saved but not yet applied". Don't auto-fill today.
  let dateApplied = cleanStageDate(input.dateApplied ?? existing.dateApplied ?? "");
  const status = simplifyStatus(input.status || existing.status || "Applied");
  // Same fix as oaDeadline: an explicit empty string from the drawer clears
  // the value; only missing input falls back to existing.
  let appliedAt = input.appliedAt !== undefined
    ? cleanTimestamp(input.appliedAt)
    : cleanTimestamp(existing.appliedAt);
  if (!appliedAt && input.appliedAt === undefined && dateApplied) {
    appliedAt = deriveApplicationTimestamp(input, existing, dateApplied, now);
  }
  if (appliedAt) {
    dateApplied = getLocalDateString(new Date(appliedAt));
  }
  // "Saved" is authoritative about NOT having applied. Without this, demoting
  // an applied card to Saved resurrects the applied state: the client clears
  // dateApplied but rarely sends appliedAt, so the stored appliedAt survives
  // and re-fills dateApplied above — the card keeps counting as applied.
  if (status === "Saved") {
    appliedAt = "";
    dateApplied = "";
  }
  const stageDateTimes = normalizeStageDateTimes(input, existing, status, previousStatus, appliedAt, now);
  const stageDates = normalizeStageDates(input, existing, status, dateApplied, stageDateTimes, now);
  if (appliedAt) {
    stageDateTimes.Applied = appliedAt;
    stageDates.Applied = getLocalDateString(new Date(appliedAt));
  }
  if (status === "Saved") {
    delete stageDateTimes.Applied;
    delete stageDates.Applied;
  }
  let rejectedAt = input.rejectedAt !== undefined
    ? cleanTimestamp(input.rejectedAt)
    : cleanTimestamp(existing.rejectedAt);
  if (status === "Rejected" && previousStatus !== "Rejected" && !rejectedAt) {
    rejectedAt = stageDateTimes.Rejected || now;
  } else if (status === "Rejected" && !rejectedAt) {
    rejectedAt = stageDateTimes.Rejected || now;
  } else if (input.rejectedAt === "") {
    rejectedAt = "";
    delete stageDateTimes.Rejected;
    delete stageDates.Rejected;
  }
  if (rejectedAt) {
    stageDateTimes.Rejected = rejectedAt;
    stageDates.Rejected = getLocalDateString(new Date(rejectedAt));
  }

  const skills = Array.isArray(input.skills)
    ? input.skills
    : String(input.skills || existing.skills || "")
        .split(/[,;]+/)
        .map((skill) => skill.trim())
        .filter(Boolean);

  return {
    id: existing.id || input.id || makeId(company, role),
    company,
    role,
    status,
    dateApplied,
    appliedAt,
    rejectedAt,
    stageDates,
    stageDateTimes,
    location: clean(input.location ?? existing.location),
    salary: clean(input.salary ?? existing.salary),
    equity: clean(input.equity ?? existing.equity),
    // Treat an explicitly-provided oaDeadline (even an empty string from the
    // drawer's clear action) as authoritative; only fall back to existing if
    // the field was omitted entirely.
    oaDeadline: input.oaDeadline !== undefined
      ? cleanTimestamp(input.oaDeadline)
      : cleanTimestamp(existing.oaDeadline) || "",
    // Timestamp the candidate submitted/finished the online assessment. This is
    // independent of pipeline status: an OA can be done while still awaiting
    // results (status stays "Online Assessment"). Empty string = not yet done.
    oaCompletedAt: input.oaCompletedAt !== undefined
      ? cleanTimestamp(input.oaCompletedAt)
      : cleanTimestamp(existing.oaCompletedAt) || "",
    // Stage outcomes the user knows about WITHOUT knowing the next step yet:
    // a map of canonical stage name → ISO timestamp when it was marked passed
    // (e.g. { "Online Assessment": "…" }). Independent of pipeline status —
    // an OA can be passed while the card stays in the OA column awaiting the
    // recruiter's next move. An explicitly-provided map replaces the stored one
    // (so un-marking works); omitting the field preserves it.
    stagePassedAt: normalizeStagePassedAt(
      input.stagePassedAt !== undefined ? input.stagePassedAt : existing.stagePassedAt
    ),
    skills,
    level: clean(input.level ?? existing.level),
    source: clean(input.source ?? existing.source) || "Extension",
    sourceUrl,
    priority: choice(input.priority ?? existing.priority, ["Low", "Medium", "High"], "Medium"),
    // CRM-style next step. `nextAction` is a free-text label ("Email recruiter")
    // and `nextActionAt` is the date it's due (YYYY-MM-DD). Both clear with an
    // explicit empty string and persist across unrelated edits — mirroring the
    // notes / oaDeadline semantics so the drawer can blank them out.
    nextAction: clean(input.nextAction ?? existing.nextAction),
    nextActionAt: input.nextActionAt !== undefined
      ? cleanStageDate(input.nextActionAt)
      : cleanStageDate(existing.nextActionAt),
    notes: clean(input.notes ?? existing.notes),
    group: clean(input.group ?? existing.group),
    groupSource: clean(input.groupSource ?? existing.groupSource),
    groupUpdatedAt: input.groupUpdatedAt !== undefined
      ? cleanTimestamp(input.groupUpdatedAt)
      : cleanTimestamp(existing.groupUpdatedAt),
    evaluation: normalizeStoredEvaluation(input.evaluation, existing.evaluation),
    // Full job description text — captured from the page, preserved verbatim.
    description: String(input.description ?? existing.description ?? ""),
    // ISO timestamp of a scheduled interview (phone screen, loop, OA, etc.)
    // Set when the user tags the card with an interview stage + date.
    interviewDate: input.interviewDate !== undefined
      ? cleanStageTimestamp("Interview", input.interviewDate)
      : cleanStageTimestamp("Interview", existing.interviewDate) || "",
    attachments: Array.isArray(input.attachments)
      ? input.attachments
      : Array.isArray(existing.attachments)
      ? existing.attachments
      : [],
    createdAt: existing.createdAt || input.createdAt || now,
    updatedAt: now,
  };
}

function normalizeStageDateTimes(input, existing, status, previousStatus, appliedAt, now) {
  const stageDateTimes = {};
  const copyTimes = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    PIPELINE_STATUSES.forEach((stage) => {
      const timestamp = cleanStageTimestamp(stage, value[stage]);
      if (timestamp) stageDateTimes[stage] = timestamp;
    });
  };
  const copyDateOnly = (value, fallback) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    PIPELINE_STATUSES.forEach((stage) => {
      if (stageDateTimes[stage]) return;
      const date = cleanStageDate(value[stage]);
      if (date) stageDateTimes[stage] = dateOnlyToTimestamp(date, fallback);
    });
  };

  copyTimes(existing.stageDateTimes);
  copyTimes(input.stageDateTimes);
  copyDateOnly(existing.stageDates, cleanTimestamp(existing.updatedAt) || cleanTimestamp(existing.createdAt));
  copyDateOnly(input.stageDates, cleanTimestamp(input.updatedAt) || cleanTimestamp(input.createdAt));

  if (appliedAt) stageDateTimes.Applied = appliedAt;

  const changedStatus = previousStatus && previousStatus !== status;
  const isNewApplication = !existing.id;
  if (changedStatus || (isNewApplication && !stageDateTimes[status])) {
    // Honor an explicitly-provided stage timestamp (e.g. the dashboard quick
    // picker asking for an interview / OA date) instead of stamping "now".
    const inputStageTime = cleanStageTimestamp(status, input.stageDateTimes?.[status]);
    stageDateTimes[status] = inputStageTime || now;
  }

  return stageDateTimes;
}

function normalizeStageDates(input, existing, status, dateApplied, stageDateTimes, now) {
  const stageDates = {};
  const copyDates = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    PIPELINE_STATUSES.forEach((stage) => {
      const date = cleanStageDate(value[stage]);
      if (date) stageDates[stage] = date;
    });
  };

  copyDates(existing.stageDates);
  copyDates(input.stageDates);

  if (dateApplied) {
    const appliedDate = cleanStageDate(dateApplied);
    if (appliedDate) stageDates.Applied = appliedDate;
  }

  PIPELINE_STATUSES.forEach((stage) => {
    if (stageDateTimes[stage]) {
      stageDates[stage] = getLocalDateString(new Date(stageDateTimes[stage]));
    }
  });

  const previousStatus = existing.status ? simplifyStatus(existing.status) : "";
  const changedStatus = previousStatus && previousStatus !== status;
  const isNewApplication = !existing.id;
  if (changedStatus || (isNewApplication && !stageDates[status])) {
    stageDates[status] = getLocalDateString(new Date(stageDateTimes[status] || now));
  }

  return stageDates;
}

function cleanStageTimestamp(stage, value, fallbackTimestamp = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = cleanStageDate(raw)
    || (DATE_INPUT_STAGES.has(stage) ? dateFromLegacyUtcMidnightTimestamp(raw) : "");
  if (date) return dateOnlyToTimestamp(date, fallbackTimestamp);
  return cleanTimestamp(raw);
}

function deriveApplicationTimestamp(input, existing, dateApplied, now) {
  const createdAt = cleanTimestamp(input.createdAt) || cleanTimestamp(existing.createdAt);
  if (createdAt && getLocalDateString(new Date(createdAt)) === dateApplied) return createdAt;
  const updatedAt = cleanTimestamp(input.updatedAt) || cleanTimestamp(existing.updatedAt);
  if (updatedAt && getLocalDateString(new Date(updatedAt)) === dateApplied) return updatedAt;
  if (dateApplied === getLocalDateString(new Date(now))) return now;
  return dateOnlyToTimestamp(dateApplied, createdAt || updatedAt);
}

function migrateApplications(applications) {
  const now = new Date().toISOString();
  let changed = false;
  const migrated = applications.map((app) => {
    if (!app || typeof app !== "object" || Array.isArray(app)) return app;
    const next = { ...app };
    const sourceUrl = clean(next.sourceUrl);
    const company = sanitizeJobIdentityValue(next.company) || inferCompanyFromSourceUrl(sourceUrl);
    const role = sanitizeJobIdentityValue(next.role);

    if (next.company !== company) {
      next.company = company;
      changed = true;
    }
    if (next.role !== role) {
      next.role = role;
      changed = true;
    }

    const status = simplifyStatus(next.status || "Applied");
    if (next.status !== status) {
      next.status = status;
      changed = true;
    }

    const dateApplied = cleanStageDate(next.dateApplied);
    if (next.dateApplied !== dateApplied) {
      next.dateApplied = dateApplied;
      changed = true;
    }

    const stageDateTimes = {};
    const oldStageDateTimes = next.stageDateTimes && typeof next.stageDateTimes === "object" && !Array.isArray(next.stageDateTimes)
      ? next.stageDateTimes
      : {};
    const oldStageDates = next.stageDates && typeof next.stageDates === "object" && !Array.isArray(next.stageDates)
      ? next.stageDates
      : {};

    PIPELINE_STATUSES.forEach((stage) => {
      const timestamp = cleanStageTimestamp(stage, oldStageDateTimes[stage]);
      if (timestamp) {
        stageDateTimes[stage] = timestamp;
        return;
      }
      const date = cleanStageDate(oldStageDates[stage]);
      if (date) {
        const fallback = stage === status
          ? cleanTimestamp(next.updatedAt) || cleanTimestamp(next.createdAt)
          : cleanTimestamp(next.createdAt) || cleanTimestamp(next.updatedAt);
        stageDateTimes[stage] = dateOnlyToTimestamp(date, fallback);
      }
    });

    const appliedAt = cleanTimestamp(next.appliedAt)
      || (dateApplied ? deriveApplicationTimestamp(next, {}, dateApplied, now) : "");
    if (appliedAt) {
      stageDateTimes.Applied = appliedAt;
      if (next.appliedAt !== appliedAt) {
        next.appliedAt = appliedAt;
        changed = true;
      }
    }

    if (!stageDateTimes[status]) {
      const fallback = status === "Applied"
        ? appliedAt
        : cleanTimestamp(next.updatedAt) || cleanTimestamp(next.createdAt);
      if (fallback) stageDateTimes[status] = fallback;
    }

    let rejectedAt = cleanTimestamp(next.rejectedAt);
    if (!rejectedAt && status === "Rejected") {
      rejectedAt = stageDateTimes.Rejected || cleanTimestamp(next.updatedAt) || cleanTimestamp(next.createdAt) || now;
    }
    if (rejectedAt) {
      stageDateTimes.Rejected = rejectedAt;
      if (next.rejectedAt !== rejectedAt) {
        next.rejectedAt = rejectedAt;
        changed = true;
      }
    }

    const stageDates = {};
    PIPELINE_STATUSES.forEach((stage) => {
      if (stageDateTimes[stage]) {
        stageDates[stage] = getLocalDateString(new Date(stageDateTimes[stage]));
      } else {
        const date = cleanStageDate(oldStageDates[stage]);
        if (date) stageDates[stage] = date;
      }
    });
    if (dateApplied && !stageDates.Applied) stageDates.Applied = dateApplied;

    if (JSON.stringify(next.stageDateTimes || {}) !== JSON.stringify(stageDateTimes)) {
      next.stageDateTimes = stageDateTimes;
      changed = true;
    }
    if (JSON.stringify(next.stageDates || {}) !== JSON.stringify(stageDates)) {
      next.stageDates = stageDates;
      changed = true;
    }

    return next;
  });

  return { applications: migrated, changed };
}

function isGenericJobIdentity(value) {
  const normalized = clean(value).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return !normalized || GENERIC_JOB_IDENTITY_RE.test(normalized);
}

function sanitizeJobIdentityValue(value) {
  const cleaned = clean(value);
  return isGenericJobIdentity(cleaned) ? "" : cleaned;
}

function displayNameFromSlug(slug) {
  return decodeURIComponent(String(slug || ""))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function companyFromUrlQuery(urlObj) {
  for (const key of ["for", "company", "company_slug", "companyName", "company_name", "organization"]) {
    const value = sanitizeJobIdentityValue(urlObj.searchParams.get(key));
    if (value) return displayNameFromSlug(value);
  }
  return "";
}

function inferCompanyFromSourceUrl(sourceUrl) {
  try {
    const urlObj = new URL(sourceUrl);
    const host = urlObj.hostname.toLowerCase();
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    let slug = "";

    if (/greenhouse\.io$/.test(host)) {
      slug = companyFromUrlQuery(urlObj) || pathParts[0] || "";
    } else if (/lever\.co$/.test(host)) {
      slug = pathParts[0]?.toLowerCase() === "embed" ? pathParts[1] : pathParts[0];
    } else if (/ashbyhq\.com$/.test(host)) {
      slug = companyFromUrlQuery(urlObj) || (pathParts[0]?.toLowerCase() === "embed" ? pathParts[1] : pathParts[0]);
    } else if (host === "app.careerpuck.com") {
      const boardIndex = pathParts.findIndex((part) => part.toLowerCase() === "job-board");
      slug = boardIndex >= 0 ? pathParts[boardIndex + 1] : "";
    }

    return sanitizeJobIdentityValue(displayNameFromSlug(slug));
  } catch {
    return "";
  }
}

function simplifyStatus(status) {
  const normalized = clean(status).toLowerCase();
  // "Saved" is a pre-application state: captured for later but not yet applied.
  // It must stay distinct from "Applied" so it never gets an Applied timestamp.
  if (["saved", "wishlist", "interested", "to apply", "not applied"].includes(normalized)) return "Saved";
  if (["online assessment", "oa", "assessment", "coding assessment", "technical assessment", "take home", "take-home"].includes(normalized)) return "Online Assessment";
  if (["recruiter screen", "phone screen", "recruiter call", "hr screen"].includes(normalized)) return "Recruiter Screen";
  if (["interview", "technical interview", "onsite", "virtual onsite", "panel"].includes(normalized)) return "Interview";
  if (normalized === "offer") return "Offer";
  if (["rejected", "withdrawn"].includes(normalized)) return "Rejected";
  return "Applied";
}

function toCsv(applications) {
  const headers = [
    "Company",
    "Role",
    "Status",
    "Date Applied",
    "Applied At",
    "Status Date",
    "Status Timestamp",
    "Interview Date",
    "Interview Timestamp",
    "Online Assessment Date",
    "Online Assessment Timestamp",
    "OA Deadline",
    "OA Submitted At",
    "Recruiter Screen Date",
    "Recruiter Screen Timestamp",
    "Offer Date",
    "Offer Timestamp",
    "Rejected Date",
    "Rejected At",
    "Priority",
    "Next Action",
    "Next Action Date",
    "Location",
    "Salary",
    "Equity",
    "Skills",
    "Level",
    "Source URL",
    "Notes",
    "Group",
    "Attachments",
    "Days In Pipeline",
    "Days Since Update",
    "Active",
    "Description",
  ];
  const now = Date.now();
  const rows = applications.map((app) => {
    const isRejected = simplifyStatus(app.status) === "Rejected";
    // Pipeline span runs from first applied until the close date (rejection) or
    // "now" while still active.
    const appliedRef = app.appliedAt || getStageTimestamp(app, "Applied") || app.dateApplied || getStageDate(app, "Applied");
    const closedRef = isRejected ? (app.rejectedAt || getStageTimestamp(app, "Rejected")) : "";
    const closedMs = closedRef && Number.isFinite(Date.parse(closedRef)) ? Date.parse(closedRef) : now;
    return [
      app.company,
      app.role,
      app.status,
      app.dateApplied,
      app.appliedAt,
      getStageDate(app, app.status),
      getStageTimestamp(app, app.status),
      getStageDate(app, "Interview"),
      getStageTimestamp(app, "Interview"),
      getStageDate(app, "Online Assessment"),
      getStageTimestamp(app, "Online Assessment"),
      app.oaDeadline || "",
      app.oaCompletedAt || "",
      getStageDate(app, "Recruiter Screen"),
      getStageTimestamp(app, "Recruiter Screen"),
      getStageDate(app, "Offer"),
      getStageTimestamp(app, "Offer"),
      getStageDate(app, "Rejected"),
      app.rejectedAt || getStageTimestamp(app, "Rejected"),
      app.priority,
      app.nextAction || "",
      app.nextActionAt || "",
      app.location,
      app.salary,
      app.equity,
      formatSkillsForCsv(app.skills),
      app.level,
      app.sourceUrl,
      app.notes,
      app.group || "",
      formatAttachmentsForCsv(app.attachments),
      csvDayCount(appliedRef, closedMs),
      csvDayCount(app.updatedAt, now),
      isRejected ? "No" : "Yes",
      app.description || "",
    ];
  });
  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function toJson(applications, { exportedAt = new Date().toISOString() } = {}) {
  return JSON.stringify({
    exportedAt,
    count: applications.length,
    applications,
  }, null, 2);
}

function formatSkillsForCsv(skills) {
  if (Array.isArray(skills)) return skills.map(clean).filter(Boolean).join("; ");
  return String(skills || "")
    .split(/[,;]+/)
    .map((skill) => skill.trim())
    .filter(Boolean)
    .join("; ");
}

function formatAttachmentsForCsv(attachments) {
  if (!Array.isArray(attachments)) return "";
  return attachments.map((att) => clean(att && att.name)).filter(Boolean).join("; ");
}

// Whole-day span between two instants, returned as a display string so that a
// legitimate "0" survives the falsy-guard in the CSV stringify step. Returns ""
// when either side is unparseable.
function csvDayCount(fromValue, toValue) {
  const from = typeof fromValue === "number" ? fromValue : Date.parse(String(fromValue || ""));
  const to = typeof toValue === "number" ? toValue : Date.parse(String(toValue || ""));
  if (!Number.isFinite(from) || !Number.isFinite(to)) return "";
  return String(Math.max(0, Math.round((to - from) / 86400000)));
}

function getStageDate(app, status) {
  const timestamp = getStageTimestamp(app, status);
  if (timestamp) return getLocalDateString(new Date(timestamp));
  return cleanStageDate(app.stageDates?.[status]) || (status === "Applied" ? cleanStageDate(app.dateApplied) : "");
}

function getStageTimestamp(app, status) {
  return cleanStageTimestamp(status, app.stageDateTimes?.[status])
    || (status === "Applied" ? cleanTimestamp(app.appliedAt) : "")
    || (status === "Rejected" ? cleanTimestamp(app.rejectedAt) : "");
}

// Gemma occasionally "backfills" URL fields it can't know with a placeholder
// (https://www.google.com and friends). An unknown URL must stay empty so the
// human fills it — never a fabricated link.
const PLACEHOLDER_URL_RE = /^(?:https?:\/\/)?(?:www\.)?(?:goog?le\.[a-z.]+|example\.(?:com|org|net)|test\.com|yourwebsite\.com|website\.com|url\.com|placeholder\.[a-z]+|sample\.com|mywebsite\.com|my-?portfolio\.[a-z]+|portfolio\.com|yoursite\.com|yourname\.com|johndoe\.[a-z]+|janedoe\.[a-z]+)(?:\/.*)?$/i;

function sanitizeAutofillMappings(mappings) {
  if (!mappings || typeof mappings !== "object") return mappings;
  const cleaned = {};
  for (const [key, value] of Object.entries(mappings)) {
    const text = String(value ?? "").trim();
    cleaned[key] = PLACEHOLDER_URL_RE.test(text) ? "" : value;
  }
  return cleaned;
}

function normalizeAiApplication(input) {
  const now = new Date().toISOString();
  const dateApplied = clean(input.dateApplied) || getLocalDateString(new Date(now));
  const appliedAt = cleanTimestamp(input.appliedAt) || deriveApplicationTimestamp(input, {}, dateApplied, now);
  return {
    company: clean(input.company),
    role: clean(input.role),
    status: simplifyStatus(input.status),
    dateApplied,
    appliedAt,
    stageDateTimes: { Applied: appliedAt },
    location: clean(input.location),
    salary: clean(input.salary),
    equity: clean(input.equity),
    skills: Array.isArray(input.skills) ? input.skills.map(clean).filter(Boolean) : [],
    level: clean(input.level),
    priority: ["High", "Medium", "Low"].includes(input.priority) ? input.priority : "Medium",
    source: "Gemma",
    sourceUrl: clean(input.sourceUrl),
    notes: clean(input.notes),
    group: clean(input.group),
    description: clean(input.description),
  };
}

function normalizeRoleCategory(value) {
  const raw = clean(value);
  if (!raw) return "";
  const exact = ROLE_CATEGORY_OPTIONS.find((category) => category.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (/developer productivity|engineering effectiveness|dev tool|build system|productivity/.test(normalized)) return "Developer Productivity";
  if (/staff|principal|distinguished/.test(normalized)) return "Staff / Principal IC";
  if (/backend|back end|api|microservice|distributed system/.test(normalized)) return "Backend Engineering";
  if (/platform/.test(normalized)) return "Platform Engineering";
  if (/sre|site reliability|devops|infrastructure|infra/.test(normalized)) return "Infrastructure / SRE";
  if (/cloud|architect|architecture/.test(normalized)) return "Cloud / Architecture";
  if (/solution|customer|sales engineer|implementation/.test(normalized)) return "Solutions / Customer Engineering";
  if (/product|pm|product manager/.test(normalized)) return "Product Management";
  if (/data|analytics|machine learning|ml|ai/.test(normalized)) return "Data / AI / ML";
  if (/front|frontend|fullstack|full stack|ui|client/.test(normalized)) return "Frontend / Fullstack";
  if (/security|appsec|waf/.test(normalized)) return "Security";
  if (/manager|director|leadership|management/.test(normalized)) return "Leadership / Management";
  if (/mobile|ios|android/.test(normalized)) return "Mobile";
  return "Other / Poor Fit";
}

export {
  PIPELINE_STATUSES,
  ROLE_CATEGORY_OPTIONS,
  GENERIC_JOB_IDENTITY_RE,
  PASSABLE_STAGES,
  DATE_INPUT_STAGES,
  PLACEHOLDER_URL_RE,
  normalizeStoredEvaluation,
  normalizeStagePassedAt,
  normalizeApplication,
  normalizeStageDateTimes,
  normalizeStageDates,
  cleanStageTimestamp,
  deriveApplicationTimestamp,
  migrateApplications,
  isGenericJobIdentity,
  sanitizeJobIdentityValue,
  displayNameFromSlug,
  companyFromUrlQuery,
  inferCompanyFromSourceUrl,
  simplifyStatus,
  toCsv,
  toJson,
  formatSkillsForCsv,
  formatAttachmentsForCsv,
  csvDayCount,
  getStageDate,
  getStageTimestamp,
  sanitizeAutofillMappings,
  normalizeAiApplication,
  normalizeRoleCategory,
};

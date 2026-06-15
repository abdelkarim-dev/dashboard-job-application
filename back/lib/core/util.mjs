// Pure, dependency-free primitives shared across every domain: string
// cleaning, list/number coercion, id/slug generation, scoring clamps and the
// code-similarity helpers used by practice normalization.

function isStringMatrixOfChars(value) {
  return Array.isArray(value)
    && value.length > 0
    && value.every((row) => Array.isArray(row) && row.every((item) => typeof item === "string" && item.length <= 1));
}

function isPlaceholderSolutionCode(code = "") {
  const raw = String(code || "");
  const stripped = raw.replace(/#.*$/gm, "").trim();
  if (!stripped) return true;
  const meaningfulLines = stripped.split("\n").map((line) => line.trim()).filter(Boolean);
  if (/Add a local helper\/test harness/i.test(raw)) return true;
  if (/class\s+LRUCache\b/.test(stripped) && /\bpass\b/.test(stripped)) return true;
  if (meaningfulLines.length <= 5 && /\bpass\b/.test(stripped)) return true;
  if (meaningfulLines.length <= 4 && /return\s+(\[\]|None|-1)\b/.test(stripped)) return true;
  return false;
}

function looksLikeSolutionDraft(draft = "", solutionCode = "") {
  const a = comparableCode(draft);
  const b = comparableCode(solutionCode);
  if (!a || !b) return false;
  if (a === b) return true;
  const maxLength = Math.max(a.length, b.length);
  if (maxLength < 40) return false;
  if (Math.abs(a.length - b.length) / maxLength > 0.12) return false;
  return editDistanceWithin(a, b, Math.ceil(maxLength * 0.08));
}

function comparableCode(value = "") {
  return String(value).replace(/[^A-Za-z0-9_]+/g, "").toLowerCase();
}

function editDistanceWithin(a, b, limit) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = current[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > limit) return false;
    previous = current;
  }
  return previous[b.length] <= limit;
}

function slugify(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}

function clampInt(value, min, max) {
  const num = Math.round(Number(value));
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
}

function normalizeOptionalNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function makeId(company = "company", role = "role") {
  const slug = `${company}-${role}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `app-${slug || Date.now()}`;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function choice(value, allowed, fallback) {
  const raw = clean(value);
  return allowed.find((item) => item.toLowerCase() === raw.toLowerCase()) || fallback;
}

function stringList(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(/[\n,;]+/);
  return items.map(clean).filter(Boolean).slice(0, 24);
}

export {
  clean,
  choice,
  stringList,
  clampInt,
  normalizeOptionalNumber,
  slugify,
  makeId,
  cloneJson,
  clampScore,
  isStringMatrixOfChars,
  isPlaceholderSolutionCode,
  looksLikeSolutionDraft,
  comparableCode,
  editDistanceWithin,
};

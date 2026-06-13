// Timestamp and date-string helpers. All take explicit inputs and stay free of
// domain knowledge so both the applications and practice layers can share them.

function stripTimezone(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
}

function cleanStageDate(value) {
  const date = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function cleanTimestamp(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function dateOnlyToTimestamp(dateString, fallbackTimestamp = "") {
  const date = cleanStageDate(dateString);
  if (!date) return "";
  const fallback = cleanTimestamp(fallbackTimestamp);
  if (fallback && getLocalDateString(new Date(fallback)) === date) return fallback;
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

function dateFromLegacyUtcMidnightTimestamp(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.000)?Z$/);
  return match ? match[1] : "";
}

function getLocalDateString(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export {
  getLocalDateString,
  cleanTimestamp,
  cleanStageDate,
  dateOnlyToTimestamp,
  dateFromLegacyUtcMidnightTimestamp,
  stripTimezone,
};

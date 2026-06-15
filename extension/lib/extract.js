// Pure, browser-free helpers extracted from content.js so they can be unit-tested
// in Node and reasoned about without a DOM. This file is listed BEFORE content.js
// in manifest.json (content_scripts.js), so the same global names stay available
// to the content script unchanged — content.js just stopped declaring them.
//
// Everything here is pure: string / regex / array logic over plain values and
// data objects ({ label, value } options, { text, ... } entries). No document,
// window, chrome, fetch, timers, or shared mutable state. DOM-coupled helpers
// (findCompany, findLocation, cleanReadableText, serializeReadable, the combobox
// pickers, …) deliberately stay in content.js.
//
// Dual-mode: the module.exports block at the bottom feeds the Node test runner
// (extension/package.json marks this directory CommonJS). In the browser
// content-script context `module` is undefined, so that block is a no-op and the
// declarations below simply populate the shared content-script scope.

// ── Constants ───────────────────────────────────────────────────────────────

// Whole lines that are pure navigation/legal noise — dropped after text extraction.
const LINE_NOISE_PATTERN =
  /^(accept( all)?( cookies?)?|manage (cookies|preferences|settings)|we use cookies.*|cookie (policy|settings|preferences)|sign ?in|log ?in|sign ?up|create (an )?account|menu|skip to (content|main).*|share|tweet|back to (jobs|search|results)|view all jobs?|see all jobs?|similar jobs?|related jobs?|recommended.*|©.*|copyright.*|all rights reserved.*|privacy( policy)?|terms( of (service|use))?|powered by.*)$/i;

const GENERIC_JOB_IDENTITY_RE =
  /^(embed|embedded|iframe|job app|job application|application form|apply|apply now|application|job board|jobs board|job posting|posting|open role|opening|careers?|jobs?|job)$/i;

// Stand-in URLs people save when they have no real portfolio/site (e.g. a bare
// google.com) plus the usual fabricated placeholders. We never want these in an
// OPTIONAL website field, and Gemma must never echo one back. Shared by the
// profile fill and the AI-value guard.
const PLACEHOLDER_URL_RE = /^(?:https?:\/\/)?(?:www\.)?(?:goog?le\.[a-z.]+|example\.(?:com|org|net)|test\.com|yourwebsite\.com|website\.com|url\.com|placeholder\.[a-z]+|sample\.com|mywebsite\.com|my-?portfolio\.[a-z]+|portfolio\.com|yoursite\.com|yourname\.com|johndoe\.[a-z]+|janedoe\.[a-z]+)(?:\/.*)?$/i;

// ── Text normalization ────────────────────────────────────────────────────

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPlaceholderUrl(value) {
  return PLACEHOLDER_URL_RE.test(String(value ?? "").trim());
}

// ── Job field parsing ───────────────────────────────────────────────────────

function isGenericJobIdentity(value) {
  const normalized = clean(value).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return !normalized || GENERIC_JOB_IDENTITY_RE.test(normalized);
}

function cleanRole(title) {
  const role = clean(
    title
      .replace(/\s+[-|]\s+.*$/, "")
      .replace(/\bat\s+[A-Z].*$/, "")
      .replace(/\bjob\b/i, ""),
  );
  return isGenericJobIdentity(role) ? "" : role;
}

function findSalary(text) {
  const salaryMatch =
    text.match(/\$[0-9]{2,3}(?:,[0-9]{3})?\s*(?:k|K)?\s*[-–]\s*\$?[0-9]{2,3}(?:,[0-9]{3})?\s*(?:k|K)?/) ||
    text.match(/\$[0-9]{2,3}(?:,[0-9]{3})?\s*(?:USD|CAD)?/i);
  return salaryMatch ? clean(salaryMatch[0]) : "";
}

function findLevel(text) {
  const levels = [];
  if (/\bjunior\b/i.test(text)) levels.push("Junior");
  if (/\bmid(?:-|\s)?level\b|\bintermediate\b/i.test(text)) levels.push("Mid");
  if (/\bsenior\b|\bstaff\b|\bprincipal\b/i.test(text)) levels.push("Senior+");
  return levels.join(", ");
}

// ── Readable-text post-processing ─────────────────────────────────────────────

// Pure text post-processing: normalize whitespace, drop nav/legal boilerplate
// lines, collapse blank runs, de-dupe short repeated chrome, and cap length.
// Kept separate from the DOM walk (serializeReadable, in content.js) so it can be
// reasoned about and tested directly.
function denoiseLines(raw, maxChars = 9000) {
  const seen = new Set();
  const lines = [];
  let blankRun = 0;
  for (const rawLine of String(raw || "").split("\n")) {
    const line = rawLine.replace(/[ \t ]+/g, " ").trim();
    if (!line) {
      if (lines.length && blankRun === 0) lines.push("");
      blankRun++;
      continue;
    }
    blankRun = 0;
    if (LINE_NOISE_PATTERN.test(line)) continue;
    const key = line.toLowerCase();
    // De-dupe short repeated chrome (menus echoed top & bottom); keep long prose.
    if (line.length < 60 && seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxChars);
}

// ── Form choice / option semantics ────────────────────────────────────────────

function normalizeChoiceText(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isGenericChoiceValue(value) {
  return /^(on|off)$/i.test(clean(value));
}

function choiceValueMeansYes(value) {
  const text = normalizeChoiceText(value);
  return /^(yes|y|true|1|checked|agree|agreed|accept|accepted)$/.test(text) || /\b(i agree|i accept|yes)\b/.test(text);
}

function choiceValueMeansNo(value) {
  const text = normalizeChoiceText(value);
  return /^(no|n|false|0|unchecked|decline|declined|disagree|opt out)$/.test(text) || /\b(no|do not|don t|not agree|decline|opt out)\b/.test(text);
}

function optionLooksYes(option) {
  const text = normalizeChoiceText(`${option.label} ${isGenericChoiceValue(option.value) ? "" : option.value}`);
  return /^(yes|y|true|1|agree|accept)\b/.test(text) || /\b(i agree|i accept)\b/.test(text);
}

function optionLooksNo(option) {
  const text = normalizeChoiceText(`${option.label} ${isGenericChoiceValue(option.value) ? "" : option.value}`);
  return /^(no|n|false|0|decline|disagree)\b/.test(text) || /\b(do not|don t|not agree|opt out)\b/.test(text);
}

// Whole-token containment on normalizeChoiceText output. Plain substring
// matching picked "No" for answers like "I do not know" ("no" inside "know").
function tokensInclude(haystack, needle) {
  if (!haystack || !needle) return false;
  return new RegExp(`(?:^| )${escapeRegExp(needle)}(?: |$)`).test(haystack);
}

// Callers pass raw option text ("Select...", "-- Please choose --") as well as
// pre-normalized text, so normalize here — matching raw text against a
// lowercase-only pattern silently classified every "Select..." default as a
// real answer and made isFieldAlreadyAnswered skip the whole dropdown.
function isPlaceholderOptionText(text) {
  if (/^\s*-+\s*$/.test(String(text || ""))) return true;
  const normalized = normalizeChoiceText(text);
  if (!normalized) return true;
  return (
    /^(please )?(select|choose|pick)( (one|an option|a option|option|options|an answer|a value|value|from( the)? list|below))?( below)?( required)?$/.test(normalized) ||
    /^(none|no selection|not selected|not specified|select a response|choose a response)$/.test(normalized)
  );
}

// Shared overlap scorer for select options and combobox option lists. Returns
// the entry only when it is the single clear winner (score >= 0.5, no tie).
function scoreOptionEntries(entries, target) {
  const targetTokens = target.split(" ").filter((token) => token.length > 1);
  if (!targetTokens.length) return null;
  const targetSet = new Set(targetTokens);
  let best = null;
  let bestScore = 0;
  let tied = false;
  for (const entry of entries) {
    const optionTokens = entry.text.split(" ").filter((token) => token.length > 1);
    if (!optionTokens.length) continue;
    const overlap = optionTokens.filter((token) => targetSet.has(token)).length;
    const score = overlap / Math.max(optionTokens.length, targetTokens.length);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
      tied = false;
    } else if (score === bestScore && score > 0) {
      tied = true;
    }
  }
  return best && !tied && bestScore >= 0.5 ? best : null;
}

// ── Node test export (no-op in the browser content-script context) ───────────
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    LINE_NOISE_PATTERN,
    GENERIC_JOB_IDENTITY_RE,
    PLACEHOLDER_URL_RE,
    clean,
    escapeHtml,
    escapeRegExp,
    isPlaceholderUrl,
    isGenericJobIdentity,
    cleanRole,
    findSalary,
    findLevel,
    denoiseLines,
    normalizeChoiceText,
    isGenericChoiceValue,
    choiceValueMeansYes,
    choiceValueMeansNo,
    optionLooksYes,
    optionLooksNo,
    tokensInclude,
    isPlaceholderOptionText,
    scoreOptionEntries,
  };
}

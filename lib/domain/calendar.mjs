// Review-reminder calendar payloads and the .ics export.
import { createHash } from "node:crypto";
import { getLocalDateString, stripTimezone } from "../core/dates.mjs";
import { getDueProblems, normalizePracticeStore } from "./practice.mjs";

function buildCalendarReviewEventPayload(store, date = getLocalDateString(new Date()), settings = {}) {
  const normalized = normalizePracticeStore(store);
  const due = getDueProblems(normalized, date);
  const timezone = settings.timezone || normalized.settings.timezone || "America/Vancouver";
  const reviewTime = settings.dailyReviewTime || normalized.settings.dailyReviewTime || "20:00";
  const minutes = Math.max(15, Number(settings.reviewMinutes || normalized.settings.reviewMinutes || 45));
  const start = new Date(`${date}T${reviewTime}:00`);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + minutes);
  const lines = due.length
    ? due.map((problem, index) => `${index + 1}. ${problem.title}${problem.url ? ` - ${problem.url}` : ""}`)
    : ["No due problems. Use the block for a fresh problem or reflection."];
  return {
    summary: "LeetCode Review",
    description: `Due review queue for ${date}:\n${lines.join("\n")}`,
    start: { dateTime: stripTimezone(start), timeZone: timezone },
    end: { dateTime: stripTimezone(end), timeZone: timezone },
    dueProblemIds: due.map((problem) => problem.id),
  };
}

function buildIcsReviewEvent(payload) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const toIcsDate = (value = "") => String(value).replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escapeIcs = (value = "") => String(value).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Job Hunt Cockpit//Practice Review//EN",
    "BEGIN:VEVENT",
    `UID:${createHash("sha1").update(JSON.stringify(payload)).digest("hex")}@job-hunt-cockpit.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toIcsDate(payload.start?.dateTime)}`,
    `DTEND:${toIcsDate(payload.end?.dateTime)}`,
    `SUMMARY:${escapeIcs(payload.summary)}`,
    `DESCRIPTION:${escapeIcs(payload.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export {
  buildCalendarReviewEventPayload,
  buildIcsReviewEvent,
};

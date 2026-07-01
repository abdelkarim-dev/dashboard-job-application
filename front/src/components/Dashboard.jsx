import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  isStale,
  parseDateValue,
  localDateString,
  daysSinceCurrentStage,
  daysWaiting,
  isGhosting,
  ageBand,
  waitingTier,
  buildAttentionItems,
  formatNextActionDue,
} from "../lib/metrics.mjs";
import { hasProcess, isWaiting, getDefaultProcess, deriveProcessStatus } from "../lib/process.mjs";
import ApplicationProcessPanel from "./ApplicationProcessPanel.jsx";
import ProcessProgressBar from "./ProcessProgressBar.jsx";

const PIPELINE_FORWARD = ["Applied", "Online Assessment", "Recruiter Screen", "Interview", "Offer"];

const STATUS_META = {
  "Applied":           { short: "Applied",            pipeShort: "Applied",            color: "var(--s-applied)",   bg: "var(--s-applied-bg)",   dot: "var(--s-applied-dot)",   step: 0 },
  "Online Assessment": { short: "Online Assessment",  pipeShort: "OA",             color: "var(--s-oa)",        bg: "var(--s-oa-bg)",        dot: "var(--s-oa-dot)",        step: 1 },
  "Recruiter Screen":  { short: "Phone Interview",    pipeShort: "Phone",          color: "var(--s-screen)",    bg: "var(--s-screen-bg)",    dot: "var(--s-screen-dot)",    step: 2 },
  "Interview":         { short: "Loop Interview",     pipeShort: "Loop",           color: "var(--s-interview)", bg: "var(--s-interview-bg)", dot: "var(--s-interview-dot)", step: 3 },
  "Offer":             { short: "Offer",              pipeShort: "Offer",              color: "var(--s-offer)",     bg: "var(--s-offer-bg)",     dot: "var(--s-offer-dot)",     step: 4 },
  "Rejected":          { short: "Rejected",           pipeShort: "Rejected",           color: "var(--s-rejected)",  bg: "var(--s-rejected-bg)",  dot: "var(--s-rejected-dot)",  step: -1 },
  "REJECTED_ATS":      { short: "Rejected ATS",       pipeShort: "Rejected ATS",       color: "var(--s-ats)",       bg: "var(--s-ats-bg)",       dot: "var(--s-ats-dot)",       step: -1 },
  "Stalled":           { short: "Stalled",            pipeShort: "Stalled",            color: "var(--s-stalled)",   bg: "var(--s-stalled-bg)",   dot: "var(--s-stalled-dot)",   step: 0 },
  "AppliedToday":      { short: "Applied Today",       pipeShort: "Applied Today",      color: "var(--md-tertiary)",  bg: "color-mix(in srgb, var(--md-tertiary) 12%, transparent)", dot: "var(--md-tertiary)", step: 0 },
  // Derived overlay: a process-tracked app sitting between rounds (last round
  // passed, next not booked). Amber, distinct from the cool pipeline stages.
  "Waiting":           { short: "Waiting",             pipeShort: "Waiting",            color: "var(--s-waiting)",   bg: "var(--s-waiting-bg)",   dot: "var(--s-waiting-dot)",   step: 0 },
  // Derived overlay: gone cold — idle 30+ days with no reply. A quiet grey
  // archive tier, deliberately cooler than the stalled-orange.
  "Ghosting":          { short: "Ghosted",             pipeShort: "Ghosted",            color: "var(--s-ghost)",     bg: "var(--s-ghost-bg)",     dot: "var(--s-ghost-dot)",     step: 0 },
  // Board section headers (not statuses): companies whose process moved past
  // step 1, and freshly-applied companies.
  "InProgress":        { short: "In progress",         pipeShort: "In progress",        color: "var(--md-primary)",  bg: "color-mix(in srgb, var(--md-primary) 12%, transparent)", dot: "var(--md-primary)", step: 0 },
  "Recent":            { short: "Recently applied",     pipeShort: "Recent",             color: "var(--s-applied)",   bg: "var(--s-applied-bg)",   dot: "var(--s-applied-dot)",   step: 0 },
};

const STAGE_DATE_STATUSES = new Set(["Online Assessment", "Recruiter Screen", "Interview"]);

const STATUS_SHORTCUTS = {
  oa: "Online Assessment", oaa: "Online Assessment",
  screen: "Recruiter Screen", recruiter: "Recruiter Screen",
  interview: "Interview",
  offer: "Offer",
  applied: "Applied",
  rejected: "Rejected",
  ats: "REJECTED_ATS",
  rejected_ats: "REJECTED_ATS",
  stalled: "Stalled",
  waiting: "Waiting",
  ghosted: "Ghosting", ghosting: "Ghosting", cold: "Ghosting",
};

const FIELD_ALIASES = {
  company: ["company", "co", "c"],
  status:   ["status", "s", "st"],
  location: ["location", "loc", "l"],
  skill:    ["skill", "sk", "tech", "t"],
  group:    ["group", "g", "gr"],
};

const FIELD_LABELS = { company: "Company", status: "Status", location: "Location", skill: "Skill", group: "Group" };

function normalizeField(f) {
  const fl = f.toLowerCase();
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(fl)) return canonical;
  }
  return fl;
}

function parseOmniSearch(raw) {
  const fieldFilters = [];
  for (const m of raw.matchAll(/@([a-z]+):("[^"]*"|[^\s@]*)/gi)) {
    fieldFilters.push({ field: normalizeField(m[1]), value: m[2].replace(/^"|"$/g, "").toLowerCase(), raw: m[0] });
  }
  const globalText = raw.replace(/@[a-z]+:(?:"[^"]*"|[^\s@]*)/gi, "").trim().toLowerCase();
  return { fieldFilters, globalText };
}

function removeFilterFromRaw(raw, filterRaw) {
  return raw.replace(filterRaw, "").replace(/\s{2,}/g, " ").trim();
}

function resolveStatus(value) {
  const v = value.toLowerCase();
  return STATUS_SHORTCUTS[v] || PIPELINE_FORWARD.find((s) => s.toLowerCase().startsWith(v)) || value;
}

function getInitials(company) {
  return (company || "?").split(/[\s&,]+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";
}

function formatDate(value) {
  if (!value) return null;
  const d = parseDateValue(value);
  if (!d) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateForInput(value) {
  if (!value) return "";
  const d = parseDateValue(value);
  if (!d) return "";
  const y = d.getFullYear(), mo = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function getAppliedDate(app) {
  return app.appliedAt || app.dateApplied || app.createdAt || "";
}

function isAppliedToday(app) {
  const d = parseDateValue(getAppliedDate(app));
  if (!d) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

const COMPANY_COLORS = ["#38bdf8","#34d399","#fbbf24","#c084fc","#fb923c","#f472b6","#a3e635","#22d3ee","#818cf8","#f87171"];
function companyColor(company) {
  let h = 0;
  for (let i = 0; i < (company || "").length; i++) h = (h * 31 + company.charCodeAt(i)) & 0xffff;
  return COMPANY_COLORS[h % COMPANY_COLORS.length];
}

function statusStep(s) { return STATUS_META[s]?.step ?? -1; }

// The canonical stage to position a card by. When an interview process is
// assigned it is the single source of truth (so the card and the side panel can
// never disagree); otherwise the raw status field is used.
function effectiveStatusOf(app) {
  return hasProcess(app) ? (deriveProcessStatus(app) || app.status || "Applied") : (app.status || "Applied");
}

// ── Derived status helpers ────────────────────────────────────────────────────

function isAtsRejection(app) {
  if (app.status !== "Rejected") return false;
  const rejectedDate = parseDateValue(app.rejectedAt || app.stageDateTimes?.Rejected);
  const appliedDate = parseDateValue(app.appliedAt || app.dateApplied || app.createdAt);
  if (!rejectedDate || !appliedDate) return false;
  const daysDiff = (rejectedDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff >= 0 && daysDiff <= 3;
}

// "Stalled" = a non-terminal app the user is NOT waiting on, idle 10–29 days, at
// ANY stage (the old Applied-only gate is gone — an OA/Phone/Loop app idle two
// weeks is just as stalled). 30+ days is "ghosting", a separate tier.
function isDisplayStalled(app) {
  if (app.status === "Rejected" || app.status === "Offer") return false;
  if (isWaiting(app)) return false;
  if (isGhosting(app)) return false;
  return isStale(app);
}

function getDisplayStatus(app) {
  // Precedence: terminal → Waiting → Ghosting → Stalled → ATS → raw. Waiting
  // (ball in the company's court) outranks the cold tiers, so a passed-round app
  // silent 30+ days stays in the Waiting hero's "going cold" tier and is never
  // archived as ghosted. Ghosting (30+) outranks Stalled (10–29).
  if (app.status === "Rejected") return isAtsRejection(app) ? "REJECTED_ATS" : "Rejected";
  if (isWaiting(app)) return "Waiting";
  if (isGhosting(app)) return "Ghosting";
  if (isDisplayStalled(app)) return "Stalled";
  return app.status;
}

function matchesDisplayFilter(app, filter) {
  if (filter === "All") return true;
  if (filter === "Today") return isAppliedToday(app) && app.status !== "Rejected";
  if (filter === "Waiting") return getDisplayStatus(app) === "Waiting";
  if (filter === "Stalled") return getDisplayStatus(app) === "Stalled";
  if (filter === "Ghosting") return getDisplayStatus(app) === "Ghosting";
  if (filter === "REJECTED_ATS") return getDisplayStatus(app) === "REJECTED_ATS";
  if (filter === "Rejected") return app.status === "Rejected" && !isAtsRejection(app);
  // Pipeline stages match the EFFECTIVE status (process-derived when assigned) —
  // the same stage the card displays, so a filter never contradicts the board.
  return effectiveStatusOf(app) === filter;
}

function companyCountLabel(count) {
  return `${count} ${count === 1 ? "company" : "companies"}`;
}

function getDisplayMeta(app) {
  return STATUS_META[getDisplayStatus(app)] || STATUS_META[app.status] || STATUS_META["Applied"];
}

function normalizeEvaluationResult(result) {
  if (!result) return null;
  const raw = result.rawEvaluation || result.evaluation || result;
  const score = Number(result.score ?? raw.matchScore ?? 0);
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  return {
    ...result,
    ok: result.ok !== false,
    score: safeScore,
    decision: result.decision || raw.applyOrSkip || "Maybe",
    analysis: result.analysis || result.explanation || raw.finalDecision || "",
    rawEvaluation: raw,
  };
}

// The single date shown inside the status pill: the stage date for OA / Phone /
// Loop stages. (The rejection date lives in the role's meta line instead, so it
// isn't duplicated on a rejected card.)
function getStatusPillDate(app) {
  const s = app.status;
  if (STAGE_DATE_STATUSES.has(s)) {
    return app.stageDateTimes?.[s] || (s === "Interview" ? app.interviewDate : null);
  }
  return null;
}

// Convert a date-input value ("YYYY-MM-DD") to a local-noon ISO timestamp, the
// same convention the server uses (avoids the UTC-midnight off-by-one-day).
function dateInputToISO(value) {
  const [y, m, d] = String(value || "").split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

// ── Side Panel ────────────────────────────────────────────────────────────────
function SidePanel({ app, onClose, onSave, saving, fetchApplications, store }) {
  const [editData, setEditData] = useState(() => ({ ...app }));
  const [dirty, setDirty] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(() =>
    app.evaluation ? normalizeEvaluationResult(app.evaluation) : null
  );
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const prevIdRef = useRef(app.id);

  // Reset when switching apps
  useEffect(() => {
    if (app.id !== prevIdRef.current) {
      setEditData({ ...app });
      setDirty(false);
      setEvaluation(app.evaluation ? normalizeEvaluationResult(app.evaluation) : null);
      prevIdRef.current = app.id;
    }
  }, [app.id]);

  // Sync fresh evaluation from app prop
  useEffect(() => {
    if (app.evaluation && !evaluation) {
      setEvaluation(normalizeEvaluationResult(app.evaluation));
    }
  }, [app.evaluation]);

  // Keep editData.status in sync with live app status
  useEffect(() => {
    setEditData((prev) => ({
      ...prev,
      status: app.status,
      stageDateTimes: { ...(app.stageDateTimes || {}), ...(prev.stageDateTimes || {}) },
    }));
  }, [app.status]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const set = (key, value) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const setStageDate = (value) => {
    const key = editData.status;
    const iso = dateInputToISO(value);
    setEditData((prev) => ({
      ...prev,
      stageDateTimes: { ...(prev.stageDateTimes || {}), [key]: iso },
      ...(key === "Interview" ? { interviewDate: iso } : {}),
    }));
    setDirty(true);
  };

  // Persist a status change FROM THE LIVE FORM STATE — building the PUT off the
  // last-saved snapshot would silently drop any unsaved field edits the user
  // typed before clicking a stage dot / Reject.
  const commitStatus = (status) => {
    const next = { ...editData, status };
    setEditData(next);
    setDirty(false);
    onSave(next);
  };

  const handlePipelineClick = (clickedStatus) => {
    if (clickedStatus === editData.status) {
      const idx = PIPELINE_FORWARD.indexOf(clickedStatus);
      commitStatus(idx > 0 ? PIPELINE_FORWARD[idx - 1] : "Applied");
    } else {
      commitStatus(clickedStatus);
    }
  };

  const handleSave = () => { onSave(editData); setDirty(false); };

  // Record a stage outcome without advancing the pipeline: passing an OA /
  // phone / loop tells you the result, not the next step — the card stays in
  // its stage with an "awaiting next step" badge until the recruiter moves.
  const handleMarkStagePassed = () => {
    const nowIso = new Date().toISOString();
    const next = {
      ...editData,
      stagePassedAt: { ...(editData.stagePassedAt || {}), [editData.status]: nowIso },
      // Passing an OA implies it was submitted.
      ...(editData.status === "Online Assessment" && !editData.oaCompletedAt ? { oaCompletedAt: nowIso } : {}),
    };
    setEditData(next);
    onSave(next);
  };

  const handleUnmarkStagePassed = () => {
    const nextPassed = { ...(editData.stagePassedAt || {}) };
    delete nextPassed[editData.status];
    const next = { ...editData, stagePassedAt: nextPassed };
    setEditData(next);
    onSave(next);
  };

  // Interview-process assignment / step advancement. The panel hands back the
  // whole next app (process fields + derived status); persist immediately, the
  // same way stage-passed does.
  const handleProcessChange = (next) => {
    setEditData(next);
    onSave(next);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      await fetch(`/api/applications/${encodeURIComponent(app.id)}`, { method: "DELETE" });
      if (fetchApplications) await fetchApplications();
      onClose();
    } catch {}
    finally { setDeleting(false); setDeleteConfirm(false); }
  };

  const handleEvaluate = async () => {
    setEvalLoading(true);
    try {
      // Evaluate the LIVE form state — the user pastes a job description into
      // the (still unsaved) textarea and expects that text to be what's scored.
      const res = await fetch("/api/evaluate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      const result = await res.json();
      if (result?.ok && result.evaluation) {
        const normed = normalizeEvaluationResult(result);
        setEvaluation(normed);
        await fetch(`/api/applications/${encodeURIComponent(app.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...editData, evaluation: normed }),
        });
        setDirty(false);
        if (fetchApplications) await fetchApplications();
      } else {
        setEvaluation({ ok: false, error: result?.error || "Evaluation failed — is your local AI running?" });
      }
    } catch {
      setEvaluation({ ok: false, error: "Network error calling the evaluation endpoint." });
    } finally {
      setEvalLoading(false);
    }
  };

  const currentMeta = STATUS_META[editData.status] || STATUS_META["Applied"];
  const stageDateValue = editData.stageDateTimes?.[editData.status] || (editData.status === "Interview" ? editData.interviewDate : "") || "";
  const skills = Array.isArray(editData.skills) ? editData.skills : (editData.skills || "").split(",").map((s) => s.trim()).filter(Boolean);

  const evalDecisionClass = evaluation?.decision
    ? evaluation.decision.toLowerCase() === "apply" ? "ndash-gemma-decision--apply"
    : evaluation.decision.toLowerCase() === "skip" ? "ndash-gemma-decision--skip"
    : "ndash-gemma-decision--maybe"
    : "ndash-gemma-decision--maybe";

  return (
    <aside className="ndash-panel">
      {/* Header */}
      <div className="ndash-panel-header" style={{ "--panel-accent": companyColor(editData.company || "") }}>
        <div className="ndash-panel-header-top">
          <div className="ndash-panel-avatar" style={{ background: `${companyColor(editData.company||"")}22`, color: companyColor(editData.company||"") }}>
            {getInitials(editData.company)}
          </div>
          <div className="ndash-panel-identity">
            <input
              className="ndash-panel-company ndash-panel-company--editable"
              value={editData.company || ""}
              onChange={(e) => set("company", e.target.value)}
              placeholder="Company name"
              aria-label="Company name"
            />
            <input
              className="ndash-panel-role ndash-panel-role--editable"
              value={editData.role || ""}
              onChange={(e) => set("role", e.target.value)}
              placeholder="Role title"
              aria-label="Role title"
            />
          </div>
          {editData.status !== "Rejected" && (
            <button
              type="button"
              className="ndash-reject-btn"
              onClick={() => commitStatus("Rejected")}
              title="Mark as Rejected"
            >
              ✕ Reject
            </button>
          )}
          <button className="ndash-panel-close" onClick={onClose} type="button" aria-label="Close">✕</button>
        </div>

        {/* A role with an ASSIGNED process shows its detailed process flow; a
            process-less role (incl. Applied / Saved) keeps the clickable generic
            pipeline so the user can one-click advance it to the next stage (or
            click the active stage to revert). Rejected stays read-only. */}
        <div className="ndash-pipeline">
          {(hasProcess(editData) || editData.status === "Rejected") ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Read-only (no onChange) for terminal Rejected, so ticking a stage
                  can't un-reject it. */}
              <ProcessProgressBar
                app={editData}
                store={store}
                onChange={editData.status === "Rejected" ? undefined : handleProcessChange}
                variant="panel"
                saving={saving}
              />
            </div>
          ) : (
            PIPELINE_FORWARD.map((status, idx) => {
              const m = STATUS_META[status];
              const isActive = editData.status === status;
              const isPast = statusStep(editData.status) > idx;
              return (
                <button
                  key={status}
                  className={`ndash-pipeline-step ${isActive ? "ndash-pipeline-step--active" : ""} ${isPast ? "ndash-pipeline-step--past" : ""} ${saving ? "ndash-pipeline-step--saving" : ""}`}
                  onClick={() => handlePipelineClick(status)}
                  type="button"
                  title={isActive ? `Click to revert to ${PIPELINE_FORWARD[idx - 1] || "Applied"}` : `Set to ${status}`}
                  style={isActive ? { "--step-color": m.color } : {}}
                >
                  <span className="ndash-pipeline-dot" style={{ background: isActive || isPast ? m.dot : "var(--md-outline-variant)" }} />
                  <span className="ndash-pipeline-label">{m.pipeShort}</span>
                </button>
              );
            })
          )}
          <button
            className={`ndash-pipeline-step ndash-pipeline-step--reject ${editData.status === "Rejected" ? "ndash-pipeline-step--active" : ""} ${saving ? "ndash-pipeline-step--saving" : ""}`}
            onClick={() => editData.status === "Rejected" ? commitStatus("Applied") : commitStatus("Rejected")}
            type="button"
            title={editData.status === "Rejected" ? "Revert status" : "Mark as Rejected"}
            style={editData.status === "Rejected" ? { "--step-color": STATUS_META["Rejected"].color } : {}}
          >
            <span className="ndash-pipeline-dot" style={{ background: editData.status === "Rejected" ? STATUS_META["Rejected"].dot : "var(--md-outline-variant)" }} />
            <span className="ndash-pipeline-label">{STATUS_META["Rejected"].pipeShort}</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="ndash-panel-body">
        {/* Stage date — hidden for process-tracked apps: their round dates live
            in stepProgress (this legacy field would be silently ignored). */}
        {!hasProcess(editData) && STAGE_DATE_STATUSES.has(editData.status) && (
          <div className="ndash-panel-field ndash-panel-field--stage">
            <label className="ndash-panel-label">
              <span className="ndash-stage-date-icon">📅</span>
              {editData.status === "Online Assessment" ? "Online Assessment Date" : editData.status === "Recruiter Screen" ? "Phone Interview Date" : "Loop Interview Date"}
            </label>
            <input
              type="date"
              className="ndash-panel-input"
              value={formatDateForInput(stageDateValue)}
              onChange={(e) => setStageDate(e.target.value)}
            />
          </div>
        )}

        {/* Stage outcome — passed, but next step unknown. Hidden for process-
            tracked apps, which use the richer interview-process tracker below. */}
        {!hasProcess(editData) && STAGE_DATE_STATUSES.has(editData.status) && (
          (editData.stagePassedAt || {})[editData.status] ? (
            <div className="ndash-stage-outcome ndash-stage-outcome--passed">
              <span className="ndash-stage-outcome-badge">
                ✓ {currentMeta.short} passed · {formatDate((editData.stagePassedAt || {})[editData.status])}
              </span>
              <span className="ndash-stage-outcome-hint">awaiting next step</span>
              <button type="button" className="ndash-stage-outcome-undo" onClick={handleUnmarkStagePassed} disabled={saving}>
                Undo
              </button>
            </div>
          ) : (
            <div className="ndash-stage-outcome">
              <button
                type="button"
                className="ndash-stage-outcome-btn"
                onClick={handleMarkStagePassed}
                disabled={saving}
                title="Record that you passed this stage — the card stays here until you know the next step"
              >
                ✓ Mark {currentMeta.short} passed
              </button>
              <span className="ndash-stage-outcome-hint">card stays in this stage until the next step is known</span>
            </div>
          )
        )}

        {/* Interview process tracker — assign a reusable process, then advance
            through its company-specific rounds (with a Waiting state between). */}
        <div className="ndash-panel-field">
          <ApplicationProcessPanel app={editData} onChange={handleProcessChange} saving={saving} />
        </div>

        {/* Core fields */}
        <div className="ndash-panel-grid">
          <div className="ndash-panel-field">
            <label className="ndash-panel-label">Location</label>
            <input className="ndash-panel-input" value={editData.location || ""} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Remote · Canada" />
          </div>
          <div className="ndash-panel-field">
            <label className="ndash-panel-label">Salary</label>
            <input className="ndash-panel-input" value={editData.salary || ""} onChange={(e) => set("salary", e.target.value)} placeholder="e.g. $180k – $220k" />
          </div>
          <div className="ndash-panel-field">
            <label className="ndash-panel-label">Level</label>
            <input className="ndash-panel-input" value={editData.level || ""} onChange={(e) => set("level", e.target.value)} placeholder="e.g. Senior / Staff" />
          </div>
          <div className="ndash-panel-field">
            <label className="ndash-panel-label">Group / Category</label>
            <input className="ndash-panel-input" value={editData.group || ""} onChange={(e) => set("group", e.target.value)} placeholder="e.g. Fintech" />
          </div>
        </div>

        {app.sourceUrl && (
          <a className="ndash-modal-url" href={app.sourceUrl} target="_blank" rel="noopener noreferrer">
            🔗 {app.sourceUrl.length > 55 ? app.sourceUrl.slice(0, 55) + "…" : app.sourceUrl}
          </a>
        )}

        <div className="ndash-panel-field">
          <label className="ndash-panel-label">Next action</label>
          <div style={{ display: "flex", gap: "6px" }}>
            <input className="ndash-panel-input" style={{ flex: 1 }} value={editData.nextAction || ""} onChange={(e) => set("nextAction", e.target.value)} placeholder="e.g. Send follow-up" />
            <input type="date" className="ndash-panel-input" style={{ width: "130px" }} value={formatDateForInput(editData.nextActionAt)} onChange={(e) => set("nextActionAt", e.target.value)} />
          </div>
        </div>

        {/* Job description — always editable */}
        <div className="ndash-panel-field">
          <label className="ndash-panel-label">Job description</label>
          <textarea
            className="ndash-panel-textarea"
            rows={4}
            value={editData.description || ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Paste or edit the job description…"
          />
        </div>

        <div className="ndash-panel-field">
          <label className="ndash-panel-label">Notes</label>
          <textarea className="ndash-panel-textarea" rows={3} value={editData.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Interview notes, company research…" />
        </div>

        {/* Gemma AI Evaluation */}
        <div className="ndash-panel-gemma">
          <div className="ndash-panel-gemma-header">
            <label className="ndash-panel-label" style={{ margin: 0 }}>✨ AI Evaluation</label>
            <button className="ndash-gemma-eval-btn" onClick={handleEvaluate} disabled={evalLoading} type="button">
              {evalLoading ? "Evaluating…" : evaluation ? "Re-evaluate" : "Evaluate"}
            </button>
          </div>
          {(evalLoading || evaluation) && (
            <div className="ndash-panel-gemma-body">
              {evalLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className="progress-bar-ind" style={{ flex: 1, height: "3px", borderRadius: "2px", background: "var(--md-outline-variant)", overflow: "hidden" }}>
                    <div style={{ width: "40%", height: "100%", background: "var(--md-primary)", borderRadius: "2px", animation: "ndash-progress 1.2s ease-in-out infinite" }} />
                  </div>
                  <span style={{ fontSize: "10px", color: "var(--md-on-surface-variant)" }}>Running…</span>
                </div>
              )}
              {!evalLoading && evaluation && (
                evaluation.ok ? (
                  <>
                    <div className="ndash-gemma-score-row">
                      <span className="ndash-gemma-score-value">{evaluation.score}/100</span>
                      <span className={`ndash-gemma-decision ${evalDecisionClass}`}>{evaluation.decision}</span>
                    </div>
                    {evaluation.analysis && <p className="ndash-gemma-analysis">{evaluation.analysis}</p>}
                  </>
                ) : (
                  <p className="ndash-gemma-error">{evaluation.error || "Evaluation unavailable."}</p>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="ndash-panel-footer">
        <button
          className={`ndash-delete-btn ${deleteConfirm ? "ndash-delete-btn--confirm" : ""}`}
          onClick={handleDelete}
          disabled={deleting}
          type="button"
          onBlur={() => setTimeout(() => setDeleteConfirm(false), 200)}
        >
          {deleting ? "Deleting…" : deleteConfirm ? "Confirm delete" : "🗑 Delete"}
        </button>
        {dirty ? (
          <button className="ndash-save-btn" onClick={handleSave} disabled={saving} type="button">
            {saving ? "Saving…" : "Save changes"}
          </button>
        ) : (
          <span className="ndash-panel-saved">All changes saved</span>
        )}
      </div>
    </aside>
  );
}

// Uniform pipeline stepper for CARDS: the SAME five stages for every company
// (Applied → Online Assessment → Phone → Loop → Offer), positioned by status, so
// every card reads identically and the grid stays aligned. The detailed
// per-company interview process lives in the side panel, not on the card. A
// single hover ✓ advances to the next stage; the panel handles everything else.
function PipelineStepper({ app, onAdvance, saving }) {
  // When ✓ advances into a stage that carries a date (OA / Phone / Loop), prompt
  // for it inline before committing — same as the old status picker did.
  const [dateValue, setDateValue] = useState(null); // string | null (null = not prompting)
  const total = PIPELINE_FORWARD.length;
  // When a company has an assigned interview process, the card position is DERIVED
  // from that process — so the card never disagrees with the side panel. Inline ✓
  // advance is only offered for process-less apps (process apps advance in the
  // panel, which keeps the canonical status in sync).
  const assigned = hasProcess(app);
  const cur = Math.min(Math.max(0, statusStep(effectiveStatusOf(app))), total - 1);
  const waiting = isWaiting(app);
  const curMeta = STATUS_META[PIPELINE_FORWARD[cur]] || STATUS_META["Applied"];
  const stageDate = getStatusPillDate(app);
  const dateLabel = stageDate ? formatDate(stageDate) : "";
  const next = assigned ? null : PIPELINE_FORWARD[cur + 1];

  const startAdvance = () => {
    if (!next) return;
    if (STAGE_DATE_STATUSES.has(next)) {
      const existing = app.stageDateTimes?.[next] || (next === "Interview" ? app.interviewDate : "");
      setDateValue(formatDateForInput(existing) || formatDateForInput(new Date().toISOString()));
    } else {
      onAdvance(app, next);
    }
  };
  const confirmAdvance = () => {
    if (dateValue === null) return;
    const iso = dateInputToISO(dateValue) || new Date().toISOString();
    onAdvance(app, next, {
      stageDateTimes: { ...(app.stageDateTimes || {}), [next]: iso },
      ...(next === "Interview" ? { interviewDate: iso } : {}),
    });
    setDateValue(null);
  };

  return (
    <div className="ppb ppb--card" onClick={(e) => e.stopPropagation()}>
      <div className="ppb-head">
        <div className="ppb-steps" role="img" aria-label={`Stage ${cur + 1} of ${total} — ${curMeta.short}${waiting ? ", waiting on the company" : ""}`}>
          {PIPELINE_FORWARD.map((key, i) => {
            const m = STATUS_META[key];
            const state = i < cur ? "done" : i === cur ? (waiting ? "waiting" : "current") : "pending";
            const filled = i > 0 && i <= cur;
            return (
              <React.Fragment key={key}>
                {i > 0 && (
                  <span className={`ppb-conn${filled ? " ppb-conn--done" : ""}`} style={filled ? { "--conn-color": STATUS_META[PIPELINE_FORWARD[i - 1]].dot } : undefined} />
                )}
                <span className={`ppb-dot ppb-dot--${state}`} style={{ "--dot-color": m.dot }} title={m.short} />
              </React.Fragment>
            );
          })}
        </div>
        <span className="ppb-label">
          <span className="ppb-stage">{curMeta.short}</span>
          {dateLabel && <span className="ppb-date">· {dateLabel}</span>}
          <span className="ppb-count">{cur + 1}/{total}</span>
        </span>
        {next && onAdvance && (
          <span className="ppb-actions">
            {dateValue !== null ? (
              <>
                <input
                  type="date"
                  className="ppb-dateinput"
                  autoFocus
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmAdvance(); if (e.key === "Escape") setDateValue(null); }}
                  onBlur={() => setDateValue(null)}
                  title={`${STATUS_META[next].short} date — Enter or ✓ to confirm, Esc to cancel`}
                />
                {/* onMouseDown so the click beats the input's cancel-on-blur. */}
                <button
                  type="button"
                  className="ppb-pass"
                  onMouseDown={(e) => { e.preventDefault(); confirmAdvance(); }}
                  disabled={saving}
                  title={`Confirm ${STATUS_META[next].short} date`}
                  aria-label={`Confirm ${STATUS_META[next].short} date`}
                >✓</button>
              </>
            ) : (
              <button type="button" className="ppb-pass" onClick={startAdvance} disabled={saving} title={`Advance to ${STATUS_META[next].short}`} aria-label={`Advance to ${STATUS_META[next].short}`}>✓</button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Role Row (inside company card) ────────────────────────────────────────────
function RoleRow({ app, isSelected, onSelect, onQuickStatusChange }) {
  // Display meta so the dot matches the row's real state — amber while Waiting,
  // grey when Ghosted, orange when Stalled — not just the raw pipeline colour.
  const dotColor = getDisplayMeta(app).dot;
  const applied = formatDate(getAppliedDate(app));
  const rejected = app.status === "Rejected"
    ? formatDate(app.rejectedAt || app.stageDateTimes?.Rejected)
    : null;

  // One quiet context chip framed by the row's display state.
  const displayStatus = getDisplayStatus(app);
  const waiting = displayStatus === "Waiting";
  const ghosted = displayStatus === "Ghosting";
  const stalledRow = displayStatus === "Stalled";
  const isTerminal = app.status === "Rejected" || app.status === "Offer";
  const daysInStage = isTerminal ? null : daysSinceCurrentStage(app);
  const dW = waiting ? (daysWaiting(app) ?? 0) : null;

  return (
    <div
      className={`ndc-role-row ${isSelected ? "ndc-role-row--active" : ""}`}
      onClick={() => onSelect(app)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(app);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <span className="ndc-role-dot" style={{ background: dotColor }} />
      <div className="ndc-role-info">
        <div className="ndc-role-head">
          <span className="ndc-role-title">{app.role || "Untitled role"}</span>
        </div>
        <div className="ndc-role-meta">
          {app.location && <span className="ndc-role-meta-item">📍 {app.location}</span>}
          {applied && <span className="ndc-role-meta-item">Applied {applied}</span>}
          {waiting && (
            <span className="ndc-role-meta-item ndc-role-meta-item--waiting" title="The ball is in their court">
              ⏳ Waiting {dW}d
            </span>
          )}
          {ghosted && (
            <span className="ndc-role-meta-item ndc-role-meta-item--silent" title={`No reply in ${daysInStage} days`}>
              ❄ {daysInStage}d silent
            </span>
          )}
          {stalledRow && (
            <span className="ndc-role-meta-item ndc-role-meta-item--idle" title={`Idle ${daysInStage} days in this stage`}>
              ⏳ idle {daysInStage}d
            </span>
          )}
          {!waiting && !ghosted && !stalledRow && daysInStage !== null && daysInStage >= 1 && (
            <span className="ndc-role-meta-item" title={`${daysInStage} days in current stage`}>
              ⏳ {daysInStage}d in stage
            </span>
          )}
          {rejected && (
            <span className="ndc-role-meta-item ndc-role-meta-item--rejected">Rejected {rejected}</span>
          )}
        </div>
        {/* Uniform pipeline stepper — only once a role has actually moved past
            Applied (an Applied card is just title + meta; no stepper noise). */}
        {app.status !== "Rejected" && app.status !== "Saved" && effectiveStatusOf(app) !== "Applied" && (
          <div className="ndc-role-progress" style={{ marginTop: 7 }}>
            <PipelineStepper app={app} onAdvance={onQuickStatusChange} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Company Card ──────────────────────────────────────────────────────────────
const MAX_VISIBLE_ROLES = 3;

function CompanyCard({ company, apps, selectedAppId, onSelect, onQuickStatusChange, index = 0 }) {
  const color = companyColor(company);
  const nonRejected = apps.filter((a) => a.status !== "Rejected");
  const isCold = (a) => { const d = getDisplayStatus(a); return d === "Stalled" || d === "Ghosting"; };

  // A quiet court summary replaces the old (redundant) "best stage" badge: it
  // says how many roles are waiting / active / cold — the per-role steppers carry
  // the stages themselves. Shown only on multi-role cards.
  const waitingCount = nonRejected.filter((a) => isWaiting(a)).length;
  const coldCount = nonRejected.filter(isCold).length;
  const activeCount = nonRejected.length - waitingCount - coldCount;
  const summaryParts = [];
  if (waitingCount) summaryParts.push(`${waitingCount} waiting`);
  if (activeCount) summaryParts.push(`${activeCount} active`);
  if (coldCount) summaryParts.push(`${coldCount} cold`);
  const courtSummary = summaryParts.join(" · ");

  // Waiting roles lead (most-overdue first), then by stage; cold roles sink.
  const sortedApps = [...apps].sort((a, b) => {
    const aw = isWaiting(a), bw = isWaiting(b);
    if (aw !== bw) return aw ? -1 : 1;
    if (aw && bw) return (daysWaiting(b) ?? 0) - (daysWaiting(a) ?? 0);
    return statusStep(b.status) - statusStep(a.status);
  });

  // Lead with the live (waiting/active) roles; tuck the cold roles + any overflow
  // behind the expander. A purely-cold card (Stalled/Ghosted band) shows its
  // cold roles normally.
  const liveApps = sortedApps.filter((a) => !isCold(a));
  const coldApps = sortedApps.filter((a) => isCold(a));
  const lead = liveApps.length ? liveApps : coldApps;   // primary roles for this band
  const rest = liveApps.length ? coldApps : [];          // cold roles tucked when there are live ones
  const orderedAll = [...lead, ...rest];
  const prominent = lead.slice(0, MAX_VISIBLE_ROLES);
  const hidden = [...lead.slice(MAX_VISIBLE_ROLES), ...rest];

  const hasSelectedHidden = hidden.some((a) => a.id === selectedAppId);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (hasSelectedHidden) setExpanded(true);
  }, [hasSelectedHidden]);

  const visibleRoles = expanded ? orderedAll : prominent;
  const hiddenCount = hidden.length;

  return (
    <div
      className={`ndc-company-card ${apps.some((a) => a.id === selectedAppId) ? "ndc-company-card--active" : ""}`}
      style={{ "--card-idx": index }}
    >
      <div className="ndc-company-header">
        <div className="ndc-company-avatar" style={{ background: `${color}22`, color }}>{getInitials(company)}</div>
        <div className="ndc-company-meta">
          <span className="ndc-company-name">{company}</span>
          <span className="ndc-company-count">{apps.length} {apps.length === 1 ? "role" : "roles"}</span>
        </div>
        {/* A quiet court summary (multi-role only) — not a clickable control. */}
        {apps.length > 1 && courtSummary && (
          <span className={`ndc-company-court ${waitingCount > 0 ? "ndc-company-court--waiting" : ""}`}>
            {courtSummary}
          </span>
        )}
      </div>
      <div className="ndc-role-list">
        {visibleRoles.map((app) => (
          <RoleRow
            key={app.id}
            app={app}
            isSelected={selectedAppId === app.id}
            onSelect={onSelect}
            onQuickStatusChange={onQuickStatusChange}
          />
        ))}
        {hiddenCount > 0 && (
          <button className="ndc-more-toggle" type="button" onClick={() => setExpanded((v) => !v)}>
            {expanded
              ? "▴ Show fewer roles"
              : `▾ +${hiddenCount} more ${hiddenCount === 1 ? "role" : "roles"}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Omni Search Tags ──────────────────────────────────────────────────────────
function SearchTags({ fieldFilters, onRemove }) {
  if (fieldFilters.length === 0) return null;
  return (
    <div className="ndash-search-tags">
      {fieldFilters.map((f) => (
        <span key={f.raw} className="ndash-search-tag">
          <span className="ndash-search-tag-field">{FIELD_LABELS[f.field] || f.field}</span>
          <span className="ndash-search-tag-sep">:</span>
          <span className="ndash-search-tag-value">{f.value}</span>
          <button
            className="ndash-search-tag-remove"
            onClick={() => onRemove(f.raw)}
            type="button"
            aria-label={`Remove ${f.field} filter`}
          >✕</button>
        </span>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
// ── Quick-add form ────────────────────────────────────────────────────────────
// The dashboard is the only application view, so it needs a manual entry point
// besides the extension: company + role + stage, POSTed to /api/applications
// (the server dedupes by sourceUrl / company+role).
const QUICK_ADD_STATUSES = ["Applied", "Online Assessment", "Recruiter Screen", "Interview", "Offer"];

function QuickAddForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ company: "", role: "", status: "Applied", location: "", salary: "", sourceUrl: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const companyRef = useRef(null);

  useEffect(() => { companyRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const now = new Date();
      const appliedAt = now.toISOString();
      const stageDateTimes = { Applied: appliedAt };
      if (form.status !== "Applied") stageDateTimes[form.status] = appliedAt;
      const payload = {
        ...form,
        company: form.company.trim(),
        role: form.role.trim(),
        source: "Manual",
        priority: "Medium",
        appliedAt,
        dateApplied: localDateString(now),
        stageDateTimes,
      };
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onCreated(await res.json());
    } catch {
      setError("Couldn't save — is the cockpit server running?");
      setSaving(false);
    }
  };

  return (
    <form className="ndash-quickadd" onSubmit={submit}>
      <div className="ndash-quickadd-grid">
        <input ref={companyRef} className="ndash-panel-input" placeholder="Company *" value={form.company} onChange={(e) => set("company", e.target.value)} required aria-label="Company" />
        <input className="ndash-panel-input" placeholder="Role *" value={form.role} onChange={(e) => set("role", e.target.value)} required aria-label="Role" />
        <select className="ndash-panel-input" value={form.status} onChange={(e) => set("status", e.target.value)} aria-label="Stage">
          {QUICK_ADD_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].short}</option>
          ))}
        </select>
        <input className="ndash-panel-input" placeholder="Location" value={form.location} onChange={(e) => set("location", e.target.value)} aria-label="Location" />
        <input className="ndash-panel-input" placeholder="Salary" value={form.salary} onChange={(e) => set("salary", e.target.value)} aria-label="Salary" />
        <input className="ndash-panel-input" placeholder="Job posting URL" value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} aria-label="Job posting URL" type="url" />
      </div>
      <div className="ndash-quickadd-actions">
        {error && <span className="ndash-quickadd-error">{error}</span>}
        <button type="button" className="ndash-quickadd-cancel" onClick={onClose}>Cancel</button>
        <button type="submit" className="ndash-quickadd-save" disabled={saving || !form.company.trim() || !form.role.trim()}>
          {saving ? "Saving…" : "＋ Add application"}
        </button>
      </div>
    </form>
  );
}

export default function Dashboard({
  applications,
  fetchApplications,
  openAppId,
  onOpenAppHandled,
  statusFilterOverride,
  onStatusFilterOverrideHandled,
}) {
  const [searchRaw, setSearchRaw] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedApp, setSelectedApp] = useState(null);
  const [saving, setSaving] = useState(false);
  // Only "In progress" stays open by default; everything else (Recently applied,
  // Stalled, Ghosted, Closed) starts collapsed — present, one click away, never hidden.
  const [collapsedSections, setCollapsedSections] = useState(() => new Set(["Recent", "Stalled", "Ghosting", "Rejected"]));
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  // Interview-process store — fetched once so every card can render its assigned
  // process or the inherited default along its progress bar.
  const [processStore, setProcessStore] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/interview-processes")
      .then((res) => (res.ok ? res.json() : null))
      .then((store) => { if (alive && store) setProcessStore(store); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // "/" focuses the omni search from anywhere on the dashboard.
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.tagName === "SELECT" || t?.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleSection = useCallback((key) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // Keep selectedApp fresh when applications update
  useEffect(() => {
    if (!selectedApp) return;
    const fresh = applications.find((a) => a.id === selectedApp.id);
    if (fresh) setSelectedApp(fresh);
  }, [applications]);

  useEffect(() => {
    if (!openAppId) return;
    const app = applications.find((a) => a.id === openAppId);
    if (!app) return;
    setSelectedApp(app);
    onOpenAppHandled?.();
  }, [openAppId, applications, onOpenAppHandled]);

  useEffect(() => {
    if (!statusFilterOverride) return;
    setStatusFilter(statusFilterOverride);
    // A rejected-status drill-down lands in the (collapsed-by-default) Closed
    // section — open it so the filter's results are actually visible.
    if (statusFilterOverride === "Rejected" || statusFilterOverride === "REJECTED_ATS") {
      setCollapsedSections((prev) => {
        const next = new Set(prev);
        next.delete("Rejected");
        return next;
      });
    }
    onStatusFilterOverrideHandled?.();
  }, [statusFilterOverride, onStatusFilterOverrideHandled]);

  const { fieldFilters, globalText } = useMemo(() => parseOmniSearch(searchRaw), [searchRaw]);

  const removeFilter = useCallback((rawToken) => {
    setSearchRaw((prev) => removeFilterFromRaw(prev, rawToken));
  }, []);

  const appMatches = useCallback((app) => {
    if (globalText) {
      const combined = [app.company, app.role, app.location, app.group,
        ...(Array.isArray(app.skills) ? app.skills : (app.skills || "").split(","))
      ].join(" ").toLowerCase();
      if (!combined.includes(globalText)) return false;
    }
    for (const { field, value } of fieldFilters) {
      if (!value) continue;
      if (field === "company" && !(app.company || "").toLowerCase().includes(value)) return false;
      if (field === "status") {
        const resolved = resolveStatus(value);
        const displayStatus = getDisplayStatus(app);
        const statusText = [
          app.status,
          displayStatus,
          STATUS_META[displayStatus]?.short,
          STATUS_META[app.status]?.short,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!matchesDisplayFilter(app, resolved) && !statusText.includes(value)) return false;
      }
      if (field === "location" && !(app.location || "").toLowerCase().includes(value)) return false;
      if (field === "skill") {
        const skills = Array.isArray(app.skills) ? app.skills : (app.skills || "").split(",");
        if (!skills.some((s) => s.toLowerCase().includes(value))) return false;
      }
      if (field === "group" && !(app.group || "").toLowerCase().includes(value)) return false;
    }
    return true;
  }, [globalText, fieldFilters]);

  const searchActive = globalText !== "" || fieldFilters.length > 0;

  // Time-sensitive reminders only: OAs to submit, interviews within the next week,
  // and overdue/today next-actions. Excludes the "ball in their court" items, so
  // it's a calm to-do nudge — not the Your-move/Waiting vanity counts.
  const attention = useMemo(() => buildAttentionItems(applications), [applications]);

  // ONE card per company, routed to a single band:
  //   In progress  — the process moved past step 1 (a later stage OR waiting
  //                  between rounds). Important: always shown, even when gone quiet.
  //   Recent       — every role still at Applied, applied within the last ~10 days.
  //   Stalled      — all roles still at Applied, idle 10–30 days.
  //   Ghosted      — all roles still at Applied, idle 30+ days.
  // Nothing is ever hidden — the lower three are just collapsed by default.
  const { companyGroups } = useMemo(() => {
    const byCompany = new Map();
    for (const app of applications) {
      if (!appMatches(app)) continue;
      if (app.status === "Rejected") continue;
      if (!matchesDisplayFilter(app, statusFilter)) continue;
      const key = app.company || "Unknown";
      if (!byCompany.has(key)) byCompany.set(key, []);
      byCompany.get(key).push(app);
    }

    const mostRecentDate = (apps) => {
      let max = 0;
      for (const a of apps) {
        const d = parseDateValue(getAppliedDate(a));
        if (d && d.getTime() > max) max = d.getTime();
      }
      return max;
    };

    const groups = Array.from(byCompany.entries()).map(([company, apps]) => {
      const nonRejected = apps.filter((a) => a.status !== "Rejected");
      // "Advanced" = the interview process moved past step 1 (Applied): any role at
      // a later stage, or waiting between rounds. These lead the board and never
      // get tucked away, even when they've gone quiet.
      const advanced = nonRejected.some((a) => statusStep(effectiveStatusOf(a)) > 0 || isWaiting(a));

      let band;
      if (advanced) {
        band = "InProgress";
      } else {
        // Every role still at step 1. Surface by the freshest role's age; only
        // genuinely cold roles fall into Stalled/Ghosted, so a never-applied
        // "Saved" lead (ageBand "terminal") stays in Recent rather than archived.
        const bands = nonRejected.map((a) => ageBand(a));
        if (bands.includes("active")) band = "Recent";
        else if (bands.includes("stalled")) band = "Stalled";
        else if (bands.includes("ghosting")) band = "Ghosting";
        else band = "Recent";
      }

      const bestStep = nonRejected.length ? Math.max(0, ...nonRejected.map((a) => statusStep(a.status))) : 0;
      const maxDaysWaiting = nonRejected.filter((a) => isWaiting(a)).reduce((m, a) => Math.max(m, daysWaiting(a) ?? 0), 0);

      // Within a card: waiting roles first (most-overdue first), then by stage.
      const sortedApps = [...apps].sort((a, b) => {
        const aw = isWaiting(a), bw = isWaiting(b);
        if (aw !== bw) return aw ? -1 : 1;
        if (aw && bw) return (daysWaiting(b) ?? 0) - (daysWaiting(a) ?? 0);
        return statusStep(b.status) - statusStep(a.status);
      });

      return { company, apps: sortedApps, band, bestStep, maxDaysWaiting, mostRecentDate: mostRecentDate(apps) };
    });

    return { companyGroups: groups };
  }, [applications, appMatches, statusFilter]);

  // Closed (rejected) companies — always present as a collapsed-by-default
  // category ("everything else"), narrowed by the search box AND the active
  // status filter (so a "Rejected ATS" drill-down filters here too, and an
  // "Interview" filter doesn't leave a stale full Closed list behind).
  const rejectedGroups = useMemo(() => {
    const companyMap = new Map();
    for (const app of applications) {
      if (!appMatches(app)) continue;
      if (app.status !== "Rejected") continue;
      if (!matchesDisplayFilter(app, statusFilter)) continue;
      const key = app.company || "Unknown";
      if (!companyMap.has(key)) companyMap.set(key, []);
      companyMap.get(key).push(app);
    }
    return Array.from(companyMap.entries())
      .map(([company, apps]) => ({ company, apps }))
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [applications, appMatches, statusFilter]);

  const handleSelectApp = useCallback((app) => {
    setSelectedApp((prev) => (prev?.id === app.id ? null : app));
  }, []);

  // Open the side panel for an app (e.g. from a deep-link).
  const handleOpenFromPulse = useCallback((appId) => {
    const app = applications.find((a) => a.id === appId);
    if (app) setSelectedApp(app);
  }, [applications]);

  const handleQuickAddCreated = useCallback(async (created) => {
    setQuickAddOpen(false);
    if (fetchApplications) await fetchApplications();
    if (created?.id) setSelectedApp(created);
  }, [fetchApplications]);

  // Quick status change from the card pill (without opening the panel). `extra`
  // carries the chosen stage date / interviewDate / rejectedAt so switching to
  // OA, Phone or Loop records the date the user picked.
  const handleQuickStatusChange = useCallback(async (app, newStatus, extra = {}) => {
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(app.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...app, status: newStatus, ...extra }),
      });
      if (res.ok && fetchApplications) await fetchApplications();
    } catch {}
  }, [fetchApplications]);

  const handleSave = useCallback(async (editData) => {
    if (!selectedApp || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(selectedApp.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedApp(updated);
        if (fetchApplications) await fetchApplications();
      }
    } catch {}
    finally { setSaving(false); }
  }, [selectedApp, saving, fetchApplications]);

  const totalCompanies = companyGroups.length + rejectedGroups.length;
  const totalRoles = companyGroups.reduce((s, g) => s + g.apps.length, 0)
    + rejectedGroups.reduce((s, g) => s + g.apps.length, 0);

  // The board, top → bottom. Nothing is hidden — only "In progress" is expanded by
  // default (see the initial collapsedSections); the rest are collapsed, one click
  // from view.
  //   In progress (expanded) → Recently applied (collapsed)
  //   → Stalled (collapsed) → Ghosted (collapsed) → Closed (collapsed)
  const stageSections = useMemo(() => {
    const byBand = (b) => companyGroups.filter((g) => g.band === b);
    const byRecency = (a, b) => (b.mostRecentDate - a.mostRecentDate) || a.company.localeCompare(b.company);
    const byStage = (a, b) => (b.bestStep - a.bestStep) || (b.maxDaysWaiting - a.maxDaysWaiting) || byRecency(a, b);

    const sections = [];
    const inProgress = byBand("InProgress").sort(byStage);
    if (inProgress.length) sections.push({ status: "InProgress", companies: inProgress });
    const recent = byBand("Recent").sort(byRecency);
    if (recent.length) sections.push({ status: "Recent", companies: recent });
    const stalled = byBand("Stalled").sort(byRecency);
    if (stalled.length) sections.push({ status: "Stalled", companies: stalled });
    const ghosted = byBand("Ghosting").sort(byRecency);
    if (ghosted.length) sections.push({ status: "Ghosting", companies: ghosted });
    return sections;
  }, [companyGroups]);

  return (
    <div className={`ndash-root ${selectedApp ? "ndash-root--panel-open" : ""}`}>
      {/* ── Left: card area ─────────────────────── */}
      <div className="ndash-main">
        {/* Topbar */}
        <div className="ndash-topbar">
          <div className="ndash-topbar-left">
            <h2 className="ndash-title">Pipeline</h2>
            <span className="ndash-total-badge">
              {totalRoles} {totalRoles === 1 ? "role" : "roles"} · {totalCompanies} {totalCompanies === 1 ? "company" : "companies"}
            </span>
            {/* Active status filter (set by an Analytics drill-down) — always
                visible and one click to clear, so it can never silently hide
                the rest of the board. */}
            {statusFilter !== "All" && (
              <button
                type="button"
                className="ndash-filter-pill"
                onClick={() => setStatusFilter("All")}
                title="Clear this filter"
              >
                <span className="ndash-filter-pill-dot" style={{ background: (STATUS_META[statusFilter] || STATUS_META["Applied"]).dot }} />
                {STATUS_META[statusFilter]?.short || statusFilter}
                <span className="ndash-filter-pill-x" aria-hidden="true">✕</span>
              </button>
            )}
          </div>
          <div className="ndash-search-wrap">
            <span className="ndash-search-icon">⌕</span>
            <input
              ref={searchRef}
              className="ndash-search"
              type="text"
              placeholder="Search… or @company: @status: @location: @skill:"
              value={searchRaw}
              onChange={(e) => setSearchRaw(e.target.value)}
              aria-label="Search jobs"
            />
            {searchRaw && (
              <button className="ndash-search-clear" onClick={() => setSearchRaw("")} type="button" aria-label="Clear search">✕</button>
            )}
          </div>
          <div className="ndash-topbar-actions">
            <button
              className={`ndash-add-btn ${quickAddOpen ? "ndash-add-btn--open" : ""}`}
              onClick={() => setQuickAddOpen((v) => !v)}
              type="button"
              title="Add an application manually"
              aria-expanded={quickAddOpen}
            >
              <span aria-hidden="true">＋</span>
              <span>Add</span>
            </button>
            <a
              className="ndash-export-btn"
              href="/api/export.json"
              download
              title="Export applications as JSON"
              aria-label="Export applications as JSON"
            >
              <span className="ndash-export-icon" aria-hidden="true">⇩</span>
              <span>JSON</span>
            </a>
          </div>
        </div>

        {/* Quick-add */}
        {quickAddOpen && (
          <QuickAddForm onClose={() => setQuickAddOpen(false)} onCreated={handleQuickAddCreated} />
        )}

        {/* Search tags */}
        <SearchTags fieldFilters={fieldFilters} onRemove={removeFilter} />

        {/* Time-sensitive reminders — only when something actually needs a hand. */}
        {attention.length > 0 && !searchActive && (
          <div className="ndash-reminders" aria-label="Needs attention soon">
            <span className="ndash-reminders-icon" aria-hidden="true">⏰</span>
            {attention.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`ndash-reminder ndash-reminder--${item.kind}`}
                onClick={() => handleOpenFromPulse(item.id)}
                title={`${item.company} — ${item.role}`}
              >
                <span className="ndash-reminder-label">{item.label}</span>
                <span className="ndash-reminder-co">{item.company}</span>
                {item.date && (
                  <span className="ndash-reminder-date">
                    {item.kind === "action" ? formatNextActionDue(item.date) : formatDate(item.date)}
                  </span>
                )}
              </button>
            ))}
            {attention.length > 5 && <span className="ndash-reminder-more">+{attention.length - 5} more</span>}
          </div>
        )}

        {/* Content */}
        <div className="ndash-content">
          {stageSections.length === 0 && rejectedGroups.length === 0 && (
            applications.length === 0 ? (
              <div className="ndash-empty">
                <div className="ndash-empty-icon">🚀</div>
                <strong>No applications yet</strong>
                <p>Add your first application manually, or capture one from a job posting with the Claire extension.</p>
                <button className="ndash-empty-add" type="button" onClick={() => setQuickAddOpen(true)}>
                  ＋ Add your first application
                </button>
              </div>
            ) : (
              <div className="ndash-empty">
                <div className="ndash-empty-icon">🔍</div>
                <strong>No results</strong>
                <p>{searchRaw ? `No applications match "${searchRaw}"` : "Nothing in this view."}</p>
                {statusFilter !== "All" && (
                  <button className="ndash-empty-add" type="button" onClick={() => setStatusFilter("All")}>
                    Clear the “{STATUS_META[statusFilter]?.short || statusFilter}” filter
                  </button>
                )}
              </div>
            )
          )}

          {stageSections.map(({ status, companies }) => {
            const m = STATUS_META[status] || STATUS_META["Applied"];
            const sectionRoles = companies.reduce((s, g) => s + g.apps.length, 0);
            const sectionCompanies = companies.length;
            const collapsed = collapsedSections.has(status);
            const sectionClass = [
              "ndash-stage-section",
              collapsed ? "ndash-stage-section--collapsed" : "",
              status === "InProgress" ? "ndash-stage-section--inprogress" : "",
              status === "Recent" ? "ndash-stage-section--recent" : "",
              status === "Stalled" ? "ndash-stage-section--stalled" : "",
              status === "Ghosting" ? "ndash-stage-section--ghosting" : "",
            ].filter(Boolean).join(" ");
            const cardProps = {
              selectedAppId: selectedApp?.id,
              onSelect: handleSelectApp,
              onQuickStatusChange: handleQuickStatusChange,
            };
            return (
              <section key={status} id={`ndash-section-${status}`} className={sectionClass}>
                <div
                  className="ndash-section-header"
                  onClick={() => toggleSection(status)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggleSection(status))}
                  aria-expanded={!collapsed}
                  title={collapsed ? "Expand section" : "Collapse section"}
                >
                  <span className="ndash-section-chevron">▾</span>
                  <span className="ndash-section-dot" style={{ background: m.dot }} />
                  <span className="ndash-section-label" style={{ color: m.color }}>{m.short || status}</span>
                  <span className="ndash-section-count">{sectionRoles} {sectionRoles === 1 ? "role" : "roles"} · {companyCountLabel(sectionCompanies)}</span>
                </div>
                {!collapsed && (
                  <div className="ndash-section-body">
                    <div className="ndc-company-grid">
                      {companies.map((g, idx) => (
                        <CompanyCard key={g.company} company={g.company} apps={g.apps} index={idx} {...cardProps} />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}

          {rejectedGroups.length > 0 && (() => {
            const rejectedMeta = STATUS_META["Rejected"];
            const collapsed = collapsedSections.has("Rejected");
            const r = rejectedGroups.reduce((s, g) => s + g.apps.length, 0);
            return (
              <section id="ndash-section-Rejected" className={`ndash-stage-section ndash-stage-section--ghosting ${collapsed ? "ndash-stage-section--collapsed" : ""}`}>
                <div
                  className="ndash-section-header"
                  onClick={() => toggleSection("Rejected")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggleSection("Rejected"))}
                  aria-expanded={!collapsed}
                  title={collapsed ? "Expand section" : "Collapse section"}
                >
                  <span className="ndash-section-chevron">▾</span>
                  <span className="ndash-section-dot" style={{ background: rejectedMeta.dot }} />
                  <span className="ndash-section-label" style={{ color: rejectedMeta.color }}>Closed</span>
                  <span className="ndash-section-count">{r} {r === 1 ? "role" : "roles"} · {companyCountLabel(rejectedGroups.length)}</span>
                </div>
                {!collapsed && (
                  <div className="ndash-section-body">
                    <div className="ndc-company-grid">
                      {rejectedGroups.map(({ company, apps }, idx) => (
                        <CompanyCard
                          key={`rejected-${company}`}
                          company={company}
                          apps={apps}
                          selectedAppId={selectedApp?.id}
                          onSelect={handleSelectApp}
                          onQuickStatusChange={handleQuickStatusChange}
                          index={idx}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })()}
        </div>
      </div>

      {/* ── Right: side panel ───────────────────── */}
      {selectedApp && (
        <SidePanel
          key={selectedApp.id}
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onSave={handleSave}
          saving={saving}
          fetchApplications={fetchApplications}
          store={processStore}
        />
      )}
    </div>
  );
}

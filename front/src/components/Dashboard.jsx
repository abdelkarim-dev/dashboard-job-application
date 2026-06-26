import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  isStale,
  parseDateValue,
  buildAttentionItems,
  computeResponseStats,
  weeklyApplicationCounts,
  formatNextActionDue,
  localDateString,
  daysSinceCurrentStage,
} from "../lib/metrics.mjs";
import { hasProcess, isProcessWaiting, processSummary, getDefaultProcess } from "../lib/process.mjs";
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
  "Waiting":           { short: "Waiting",             pipeShort: "Waiting",            color: "#f5a524",            bg: "rgba(245, 165, 36, 0.14)", dot: "#f5a524",            step: 0 },
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

// ── Derived status helpers ────────────────────────────────────────────────────

function isAtsRejection(app) {
  if (app.status !== "Rejected") return false;
  const rejectedDate = parseDateValue(app.rejectedAt || app.stageDateTimes?.Rejected);
  const appliedDate = parseDateValue(app.appliedAt || app.dateApplied || app.createdAt);
  if (!rejectedDate || !appliedDate) return false;
  const daysDiff = (rejectedDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff >= 0 && daysDiff <= 3;
}

function isDisplayStalled(app) {
  return app.status === "Applied" && isStale(app);
}

function getDisplayStatus(app) {
  // "Waiting" overlays an in-flight process sitting between rounds. It wins over
  // Stalled (you're mid-process, not idle) but never over a rejection.
  if (app.status !== "Rejected" && isProcessWaiting(app)) return "Waiting";
  if (isDisplayStalled(app)) return "Stalled";
  if (isAtsRejection(app)) return "REJECTED_ATS";
  return app.status;
}

function matchesDisplayFilter(app, filter) {
  if (filter === "All") return true;
  if (filter === "Today") return isAppliedToday(app) && app.status !== "Rejected";
  if (filter === "Waiting") return getDisplayStatus(app) === "Waiting";
  if (filter === "Stalled") return isDisplayStalled(app);
  if (filter === "REJECTED_ATS") return getDisplayStatus(app) === "REJECTED_ATS";
  if (filter === "Rejected") return app.status === "Rejected" && !isAtsRejection(app);
  return app.status === filter;
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

// ── Status Quick Picker ───────────────────────────────────────────────────────
// One clickable pill that shows the role's status AND its date (e.g. "Phone
// Interview · Jun 16"). Switching to a stage that needs a date (OA / Phone /
// Loop) prompts for one inline; rejection records the date of the action (now).
function StatusPicker({ app, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const [dateStep, setDateStep] = useState(null); // { status, value } | null
  const ref = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) { setDateStep(null); return; }
    const close = (e) => {
      if (ref.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const closeOnViewportChange = () => setOpen(false);
    const closeOnEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close, true);
    window.addEventListener("scroll", closeOnViewportChange, true);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close, true);
      window.removeEventListener("scroll", closeOnViewportChange, true);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const displayStatus = getDisplayStatus(app);
  const meta = STATUS_META[displayStatus] || STATUS_META["Applied"];
  const isAts = displayStatus === "REJECTED_ATS";
  const pillDate = getStatusPillDate(app);
  const pillDateLabel = pillDate ? formatDate(pillDate) : null;

  const toggleOpen = (e) => {
    e.stopPropagation();
    if (isAts) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 210;
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    setMenuPos({ top: rect.bottom + 6, left });
    setOpen((value) => !value);
  };

  const commit = (status, extra) => {
    onStatusChange(app, status, extra);
    setOpen(false);
    setDateStep(null);
  };

  const pickStatus = (e, status) => {
    e.stopPropagation();
    if (STAGE_DATE_STATUSES.has(status)) {
      const existing = app.stageDateTimes?.[status] || (status === "Interview" ? app.interviewDate : "");
      setDateStep({
        status,
        value: formatDateForInput(existing) || formatDateForInput(new Date().toISOString()),
      });
    } else if (status === "Rejected") {
      commit("Rejected", { rejectedAt: new Date().toISOString() });
    } else {
      commit(status);
    }
  };

  const confirmDate = (e) => {
    e.stopPropagation();
    if (!dateStep) return;
    const { status, value } = dateStep;
    const iso = dateInputToISO(value) || new Date().toISOString();
    commit(status, {
      stageDateTimes: { ...(app.stageDateTimes || {}), [status]: iso },
      ...(status === "Interview" ? { interviewDate: iso } : {}),
    });
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className={`ndc-status-pill${isAts ? " ndc-status-pill--ats" : ""}`}
        style={{ color: meta.color, background: meta.bg }}
        onClick={toggleOpen}
        title={isAts ? "Auto-rejected by ATS (within 3 days of applying)" : "Click to change status"}
        type="button"
      >
        <span className="ndc-status-pill-dot" style={{ background: meta.dot }} />
        <span className="ndc-status-pill-label">{meta.short}</span>
        {pillDateLabel && <span className="ndc-status-pill-date">· {pillDateLabel}</span>}
        {!isAts && <span className="ndc-status-pill-arrow">▾</span>}
      </button>
      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          className="ndc-status-menu ndc-status-menu--floating"
          style={{ top: menuPos.top, left: menuPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {dateStep ? (
            <div className="ndc-status-datestep">
              <div className="ndc-status-datestep-title">
                <span className="ndc-status-datestep-cal">📅</span>
                {STATUS_META[dateStep.status]?.short} date
              </div>
              <input
                type="date"
                className="ndc-status-datestep-input"
                autoFocus
                value={dateStep.value}
                onChange={(e) => setDateStep((s) => ({ ...s, value: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") confirmDate(e); }}
              />
              <div className="ndc-status-datestep-actions">
                <button type="button" className="ndc-status-datestep-back" onClick={(e) => { e.stopPropagation(); setDateStep(null); }}>
                  ‹ Back
                </button>
                <button type="button" className="ndc-status-datestep-set" onClick={confirmDate}>
                  Set status
                </button>
              </div>
            </div>
          ) : (
            [...PIPELINE_FORWARD, "Rejected"].map(status => {
              const m = STATUS_META[status];
              const needsDate = STAGE_DATE_STATUSES.has(status);
              return (
                <button
                  key={status}
                  className={`ndc-status-menu-item ${app.status === status ? "ndc-status-menu-item--active" : ""}`}
                  onClick={(e) => pickStatus(e, status)}
                  type="button"
                >
                  <span className="ndc-status-menu-dot" style={{ background: m.dot }} />
                  <span className="ndc-status-menu-label">{m.short}</span>
                  {needsDate && <span className="ndc-status-menu-cal" title="Asks for a date">📅</span>}
                </button>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Side Panel ────────────────────────────────────────────────────────────────
function SidePanel({ app, allApps, onClose, onStatusChange, onSave, saving, fetchApplications, store }) {
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

  const handlePipelineClick = (clickedStatus) => {
    if (clickedStatus === editData.status) {
      const idx = PIPELINE_FORWARD.indexOf(clickedStatus);
      const prev = idx > 0 ? PIPELINE_FORWARD[idx - 1] : "Applied";
      onStatusChange(prev);
    } else {
      onStatusChange(clickedStatus);
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
      const res = await fetch("/api/evaluate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app),
      });
      const result = await res.json();
      if (result?.ok && result.evaluation) {
        const normed = normalizeEvaluationResult(result);
        setEvaluation(normed);
        await fetch(`/api/applications/${encodeURIComponent(app.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...app, evaluation: normed }),
        });
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
              onClick={() => onStatusChange("Rejected")}
              title="Mark as Rejected"
            >
              ✕ Reject
            </button>
          )}
          <button className="ndash-panel-close" onClick={onClose} type="button" aria-label="Close">✕</button>
        </div>

        {/* When a process applies (assigned, or the inherited default), the stage
            position shows as the process flow instead of the generic pipeline. */}
        <div className="ndash-pipeline">
          {(hasProcess(editData) || (store && getDefaultProcess(store))) ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <ProcessProgressBar app={editData} store={store} onChange={handleProcessChange} variant="panel" saving={saving} />
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
            onClick={() => editData.status === "Rejected" ? handlePipelineClick("Rejected") : onStatusChange("Rejected")}
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
        {/* Stage date */}
        {STAGE_DATE_STATUSES.has(editData.status) && (
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

// ── Role Row (inside company card) ────────────────────────────────────────────
function RoleRow({ app, isSelected, onSelect, onQuickStatusChange, store, onProcessPatch }) {
  const meta = getDisplayMeta(app);
  const applied = formatDate(getAppliedDate(app));
  const rejected = app.status === "Rejected"
    ? formatDate(app.rejectedAt || app.stageDateTimes?.Rejected)
    : null;
  const stale = isStale(app);
  // Stage passed but next step unknown — the user did their part, the ball is
  // in the company's court.
  const stagePassed = (app.stagePassedAt || {})[app.status];
  const proc = hasProcess(app) ? processSummary(app) : null;
  // Days the application has sat in its current stage — i.e. how long it has been
  // stalled. Null for terminal apps (Offer/Rejected) or when no usable timestamp.
  const isTerminal = app.status === "Rejected" || app.status === "Offer";
  const daysInStage = isTerminal ? null : daysSinceCurrentStage(app);

  return (
    <div
      className={`ndc-role-row ${isSelected ? "ndc-role-row--active" : ""} ${stale ? "ndc-role-row--stale" : ""}`}
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
      <span className="ndc-role-dot" style={{ background: meta.dot }} />
      <div className="ndc-role-info">
        <div className="ndc-role-head">
          <span className="ndc-role-title">{app.role || "Untitled role"}</span>
          {/* The single status control — shows status + its date, click to change. */}
          <div className="ndc-role-status" onClick={(e) => e.stopPropagation()}>
            <StatusPicker app={app} onStatusChange={onQuickStatusChange} />
          </div>
        </div>
        <div className="ndc-role-meta">
          {app.location && <span className="ndc-role-meta-item">📍 {app.location}</span>}
          {applied && <span className="ndc-role-meta-item">Applied {applied}</span>}
          {daysInStage !== null && daysInStage >= 1 && (
            <span
              className="ndc-role-meta-item"
              style={{ color: stale ? "var(--s-stalled-dot)" : undefined, fontWeight: stale ? 600 : undefined }}
              title={stale ? `Idle in this stage for ${daysInStage} days (10+ = stalled)` : `${daysInStage} days in current stage`}
            >
              {stale ? "⚠ " : "⏳ "}{daysInStage}d {stale ? "stalled" : "in stage"}
            </span>
          )}
          {!proc && stagePassed && (
            <span className="ndc-role-meta-item ndc-role-meta-item--passed" title={`Passed ${formatDate(stagePassed)} — awaiting next step`}>
              ✓ Passed · awaiting next step
            </span>
          )}
          {rejected && (
            <span className="ndc-role-meta-item ndc-role-meta-item--rejected">Rejected {rejected}</span>
          )}
        </div>
        {/* Stage-aware process progress bar (assigned process, or the inherited
            default). Lets the user assign a date / mark the stage passed inline. */}
        {app.status !== "Rejected" && (
          <div className="ndc-role-progress" style={{ marginTop: 7 }}>
            <ProcessProgressBar
              app={app}
              store={store}
              onChange={(next) => onProcessPatch && onProcessPatch(app, next)}
              variant="card"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Company Card ──────────────────────────────────────────────────────────────
const MAX_VISIBLE_ROLES = 3;

function CompanyCard({ company, apps, selectedAppId, onSelect, onQuickStatusChange, index = 0, store, onProcessPatch }) {
  const color = companyColor(company);
  const nonRejected = apps.filter((a) => a.status !== "Rejected");
  const bestStep = nonRejected.length ? Math.max(0, ...nonRejected.map((a) => statusStep(a.status))) : -1;
  const bestStatus = nonRejected.length ? (PIPELINE_FORWARD[bestStep] || "Applied") : "Rejected";

  // Use display meta for the company-level badge
  const allStalled = nonRejected.length > 0 && nonRejected.every(a => isDisplayStalled(a));
  const companyDisplayStatus = allStalled ? "Stalled" : bestStatus;
  const bestMeta = STATUS_META[companyDisplayStatus] || STATUS_META["Applied"];

  const sortedApps = [...apps].sort((a, b) => {
    if (isStale(a) && !isStale(b)) return 1;
    if (!isStale(a) && isStale(b)) return -1;
    return statusStep(b.status) - statusStep(a.status);
  });

  // Prominence logic: advanced roles lead, while older applied roles stay tucked
  // behind the expander. Stalled roles are split into their own section upstream.
  let prominent, hidden;
  if (bestStep > 0) {
    prominent = sortedApps.filter((a) => statusStep(a.status) > 0);
    hidden = sortedApps.filter((a) => statusStep(a.status) === 0);
  } else {
    prominent = sortedApps.slice(0, MAX_VISIBLE_ROLES);
    hidden = sortedApps.slice(MAX_VISIBLE_ROLES);
  }

  const hasSelectedHidden = hidden.some((a) => a.id === selectedAppId);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (hasSelectedHidden) setExpanded(true);
  }, [hasSelectedHidden]);

  const visibleRoles = expanded ? sortedApps : prominent;
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
        {/* Company-level badge is NOT clickable — only role-level badges are */}
        <span className="ndc-company-best" style={{ color: bestMeta.color, background: bestMeta.bg }}>
          {bestMeta.short}
        </span>
      </div>
      <div className="ndc-role-list">
        {visibleRoles.map((app) => (
          <RoleRow
            key={app.id}
            app={app}
            isSelected={selectedAppId === app.id}
            onSelect={onSelect}
            onQuickStatusChange={onQuickStatusChange}
            store={store}
            onProcessPatch={onProcessPatch}
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
function SearchTags({ fieldFilters, searchRaw, onRemove }) {
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

// ── Pulse strip: key pipeline numbers + what needs attention today ───────────
function DashboardPulse({ applications, onOpenApp, onShowStalled }) {
  const stats = useMemo(() => {
    const active = applications.filter((a) => a.status !== "Rejected");
    const interviewing = active.filter((a) =>
      a.status === "Online Assessment" || a.status === "Recruiter Screen" || a.status === "Interview"
    ).length;
    const offers = active.filter((a) => a.status === "Offer").length;
    const { responseRate } = computeResponseStats(applications);
    const weekly = weeklyApplicationCounts(applications, { weeks: 1 });
    return {
      active: active.length,
      interviewing,
      offers,
      responseRate,
      thisWeek: weekly[weekly.length - 1]?.count || 0,
    };
  }, [applications]);

  const attention = useMemo(() => buildAttentionItems(applications), [applications]);
  const stalledCount = useMemo(() => applications.filter(isDisplayStalled).length, [applications]);

  const tiles = [
    { label: "active roles", value: stats.active },
    { label: "interviewing", value: stats.interviewing },
    { label: "offers", value: stats.offers },
    { label: "response rate", value: `${stats.responseRate}%` },
    { label: "this week", value: stats.thisWeek },
  ];

  return (
    <div className="ndash-pulse">
      <div className="ndash-pulse-stats" role="list" aria-label="Pipeline overview">
        {tiles.map(({ label, value }) => (
          <div className="ndash-pulse-tile" role="listitem" key={label}>
            <span className="ndash-pulse-value">{value}</span>
            <span className="ndash-pulse-label">{label}</span>
          </div>
        ))}
      </div>
      <div className="ndash-pulse-attention">
        {attention.length === 0 && stalledCount === 0 ? (
          <span className="ndash-pulse-clear">✓ All caught up — nothing needs attention today</span>
        ) : (
          <>
            {attention.length > 0 && <span className="ndash-pulse-attn-label">Needs attention</span>}
            {attention.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`ndash-pulse-item ndash-pulse-item--${item.kind}`}
                onClick={() => onOpenApp(item.id)}
                title={`${item.company} — ${item.role}`}
              >
                <span className="ndash-pulse-item-kind">{item.label}</span>
                <span className="ndash-pulse-item-co">{item.company}</span>
                {item.date && (
                  <span className="ndash-pulse-item-date">
                    {item.kind === "action" ? formatNextActionDue(item.date) : formatDate(item.date)}
                  </span>
                )}
              </button>
            ))}
            {attention.length > 5 && <span className="ndash-pulse-more">+{attention.length - 5} more</span>}
            {stalledCount > 0 && (
              <button type="button" className="ndash-pulse-item ndash-pulse-item--stalled" onClick={onShowStalled}>
                <span className="ndash-pulse-item-kind">Stalled</span>
                <span className="ndash-pulse-item-co">{stalledCount} {stalledCount === 1 ? "role" : "roles"} idle 10+ days</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
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
  const [collapsedSections, setCollapsedSections] = useState(() => new Set());
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

  // Build company groups. Stalled roles get their own company grouping so they
  // never disappear inside an active company card.
  const { companyGroups } = useMemo(() => {
    const activeMap = new Map();
    const stalledMap = new Map();

    const addToMap = (map, app) => {
      const key = app.company || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(app);
    };

    for (const app of applications) {
      if (!appMatches(app)) continue;
      const displayStatus = getDisplayStatus(app);
      if (app.status === "Rejected") continue;
      if (!matchesDisplayFilter(app, statusFilter)) continue;
      if (displayStatus === "Stalled") {
        addToMap(stalledMap, app);
      } else {
        addToMap(activeMap, app);
      }
    }

    const activeGroups = Array.from(activeMap.entries())
      .map(([company, apps]) => {
        const nonRejected = apps.filter(a => a.status !== "Rejected");
        const bestStep = nonRejected.length ? Math.max(0, ...nonRejected.map((a) => statusStep(a.status))) : -1;
        return {
          company,
          apps: [...apps].sort((a, b) => {
            return statusStep(b.status) - statusStep(a.status);
          }),
          bestStep,
          displayCategory: PIPELINE_FORWARD[Math.max(0, bestStep)] || "Applied",
        };
      });

    const getMostRecentDate = (apps) => {
      let max = 0;
      for (const a of apps) {
        const d = parseDateValue(getAppliedDate(a));
        if (d && d.getTime() > max) max = d.getTime();
      }
      return max;
    };

    const stalledGroups = Array.from(stalledMap.entries())
      .map(([company, apps]) => ({
        company,
        apps: [...apps].sort((a, b) => String(a.role || "").localeCompare(String(b.role || ""))),
        bestStep: -0.5,
        displayCategory: "Stalled",
        mostRecentDate: getMostRecentDate(apps),
      }));

    const activeGroupsWithDate = activeGroups.map(g => ({
      ...g,
      mostRecentDate: getMostRecentDate(g.apps),
    }));

    const sorted = [...activeGroupsWithDate, ...stalledGroups]
      .sort((a, b) => {
        if (b.bestStep !== a.bestStep) return b.bestStep - a.bestStep;
        return b.mostRecentDate - a.mostRecentDate || a.company.localeCompare(b.company);
      });

    return { companyGroups: sorted };
  }, [applications, appMatches, statusFilter]);

  // Rejected companies (when searched or explicitly filtered).
  const rejectedGroups = useMemo(() => {
    const rejectedFilterActive = statusFilter === "Rejected" || statusFilter === "REJECTED_ATS";
    if (!searchActive && !rejectedFilterActive) return [];
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
  }, [applications, appMatches, searchActive, statusFilter]);

  const handleSelectApp = useCallback((app) => {
    setSelectedApp((prev) => (prev?.id === app.id ? null : app));
  }, []);

  // Open the side panel for an app surfaced by the pulse strip.
  const handleOpenFromPulse = useCallback((appId) => {
    const app = applications.find((a) => a.id === appId);
    if (app) setSelectedApp(app);
  }, [applications]);

  const handleQuickAddCreated = useCallback(async (created) => {
    setQuickAddOpen(false);
    if (fetchApplications) await fetchApplications();
    if (created?.id) setSelectedApp(created);
  }, [fetchApplications]);

  const handleStatusChange = useCallback(async (newStatus) => {
    if (!selectedApp || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(selectedApp.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...selectedApp, status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedApp(updated);
        if (fetchApplications) await fetchApplications();
      }
    } catch {}
    finally { setSaving(false); }
  }, [selectedApp, saving, fetchApplications]);

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

  // Persist a full process patch (assign default / set a stage date / mark a
  // stage passed) coming from a card's progress bar. `nextApp` already carries
  // the updated process fields + derived status.
  const handleProcessPatch = useCallback(async (app, nextApp) => {
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(app.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextApp),
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

  // Group companies into sections:
  //   Offer → Loop → Phone → OA → Applied Today → Applied → Stalled
  // "Applied Today" = Applied-status companies applied today, excluded from regular Applied.
  const stageSections = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Companies applied today that haven't advanced past Applied (Applied or Stalled display) → own section
    const ADVANCED = new Set(["Online Assessment", "Recruiter Screen", "Interview", "Offer"]);
    const appliedTodayCompanies = companyGroups.filter(
      (g) => g.mostRecentDate >= todayStart && !ADVANCED.has(g.displayCategory)
    );
    const appliedTodaySet = new Set(appliedTodayCompanies.map((g) => g.company));

    // All other companies (advanced stages, older Applied, older Stalled)
    const restGroups = companyGroups.filter((g) => !appliedTodaySet.has(g.company));

    const byCategory = new Map();
    for (const group of restGroups) {
      const key = group.displayCategory;
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(group);
    }

    const sections = [];
    // Advanced stages first (most → least advanced)
    for (const key of ["Offer", "Interview", "Recruiter Screen", "Online Assessment"]) {
      const companies = byCategory.get(key) || [];
      if (companies.length > 0) sections.push({ status: key, companies });
    }
    // Applied Today sits between OA and regular Applied
    if (appliedTodayCompanies.length > 0) {
      sections.push({ status: "AppliedToday", companies: appliedTodayCompanies });
    }
    // Regular Applied (older)
    const appliedCompanies = byCategory.get("Applied") || [];
    if (appliedCompanies.length > 0) sections.push({ status: "Applied", companies: appliedCompanies });
    // Stalled at the bottom
    const stalledCompanies = byCategory.get("Stalled") || [];
    if (stalledCompanies.length > 0) sections.push({ status: "Stalled", companies: stalledCompanies });

    return sections;
  }, [companyGroups]);

  const filterChips = [
    { label: "All", value: "All" },
    { label: "Today", value: "Today" },
    { label: "Applied", value: "Applied" },
    { label: "Online Assessment", value: "Online Assessment" },
    { label: "Phone Interview", value: "Recruiter Screen" },
    { label: "Loop Interview", value: "Interview" },
    { label: "Offer", value: "Offer" },
    { label: "Waiting", value: "Waiting" },
    { label: "Stalled", value: "Stalled" },
    { label: "Rejected ATS", value: "REJECTED_ATS" },
    { label: "Rejected", value: "Rejected" },
  ];

  const countForFilter = useCallback((value) => {
    return applications.filter((app) => {
      if (!appMatches(app)) return false;
      if (value === "All") return app.status !== "Rejected";
      if (value === "Today") return isAppliedToday(app) && app.status !== "Rejected";
      return matchesDisplayFilter(app, value);
    }).length;
  }, [applications, appMatches]);

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
        <SearchTags fieldFilters={fieldFilters} searchRaw={searchRaw} onRemove={removeFilter} />

        {/* Pulse: key numbers + needs-attention feed */}
        <DashboardPulse
          applications={applications}
          onOpenApp={handleOpenFromPulse}
          onShowStalled={() => setStatusFilter("Stalled")}
        />

        {/* Filter bar */}
        <div className="ndash-filterbar">
          <div className="ndash-chips">
            {filterChips.map(({ label, value }) => {
              const count = countForFilter(value);
              return (
                <button
                  key={value}
                  className={`ndash-chip ${statusFilter === value ? "ndash-chip--active" : ""} ${value === "Today" ? "ndash-chip--today" : ""}`}
                  onClick={() => setStatusFilter(value)}
                  type="button"
                >
                  {label}
                  {count > 0 && <span className="ndash-chip-count">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="ndash-content">
          {companyGroups.length === 0 && rejectedGroups.length === 0 && (
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
                <p>{searchRaw ? `No applications match "${searchRaw}"` : "No applications in this view."}</p>
              </div>
            )
          )}

          {stageSections.map(({ status, companies }) => {
            const m = STATUS_META[status] || STATUS_META["Applied"];
            const sectionRoles = companies.reduce((s, g) => s + g.apps.length, 0);
            const sectionCompanies = companies.length;
            const collapsed = collapsedSections.has(status);
            const isStallSection = status === "Stalled";
            const isAppliedTodaySection = status === "AppliedToday";
            return (
              <section
                key={status}
                className={`ndash-stage-section ${collapsed ? "ndash-stage-section--collapsed" : ""} ${isStallSection ? "ndash-stage-section--stalled" : ""} ${isAppliedTodaySection ? "ndash-stage-section--today" : ""}`}
              >
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
                <div className="ndash-section-body">
                  <div className="ndc-company-grid">
                    {companies.map(({ company, apps }, idx) => (
                      <CompanyCard
                        key={company}
                        company={company}
                        apps={apps}
                        selectedAppId={selectedApp?.id}
                        onSelect={handleSelectApp}
                        onQuickStatusChange={handleQuickStatusChange}
                        store={processStore}
                        onProcessPatch={handleProcessPatch}
                        index={idx}
                      />
                    ))}
                  </div>
                </div>
              </section>
            );
          })}

          {rejectedGroups.length > 0 && (() => {
            const rejectedSectionStatus = statusFilter === "REJECTED_ATS" ? "REJECTED_ATS" : "Rejected";
            const rejectedMeta = STATUS_META[rejectedSectionStatus] || STATUS_META["Rejected"];
            const collapsed = collapsedSections.has(rejectedSectionStatus);
            return (
              <section className={`ndash-stage-section ${collapsed ? "ndash-stage-section--collapsed" : ""}`}>
                <div
                  className="ndash-section-header"
                  onClick={() => toggleSection(rejectedSectionStatus)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggleSection(rejectedSectionStatus))}
                  aria-expanded={!collapsed}
                  title={collapsed ? "Expand section" : "Collapse section"}
                >
                  <span className="ndash-section-chevron">▾</span>
                  <span className="ndash-section-dot" style={{ background: rejectedMeta.dot }} />
                  <span className="ndash-section-label" style={{ color: rejectedMeta.color }}>{rejectedMeta.short}</span>
                  <span className="ndash-section-count">{(() => { const r = rejectedGroups.reduce((s, g) => s + g.apps.length, 0); return `${r} ${r === 1 ? "role" : "roles"} · ${companyCountLabel(rejectedGroups.length)}`; })()}</span>
                </div>
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
                        store={processStore}
                        onProcessPatch={handleProcessPatch}
                        index={idx}
                      />
                    ))}
                  </div>
                </div>
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
          allApps={applications}
          onClose={() => setSelectedApp(null)}
          onStatusChange={handleStatusChange}
          onSave={handleSave}
          saving={saving}
          fetchApplications={fetchApplications}
          store={processStore}
        />
      )}
    </div>
  );
}

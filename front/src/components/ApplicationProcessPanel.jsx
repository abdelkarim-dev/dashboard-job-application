import React, { useEffect, useState } from "react";
import "./ApplicationProcessPanel.css";
import {
  STEP_STATES,
  STEP_STATE_META,
  stepType,
  stepPhase,
  hasProcess,
  processSummary,
  applyStepState,
} from "../lib/process.mjs";

// Convert a date-input value ("YYYY-MM-DD") to a local-noon ISO timestamp — the
// same convention the dashboard/server use to dodge the UTC-midnight off-by-one.
function dateInputToISO(value) {
  const [y, m, d] = String(value || "").split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

function dateForInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatShort(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
}

// Per-application interview-process tracker, rendered inside the dashboard side
// panel. Assigns a reusable process, then advances the application through its
// ordered steps. `onChange(nextApp)` persists the whole app (mirrors the panel's
// other immediate-save actions).
export default function ApplicationProcessPanel({ app, onChange, saving }) {
  const [processes, setProcesses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [picker, setPicker] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/interview-processes")
      .then((res) => (res.ok ? res.json() : { processes: [] }))
      .then((store) => { if (alive) { setProcesses(Array.isArray(store.processes) ? store.processes : []); setLoaded(true); } })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  const assigned = hasProcess(app);

  const assignProcess = (processId) => {
    const proc = processes.find((p) => p.id === processId);
    if (!proc) return;
    const steps = (proc.steps || []).map((s) => ({
      id: s.id, name: s.name, type: s.type, phase: s.phase || stepPhase(s.type),
    }));
    onChange({
      ...app,
      processId: proc.id,
      processName: proc.name,
      processSteps: steps,
      stepProgress: {},
      currentStepId: steps[0]?.id || "",
    });
  };

  const removeProcess = () => {
    setConfirmRemove(false);
    onChange({ ...app, processId: "", processName: "", processSteps: [], stepProgress: {}, currentStepId: "" });
  };

  const setStepState = (stepId, state) => onChange(applyStepState(app, stepId, state));
  const setStepDate = (stepId, value) =>
    onChange(applyStepState(app, stepId, "scheduled", { scheduledAt: dateInputToISO(value) }));

  // ── Unassigned: offer a picker ──
  if (!assigned) {
    return (
      <div className="apx-panel">
        <div className="apx-head">
          <span className="apx-head-title">🧭 Interview process</span>
        </div>
        {loaded && processes.length === 0 ? (
          <p className="apx-hint">
            No processes defined yet. Create one on the <strong>Processes</strong> page, then assign it here to track
            company-specific rounds.
          </p>
        ) : (
          <div className="apx-assign-row">
            <select className="apx-select" value={picker} onChange={(e) => setPicker(e.target.value)} aria-label="Choose a process">
              <option value="">Choose a process…</option>
              {processes.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {p.steps?.length || 0} steps</option>
              ))}
            </select>
            <button type="button" className="apx-assign-btn" onClick={() => picker && assignProcess(picker)} disabled={!picker || saving}>
              Assign
            </button>
          </div>
        )}
      </div>
    );
  }

  const summary = processSummary(app);
  const pct = summary.total ? Math.round((summary.doneCount / summary.total) * 100) : 0;
  const endedOnFailure = summary.complete && app.processSteps.some((s) => (app.stepProgress || {})[s.id]?.state === "failed");

  return (
    <div className="apx-panel">
      <div className="apx-head">
        <span className="apx-head-title">🧭 {app.processName || "Interview process"}</span>
        <span className="apx-head-progress">{summary.doneCount}/{summary.total}</span>
      </div>

      <div className="apx-progressbar" aria-hidden="true">
        <div className="apx-progressbar-fill" style={{ width: `${pct}%` }} />
      </div>

      {summary.waiting && (
        <div className="apx-waiting">⏳ Waiting — last round passed, next step not booked yet.</div>
      )}
      {summary.complete && (
        endedOnFailure
          ? <div className="apx-ended">Process ended — a round was not passed.</div>
          : <div className="apx-complete">✓ Process complete.</div>
      )}

      <ol className="apx-steps">
        {app.processSteps.map((step, idx) => {
          const entry = (app.stepProgress || {})[step.id] || {};
          const state = STEP_STATES.includes(entry.state) ? entry.state : "pending";
          const isCurrent = step.id === summary.current?.id;
          const meta = stepType(step.type);
          return (
            <li key={step.id} className={`apx-step apx-step--${state} ${isCurrent ? "apx-step--current" : ""}`}>
              <span className="apx-step-rail" aria-hidden="true">
                <span className="apx-step-node">{STEP_STATE_META[state].icon}</span>
              </span>
              <div className="apx-step-body">
                <div className="apx-step-top">
                  <span className="apx-step-name">
                    <span className="apx-step-icon" aria-hidden="true">{meta.icon}</span>
                    {step.name}
                    {isCurrent && !summary.complete && <span className="apx-current-tag">current</span>}
                  </span>
                  {state === "scheduled" && entry.scheduledAt && (
                    <span className="apx-step-date">{formatShort(entry.scheduledAt)}</span>
                  )}
                  {state === "done" && entry.completedAt && (
                    <span className="apx-step-date apx-step-date--done">passed {formatShort(entry.completedAt)}</span>
                  )}
                </div>
                <div className="apx-step-controls">
                  {STEP_STATES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`apx-state-btn ${state === s ? "is-active" : ""}`}
                      style={state === s ? { "--state-color": STEP_STATE_META[s].color } : undefined}
                      onClick={() => setStepState(step.id, s)}
                      disabled={saving}
                      title={STEP_STATE_META[s].label}
                    >
                      <span aria-hidden="true">{STEP_STATE_META[s].icon}</span>
                      <span className="apx-state-label">{STEP_STATE_META[s].label}</span>
                    </button>
                  ))}
                  {state === "scheduled" && (
                    <input
                      type="date"
                      className="apx-step-dateinput"
                      value={dateForInput(entry.scheduledAt)}
                      onChange={(e) => setStepDate(step.id, e.target.value)}
                      aria-label={`${step.name} date`}
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="apx-foot">
        <button
          type="button"
          className={`apx-remove ${confirmRemove ? "is-confirm" : ""}`}
          onClick={() => (confirmRemove ? removeProcess() : setConfirmRemove(true))}
          onBlur={() => setTimeout(() => setConfirmRemove(false), 200)}
          disabled={saving}
        >
          {confirmRemove ? "Confirm remove" : "Remove process"}
        </button>
        <select
          className="apx-switch"
          value=""
          onChange={(e) => e.target.value && assignProcess(e.target.value)}
          disabled={saving}
          aria-label="Switch process"
        >
          <option value="">Switch process…</option>
          {processes.filter((p) => p.id !== app.processId).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import "./ProcessProgressBar.css";
import {
  processViewForApp,
  ensureProcess,
  setStepDate,
  applyStepState,
} from "../lib/process.mjs";

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

// A compact, text-first stage progress indicator: "n/N · <current stage>" + a
// thin fill bar — no per-stage icons. Shows how far an application has advanced
// along its interview process (the assigned one, or the store's default
// positioned from canonical status). Assigning a date / marking the stage passed
// inline on an unassigned card adopts the default process as a real snapshot.
export default function ProcessProgressBar({ app, store, onChange, variant = "card", saving }) {
  const [editingDate, setEditingDate] = useState(false);
  const view = processViewForApp(app, store);
  if (!view) return null;

  const current = view.currentLeaf;
  const position = view.currentIndex >= 0 ? Math.min(view.currentIndex + 1, view.total) : 0;
  const fillPct = view.complete ? 100 : (view.total ? Math.round((position / view.total) * 100) : 0);

  const commit = (mutate) => {
    if (!onChange) return;
    const base = ensureProcess(app, store);
    onChange(mutate(base));
    setEditingDate(false);
  };
  const setDate = (value) => commit((base) => setStepDate(base, current.id, dateInputToISO(value)));
  const markPassed = () => commit((base) => applyStepState(base, current.id, "done"));

  const stateLabel = view.complete ? (view.statusPhase === "Offer" ? "Offer 🎉" : "Complete")
    : view.waiting ? "Waiting"
    : current ? (current.state === "scheduled" ? "Scheduled" : current.state === "failed" ? "Did not pass" : "Up next")
    : "";
  const stateKey = view.complete ? "done" : view.waiting ? "waiting" : (current?.state || "pending");
  // On the compact card, the bar + "n/N · stage" carry it — only surface a state
  // pill when it adds something (scheduled/waiting/done/failed), not the default
  // "Up next". The panel always shows it.
  const showState = stateLabel && (variant === "panel" || stateKey !== "pending");

  return (
    <div className={`ppb ppb--${variant}`} onClick={(e) => e.stopPropagation()}>
      <div className="ppb-head">
        <span className="ppb-count" title={view.processName}>{position}/{view.total}</span>
        {current && <span className="ppb-current">{current.name}</span>}
        {showState && <span className={`ppb-state ppb-state--${stateKey}`}>{stateLabel}</span>}
        {current && !current.synthetic && !view.complete && onChange && (
          editingDate ? (
            <input
              type="date"
              className="ppb-dateinput"
              autoFocus
              defaultValue={dateForInput(current.scheduledAt)}
              onChange={(e) => setDate(e.target.value)}
              onBlur={() => setEditingDate(false)}
            />
          ) : (
            <button type="button" className="ppb-datechip" onClick={() => setEditingDate(true)} disabled={saving} title="Assign a date for this stage">
              <span aria-hidden="true">📅</span>
              {current.scheduledAt ? formatShort(current.scheduledAt) : "Set date"}
            </button>
          )
        )}
        {current && !current.synthetic && !view.complete && onChange && current.state !== "done" && (
          <button type="button" className="ppb-pass" onClick={markPassed} disabled={saving} aria-label="Mark this stage passed" title="Mark this stage passed">✓</button>
        )}
      </div>
      <div className="ppb-bar" role="img" aria-label={`Stage ${position} of ${view.total}${current ? ` — ${current.name}` : ""}, ${fillPct}% through the process`}>
        <div className="ppb-bar-fill" style={{ width: `${fillPct}%` }} />
      </div>
    </div>
  );
}

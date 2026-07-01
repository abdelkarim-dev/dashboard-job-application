import React, { useState } from "react";
import "./ProcessProgressBar.css";
import {
  processViewForApp,
  ensureProcess,
  setStepDate,
  applyStepState,
  stepType,
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

// Each leaf's dot colour matches the stage colour used everywhere else (the
// status pill + the picker dropdown), so the stepper reads as the same design
// language. "Applied" is synthetic (not a real step type) → the applied token.
function leafColor(leaf) {
  if (leaf.type === "applied" || leaf.phase === "Applied") return "var(--s-applied-dot, #38bdf8)";
  return stepType(leaf.type).color;
}

// Collapse a leaf's raw state + position into the dot's visual state. The
// CURRENT leaf is where the eye should land: amber while we're Waiting on the
// company, otherwise the stage's own colour ("you are here / up next").
function dotState(leaf, waiting) {
  if (leaf.state === "failed") return "failed";
  if (leaf.state === "done") return "done";
  if (leaf.isCurrent) return waiting ? "waiting" : "current";
  if (leaf.state === "scheduled") return "scheduled";
  return "pending";
}

// A per-stage DOT STEPPER: one dot per stage of the interview process, coloured
// by stage (matching the status pill + picker), past stages filled, the current
// stage ringed (amber while Waiting). Replaces the old "n/N + gradient bar +
// WAITING chip", which duplicated the status pill and used unrelated colours.
// Shows how far an application has advanced along its process (the assigned one,
// or the store's default positioned from canonical status). Assigning a date /
// marking the stage passed inline on an unassigned card adopts the default
// process as a real snapshot.
export default function ProcessProgressBar({ app, store, onChange, variant = "card", saving }) {
  const [editingDate, setEditingDate] = useState(false);
  const view = processViewForApp(app, store);
  if (!view) return null;

  // A rejected application's process is OVER — freeze the stepper (no pulsing
  // "current" ring, no actions) and say so, instead of implying a live round.
  const ended = app && app.status === "Rejected";
  const current = view.currentLeaf;
  const position = view.currentIndex >= 0 ? Math.min(view.currentIndex + 1, view.total) : 0;
  const leaves = view.leaves || [];

  const commit = (mutate) => {
    if (!onChange) return;
    const base = ensureProcess(app, store);
    onChange(mutate(base));
    setEditingDate(false);
  };
  const setDate = (value) => commit((base) => setStepDate(base, current.id, dateInputToISO(value)));
  const markPassed = () => commit((base) => applyStepState(base, current.id, "done"));

  // The stage label carries the words; the dots carry the progress — no separate
  // status chip (the card's status pill already owns "Waiting"/"Offer"/…).
  const stageName = ended
    ? `Ended · rejected at ${current ? current.name : "—"}`
    : view.complete
      ? (view.statusPhase === "Offer" ? "Offer 🎉" : "Complete")
      : (current ? current.name : "");

  return (
    <div className={`ppb ppb--${variant}${view.waiting && !ended ? " ppb--waiting" : ""}${ended ? " ppb--ended" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div className="ppb-head">
        <div
          className="ppb-steps"
          role="img"
          aria-label={ended
            ? `Process ended — rejected at stage ${position} of ${view.total}${current ? ` (${current.name})` : ""}`
            : `Stage ${position} of ${view.total}${current ? ` — ${current.name}` : ""}${view.waiting ? " — waiting on the company" : ""}`}
        >
          {leaves.map((leaf, i) => {
            const state = ended && leaf.isCurrent ? "failed" : dotState(leaf, view.waiting);
            const prev = leaves[i - 1];
            const filled = prev && (prev.state === "done" || prev.state === "failed");
            return (
              <React.Fragment key={leaf.id}>
                {i > 0 && (
                  <span
                    className={`ppb-conn${filled ? " ppb-conn--done" : ""}`}
                    style={filled ? { "--conn-color": leafColor(prev) } : undefined}
                  />
                )}
                <span
                  className={`ppb-dot ppb-dot--${state}`}
                  style={{ "--dot-color": leafColor(leaf) }}
                  title={`${leaf.name}${leaf.synthetic ? "" : ""}`}
                />
              </React.Fragment>
            );
          })}
        </div>

        {stageName && (
          <span className="ppb-label">
            <span className="ppb-stage">{stageName}</span>
            <span className="ppb-count">{position}/{view.total}</span>
          </span>
        )}

        {current && !current.synthetic && !view.complete && !ended && onChange && (
          <span className="ppb-actions">
            {editingDate ? (
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
            )}
            {current.state !== "done" && (
              <button type="button" className="ppb-pass" onClick={markPassed} disabled={saving} aria-label="Mark this stage passed" title="Mark this stage passed">✓</button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

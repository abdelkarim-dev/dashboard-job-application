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

// A polished, stage-aware progress bar showing how far an application has
// advanced along its interview process — the assigned one, or the store's
// default process (positioned from canonical status) when none is assigned.
// Supports assigning a date and marking the current stage passed inline; doing
// so on an unassigned card adopts the default process as a real snapshot.
export default function ProcessProgressBar({ app, store, onChange, variant = "card", saving }) {
  const [editingDate, setEditingDate] = useState(false);
  const view = processViewForApp(app, store);
  if (!view) return null;

  const current = view.currentLeaf;
  const pct = view.total ? Math.round((view.doneCount / view.total) * 100) : 0;

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

  return (
    <div className={`ppb ppb--${variant}`} onClick={(e) => e.stopPropagation()}>
      <div className="ppb-track" role="img" aria-label={`Stage ${Math.max(1, view.currentIndex + 1)} of ${view.total} — ${pct}% complete`}>
        {view.groups.map((node, i) => {
          const filledBefore = i > 0 && segmentDone(view.groups[i - 1]);
          return (
            <React.Fragment key={node.id}>
              {i > 0 && <span className={`ppb-link ${filledBefore ? "is-filled" : ""}`} aria-hidden="true" />}
              {node.isGroup ? <GroupNode node={node} variant={variant} /> : <LeafNode node={node} variant={variant} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="ppb-caption">
        <span className="ppb-current" title={view.processName}>
          {current ? (
            <>
              <span className="ppb-current-icon" aria-hidden="true">{stepType(current.type).icon}</span>
              <span className="ppb-current-name">{current.name}</span>
            </>
          ) : view.processName}
        </span>
        <span className={`ppb-state ppb-state--${view.complete ? "done" : view.waiting ? "waiting" : current?.state || "pending"}`}>{stateLabel}</span>

        {current && !view.complete && onChange && (
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
        {current && !view.complete && onChange && current.state !== "done" && (
          <button type="button" className="ppb-pass" onClick={markPassed} disabled={saving} aria-label="Mark this stage passed" title="Mark this stage passed">✓</button>
        )}
      </div>
    </div>
  );
}

function segmentDone(node) {
  if (!node) return false;
  return node.isGroup ? (node.aggregate === "done") : (node.state === "done");
}

function LeafNode({ node, variant }) {
  const meta = stepType(node.type);
  return (
    <span
      className={`ppb-node ppb-node--leaf ppb-node--${node.state} ${node.isCurrent ? "is-current" : ""}`}
      style={{ "--node-color": meta.color || "var(--md-primary)" }}
      title={`${node.name} · ${labelFor(node.state)}${node.scheduledAt ? " · " + formatShort(node.scheduledAt) : ""}`}
    >
      <span className="ppb-node-icon" aria-hidden="true">{node.state === "done" ? "✓" : node.state === "failed" ? "✕" : meta.icon}</span>
    </span>
  );
}

function GroupNode({ node, variant }) {
  const done = node.children.filter((c) => c.state === "done").length;
  const total = node.children.length;
  return (
    <span
      className={`ppb-node ppb-node--group ppb-node--${node.aggregate} ${node.hasCurrent ? "is-current" : ""}`}
      title={`${node.name} — ${done}/${total} rounds passed`}
    >
      <span className="ppb-group-icon" aria-hidden="true">🔁</span>
      <span className="ppb-group-pips" aria-hidden="true">
        {node.children.map((c) => (
          <span key={c.id} className={`ppb-pip ppb-pip--${c.state} ${c.isCurrent ? "is-current" : ""}`} title={c.name} />
        ))}
      </span>
      <span className="ppb-group-count">{done}/{total}</span>
    </span>
  );
}

function labelFor(state) {
  return { pending: "not started", scheduled: "scheduled", done: "passed", failed: "did not pass" }[state] || state;
}

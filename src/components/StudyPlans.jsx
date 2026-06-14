import React, { useState, useEffect, useMemo } from "react";

const ACCENTS = ["violet", "sky", "amber", "emerald", "rose", "cyan"];

const BLANK_DRAFT = { id: null, name: "", description: "", accent: "violet", problemIds: [] };

function planProgress(plan, byId) {
  const trainable = plan.problemIds.map((id) => byId[id]).filter(Boolean);
  const solved = trainable.filter((p) => p.solved).length;
  const missing = plan.problemIds.length - trainable.length;
  const pct = trainable.length ? Math.round((solved / trainable.length) * 100) : 0;
  return { trainable, solved, missing, pct, total: trainable.length };
}

export default function StudyPlans({ onTrainPlan }) {
  const [plans, setPlans] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null); // null = board view; object = editor view
  const [pickerSearch, setPickerSearch] = useState("");
  const [status, setStatus] = useState("");

  const byId = useMemo(() => {
    const map = {};
    problems.forEach((p) => { map[p.id] = p; });
    return map;
  }, [problems]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [plansRes, practiceRes] = await Promise.all([
        fetch("/api/practice/plans"),
        fetch("/api/practice"),
      ]);
      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
      }
      if (practiceRes.ok) {
        const data = await practiceRes.json();
        setProblems(data.problems || []);
      }
    } catch (err) {
      console.error("Failed to load study plans", err);
      setStatus("Could not reach the local server.");
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setStatus("");
    setPickerSearch("");
    setDraft({ ...BLANK_DRAFT, accent: ACCENTS[plans.length % ACCENTS.length] });
  };

  const startEdit = (plan) => {
    setStatus("");
    setPickerSearch("");
    setDraft({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      accent: plan.accent,
      problemIds: [...plan.problemIds],
    });
  };

  const savePlan = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) { setStatus("Give the plan a name first."); return; }
    const payload = {
      name,
      description: draft.description.trim(),
      accent: draft.accent,
      problemIds: draft.problemIds,
    };
    try {
      const res = draft.id
        ? await fetch(`/api/practice/plans/${encodeURIComponent(draft.id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/practice/plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (res.ok) {
        setDraft(null);
        setStatus(draft.id ? "Plan updated." : "Plan created.");
        await fetchAll();
      } else {
        setStatus(`Save failed (HTTP ${res.status}). If this is a 404, restart the local server so it picks up the new plan routes.`);
      }
    } catch (err) {
      console.error(err);
      setStatus("Save failed — could not reach the local server (is it running?).");
    }
  };

  const deletePlan = async (plan) => {
    if (!window.confirm(`Delete the plan "${plan.name}"? Your problem progress is kept; only the plan is removed.`)) return;
    try {
      const res = await fetch(`/api/practice/plans/${encodeURIComponent(plan.id)}`, { method: "DELETE" });
      if (res.ok) {
        setStatus("Plan deleted.");
        if (draft?.id === plan.id) setDraft(null);
        await fetchAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---- Draft editor helpers ----
  const addToDraft = (id) => setDraft((d) => (d.problemIds.includes(id) ? d : { ...d, problemIds: [...d.problemIds, id] }));
  const removeFromDraft = (id) => setDraft((d) => ({ ...d, problemIds: d.problemIds.filter((x) => x !== id) }));
  const moveInDraft = (index, dir) => setDraft((d) => {
    const next = [...d.problemIds];
    const target = index + dir;
    if (target < 0 || target >= next.length) return d;
    [next[index], next[target]] = [next[target], next[index]];
    return { ...d, problemIds: next };
  });

  const renderProgressBar = (pct, accent) => (
    <div className="plan-progress-track">
      <div className={`plan-progress-fill accent-${accent}`} style={{ width: `${pct}%` }} />
    </div>
  );

  if (loading) {
    return (
      <div className="tab-content-container active learning-view">
        <div className="learning-empty"><strong>Loading study plans…</strong></div>
      </div>
    );
  }

  // ---------- Editor view ----------
  if (draft) {
    const search = pickerSearch.trim().toLowerCase();
    const inPlan = new Set(draft.problemIds);
    const available = problems
      .filter((p) => !inPlan.has(p.id))
      .filter((p) => !search
        || p.title.toLowerCase().includes(search)
        || (p.tags || []).some((t) => t.toLowerCase().includes(search)));

    return (
      <div className="tab-content-container active learning-view">
        <div className="learning-header">
          <div>
            <p className="eyebrow">Study plans</p>
            <h2>{draft.id ? "Edit plan" : "New plan"}</h2>
          </div>
          <div className="plan-editor-actions">
            <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={savePlan}>Save plan</button>
          </div>
        </div>

        {status && <p className="plan-status-line">{status}</p>}

        <div className="plan-editor-grid">
          <div className="learning-card plan-editor-meta">
            <label className="plan-field">
              <span>Plan name</span>
              <input
                className="learning-input"
                value={draft.name}
                placeholder="e.g. Toast onsite — strings"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </label>
            <label className="plan-field">
              <span>Description</span>
              <textarea
                className="learning-input"
                rows={3}
                value={draft.description}
                placeholder="What is this flow for?"
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </label>
            <div className="plan-field">
              <span>Accent</span>
              <div className="plan-accent-row">
                {ACCENTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-label={a}
                    aria-pressed={draft.accent === a}
                    className={`plan-accent-dot accent-${a} ${draft.accent === a ? "active" : ""}`}
                    onClick={() => setDraft((d) => ({ ...d, accent: a }))}
                  />
                ))}
              </div>
            </div>
            <p className="plan-editor-hint">
              {draft.problemIds.length} {draft.problemIds.length === 1 ? "problem" : "problems"} in this flow. They train in the order below.
            </p>
          </div>

          <div className="learning-card plan-editor-selected">
            <div className="learning-card-title"><h3>In this plan</h3><span>ordered</span></div>
            {draft.problemIds.length === 0 ? (
              <p className="mini-empty">No problems yet — add some from the bank on the right.</p>
            ) : (
              <ol className="plan-selected-list">
                {draft.problemIds.map((id, index) => {
                  const prob = byId[id];
                  return (
                    <li key={id} className={`plan-selected-row ${prob ? "" : "missing"}`}>
                      <span className="plan-order">{index + 1}</span>
                      <span className="plan-selected-title">
                        {prob ? prob.title : id}
                        {!prob && <em className="plan-missing-tag">not in bank</em>}
                        {prob?.solved && <span className="plan-solved-dot" title="Solved">✓</span>}
                      </span>
                      <span className="plan-row-actions">
                        <button type="button" className="icon-mini" aria-label="Move up" disabled={index === 0} onClick={() => moveInDraft(index, -1)}>↑</button>
                        <button type="button" className="icon-mini" aria-label="Move down" disabled={index === draft.problemIds.length - 1} onClick={() => moveInDraft(index, 1)}>↓</button>
                        <button type="button" className="icon-mini danger" aria-label="Remove" onClick={() => removeFromDraft(id)}>✕</button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="learning-card plan-editor-picker">
            <div className="learning-card-title"><h3>Add from the bank</h3><span>{available.length}</span></div>
            <input
              className="learning-input"
              type="search"
              placeholder="Search the problem bank…"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
            />
            <div className="plan-picker-list">
              {available.length === 0 ? (
                <p className="mini-empty">Nothing left to add.</p>
              ) : (
                available.map((p) => (
                  <button key={p.id} type="button" className="plan-picker-row" onClick={() => addToDraft(p.id)}>
                    <span className="plan-picker-title">{p.title}</span>
                    <span className={`diff-tag ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                    <span className="plan-picker-add">+</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Board view ----------
  return (
    <div className="tab-content-container active learning-view">
      <div className="learning-header">
        <div>
          <p className="eyebrow">Interview training</p>
          <h2>Study plans</h2>
        </div>
        <button type="button" className="btn-primary" onClick={startCreate}>+ New plan</button>
      </div>

      {status && <p className="plan-status-line">{status}</p>}

      {plans.length === 0 ? (
        <div className="learning-empty">
          <strong>No plans yet</strong>
          <span>Create a plan, pick the exact problems you want to drill, then train only those.</span>
        </div>
      ) : (
        <div className="plan-board">
          {plans.map((plan) => {
            const { solved, total, missing, pct } = planProgress(plan, byId);
            const preview = plan.problemIds.map((id) => byId[id]).filter(Boolean).slice(0, 5);
            return (
              <article key={plan.id} className={`plan-card accent-${plan.accent}`}>
                <div className="plan-card-stripe" />
                <div className="plan-card-body">
                  <div className="plan-card-head">
                    <h3>{plan.name}</h3>
                    {plan.seeded && <span className="plan-seed-tag">starter</span>}
                  </div>
                  {plan.description && <p className="plan-card-desc">{plan.description}</p>}

                  <div className="plan-card-stat">
                    <strong>{solved}</strong>
                    <span>/ {total} solved{missing ? ` · ${missing} not in bank` : ""}</span>
                  </div>
                  {renderProgressBar(pct, plan.accent)}

                  {preview.length > 0 && (
                    <div className="plan-card-chips">
                      {preview.map((p) => (
                        <span key={p.id} className={`plan-chip ${p.solved ? "solved" : ""}`}>{p.title}</span>
                      ))}
                      {total > preview.length && <span className="plan-chip more">+{total - preview.length}</span>}
                    </div>
                  )}
                </div>
                <div className="plan-card-footer">
                  <button
                    type="button"
                    className="btn-primary plan-train-btn"
                    disabled={total === 0}
                    onClick={() => onTrainPlan?.(plan)}
                  >
                    Train ▸
                  </button>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => startEdit(plan)}>Edit</button>
                  <button type="button" className="btn-ghost btn-sm danger" onClick={() => deletePlan(plan)}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

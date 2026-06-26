import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./InterviewProcesses.css";
import { STEP_TYPES, PROCESS_ACCENTS, stepType, accentColor } from "../lib/process.mjs";

const API = "/api/interview-processes";

function makeStepId() {
  return `step-${Math.random().toString(36).slice(2, 9)}`;
}

function blankStep(type = "recruiter") {
  return { id: makeStepId(), name: stepType(type).label, type };
}

function blankProcess() {
  return {
    id: "",
    _isNew: true,
    name: "",
    description: "",
    accent: PROCESS_ACCENTS[0],
    steps: [blankStep("recruiter"), blankStep("assessment"), blankStep("loop"), blankStep("offer")],
  };
}

// ── Per-process editor card ───────────────────────────────────────────────────
function ProcessCard({ process, onSaved, onDeleted, autoFocus }) {
  const [draft, setDraft] = useState(() => structuredClone(process));
  const [dirty, setDirty] = useState(Boolean(process._isNew));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRef = useRef(null);

  // Re-sync when the upstream record identity changes (after a save assigns an id).
  const prevId = useRef(process.id);
  useEffect(() => {
    if (process.id !== prevId.current) {
      setDraft(structuredClone(process));
      setDirty(Boolean(process._isNew));
      prevId.current = process.id;
    }
  }, [process]);

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  const mutate = useCallback((updater) => {
    setDraft((prev) => updater(structuredClone(prev)));
    setDirty(true);
    setError("");
  }, []);

  const setField = (key, value) => mutate((d) => { d[key] = value; return d; });

  const setStep = (idx, key, value) => mutate((d) => {
    d.steps[idx][key] = value;
    // Renaming follows the type's default label until the user types a custom name.
    if (key === "type" && (!d.steps[idx]._renamed)) d.steps[idx].name = stepType(value).label;
    if (key === "name") d.steps[idx]._renamed = true;
    return d;
  });

  const addStep = () => mutate((d) => { d.steps.push(blankStep("loop")); return d; });
  const removeStep = (idx) => mutate((d) => { d.steps.splice(idx, 1); return d; });
  const moveStep = (idx, dir) => mutate((d) => {
    const target = idx + dir;
    if (target < 0 || target >= d.steps.length) return d;
    [d.steps[idx], d.steps[target]] = [d.steps[target], d.steps[idx]];
    return d;
  });

  const save = async () => {
    if (!draft.name.trim()) { setError("Give the process a name."); nameRef.current?.focus(); return; }
    if (!draft.steps.length) { setError("Add at least one step."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description,
        accent: draft.accent,
        steps: draft.steps.map(({ id, name, type }) => ({ id, name: name.trim() || stepType(type).label, type })),
      };
      const isNew = draft._isNew || !draft.id;
      const res = await fetch(isNew ? API : `${API}/${encodeURIComponent(draft.id)}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json();
      setDirty(false);
      onSaved(saved, process.id);
    } catch {
      setError("Couldn't save — is the cockpit server running?");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (draft._isNew) { onDeleted(process.id); return; }
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try {
      await fetch(`${API}/${encodeURIComponent(draft.id)}`, { method: "DELETE" });
      onDeleted(draft.id);
    } catch {
      setError("Couldn't delete.");
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  const accent = accentColor(draft.accent);

  return (
    <section className="ipx-card" style={{ "--accent": accent }}>
      <header className="ipx-card-head">
        <span className="ipx-accent-dot" aria-hidden="true" />
        <input
          ref={nameRef}
          className="ipx-name"
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="Process name (e.g. Toast)"
          aria-label="Process name"
        />
        <span className="ipx-step-count">{draft.steps.length} {draft.steps.length === 1 ? "step" : "steps"}</span>
      </header>

      <input
        className="ipx-desc"
        value={draft.description}
        onChange={(e) => setField("description", e.target.value)}
        placeholder="Short description (optional)"
        aria-label="Process description"
      />

      <div className="ipx-accents" role="group" aria-label="Accent colour">
        {PROCESS_ACCENTS.map((a) => (
          <button
            key={a}
            type="button"
            className={`ipx-accent ${draft.accent === a ? "is-active" : ""}`}
            style={{ background: accentColor(a) }}
            onClick={() => setField("accent", a)}
            aria-label={`Accent ${a}`}
            aria-pressed={draft.accent === a}
          />
        ))}
      </div>

      <ol className="ipx-steps">
        {draft.steps.map((step, idx) => {
          const meta = stepType(step.type);
          return (
            <li key={step.id} className="ipx-step">
              <span className="ipx-step-index" aria-hidden="true">{idx + 1}</span>
              <span className="ipx-step-icon" aria-hidden="true">{meta.icon}</span>
              <input
                className="ipx-step-name"
                value={step.name}
                onChange={(e) => setStep(idx, "name", e.target.value)}
                placeholder="Step name"
                aria-label={`Step ${idx + 1} name`}
              />
              <select
                className="ipx-step-type"
                value={step.type}
                onChange={(e) => setStep(idx, "type", e.target.value)}
                aria-label={`Step ${idx + 1} type`}
              >
                {STEP_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>{t.label}</option>
                ))}
              </select>
              <span className="ipx-step-phase" title="Counts as this pipeline stage for analytics">{meta.phase}</span>
              <span className="ipx-step-actions">
                <button type="button" className="ipx-iconbtn" onClick={() => moveStep(idx, -1)} disabled={idx === 0} aria-label="Move up" title="Move up">↑</button>
                <button type="button" className="ipx-iconbtn" onClick={() => moveStep(idx, 1)} disabled={idx === draft.steps.length - 1} aria-label="Move down" title="Move down">↓</button>
                <button type="button" className="ipx-iconbtn ipx-iconbtn--danger" onClick={() => removeStep(idx)} aria-label="Remove step" title="Remove">✕</button>
              </span>
            </li>
          );
        })}
      </ol>

      <button type="button" className="ipx-addstep" onClick={addStep}>＋ Add step</button>

      <footer className="ipx-card-foot">
        {error && <span className="ipx-error">{error}</span>}
        <button
          type="button"
          className={`ipx-delete ${confirmDelete ? "is-confirm" : ""}`}
          onClick={remove}
          disabled={saving}
          onBlur={() => setTimeout(() => setConfirmDelete(false), 200)}
        >
          {draft._isNew ? "Discard" : confirmDelete ? "Confirm delete" : "🗑 Delete"}
        </button>
        {dirty ? (
          <button type="button" className="ipx-save" onClick={save} disabled={saving}>
            {saving ? "Saving…" : draft._isNew ? "Create process" : "Save changes"}
          </button>
        ) : (
          <span className="ipx-saved">All changes saved</span>
        )}
      </footer>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InterviewProcesses() {
  const [processes, setProcesses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [drafts, setDrafts] = useState([]); // unsaved new processes (client-only)
  const [loadError, setLoadError] = useState("");

  const fetchProcesses = useCallback(async () => {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const store = await res.json();
      setProcesses(Array.isArray(store.processes) ? store.processes : []);
      setLoadError("");
    } catch {
      setLoadError("Couldn't load processes — is the cockpit server running?");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchProcesses(); }, [fetchProcesses]);

  const addDraft = () => setDrafts((prev) => [{ ...blankProcess(), id: `draft-${Date.now()}` }, ...prev]);

  const handleSaved = useCallback((saved, prevId) => {
    setDrafts((prev) => prev.filter((d) => d.id !== prevId));
    setProcesses((prev) => {
      const without = prev.filter((p) => p.id !== saved.id && p.id !== prevId);
      return [saved, ...without];
    });
  }, []);

  const handleDeleted = useCallback((id) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setProcesses((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const totalSteps = useMemo(
    () => processes.reduce((sum, p) => sum + (p.steps?.length || 0), 0),
    [processes]
  );

  return (
    <div className="ipx-root">
      <div className="ipx-topbar">
        <div className="ipx-topbar-left">
          <h2 className="ipx-title">Interview Processes</h2>
          <span className="ipx-subtitle">
            {processes.length} {processes.length === 1 ? "process" : "processes"} · {totalSteps} steps · reuse them when advancing applications
          </span>
        </div>
        <button type="button" className="ipx-new" onClick={addDraft}>＋ New process</button>
      </div>

      <p className="ipx-blurb">
        Define a company's interview path once — e.g. <strong>Toast</strong> = Recruiter → Coding → 5-round Loop → Manager → Offer —
        then assign it to an application from its panel. Each step maps to a pipeline stage so your analytics and board keep working,
        and a <em>Waiting</em> badge appears between rounds.
      </p>

      {loadError && <div className="ipx-loaderror">{loadError}</div>}

      <div className="ipx-list">
        {drafts.map((d) => (
          <ProcessCard key={d.id} process={d} onSaved={handleSaved} onDeleted={handleDeleted} autoFocus />
        ))}
        {processes.map((p) => (
          <ProcessCard key={p.id} process={p} onSaved={handleSaved} onDeleted={handleDeleted} />
        ))}
        {loaded && !drafts.length && !processes.length && !loadError && (
          <div className="ipx-empty">
            <div className="ipx-empty-icon">🧭</div>
            <strong>No processes yet</strong>
            <p>Create your first interview process to track applications through company-specific rounds.</p>
            <button type="button" className="ipx-empty-add" onClick={addDraft}>＋ New process</button>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./InterviewProcesses.css";
import { STEP_TYPES, GROUP_TYPE, PROCESS_ACCENTS, stepType, accentColor, flattenSteps } from "../lib/process.mjs";

const API = "/api/interview-processes";

// Palette is grouped for scannability. The "group" component creates an inline
// container (e.g. an Onsite Loop) you fill with rounds.
const PALETTE_GROUPS = [
  { label: "Screening", types: ["recruiter", "assessment", "take_home"] },
  { label: "Interviews", types: ["coding", "technical", "system_design", "loop", "behavioral", "manager", "team_match"] },
  { label: "Decision", types: ["offer", "custom"] },
];

function rid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
function makeLeaf(type) {
  return { id: rid("step"), name: stepType(type).label, type };
}
function makeGroup() {
  return { id: rid("group"), name: "Onsite Loop", type: GROUP_TYPE, children: [makeLeaf("coding")] };
}
function blankProcess() {
  return {
    id: `draft-${Date.now()}`,
    _isNew: true,
    name: "",
    description: "",
    accent: PROCESS_ACCENTS[0],
    isDefault: false,
    steps: [makeLeaf("recruiter"), makeLeaf("assessment"), makeGroup(), makeLeaf("offer")],
  };
}

// ── Editable, type-aware node card ────────────────────────────────────────────
function LeafCard({ step, onChange, onRemove, onMove, canLeft, canRight, compact }) {
  const meta = stepType(step.type);
  return (
    <div className={`ipx-node ipx-node--leaf ${compact ? "ipx-node--compact" : ""}`} style={{ "--node-color": meta.color || "var(--md-primary)" }}>
      <div className="ipx-node-top">
        <span className="ipx-node-icon" aria-hidden="true">{meta.icon}</span>
        <input
          className="ipx-node-name"
          value={step.name}
          onChange={(e) => onChange({ ...step, name: e.target.value, _renamed: true })}
          placeholder="Step name"
          aria-label="Step name"
        />
      </div>
      <select
        className="ipx-node-type"
        value={step.type}
        onChange={(e) => {
          const type = e.target.value;
          const autoName = !step._renamed || step.name === stepType(step.type).label;
          onChange({ ...step, type, name: autoName ? stepType(type).label : step.name });
        }}
        aria-label="Step type"
      >
        {STEP_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
      </select>
      <div className="ipx-node-actions">
        <span className="ipx-node-phase">{meta.phase}</span>
        <span className="ipx-node-btns">
          <button type="button" className="ipx-mini" onClick={() => onMove(-1)} disabled={!canLeft} title="Move left" aria-label="Move left">‹</button>
          <button type="button" className="ipx-mini" onClick={() => onMove(1)} disabled={!canRight} title="Move right" aria-label="Move right">›</button>
          <button type="button" className="ipx-mini ipx-mini--danger" onClick={onRemove} title="Remove" aria-label="Remove step">✕</button>
        </span>
      </div>
    </div>
  );
}

// ── Group container (e.g. Onsite Loop) ────────────────────────────────────────
function GroupCard({ step, onChange, onRemove, onMove, canLeft, canRight, onDropType }) {
  const [over, setOver] = useState(false);
  const children = Array.isArray(step.children) ? step.children : [];

  const setChild = (idx, next) => {
    const arr = children.slice();
    arr[idx] = next;
    onChange({ ...step, children: arr });
  };
  const removeChild = (idx) => onChange({ ...step, children: children.filter((_, i) => i !== idx) });
  const moveChild = (idx, dir) => {
    const t = idx + dir;
    if (t < 0 || t >= children.length) return;
    const arr = children.slice();
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    onChange({ ...step, children: arr });
  };
  const addChild = (type = "coding") => onChange({ ...step, children: [...children, makeLeaf(type)] });

  return (
    <div
      className={`ipx-node ipx-node--group ${over ? "is-drop" : ""}`}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); }}
      onDrop={(e) => {
        e.preventDefault(); e.stopPropagation(); setOver(false);
        const type = e.dataTransfer.getData("text/component");
        if (type && type !== GROUP_TYPE) addChild(type);
      }}
    >
      <div className="ipx-group-head">
        <span className="ipx-group-badge" aria-hidden="true">🔁</span>
        <input
          className="ipx-group-name"
          value={step.name}
          onChange={(e) => onChange({ ...step, name: e.target.value })}
          placeholder="Group name"
          aria-label="Group name"
        />
        <span className="ipx-group-count">{children.length}</span>
        <span className="ipx-node-btns">
          <button type="button" className="ipx-mini" onClick={() => onMove(-1)} disabled={!canLeft} title="Move left" aria-label="Move left">‹</button>
          <button type="button" className="ipx-mini" onClick={() => onMove(1)} disabled={!canRight} title="Move right" aria-label="Move right">›</button>
          <button type="button" className="ipx-mini ipx-mini--danger" onClick={onRemove} title="Remove group" aria-label="Remove group">✕</button>
        </span>
      </div>
      <div className="ipx-group-children">
        {children.map((child, idx) => {
          const meta = stepType(child.type);
          return (
            <div key={child.id} className="ipx-chip" style={{ "--node-color": meta.color || "var(--md-primary)" }}>
              <span className="ipx-chip-idx">{idx + 1}</span>
              <span className="ipx-chip-icon" aria-hidden="true">{meta.icon}</span>
              <input
                className="ipx-chip-name"
                value={child.name}
                onChange={(e) => setChild(idx, { ...child, name: e.target.value, _renamed: true })}
                aria-label="Round name"
              />
              <select
                className="ipx-chip-type"
                value={child.type}
                onChange={(e) => {
                  const type = e.target.value;
                  const autoName = !child._renamed || child.name === stepType(child.type).label;
                  setChild(idx, { ...child, type, name: autoName ? stepType(type).label : child.name });
                }}
                aria-label="Round type"
              >
                {STEP_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
              </select>
              <button type="button" className="ipx-mini" onClick={() => moveChild(idx, -1)} disabled={idx === 0} aria-label="Move up">↑</button>
              <button type="button" className="ipx-mini" onClick={() => moveChild(idx, 1)} disabled={idx === children.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="ipx-mini ipx-mini--danger" onClick={() => removeChild(idx)} aria-label="Remove round">✕</button>
            </div>
          );
        })}
        <button type="button" className="ipx-add-round" onClick={() => addChild("coding")}>＋ Add round</button>
      </div>
    </div>
  );
}

// ── The horizontal flow canvas for one process ────────────────────────────────
function ProcessCanvas({ steps, onStepsChange }) {
  const [overEnd, setOverEnd] = useState(false);

  const setStep = (idx, next) => {
    const arr = steps.slice(); arr[idx] = next; onStepsChange(arr);
  };
  const removeStep = (idx) => onStepsChange(steps.filter((_, i) => i !== idx));
  const moveStep = (idx, dir) => {
    const t = idx + dir;
    if (t < 0 || t >= steps.length) return;
    const arr = steps.slice(); [arr[idx], arr[t]] = [arr[t], arr[idx]]; onStepsChange(arr);
  };
  const appendType = (type) => {
    onStepsChange([...steps, type === GROUP_TYPE ? makeGroup() : makeLeaf(type)]);
  };

  return (
    <div
      className="ipx-canvas"
      onDragOver={(e) => { e.preventDefault(); setOverEnd(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverEnd(false); }}
      onDrop={(e) => {
        e.preventDefault(); setOverEnd(false);
        const type = e.dataTransfer.getData("text/component");
        if (type) appendType(type);
      }}
    >
      <div className="ipx-flow">
        {steps.length === 0 && (
          <div className="ipx-flow-empty">Drag components from the right →</div>
        )}
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            {idx > 0 && <span className="ipx-conn" aria-hidden="true" />}
            {step.type === GROUP_TYPE ? (
              <GroupCard
                step={step}
                onChange={(next) => setStep(idx, next)}
                onRemove={() => removeStep(idx)}
                onMove={(dir) => moveStep(idx, dir)}
                canLeft={idx > 0}
                canRight={idx < steps.length - 1}
              />
            ) : (
              <LeafCard
                step={step}
                onChange={(next) => setStep(idx, next)}
                onRemove={() => removeStep(idx)}
                onMove={(dir) => moveStep(idx, dir)}
                canLeft={idx > 0}
                canRight={idx < steps.length - 1}
              />
            )}
          </React.Fragment>
        ))}
        {steps.length > 0 && <span className="ipx-conn ipx-conn--end" aria-hidden="true" />}
        <div className={`ipx-dropzone ${overEnd ? "is-over" : ""}`}>
          <span>＋</span>
          <span className="ipx-dropzone-label">drop / click a component</span>
        </div>
      </div>
    </div>
  );
}

// ── Right-hand component palette ──────────────────────────────────────────────
function Palette({ onAdd }) {
  return (
    <aside className="ipx-palette">
      <div className="ipx-palette-head">
        <strong>Components</strong>
        <span>drag onto the flow, or click to append</span>
      </div>
      {PALETTE_GROUPS.map((group) => (
        <div key={group.label} className="ipx-palette-group">
          <div className="ipx-palette-label">{group.label}</div>
          {group.types.map((type) => {
            const meta = stepType(type);
            return (
              <button
                key={type}
                type="button"
                className="ipx-palette-item"
                style={{ "--node-color": meta.color || "var(--md-primary)" }}
                draggable
                onDragStart={(e) => { e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/component", type); }}
                onClick={() => onAdd(type)}
                title={`${meta.label} · ${meta.phase}`}
              >
                <span className="ipx-palette-icon" aria-hidden="true">{meta.icon}</span>
                <span className="ipx-palette-name">{meta.label}</span>
              </button>
            );
          })}
        </div>
      ))}
      <div className="ipx-palette-group">
        <div className="ipx-palette-label">Structure</div>
        <button
          type="button"
          className="ipx-palette-item ipx-palette-item--group"
          draggable
          onDragStart={(e) => { e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/component", GROUP_TYPE); }}
          onClick={() => onAdd(GROUP_TYPE)}
          title="A group / sub-process (e.g. Onsite Loop) that holds several rounds"
        >
          <span className="ipx-palette-icon" aria-hidden="true">🔁</span>
          <span className="ipx-palette-name">Loop / Group</span>
        </button>
      </div>
    </aside>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InterviewProcesses() {
  const [processes, setProcesses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchProcesses = useCallback(async (selectFirst = false) => {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const store = await res.json();
      const list = Array.isArray(store.processes) ? store.processes : [];
      setProcesses(list);
      setLoadError("");
      if (selectFirst && list.length) setSelectedId((prev) => prev || list[0].id);
    } catch {
      setLoadError("Couldn't load processes — is the cockpit server running?");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchProcesses(true); }, [fetchProcesses]);

  // Load the selected process into the editable draft (unless mid-edit on it).
  useEffect(() => {
    if (!selectedId) { setDraft(null); return; }
    if (draft && draft.id === selectedId) return;
    const found = processes.find((p) => p.id === selectedId);
    if (found) {
      setDraft(structuredClone(found));
      setDirty(false);
      setConfirmDelete(false);
    }
  }, [selectedId, processes]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectProcess = (id) => {
    if (dirty && !window.confirm("Discard unsaved changes to this process?")) return;
    setSelectedId(id);
    const found = processes.find((p) => p.id === id);
    setDraft(found ? structuredClone(found) : null);
    setDirty(false);
  };

  const createDraft = () => {
    const d = blankProcess();
    setProcesses((prev) => [d, ...prev.filter((p) => !p._isNew)]);
    setSelectedId(d.id);
    setDraft(d);
    setDirty(true);
  };

  const mutateDraft = useCallback((updater) => {
    setDraft((prev) => (prev ? updater(structuredClone(prev)) : prev));
    setDirty(true);
    setSaveError("");
  }, []);

  const setField = (key, value) => mutateDraft((d) => { d[key] = value; return d; });
  const setSteps = (steps) => mutateDraft((d) => { d.steps = steps; return d; });
  const addComponent = (type) => mutateDraft((d) => {
    d.steps = [...d.steps, type === GROUP_TYPE ? makeGroup() : makeLeaf(type)];
    return d;
  });

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { setSaveError("Give the process a name."); return; }
    if (!draft.steps.length) { setSaveError("Add at least one step."); return; }
    setSaving(true); setSaveError("");
    try {
      const isNew = draft._isNew || !processes.some((p) => p.id === draft.id && !p._isNew);
      const payload = {
        name: draft.name.trim(),
        description: draft.description,
        accent: draft.accent,
        isDefault: draft.isDefault,
        steps: stripDraftMeta(draft.steps),
      };
      const res = await fetch(isNew ? API : `${API}/${encodeURIComponent(draft.id)}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json();
      setDirty(false);
      setSelectedId(saved.id);
      setDraft(structuredClone(saved));
      // Refresh the list (default flag may have moved between processes).
      const store = await (await fetch(API)).json();
      setProcesses(Array.isArray(store.processes) ? store.processes : []);
    } catch {
      setSaveError("Couldn't save — is the cockpit server running?");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft) return;
    if (draft._isNew) {
      setProcesses((prev) => prev.filter((p) => p.id !== draft.id));
      setDraft(null); setSelectedId(""); setDirty(false); setConfirmDelete(false);
      return;
    }
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try {
      await fetch(`${API}/${encodeURIComponent(draft.id)}`, { method: "DELETE" });
      const store = await (await fetch(API)).json();
      const list = Array.isArray(store.processes) ? store.processes : [];
      setProcesses(list);
      setSelectedId(list[0]?.id || "");
      setDraft(list[0] ? structuredClone(list[0]) : null);
      setDirty(false);
    } catch {
      setSaveError("Couldn't delete.");
    } finally {
      setSaving(false); setConfirmDelete(false);
    }
  };

  const tabs = useMemo(() => {
    const seen = new Set();
    return processes.filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));
  }, [processes]);

  return (
    <div className="ipx-root">
      <div className="ipx-topbar">
        <div className="ipx-topbar-left">
          <h2 className="ipx-title">Interview Processes</h2>
          <span className="ipx-subtitle">Design a company's interview path as a flow, then assign it to applications.</span>
        </div>
        <button type="button" className="ipx-new" onClick={createDraft}>＋ New process</button>
      </div>

      {loadError && <div className="ipx-loaderror">{loadError}</div>}

      {/* Process tabs */}
      <div className="ipx-tabs" role="tablist" aria-label="Processes">
        {tabs.map((p) => {
          const count = flattenSteps(p.steps).length;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === selectedId}
              className={`ipx-tab ${p.id === selectedId ? "is-active" : ""}`}
              style={{ "--accent": accentColor(p.accent) }}
              onClick={() => selectProcess(p.id)}
            >
              <span className="ipx-tab-dot" aria-hidden="true" />
              <span className="ipx-tab-name">{p.name || "Untitled"}{p._isNew ? " •" : ""}</span>
              {p.isDefault && <span className="ipx-tab-default" title="Default — inherited by all unassigned applications">★</span>}
              <span className="ipx-tab-count">{count}</span>
            </button>
          );
        })}
        {loaded && tabs.length === 0 && !loadError && (
          <span className="ipx-tabs-empty">No processes yet — create your first one.</span>
        )}
      </div>

      {draft && (
        <div className="ipx-editor">
          <div className="ipx-editor-main">
            <div className="ipx-editor-head" style={{ "--accent": accentColor(draft.accent) }}>
              <span className="ipx-accent-dot" aria-hidden="true" />
              <input
                className="ipx-name"
                value={draft.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Process name (e.g. Toast)"
                aria-label="Process name"
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
              <button
                type="button"
                className={`ipx-default-toggle ${draft.isDefault ? "is-on" : ""}`}
                onClick={() => setField("isDefault", !draft.isDefault)}
                title="Make this the default process inherited by all unassigned applications"
              >
                {draft.isDefault ? "★ Default" : "☆ Make default"}
              </button>
            </div>

            <input
              className="ipx-desc"
              value={draft.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Short description (optional)"
              aria-label="Process description"
            />

            <ProcessCanvas steps={draft.steps} onStepsChange={setSteps} />

            <div className="ipx-editor-foot">
              {saveError && <span className="ipx-error">{saveError}</span>}
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
            </div>
          </div>

          <Palette onAdd={addComponent} />
        </div>
      )}

      {loaded && !draft && !loadError && (
        <div className="ipx-empty">
          <div className="ipx-empty-icon">🧭</div>
          <strong>No process selected</strong>
          <p>Pick a process above, or create a new one to design its interview flow.</p>
          <button type="button" className="ipx-new" onClick={createDraft}>＋ New process</button>
        </div>
      )}
    </div>
  );
}

// Strip editor-only flags (_renamed) before sending to the server.
function stripDraftMeta(steps) {
  return steps.map((step) => {
    if (step.type === GROUP_TYPE) {
      return { id: step.id, name: step.name, type: GROUP_TYPE, children: (step.children || []).map((c) => ({ id: c.id, name: c.name, type: c.type })) };
    }
    return { id: step.id, name: step.name, type: step.type };
  });
}

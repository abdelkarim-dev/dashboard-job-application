import React, { useState, useEffect, useRef, useMemo } from "react";

// ── Prebuilt reference content ─────────────────────────────────────────────
// Static study material that ships with the app (separate from the editable,
// DB-backed topics). This is the "always-there" playbook a candidate can skim
// right before an interview.

const PLAYBOOK_STEPS = [
  {
    title: "1 · Scope & requirements",
    body: "Pin down functional requirements (the 2-3 core features), then non-functional ones: scale (DAU, QPS), read/write ratio, latency target, consistency vs availability, durability. Call out what's explicitly out of scope.",
  },
  {
    title: "2 · Back-of-envelope estimation",
    body: "Turn DAU into QPS (peak ≈ 2-3× average). Size storage per record × volume × retention. Size bandwidth. Decide if it fits in memory. These numbers drive every later decision.",
  },
  {
    title: "3 · API + data model",
    body: "Define the handful of endpoints (verbs, params, response). Sketch the core entities and how they relate. Pick SQL vs NoSQL from the access patterns, not by reflex.",
  },
  {
    title: "4 · High-level design",
    body: "Draw the boxes: clients → load balancer → app servers → cache → DB, plus async workers/queues for slow work. Get a working end-to-end path before optimizing any one box.",
  },
  {
    title: "5 · Deep dive & bottlenecks",
    body: "Pick the 1-2 hardest components and go deep: sharding key, cache strategy, replication, hot-key handling, the consistency model. This is where senior signal lives.",
  },
  {
    title: "6 · Scale, failure & tradeoffs",
    body: "Identify single points of failure and add redundancy. Discuss what breaks at 10×. Close by naming the tradeoffs you chose and what you'd revisit with more time.",
  },
];

const CHEAT_NUMBERS = [
  ["Latency: L1 cache", "~1 ns"],
  ["Latency: main memory", "~100 ns"],
  ["Latency: SSD random read", "~100 µs"],
  ["Latency: network round trip (same DC)", "~0.5 ms"],
  ["Latency: disk seek (HDD)", "~10 ms"],
  ["Latency: US ↔ EU round trip", "~150 ms"],
  ["Throughput: single SQL box", "~10³–10⁴ QPS"],
  ["Throughput: Redis node", "~10⁵ ops/s"],
  ["1 day ≈", "86,400 s (~10⁵)"],
  ["1 char ≈ 1 byte; UUID ≈", "16 bytes"],
  ["Availability: 3 nines", "~8.8 h/yr down"],
  ["Availability: 4 nines", "~52 min/yr down"],
];

const STATUS_OPTIONS = ["Not Started", "In Progress", "Reviewing", "Mastered"];

// Spaced-repetition interval (in days) keyed by self-rated confidence 1-5.
const REVIEW_INTERVAL_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

function localDateString(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysISODate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

function formatAge(value) {
  if (!value) return "never";
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return "never";
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function statusClass(status) {
  return "sd-pill sd-pill-" + String(status || "Not Started").toLowerCase().replace(/\s+/g, "-");
}

// ── Confidence dots ────────────────────────────────────────────────────────
function ConfidenceDots({ value }) {
  return (
    <span className="sd-dots" title={`Confidence ${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`sd-dot ${n <= value ? "filled" : ""}`} />
      ))}
    </span>
  );
}

// ── Flashcard practice of a topic's prompts ────────────────────────────────
function FlashcardDeck({ prompts, notes }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  if (!prompts.length) {
    return <p className="sd-muted">No practice prompts yet. Add some below.</p>;
  }
  const go = (delta) => {
    setIndex((i) => (i + delta + prompts.length) % prompts.length);
    setRevealed(false);
  };
  return (
    <div className="sd-flashcard">
      <div className="sd-flashcard-counter">
        Prompt {index + 1} / {prompts.length}
      </div>
      <div className="sd-flashcard-question">{prompts[index]}</div>
      {revealed ? (
        <div className="sd-flashcard-notes">{notes ? notes : <span className="sd-muted">No notes recorded for this topic yet.</span>}</div>
      ) : (
        <button type="button" className="btn-ghost sd-reveal" onClick={() => setRevealed(true)}>
          Reveal notes
        </button>
      )}
      <div className="sd-flashcard-nav">
        <button type="button" className="btn-ghost" onClick={() => go(-1)}>← Prev</button>
        <button type="button" className="btn-ghost" onClick={() => go(1)}>Next →</button>
      </div>
    </div>
  );
}

// ── One system-design topic (collapsible) ──────────────────────────────────
function TopicCard({ topic, onPatch, onDelete }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(topic.notes || "");
  const [newPrompt, setNewPrompt] = useState("");
  const notesDirty = useRef(false);

  useEffect(() => {
    if (!notesDirty.current) setNotes(topic.notes || "");
  }, [topic.notes]);

  const checklist = Array.isArray(topic.checklist) ? topic.checklist : [];
  const done = checklist.filter((c) => c.completed).length;
  const prompts = Array.isArray(topic.prompts) ? topic.prompts : [];
  const dueToday = topic.nextReviewAt && topic.nextReviewAt <= localDateString();

  const toggleChecklist = (i) => {
    const next = checklist.map((c, idx) => (idx === i ? { ...c, completed: !c.completed } : c));
    onPatch(topic.id, { checklist: next });
  };

  const markPracticed = () => {
    const entry = { at: new Date().toISOString(), type: "practice", note: `Confidence ${topic.confidence}/5` };
    onPatch(topic.id, {
      lastPracticedAt: new Date().toISOString(),
      nextReviewAt: addDaysISODate(REVIEW_INTERVAL_DAYS[topic.confidence] || 7),
      practiceHistory: [...(topic.practiceHistory || []), entry],
    });
  };

  const addPrompt = () => {
    const v = newPrompt.trim();
    if (!v) return;
    onPatch(topic.id, { prompts: [...prompts, v] });
    setNewPrompt("");
  };

  return (
    <article className={`sd-card ${open ? "open" : ""} ${dueToday ? "sd-due" : ""}`}>
      <header
        className="sd-card-head"
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((o) => !o))}
      >
        <div className="sd-card-headmain">
          <h3>{topic.title}</h3>
          <div className="sd-card-meta">
            <span className={statusClass(topic.status)}>{topic.status}</span>
            <ConfidenceDots value={topic.confidence} />
            {checklist.length > 0 && (
              <span className="sd-muted">{done}/{checklist.length} checklist</span>
            )}
            {dueToday && <span className="sd-due-pill">Due for review</span>}
          </div>
        </div>
        <span className="sd-chevron">{open ? "▾" : "▸"}</span>
      </header>

      {open && (
        <div className="sd-card-body">
          <div className="sd-controls">
            <label>
              <span>Status</span>
              <select
                value={topic.status}
                onChange={(e) => onPatch(topic.id, { status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>
              <span>Confidence</span>
              <select
                value={topic.confidence}
                onChange={(e) => onPatch(topic.id, { confidence: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button type="button" className="btn-primary sd-practice-btn" onClick={markPracticed}>
              ✓ Mark practiced
            </button>
            <span className="sd-muted sd-lastpracticed">
              Last: {formatAge(topic.lastPracticedAt)}
              {topic.nextReviewAt ? ` · next ${topic.nextReviewAt}` : ""}
            </span>
          </div>

          <div className="sd-section">
            <h4>Practice prompts</h4>
            <FlashcardDeck prompts={prompts} notes={topic.notes} />
            <div className="sd-add-row">
              <input
                type="text"
                placeholder="Add a practice prompt…"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addPrompt(); }}
              />
              <button type="button" className="btn-ghost" onClick={addPrompt}>Add</button>
            </div>
          </div>

          {checklist.length > 0 && (
            <div className="sd-section">
              <h4>Mastery checklist</h4>
              <ul className="sd-checklist">
                {checklist.map((c, i) => (
                  <li key={i}>
                    <label>
                      <input type="checkbox" checked={Boolean(c.completed)} onChange={() => toggleChecklist(i)} />
                      <span className={c.completed ? "done" : ""}>{c.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="sd-section">
            <h4>Notes & key insights</h4>
            <textarea
              className="sd-notes"
              rows={8}
              value={notes}
              onChange={(e) => { setNotes(e.target.value); notesDirty.current = true; }}
              onBlur={() => {
                if (notesDirty.current) {
                  notesDirty.current = false;
                  onPatch(topic.id, { notes });
                }
              }}
              placeholder="Approach, tradeoffs, formulas, things you keep forgetting…"
            />
          </div>

          {topic.diagramLinks && (
            <div className="sd-section">
              <a className="btn-ghost" href={topic.diagramLinks} target="_blank" rel="noreferrer">
                Open diagram ↗
              </a>
            </div>
          )}

          <div className="sd-card-foot">
            <button
              type="button"
              className="sd-delete"
              onClick={() => { if (window.confirm(`Delete topic "${topic.title}"?`)) onDelete(topic.id); }}
            >
              Delete topic
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// ── Course card ─────────────────────────────────────────────────────────────
function CourseCard({ course, onPatch }) {
  const [open, setOpen] = useState(false);
  const modules = Array.isArray(course.modules) ? course.modules : [];
  const done = modules.filter((m) => m.completed).length;
  const pct = modules.length ? Math.round((done / modules.length) * 100) : (course.progress || 0);

  const toggleModule = (i) => {
    const next = modules.map((m, idx) => (idx === i ? { ...m, completed: !m.completed } : m));
    const completed = next.filter((m) => m.completed).length;
    onPatch(course.id, {
      modules: next,
      progress: next.length ? Math.round((completed / next.length) * 100) : course.progress,
      status: completed === next.length && next.length ? "Completed" : completed > 0 ? "In Progress" : course.status,
      lastStudiedAt: new Date().toISOString(),
    });
  };

  return (
    <article className={`sd-card ${open ? "open" : ""}`}>
      <header
        className="sd-card-head"
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((o) => !o))}
      >
        <div className="sd-card-headmain">
          <h3>{course.title}</h3>
          <div className="sd-card-meta">
            <span className="sd-pill sd-pill-track">{course.track || "Course"}</span>
            <span className={statusClass(course.status)}>{course.status}</span>
            <span className="sd-muted">{pct}%</span>
          </div>
          <div className="sd-progress"><div className="sd-progress-fill" style={{ width: `${pct}%` }} /></div>
        </div>
        <span className="sd-chevron">{open ? "▾" : "▸"}</span>
      </header>
      {open && (
        <div className="sd-card-body">
          {modules.length > 0 && (
            <div className="sd-section">
              <h4>Modules</h4>
              <ul className="sd-checklist">
                {modules.map((m, i) => (
                  <li key={i}>
                    <label>
                      <input type="checkbox" checked={Boolean(m.completed)} onChange={() => toggleModule(i)} />
                      <span className={m.completed ? "done" : ""}>{m.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(course.resources) && course.resources.length > 0 && (
            <div className="sd-section">
              <h4>Resources</h4>
              <ul className="sd-resources">
                {course.resources.map((r, i) => (
                  <li key={i}><a href={r} target="_blank" rel="noreferrer">{r}</a></li>
                ))}
              </ul>
            </div>
          )}
          {course.notes && (
            <div className="sd-section">
              <h4>Notes</h4>
              <p className="sd-course-notes">{course.notes}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function SystemDesign() {
  const [topics, setTopics] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [playbookOpen, setPlaybookOpen] = useState(true);

  const load = async () => {
    try {
      const [sdRes, cRes] = await Promise.all([
        fetch("/api/learning/system-design"),
        fetch("/api/learning/courses"),
      ]);
      if (sdRes.ok) setTopics((await sdRes.json()).topics || []);
      if (cRes.ok) setCourses((await cRes.json()).items || []);
      setError("");
    } catch {
      setError("Could not reach the local server. Is it running on 127.0.0.1:8787?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Optimistic PUT of a partial topic update.
  const patchTopic = async (id, patch) => {
    const current = topics.find((t) => t.id === id);
    if (!current) return;
    const optimistic = { ...current, ...patch };
    setTopics((prev) => prev.map((t) => (t.id === id ? optimistic : t)));
    try {
      const res = await fetch(`/api/learning/system-design/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimistic),
      });
      if (res.ok) {
        const saved = await res.json();
        setTopics((prev) => prev.map((t) => (t.id === id ? saved : t)));
      }
    } catch {
      setTopics((prev) => prev.map((t) => (t.id === id ? current : t)));
    }
  };

  const patchCourse = async (id, patch) => {
    const current = courses.find((c) => c.id === id);
    if (!current) return;
    const optimistic = { ...current, ...patch };
    setCourses((prev) => prev.map((c) => (c.id === id ? optimistic : c)));
    try {
      const res = await fetch(`/api/learning/courses/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimistic),
      });
      if (res.ok) {
        const saved = await res.json();
        setCourses((prev) => prev.map((c) => (c.id === id ? saved : c)));
      }
    } catch {
      setCourses((prev) => prev.map((c) => (c.id === id ? current : c)));
    }
  };

  const addTopic = async () => {
    const title = window.prompt("New system design topic title:");
    if (!title) return;
    const res = await fetch("/api/learning/system-design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        status: "Not Started",
        confidence: 1,
        prompts: [`Design ${title.toLowerCase()}.`],
        checklist: ["Requirements & scale", "API & data model", "High-level design", "Deep dive & bottlenecks", "Failure modes & tradeoffs"],
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setTopics((prev) => [created, ...prev]);
    }
  };

  const deleteTopic = async (id) => {
    setTopics((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/learning/system-design/${encodeURIComponent(id)}`, { method: "DELETE" });
  };

  const stats = useMemo(() => {
    const total = topics.length;
    const mastered = topics.filter((t) => ["Mastered", "Done"].includes(t.status)).length;
    const inProgress = topics.filter((t) => ["In Progress", "Reviewing"].includes(t.status)).length;
    const avg = total ? (topics.reduce((s, t) => s + (t.confidence || 0), 0) / total) : 0;
    const due = topics.filter((t) => t.nextReviewAt && t.nextReviewAt <= localDateString()).length;
    return { total, mastered, inProgress, avg: avg.toFixed(1), due };
  }, [topics]);

  const visibleTopics = statusFilter
    ? topics.filter((t) => t.status === statusFilter)
    : topics;

  return (
    <div className="tab-content-container active sd-page">
      <header className="sd-header">
        <div>
          <p className="eyebrow">Skill builder</p>
          <h1>System Design</h1>
          <p className="sd-sub">Prebuilt topics, spaced-repetition review, and a pre-interview playbook.</p>
        </div>
        <div className="sd-stats">
          <div className="sd-stat"><strong>{stats.total}</strong><span>topics</span></div>
          <div className="sd-stat"><strong>{stats.mastered}</strong><span>mastered</span></div>
          <div className="sd-stat"><strong>{stats.avg}</strong><span>avg confidence</span></div>
          <div className={`sd-stat ${stats.due ? "warn" : ""}`}><strong>{stats.due}</strong><span>due today</span></div>
        </div>
      </header>

      {/* Prebuilt reference playbook */}
      <section className="sd-playbook">
        <header
          onClick={() => setPlaybookOpen((o) => !o)}
          role="button"
          tabIndex={0}
          aria-expanded={playbookOpen}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setPlaybookOpen((o) => !o))}
        >
          <h2>📐 Interview playbook & cheat sheet</h2>
          <span className="sd-chevron">{playbookOpen ? "▾" : "▸"}</span>
        </header>
        {playbookOpen && (
          <div className="sd-playbook-body">
            <div className="sd-playbook-steps">
              {PLAYBOOK_STEPS.map((s) => (
                <div className="sd-step" key={s.title}>
                  <h4>{s.title}</h4>
                  <p>{s.body}</p>
                </div>
              ))}
            </div>
            <div className="sd-cheat">
              <h4>Numbers worth memorizing</h4>
              <table>
                <tbody>
                  {CHEAT_NUMBERS.map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {error && <div className="sd-error">{error}</div>}
      {loading ? (
        <p className="sd-muted">Loading…</p>
      ) : (
        <>
          <section className="sd-block">
            <div className="sd-block-head">
              <h2>Architecture topics</h2>
              <div className="sd-block-actions">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <button type="button" className="btn-primary" onClick={addTopic}>+ Topic</button>
              </div>
            </div>
            <div className="sd-grid">
              {visibleTopics.map((t) => (
                <TopicCard key={t.id} topic={t} onPatch={patchTopic} onDelete={deleteTopic} />
              ))}
              {visibleTopics.length === 0 && <p className="sd-muted">No topics match this filter.</p>}
            </div>
          </section>

          {courses.length > 0 && (
            <section className="sd-block">
              <div className="sd-block-head"><h2>Courses & tracks</h2></div>
              <div className="sd-grid">
                {courses.map((c) => (
                  <CourseCard key={c.id} course={c} onPatch={patchCourse} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

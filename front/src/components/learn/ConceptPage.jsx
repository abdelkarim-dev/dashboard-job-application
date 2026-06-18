import React, { useEffect, useMemo, useRef, useState } from "react";
import { Diagram, DIAGRAMS_BY_CONCEPT } from "./diagrams.jsx";
import { LearnPrintPortal } from "./PrintView.jsx";
import { buildToc } from "./toc"; // first TypeScript module (compiled by Vite)
import { GlossarySegments, JargonCard } from "./GlossaryText.jsx";
import { splitWithGlossary } from "./glossary.js";
import ConceptDrill from "./ConceptDrill.jsx";
import { awardPoints } from "../../lib/points.mjs";

const PROGRESS_KEY = "learnConceptProgress";
const CHECKLIST_KEY = "learnChecklistProgress";

export function loadConceptProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function setReviewed(id, reviewed) {
  const next = { ...loadConceptProgress(), [id]: reviewed };
  if (!reviewed) delete next[id];
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  } catch {}
  // Let the Learn rail update its checkmarks without prop drilling.
  document.dispatchEvent(new CustomEvent("learn:progress"));
  return next;
}

function loadChecklist() {
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// Exposed so other surfaces (e.g. the Study Plans prep hub) can read checklist
// progress without re-implementing the storage format.
export function loadChecklistProgress() {
  return loadChecklist();
}

function saveChecklistItem(conceptId, index, checked) {
  const all = loadChecklist();
  const forConcept = { ...(all[conceptId] || {}) };
  if (checked) forConcept[index] = true;
  else delete forConcept[index];
  const next = { ...all, [conceptId]: forConcept };
  if (Object.keys(forConcept).length === 0) delete next[conceptId];
  try {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
  } catch {}
  // Reuse the same signal the review toggle uses so the rail / prep hub refresh.
  document.dispatchEvent(new CustomEvent("learn:progress"));
  return next;
}

// Compact summary of the page so Gemma answers in the context of what's open.
function buildAskContext(concept) {
  const headings = (concept.sections || []).map((s) => s.heading).filter(Boolean);
  const kp = (concept.keyPoints || []).slice(0, 8);
  const parts = [];
  if (concept.tagline) parts.push(concept.tagline);
  if (headings.length) parts.push("Sections: " + headings.join("; "));
  if (kp.length) parts.push("Key points: " + kp.join(" | "));
  return parts.join("\n").slice(0, 3500);
}

// Floating header to jump between concept pages without the left rail: prev/next
// through the ordered list plus a grouped dropdown to jump anywhere.
function ModuleBar({ navItems, currentId, onNavigate }) {
  if (!navItems?.length || !onNavigate) return null;
  const idx = navItems.findIndex((n) => n.id === currentId);
  const prev = idx > 0 ? navItems[idx - 1] : null;
  const next = idx >= 0 && idx < navItems.length - 1 ? navItems[idx + 1] : null;

  const groups = [];
  for (const n of navItems) {
    let g = groups.find((x) => x.name === n.group);
    if (!g) {
      g = { name: n.group, items: [] };
      groups.push(g);
    }
    g.items.push(n);
  }

  return (
    <nav className="learn-modulebar" aria-label="Module switcher">
      <button
        type="button"
        className="learn-mod-btn"
        disabled={!prev}
        onClick={() => prev && onNavigate(prev.id)}
        title={prev ? `Previous: ${prev.label}` : ""}
        aria-label="Previous module"
      >
        ‹
      </button>
      <div className="learn-mod-switch">
        <select
          value={currentId}
          onChange={(e) => onNavigate(e.target.value)}
          aria-label="Switch module"
        >
          {groups.map((g) => (
            <optgroup key={g.name} label={g.name}>
              {g.items.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {idx >= 0 && <span className="learn-mod-pos">{idx + 1} / {navItems.length}</span>}
      </div>
      <button
        type="button"
        className="learn-mod-btn"
        disabled={!next}
        onClick={() => next && onNavigate(next.id)}
        title={next ? `Next: ${next.label}` : ""}
        aria-label="Next module"
      >
        ›
      </button>
    </nav>
  );
}

// "Ask Gemma" box, present on every concept page. Streams the coach's answer
// token-by-token from /api/learn-ask-stream, falling back to the buffered
// /api/learn-ask if the streaming endpoint is missing (older server build).
function AskGemma({ concept }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [thinking, setThinking] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const askBuffered = async (body) => {
    setStatus("Thinking");
    const res = await fetch("/api/learn-ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429 || data.busy) {
      setError("Gemma is busy with another task. Give it a moment and ask again.");
    } else if (data.ok && data.answer) {
      setAnswer(data.answer);
    } else {
      setError(data.error || "Gemma is not reachable. Is your local model (Ollama or a local server) running?");
    }
  };

  const ask = async (e) => {
    if (e) e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError("");
    setAnswer("");
    setThinking("");
    setStatus("Connecting to Gemma");
    const body = JSON.stringify({ question: q, title: concept.title, context: buildAskContext(concept) });
    try {
      const res = await fetch("/api/learn-ask-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.status === 404) {
        await askBuffered(body);
        return;
      }
      if (!res.ok || !res.body) {
        setError("Gemma is not reachable. Is your local model (Ollama or a local server) running?");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev;
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "status") setStatus(ev.text || "");
          else if (ev.type === "thinking") setThinking((t) => t + ev.text);
          else if (ev.type === "token") {
            acc += ev.text;
            setAnswer(acc);
            setStatus("");
          } else if (ev.type === "busy") {
            setError(ev.text || "Gemma is busy. Try again shortly.");
          } else if (ev.type === "error") {
            setError(ev.text || "Gemma error.");
          }
        }
      }
    } catch {
      setError("Connection interrupted.");
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  return (
    <section className="learn-aside-card learn-ask-card">
      <h3>
        Ask Gemma
        {loading && <span className="learn-ask-live">live</span>}
      </h3>
      <form className="learn-ask-form" onSubmit={ask}>
        <textarea
          className="learn-ask-input"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={'Ask about this page — e.g. "explain this more simply", "quiz me", "how would I answer this at Toast?"'}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask(e);
          }}
        />
        <button type="submit" className="learn-ask-btn" disabled={loading || !question.trim()}>
          {loading ? "Streaming…" : "Ask Gemma"}
        </button>
      </form>
      {loading && status && (
        <p className="learn-ask-status">
          <span className="learn-ask-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {status}
        </p>
      )}
      {thinking && (
        <details className="learn-ask-thinking" open>
          <summary>Thinking</summary>
          <div className="learn-ask-thinking-body">{thinking}</div>
        </details>
      )}
      {error && <p className="learn-ask-msg error">{error}</p>}
      {answer && (
        <div className="learn-ask-answer">
          {answer}
          {loading && <span className="learn-ask-cursor" aria-hidden="true" />}
        </div>
      )}
    </section>
  );
}

// One reading section: heading + paragraphs, plus optional richer blocks
// (callout, numbered steps, comparison table, code) to break up the text.
// `bodySegments` is the section's paragraphs pre-split into glossary segments
// (so jargon gets inline definitions); falls back to plain text if absent.
function Section({ section, index, id, bodySegments }) {
  const paras = Array.isArray(bodySegments)
    ? bodySegments
    : (section.body || []).map((p) => [{ text: p }]);
  return (
    <section id={id} className={`learn-section learn-reveal ${section.card ? "learn-section-card" : ""}`}>
      {section.heading &&
        (section.card ? (
          <div className="learn-card-head">
            {section.tag && <span className="learn-card-tag">{section.tag}</span>}
            <h3>{section.heading}</h3>
          </div>
        ) : (
          <h3 className="learn-section-h">
            <span className="learn-section-num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            {section.heading}
          </h3>
        ))}
      {paras.map((segs, j) => (
        <p key={j}>
          <GlossarySegments segments={segs} />
        </p>
      ))}
      {section.callout && (
        <div className={`learn-callout kind-${section.callout.kind || "key"}`}>
          {section.callout.title && <strong>{section.callout.title}</strong>}
          <span>{section.callout.text}</span>
        </div>
      )}
      {Array.isArray(section.defs) && section.defs.length > 0 && (
        <dl className="learn-defs">
          {section.defs.map((d, k) => (
            <div className="learn-def" key={d.term || k}>
              <dt>{d.term}</dt>
              <dd>{d.def}</dd>
            </div>
          ))}
        </dl>
      )}
      {Array.isArray(section.steps) && section.steps.length > 0 && (
        <ol className="learn-steps">
          {section.steps.map((s, k) => (
            <li key={k}>{s}</li>
          ))}
        </ol>
      )}
      {section.table && Array.isArray(section.table.rows) && (
        <div className="learn-table-wrap">
          <table className="learn-table">
            {Array.isArray(section.table.headers) && (
              <thead>
                <tr>
                  {section.table.headers.map((h, k) => (
                    <th key={k}>{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {section.table.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {section.code && (
        <pre className="learn-code" data-lang={section.code.lang || ""}>
          <code>{section.code.source}</code>
        </pre>
      )}
    </section>
  );
}

// Renders one reading "concept" subpage from the data shape in concepts.js. A
// floating module bar lets you switch pages; the reading flows in the main column
// (with an SVG schematic where one helps); the study rail (Ask Gemma, checklist,
// quiz) docks to the right. Code labs are NOT rendered here.
export default function ConceptPage({ concept, navItems = [], onNavigate }) {
  const [reviewed, setReviewedState] = useState(() => !!loadConceptProgress()[concept.id]);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(() => loadChecklist()[concept.id] || {});
  const [activeId, setActiveId] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [drilling, setDrilling] = useState(false);
  // Paginated reading: one section per page instead of a wall of text.
  const [page, setPage] = useState(0);
  const articleRef = useRef(null);

  // The "On this page" navigator entries (one per titled section + takeaways),
  // built by the typed helper in toc.ts.
  const toc = useMemo(() => buildToc(concept), [concept]);

  // Pre-split every body paragraph (and key takeaway) into glossary segments,
  // sharing ONE `seen` set across the whole page so each jargon term is defined
  // inline only at its first mention — in reading order (sections, then
  // takeaways). Recomputed only when the page changes.
  const glossed = useMemo(() => {
    const secs = Array.isArray(concept?.sections) ? concept.sections : [];
    const kps = Array.isArray(concept?.keyPoints) ? concept.keyPoints : [];
    const seen = new Set();
    return {
      sectionSegs: secs.map((s) =>
        (Array.isArray(s.body) ? s.body : []).map((p) => splitWithGlossary(p, seen))
      ),
      keyPointSegs: kps.map((p) => splitWithGlossary(p, seen)),
    };
  }, [concept?.id]);

  // Reveal the active page's blocks as they enter view (progressive disclosure).
  // In paginated mode only one section is mounted at a time, so re-run on every
  // page change to animate the freshly-rendered section in.
  useEffect(() => {
    const root = articleRef.current;
    if (!root) return undefined;
    let revealObs;
    try {
      revealObs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add("is-revealed");
              revealObs.unobserve(e.target);
            }
          }
        },
        { rootMargin: "0px 0px -6% 0px", threshold: 0.03 }
      );
      root.querySelectorAll(".learn-reveal:not(.is-revealed)").forEach((el) => revealObs.observe(el));
    } catch {
      // No IntersectionObserver: just show everything.
      root.querySelectorAll(".learn-reveal").forEach((el) => el.classList.add("is-revealed"));
    }
    return () => revealObs?.disconnect();
  }, [concept?.id, page]);

  // Reset to the first page whenever the concept changes.
  useEffect(() => {
    setPage(0);
    setActiveId(null);
  }, [concept?.id]);

  if (!concept) return null;

  const toggleReviewed = () => {
    const next = !reviewed;
    setReviewedState(next);
    setReviewed(concept.id, next);
    if (next) awardPoints("conceptReviewed");
  };

  const toggleCheck = (i) => {
    const next = !checked[i];
    setChecked((prev) => {
      const n = { ...prev };
      if (next) n[i] = true;
      else delete n[i];
      return n;
    });
    saveChecklistItem(concept.id, i, next);
  };

  const checklist = Array.isArray(concept.checklist) ? concept.checklist : [];
  const quiz = Array.isArray(concept.quiz) ? concept.quiz : [];
  const keyPoints = Array.isArray(concept.keyPoints) ? concept.keyPoints : [];
  const sections = Array.isArray(concept.sections) ? concept.sections : [];
  const diagrams = DIAGRAMS_BY_CONCEPT[concept.id] || [];
  const doneCount = checklist.reduce((n, _, i) => n + (checked[i] ? 1 : 0), 0);

  // One page per section, plus a final "Key takeaways" page. Each page carries
  // the matching `sec-*` id the "On this page" navigator already targets.
  const pages = [
    ...sections.map((s, i) => ({ kind: "section", index: i, id: `sec-${i}`, label: s.heading || `Section ${i + 1}` })),
    ...(keyPoints.length > 0 ? [{ kind: "keypoints", id: "sec-keypoints", label: "Key takeaways" }] : []),
  ];
  const pageCount = pages.length;
  const current = pages[Math.min(page, Math.max(0, pageCount - 1))] || null;

  const goTo = (i) => {
    const next = Math.max(0, Math.min(pageCount - 1, i));
    setPage(next);
    setActiveId(pages[next]?.id || null);
    const el = articleRef.current;
    if (el) el.scrollTo ? el.scrollTo({ top: 0, behavior: "smooth" }) : (el.scrollTop = 0);
  };

  return (
    <article className="learn-concept has-aside" key={concept.id} ref={articleRef}>
      <ModuleBar navItems={navItems} currentId={concept.id} onNavigate={onNavigate} />

      <header className="learn-concept-head">
        <div>
          <div className="learn-concept-kicker">{concept.group}</div>
          <h1 className="learn-concept-title">{concept.title}</h1>
          {concept.tagline && <p className="learn-concept-lead">{concept.tagline}</p>}
        </div>
        <div className="learn-concept-actions">
          <button
            type="button"
            className="learn-drill-btn"
            onClick={() => setDrilling(true)}
            title="Quiz yourself on this page (auto-generated)"
          >
            🎯 Drill
          </button>
          <button
            type="button"
            className="learn-pdf-btn"
            onClick={() => setPrinting(true)}
            disabled={printing}
            title="Download this page as a PDF"
          >
            {printing ? "Preparing…" : "⤓ PDF"}
          </button>
          <button
            type="button"
            className={`learn-review-btn ${reviewed ? "done" : ""}`}
            onClick={toggleReviewed}
            aria-pressed={reviewed}
          >
            {reviewed ? "✓ Reviewed" : "Mark reviewed"}
          </button>
        </div>
      </header>

      {printing && (
        <LearnPrintPortal
          concepts={[concept]}
          title={concept.title || concept.label || "Concept"}
          onDone={() => setPrinting(false)}
        />
      )}

      {drilling && <ConceptDrill concept={concept} onClose={() => setDrilling(false)} />}

      <div className="learn-concept-body">
        <div className="learn-concept-main">
          {current && current.kind === "section" && (
            <React.Fragment key={`${concept.id}-sec-${current.index}`}>
              <Section
                section={sections[current.index]}
                index={current.index}
                id={current.id}
                bodySegments={glossed.sectionSegs[current.index]}
              />
              {current.index === 0 &&
                diagrams.map((d) => (
                  <figure className="learn-diagram learn-reveal" key={d.id}>
                    <Diagram id={d.id} />
                    {d.caption && <figcaption>{d.caption}</figcaption>}
                  </figure>
                ))}
            </React.Fragment>
          )}

          {current && current.kind === "keypoints" && (
            <section id="sec-keypoints" className="learn-section learn-keypoints learn-reveal" key={`${concept.id}-kp`}>
              <h3>Key takeaways</h3>
              <ul className="learn-points">
                {keyPoints.map((point, ki) => (
                  <li key={point}>
                    <GlossarySegments segments={glossed.keyPointSegs[ki] || [{ text: point }]} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pageCount > 1 && (
            <nav className="learn-pager" aria-label="Page navigation">
              <button
                type="button"
                className="learn-pager-btn"
                onClick={() => goTo(page - 1)}
                disabled={page <= 0}
              >
                ‹ Prev
              </button>
              <div className="learn-pager-mid">
                <span className="learn-pager-count">{page + 1} / {pageCount}</span>
                <span className="learn-pager-label">{current?.label}</span>
                <div className="learn-pager-dots" role="tablist" aria-label="Jump to page">
                  {pages.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`learn-pager-dot ${i === page ? "active" : ""}`}
                      onClick={() => goTo(i)}
                      aria-label={`Page ${i + 1}: ${p.label}`}
                      aria-selected={i === page}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="learn-pager-btn primary"
                onClick={() => goTo(page + 1)}
                disabled={page >= pageCount - 1}
              >
                Next ›
              </button>
            </nav>
          )}
        </div>

        <aside className="learn-concept-aside" aria-label="Study tools">
          {toc.length > 1 && (
            <nav className="learn-aside-card learn-toc-card" aria-label="On this page">
              <h3>On this page</h3>
              <ol className="learn-toc">
                {toc.map((it, i) => {
                  const pageIndex = pages.findIndex((p) => p.id === it.id);
                  const isActive = current?.id === it.id;
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        className={`learn-toc-link ${isActive ? "active" : ""}`}
                        onClick={() => pageIndex >= 0 && goTo(pageIndex)}
                      >
                        <span className="learn-toc-num" aria-hidden="true">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="learn-toc-label">{it.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
          <JargonCard concept={concept} />
          <AskGemma concept={concept} />

          {checklist.length > 0 && (
            <section className="learn-aside-card learn-checklist-card">
              <h3>
                Checklist
                <span className="learn-checklist-count">
                  {doneCount}/{checklist.length}
                </span>
              </h3>
              <ul className="learn-checklist">
                {checklist.map((item, i) => (
                  <li key={i}>
                    <label className={checked[i] ? "done" : ""}>
                      <input type="checkbox" checked={!!checked[i]} onChange={() => toggleCheck(i)} />
                      <span>{item}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {quiz.length > 0 && (
            <section className="learn-aside-card learn-quiz-card">
              <h3>Quick check</h3>
              {quiz.map((q, qi) => {
                const chosen = answers[qi];
                const answered = chosen !== undefined;
                return (
                  <div className="learn-quiz-item" key={qi}>
                    <p className="learn-quiz-q">{q.q}</p>
                    <div className="learn-quiz-options">
                      {q.options.map((opt, oi) => {
                        const isAnswer = oi === q.answer;
                        const isChosen = chosen === oi;
                        let cls = "learn-quiz-option";
                        if (answered && isAnswer) cls += " correct";
                        else if (answered && isChosen && !isAnswer) cls += " wrong";
                        return (
                          <button
                            type="button"
                            key={oi}
                            className={cls}
                            disabled={answered}
                            onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {answered && q.explain && (
                      <p className={`learn-quiz-explain ${chosen === q.answer ? "ok" : "no"}`}>
                        {chosen === q.answer ? "Correct. " : "Not quite. "}
                        {q.explain}
                      </p>
                    )}
                  </div>
                );
              })}
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}

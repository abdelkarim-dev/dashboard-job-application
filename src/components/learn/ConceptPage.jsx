import React, { useState } from "react";

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

// "Ask Gemma" box, present on every concept page. Posts the question plus a
// summary of the current page to the local Gemma proxy (/api/learn-ask) and
// shows the coach's answer, or a clear message when Gemma is busy / not running.
function AskGemma({ concept }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [thinking, setThinking] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  // Buffered fallback for servers without the streaming endpoint (older build).
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

// Renders one reading "concept" subpage (principles, interview prep, AI KB,
// company intel, or CV-personalized content) from the data shape in concepts.js.
// The reading flows in the main column; the study rail docks to the right (Ask
// Gemma, an interactive checklist, and a quick-check quiz) so it uses the
// horizontal space and stays in view while you read. Sections marked `card`
// render as discrete cards (e.g. pitch variants, STAR stories). Code labs are
// NOT rendered here — Learn.jsx maps those to their existing components.
export default function ConceptPage({ concept }) {
  const [reviewed, setReviewedState] = useState(() => !!loadConceptProgress()[concept.id]);
  // Quiz answers are per-mount (not persisted) — they're a self-check, not a score.
  const [answers, setAnswers] = useState({});
  // Checklist ticks ARE persisted so prep progress survives navigation/reload.
  const [checked, setChecked] = useState(() => loadChecklist()[concept.id] || {});

  if (!concept) return null;

  const toggleReviewed = () => {
    const next = !reviewed;
    setReviewedState(next);
    setReviewed(concept.id, next);
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
  const doneCount = checklist.reduce((n, _, i) => n + (checked[i] ? 1 : 0), 0);

  return (
    <article className="learn-concept has-aside" key={concept.id}>
      <header className="learn-concept-head">
        <div>
          <div className="learn-concept-kicker">{concept.group}</div>
          <h1 className="learn-concept-title">{concept.title}</h1>
          {concept.tagline && <p className="learn-concept-lead">{concept.tagline}</p>}
        </div>
        <button
          type="button"
          className={`learn-review-btn ${reviewed ? "done" : ""}`}
          onClick={toggleReviewed}
          aria-pressed={reviewed}
        >
          {reviewed ? "✓ Reviewed" : "Mark reviewed"}
        </button>
      </header>

      <div className="learn-concept-body">
        <div className="learn-concept-main">
          {(concept.sections || []).map((section, i) => (
            <section
              className={`learn-section ${section.card ? "learn-section-card" : ""}`}
              key={section.heading || i}
            >
              {section.heading &&
                (section.card ? (
                  <div className="learn-card-head">
                    {section.tag && <span className="learn-card-tag">{section.tag}</span>}
                    <h3>{section.heading}</h3>
                  </div>
                ) : (
                  <h3>{section.heading}</h3>
                ))}
              {(section.body || []).map((para, j) => (
                <p key={j}>{para}</p>
              ))}
              {section.code && (
                <pre className="learn-code" data-lang={section.code.lang || ""}>
                  <code>{section.code.source}</code>
                </pre>
              )}
            </section>
          ))}

          {keyPoints.length > 0 && (
            <section className="learn-section learn-keypoints">
              <h3>Key takeaways</h3>
              <ul className="learn-points">
                {keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="learn-concept-aside" aria-label="Study tools">
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

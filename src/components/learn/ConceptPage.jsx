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

// Renders one reading "concept" subpage (principles, interview prep, AI KB,
// company intel, or CV-personalized content) from the data shape in concepts.js.
// The reading flows in the main column; the self-check rail (interactive
// checklist + quiz) docks to the right so it uses the horizontal space and stays
// in view while you read. The rail only appears when a concept actually has a
// checklist or quiz. Code labs are NOT rendered here — Learn.jsx maps those to
// their existing components.
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
  const hasAside = checklist.length > 0 || quiz.length > 0;
  const doneCount = checklist.reduce((n, _, i) => n + (checked[i] ? 1 : 0), 0);

  return (
    <article className={`learn-concept ${hasAside ? "has-aside" : ""}`} key={concept.id}>
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

      <div className={`learn-concept-body ${hasAside ? "" : "no-aside"}`}>
        <div className="learn-concept-main">
          {(concept.sections || []).map((section, i) => (
            <section className="learn-section" key={section.heading || i}>
              {section.heading && <h3>{section.heading}</h3>}
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

        {hasAside && (
          <aside className="learn-concept-aside" aria-label="Self-check">
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
                        <input
                          type="checkbox"
                          checked={!!checked[i]}
                          onChange={() => toggleCheck(i)}
                        />
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
        )}
      </div>
    </article>
  );
}

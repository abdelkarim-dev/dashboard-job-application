import React, { useState } from "react";

const PROGRESS_KEY = "learnConceptProgress";

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

// Renders one reading "concept" subpage (principles, interview prep, AI KB, or
// CV-personalized content) from the data shape in concepts.js. Code labs are NOT
// rendered here — Learn.jsx maps those to their existing components.
export default function ConceptPage({ concept }) {
  const [reviewed, setReviewedState] = useState(() => !!loadConceptProgress()[concept.id]);
  // Quiz answers are per-mount (not persisted) — they're a self-check, not a score.
  const [answers, setAnswers] = useState({});

  if (!concept) return null;

  const toggleReviewed = () => {
    const next = !reviewed;
    setReviewedState(next);
    setReviewed(concept.id, next);
  };

  return (
    <article className="learn-concept" key={concept.id}>
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

      {Array.isArray(concept.keyPoints) && concept.keyPoints.length > 0 && (
        <section className="learn-section learn-keypoints">
          <h3>Key takeaways</h3>
          <ul className="learn-points">
            {concept.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      )}

      {Array.isArray(concept.quiz) && concept.quiz.length > 0 && (
        <section className="learn-section learn-quiz">
          <h3>Quick check</h3>
          {concept.quiz.map((q, qi) => {
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
    </article>
  );
}

import React, { useMemo, useState } from "react";
import { collectGlossaryTerms } from "./glossary.js";

// Interactive study drill for a concept page. Questions are AUTO-GENERATED from
// the page's own content — the curated quiz, plus term↔definition MCQs mined
// from the glossary, plus key-point recall flashcards — so every page gets an
// active-recall surface with zero hand-authoring. An optional "generate fresh
// questions" button asks the local Gemma model for more (graceful if it's off).

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(list, n, exclude) {
  const pool = list.filter((x) => x !== exclude);
  return shuffle(pool).slice(0, n);
}

// Build an MCQ pool from the page: curated quiz + term/def questions (both
// directions). Returns [{ q, options:[...], answer:index, explain, kind }].
function buildQuestions(concept, terms) {
  const out = [];
  for (const q of concept.quiz || []) {
    if (Array.isArray(q.options) && q.options.length > 1) {
      out.push({ q: q.q, options: q.options, answer: q.answer, explain: q.explain || "", kind: "curated" });
    }
  }
  const defs = terms.map((t) => t.def);
  const names = terms.map((t) => t.term);
  if (terms.length >= 4) {
    for (const t of terms) {
      // term → definition
      const distractDefs = sample(defs, 3, t.def);
      if (distractDefs.length === 3) {
        const options = shuffle([t.def, ...distractDefs]);
        out.push({
          q: `What does “${t.term}” mean?`,
          options,
          answer: options.indexOf(t.def),
          explain: `${t.term}: ${t.def}`,
          kind: "term",
        });
      }
      // definition → term
      const distractNames = sample(names, 3, t.term);
      if (distractNames.length === 3) {
        const options = shuffle([t.term, ...distractNames]);
        out.push({
          q: `Which term means: “${t.def}”`,
          options,
          answer: options.indexOf(t.term),
          explain: `That's ${t.term}.`,
          kind: "term",
        });
      }
    }
  }
  return out;
}

function buildCards(concept, terms) {
  const cards = [];
  for (const t of terms) cards.push({ front: t.term, back: t.def, tag: "Define it" });
  for (const p of concept.keyPoints || []) cards.push({ front: "Key takeaway — recall it", back: p, tag: "Recall" });
  return cards;
}

function QuizMode({ pool, concept }) {
  const [order, setOrder] = useState(() => shuffle(pool).slice(0, Math.min(10, pool.length)));
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  // Gemma-generated extras get appended to the live pool.
  const [genStatus, setGenStatus] = useState("");
  const [generating, setGenerating] = useState(false);

  const reset = (nextPool) => {
    const source = nextPool || pool;
    setOrder(shuffle(source).slice(0, Math.min(10, source.length)));
    setIdx(0);
    setChosen(null);
    setScore(0);
    setDone(false);
  };

  const q = order[idx];

  const pick = (i) => {
    if (chosen !== null) return;
    setChosen(i);
    if (i === q.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 >= order.length) {
      setDone(true);
      return;
    }
    setIdx((v) => v + 1);
    setChosen(null);
  };

  const generate = async () => {
    setGenerating(true);
    setGenStatus("Asking Gemma for fresh questions…");
    try {
      const res = await fetch("http://127.0.0.1:8787/api/learn-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: concept.title, count: 5, context: buildContext(concept) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setGenStatus("Live generation needs a newer server build — using the auto-built questions from this page.");
      } else if (data.busy) {
        setGenStatus("Gemma is busy. Try again in a moment.");
      } else if (data.ok && Array.isArray(data.questions) && data.questions.length) {
        const extra = data.questions
          .filter((x) => x && x.q && Array.isArray(x.options) && x.options.length > 1 && Number.isInteger(x.answer))
          .map((x) => ({ ...x, kind: "gemma" }));
        if (extra.length) {
          reset([...pool, ...extra]);
          setGenStatus(`Added ${extra.length} fresh question${extra.length > 1 ? "s" : ""} from Gemma.`);
        } else {
          setGenStatus("Gemma didn't return usable questions this time.");
        }
      } else {
        setGenStatus("Gemma isn't reachable. Is your local model running? The page's own questions still work.");
      }
    } catch {
      setGenStatus("Couldn't reach the server. The page's own questions still work.");
    } finally {
      setGenerating(false);
    }
  };

  if (!order.length) {
    return <p className="drill-empty">No quiz questions could be built for this page yet. Try the flashcards.</p>;
  }

  if (done) {
    const pct = Math.round((score / order.length) * 100);
    return (
      <div className="drill-done">
        <div className={`drill-score ${pct >= 80 ? "good" : pct >= 50 ? "ok" : "low"}`}>{pct}%</div>
        <p>{score} / {order.length} correct</p>
        <div className="drill-done-actions">
          <button type="button" className="drill-btn primary" onClick={() => reset()}>↻ New shuffle</button>
          <button type="button" className="drill-btn" onClick={generate} disabled={generating}>
            {generating ? "Generating…" : "✨ Generate with Gemma"}
          </button>
        </div>
        {genStatus && <p className="drill-genstatus">{genStatus}</p>}
      </div>
    );
  }

  return (
    <div className="drill-quiz">
      <div className="drill-progress">
        <div className="drill-progress-bar" style={{ width: `${(idx / order.length) * 100}%` }} />
      </div>
      <div className="drill-meta">
        <span>Question {idx + 1} / {order.length}</span>
        <span className="drill-score-live">Score {score}</span>
      </div>
      <p className="drill-q">{q.q}</p>
      <div className="drill-options">
        {q.options.map((opt, i) => {
          let cls = "drill-option";
          if (chosen !== null) {
            if (i === q.answer) cls += " correct";
            else if (i === chosen) cls += " wrong";
          }
          return (
            <button type="button" key={i} className={cls} disabled={chosen !== null} onClick={() => pick(i)}>
              {opt}
            </button>
          );
        })}
      </div>
      {chosen !== null && (
        <div className={`drill-explain ${chosen === q.answer ? "ok" : "no"}`}>
          <strong>{chosen === q.answer ? "Correct. " : "Not quite. "}</strong>
          {q.explain}
        </div>
      )}
      <div className="drill-quiz-foot">
        <button type="button" className="drill-btn ghost" onClick={generate} disabled={generating}>
          {generating ? "Generating…" : "✨ More from Gemma"}
        </button>
        {chosen !== null && (
          <button type="button" className="drill-btn primary" onClick={next}>
            {idx + 1 >= order.length ? "See score →" : "Next →"}
          </button>
        )}
      </div>
      {genStatus && <p className="drill-genstatus">{genStatus}</p>}
    </div>
  );
}

function FlashcardsMode({ cards }) {
  const [deck, setDeck] = useState(() => shuffle(cards));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [review, setReview] = useState([]);
  const [gotIt, setGotIt] = useState(0);

  if (!deck.length) {
    return <p className="drill-empty">No flashcards for this page yet.</p>;
  }

  const card = deck[idx];
  const atEnd = idx >= deck.length;

  const rate = (known) => {
    if (known) setGotIt((g) => g + 1);
    else setReview((r) => [...r, card]);
    setFlipped(false);
    setIdx((v) => v + 1);
  };

  if (atEnd) {
    return (
      <div className="drill-done">
        <p className="drill-flash-summary">
          <strong>{gotIt}</strong> known · <strong>{review.length}</strong> to review
        </p>
        <div className="drill-done-actions">
          {review.length > 0 && (
            <button
              type="button"
              className="drill-btn primary"
              onClick={() => { setDeck(shuffle(review)); setReview([]); setGotIt(0); setIdx(0); setFlipped(false); }}
            >
              ↻ Review the {review.length} I missed
            </button>
          )}
          <button
            type="button"
            className="drill-btn"
            onClick={() => { setDeck(shuffle(cards)); setReview([]); setGotIt(0); setIdx(0); setFlipped(false); }}
          >
            Restart full deck
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="drill-flash">
      <div className="drill-meta">
        <span>Card {idx + 1} / {deck.length}</span>
        <span className="drill-score-live">{gotIt} known</span>
      </div>
      <button
        type="button"
        className={`drill-card ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show prompt" : "Reveal answer"}
      >
        <span className="drill-card-tag">{card.tag}</span>
        <span className="drill-card-text">{flipped ? card.back : card.front}</span>
        {!flipped && <span className="drill-card-hint">tap to reveal</span>}
      </button>
      {flipped ? (
        <div className="drill-rate">
          <button type="button" className="drill-btn no" onClick={() => rate(false)}>Review again</button>
          <button type="button" className="drill-btn yes" onClick={() => rate(true)}>Got it ✓</button>
        </div>
      ) : (
        <p className="drill-flash-hint">Recall it, then tap the card to check yourself.</p>
      )}
    </div>
  );
}

function buildContext(concept) {
  const headings = (concept.sections || []).map((s) => s.heading).filter(Boolean);
  const kp = (concept.keyPoints || []).slice(0, 10);
  const parts = [];
  if (concept.tagline) parts.push(concept.tagline);
  if (headings.length) parts.push("Sections: " + headings.join("; "));
  if (kp.length) parts.push("Key points: " + kp.join(" | "));
  return parts.join("\n").slice(0, 3500);
}

export default function ConceptDrill({ concept, onClose }) {
  const [mode, setMode] = useState("quiz");
  const terms = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const t of collectGlossaryTerms(concept)) {
      if (seen.has(t.term)) continue;
      seen.add(t.term);
      out.push(t);
    }
    return out;
  }, [concept]);
  const pool = useMemo(() => buildQuestions(concept, terms), [concept, terms]);
  const cards = useMemo(() => buildCards(concept, terms), [concept, terms]);

  return (
    <div className="drill-overlay" role="dialog" aria-label={`Drill: ${concept.title}`}>
      <div className="drill-panel">
        <header className="drill-head">
          <div>
            <p className="drill-eyebrow">Active recall · {concept.label || concept.group}</p>
            <h2>Drill: {concept.title}</h2>
          </div>
          <button type="button" className="drill-close" onClick={onClose} aria-label="Close drill">✕</button>
        </header>

        <div className="drill-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "quiz"}
            className={mode === "quiz" ? "active" : ""}
            onClick={() => setMode("quiz")}
          >
            Quiz <span className="drill-tab-count">{pool.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "cards"}
            className={mode === "cards" ? "active" : ""}
            onClick={() => setMode("cards")}
          >
            Flashcards <span className="drill-tab-count">{cards.length}</span>
          </button>
        </div>

        <div className="drill-body">
          {mode === "quiz" ? (
            <QuizMode pool={pool} concept={concept} />
          ) : (
            <FlashcardsMode cards={cards} />
          )}
        </div>
      </div>
    </div>
  );
}

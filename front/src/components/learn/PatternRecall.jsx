import React, { useEffect, useState } from "react";
import { PATTERNS, GOLDEN_RULES, PATTERN_STATUS_META } from "./patterns.js";
import { awardPoints } from "../../lib/points.mjs";

// Structured Python-exercise recall sheets (the subjects-1-3 study format):
// the idea, the worked code to internalize, complexity, the key insight, and a
// recall drill ("rewrite from a blank file"). Checking a recall item is how you
// log a rep — it persists and earns points toward your daily streak.

const RECALL_KEY = "learnPatternRecall";

function loadRecall() {
  try {
    const raw = localStorage.getItem(RECALL_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveRecall(next) {
  try {
    localStorage.setItem(RECALL_KEY, JSON.stringify(next));
  } catch {}
}

function PatternCard({ pattern, recalled, onToggle }) {
  const [showCode, setShowCode] = useState(false);
  const meta = PATTERN_STATUS_META[pattern.status] || PATTERN_STATUS_META.later;
  const doneCount = pattern.recall.reduce((n, _, i) => n + (recalled[i] ? 1 : 0), 0);
  const allDone = doneCount === pattern.recall.length && pattern.recall.length > 0;

  return (
    <article className={`pat-card status-${pattern.status} ${allDone ? "mastered" : ""}`}>
      <header className="pat-head">
        <span className="pat-n">{pattern.n}</span>
        <div className="pat-titles">
          <h4>{pattern.title}</h4>
          <span className="pat-recall-count">{doneCount}/{pattern.recall.length} recalled</span>
        </div>
        <span className={`pat-status pat-status-${meta.tone}`}>{meta.label}</span>
      </header>

      <p className="pat-idea">{pattern.idea}</p>

      <div className="pat-meta">
        <span className="pat-cx"><b>Time</b> {pattern.complexity.time}</span>
        <span className="pat-cx"><b>Space</b> {pattern.complexity.space}</span>
      </div>

      <div className="pat-insight">💡 {pattern.insight}</div>

      <button
        type="button"
        className="pat-code-toggle"
        onClick={() => setShowCode((v) => !v)}
        aria-expanded={showCode}
      >
        {showCode ? "▾ Hide worked code" : "▸ Show worked code"}
      </button>
      {showCode && (
        <pre className="pat-code" data-lang="python"><code>{pattern.code}</code></pre>
      )}

      <div className="pat-recall">
        <h5>Recall drill — rewrite from a blank file, out loud</h5>
        <ul>
          {pattern.recall.map((item, i) => (
            <li key={i}>
              <label className={recalled[i] ? "done" : ""}>
                <input type="checkbox" checked={!!recalled[i]} onChange={() => onToggle(i)} />
                <span>{item}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {pattern.problems?.length > 0 && (
        <div className="pat-problems">
          {pattern.problems.map((p) => (
            <a
              key={p.lc}
              className="pat-problem"
              href={`https://leetcode.com/problems/${p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}/`}
              target="_blank"
              rel="noreferrer"
            >
              {p.title} <span className="pat-lc">{p.lc}</span>
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

export default function PatternRecall() {
  const [recall, setRecall] = useState(loadRecall);

  // Keep in sync if another surface clears progress.
  useEffect(() => {
    const refresh = () => setRecall(loadRecall());
    document.addEventListener("learn:patternrecall", refresh);
    return () => document.removeEventListener("learn:patternrecall", refresh);
  }, []);

  const toggle = (patternId, index) => {
    // Side effects (persist + points) stay OUTSIDE the state updater: React
    // double-invokes updaters in StrictMode, which would double-award points.
    const forPattern = { ...(recall[patternId] || {}) };
    const wasDone = !!forPattern[index];
    if (wasDone) delete forPattern[index];
    else forPattern[index] = true;
    const next = { ...recall, [patternId]: forPattern };
    if (Object.keys(forPattern).length === 0) delete next[patternId];
    saveRecall(next);
    // Award a point only when checking ON (a fresh rep), never on uncheck.
    if (!wasDone) awardPoints("patternRecalled");
    setRecall(next);
  };

  const masteredCount = PATTERNS.filter((p) => {
    const r = recall[p.id] || {};
    return p.recall.length > 0 && p.recall.every((_, i) => r[i]);
  }).length;

  return (
    <section className="pat-recall-section">
      <div className="pat-recall-head">
        <div>
          <p className="eyebrow">Coding · pattern recall</p>
          <h3>Recall sheets — learn ~8 shapes, not 150 answers</h3>
        </div>
        <span className="pat-mastered">{masteredCount}/{PATTERNS.length} patterns mastered</span>
      </div>

      <div className="pat-golden">
        <strong>{GOLDEN_RULES.title}</strong>
        <ol>
          {GOLDEN_RULES.rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
        <div className="pat-when">
          {GOLDEN_RULES.when.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      </div>

      <div className="pat-grid">
        {PATTERNS.map((p) => (
          <PatternCard
            key={p.id}
            pattern={p}
            recalled={recall[p.id] || {}}
            onToggle={(i) => toggle(p.id, i)}
          />
        ))}
      </div>
    </section>
  );
}

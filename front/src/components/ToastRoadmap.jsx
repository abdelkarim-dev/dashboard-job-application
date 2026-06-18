import React, { useMemo } from "react";
import {
  TOAST_SCREEN,
  RECURSION_CHECK,
  HABITS,
  TOAST_FAVORITES,
  TOP_TEN,
  SUBJECTS,
  STATUS_META,
  normalizeTitle,
} from "./learn/toastRoadmap.js";

// The Toast coding-screen roadmap shown in the LeetCode lab when no problem is
// open (and via the "Roadmap" toggle). It organizes the bank around the 8 prep
// subjects + the top-10 highest-yield list. Any problem already in the local
// runnable bank becomes a one-click "open in editor" chip; the rest link out.

function leetcodeUrl(entry) {
  const slug = String(entry.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `https://leetcode.com/problems/${slug}/`;
}

function ProblemChip({ entry, bankByTitle, onSelectProblem }) {
  const inBank = bankByTitle.get(normalizeTitle(entry.title));
  const solved = inBank?.solved;
  if (inBank && onSelectProblem) {
    return (
      <button
        type="button"
        className={`troad-chip runnable ${solved ? "solved" : ""}`}
        onClick={() => onSelectProblem(inBank)}
        title={`Open “${inBank.title}” in the editor`}
      >
        <span className="troad-chip-run" aria-hidden="true">{solved ? "✓" : "▶"}</span>
        <span className="troad-chip-title">{entry.title}</span>
        {entry.lc && <span className="troad-chip-lc">{entry.lc}</span>}
        {entry.note && <small className="troad-chip-note">{entry.note}</small>}
      </button>
    );
  }
  return (
    <a
      className="troad-chip external"
      href={leetcodeUrl(entry)}
      target="_blank"
      rel="noreferrer"
      title={`Open “${entry.title}” on LeetCode (not in your local bank yet)`}
    >
      <span className="troad-chip-run" aria-hidden="true">↗</span>
      <span className="troad-chip-title">{entry.title}</span>
      {entry.lc && <span className="troad-chip-lc">{entry.lc}</span>}
      {entry.note && <small className="troad-chip-note">{entry.note}</small>}
    </a>
  );
}

export default function ToastRoadmap({ problems = [], onSelectProblem, onClose }) {
  const bankByTitle = useMemo(() => {
    const map = new Map();
    for (const p of problems) map.set(normalizeTitle(p.title), p);
    return map;
  }, [problems]);

  const inBankCount = useMemo(() => {
    const all = [...TOP_TEN, ...SUBJECTS.flatMap((s) => s.problems)];
    const seen = new Set();
    let n = 0;
    for (const e of all) {
      const key = normalizeTitle(e.title);
      if (seen.has(key)) continue;
      seen.add(key);
      if (bankByTitle.has(key)) n += 1;
    }
    return n;
  }, [bankByTitle]);

  const doneCount = SUBJECTS.filter((s) => s.status === "done").length;

  return (
    <div className="troad" aria-label="Toast coding screen roadmap">
      <header className="troad-head">
        <div>
          <p className="eyebrow">Coding screen · {TOAST_SCREEN.company} — {TOAST_SCREEN.team}</p>
          <h2>The screen roadmap</h2>
          <p className="troad-lead">
            Your LeetCode bank, organized around the exact spread the screen draws from.
            <strong> {inBankCount}</strong> of the roadmap problems are runnable here — the rest link out.
          </p>
        </div>
        {onClose && (
          <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
            Back to problems
          </button>
        )}
      </header>

      {/* The screen at a glance */}
      <section className="troad-screen">
        <div className="troad-screen-when">
          <span className="troad-screen-eyebrow">Next gate</span>
          <strong>{TOAST_SCREEN.window}</strong>
          <small>{doneCount}/8 subjects done</small>
        </div>
        <dl className="troad-screen-facts">
          <div><dt>Format</dt><dd>{TOAST_SCREEN.format}</dd></div>
          <div><dt>Scope</dt><dd>{TOAST_SCREEN.scope}</dd></div>
          <div><dt>Difficulty</dt><dd>{TOAST_SCREEN.difficulty}</dd></div>
        </dl>
      </section>

      <div className="troad-cols">
        {/* Top 10 highest-yield */}
        <section className="troad-card troad-top10">
          <h3>If you only do 10 <small>highest yield, all screen-level</small></h3>
          <ol className="troad-top10-list">
            {TOP_TEN.map((e) => (
              <li key={e.rank}>
                <span className="troad-rank">{e.rank}</span>
                <ProblemChip entry={e} bankByTitle={bankByTitle} onSelectProblem={onSelectProblem} />
                <span className="troad-pattern">{e.pattern}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="troad-side">
          {/* The 4 habits */}
          <section className="troad-card troad-habits">
            <h3>The 4 habits <small>beat raw problem count</small></h3>
            <ul>
              {HABITS.map((h, i) => (
                <li key={i}><span className="troad-habit-n">{i + 1}</span>{h}</li>
              ))}
            </ul>
          </section>

          {/* Recursion checklist — the named weak spot */}
          <section className="troad-card troad-recur">
            <h3>Recursion checklist <small>run it every time</small></h3>
            <ol>
              {RECURSION_CHECK.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {/* The 8-subject ladder */}
      <section className="troad-card troad-ladder">
        <h3>The subject ladder <small>easy foundation → medium (the screen's real level)</small></h3>
        <div className="troad-subjects">
          {SUBJECTS.map((s) => {
            const meta = STATUS_META[s.status] || STATUS_META.later;
            return (
              <article key={s.n} className={`troad-subject status-${s.status}`}>
                <div className="troad-subject-head">
                  <span className="troad-subject-n">{s.n}</span>
                  <div className="troad-subject-titles">
                    <h4>{s.title}</h4>
                    <span className="troad-subject-level">{s.level}</span>
                  </div>
                  <span className={`troad-status troad-status-${meta.tone}`}>{meta.label}</span>
                </div>
                <p className="troad-subject-idea">{s.idea}</p>
                {s.built.length > 0 && (
                  <p className="troad-subject-built">
                    <span>Built</span> {s.built.join(" · ")}
                  </p>
                )}
                <div className="troad-subject-problems">
                  {s.problems.map((p) => (
                    <ProblemChip key={p.title + p.lc} entry={p} bankByTitle={bankByTitle} onSelectProblem={onSelectProblem} />
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Toast favorites */}
      <section className="troad-card troad-favorites">
        <h3>Toast favorites <small>hit these by name</small></h3>
        <div className="troad-subject-problems">
          {TOAST_FAVORITES.map((p) => (
            <ProblemChip key={p.title + p.lc} entry={p} bankByTitle={bankByTitle} onSelectProblem={onSelectProblem} />
          ))}
        </div>
      </section>
    </div>
  );
}

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Diagram, DIAGRAMS_BY_CONCEPT } from "./diagrams.jsx";

// Print-to-PDF renderer for the Learn hub. The app is a dark-themed SPA, so for
// a clean PDF we render a dedicated, paper-friendly representation of each
// concept (its own `lp-*` classes, styled in the @media print block of
// index.css) instead of trying to recolor the live page. The tree is portaled
// to <body> so the print stylesheet can hide the whole app (#root) and show
// only this; LearnPrintPortal owns triggering print() + cleanup.
//
// Used by both the per-page "Download PDF" button (ConceptPage) and the rail's
// "Download all" button (Learn) — same renderer, one concept vs. all of them.

function k(prefix, i) {
  return `${prefix}-${i}`;
}

// One reading section: heading + paragraphs + the optional richer blocks
// (callout, numbered steps, comparison table, code) that ConceptPage's live
// <Section> renders. Kept in lockstep with that component's block shapes.
function PrintSection({ section, index }) {
  const body = Array.isArray(section.body) ? section.body : [];
  const steps = Array.isArray(section.steps) ? section.steps : [];
  const table = section.table && Array.isArray(section.table.rows) ? section.table : null;
  return (
    <section className="lp-section">
      {section.heading && (
        <h2 className="lp-h2">
          <span className="lp-num">{String(index + 1).padStart(2, "0")}</span>
          {section.heading}
        </h2>
      )}
      {body.map((para, j) => (
        <p key={k("p", j)} className="lp-p">
          {para}
        </p>
      ))}
      {section.callout && (
        <div className="lp-callout">
          {section.callout.title && <strong>{section.callout.title}</strong>}
          <span>{section.callout.text}</span>
        </div>
      )}
      {steps.length > 0 && (
        <ol className="lp-steps">
          {steps.map((s, i) => (
            <li key={k("s", i)}>{s}</li>
          ))}
        </ol>
      )}
      {table && (
        <table className="lp-table">
          {Array.isArray(table.headers) && (
            <thead>
              <tr>
                {table.headers.map((h, i) => (
                  <th key={k("h", i)}>{h}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={k("r", r)}>
                {row.map((cell, c) => (
                  <td key={k("c", c)}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {section.code && (
        <pre className="lp-code">
          <code>{section.code.source}</code>
        </pre>
      )}
    </section>
  );
}

// A whole concept, print-friendly: header, sections (with the page's diagram(s)
// after the first section, mirroring the live layout), key takeaways, checklist,
// and the quiz with answers marked — it's a study sheet, not a test.
export function ConceptPrintArticle({ concept }) {
  const sections = Array.isArray(concept.sections) ? concept.sections : [];
  const keyPoints = Array.isArray(concept.keyPoints) ? concept.keyPoints : [];
  const checklist = Array.isArray(concept.checklist) ? concept.checklist : [];
  const quiz = Array.isArray(concept.quiz) ? concept.quiz : [];
  const diagrams = DIAGRAMS_BY_CONCEPT[concept.id] || [];

  return (
    <article className="lp-article">
      <header className="lp-head">
        {concept.group && <div className="lp-kicker">{concept.group}</div>}
        <h1 className="lp-title">{concept.title || concept.label}</h1>
        {concept.tagline && <p className="lp-lead">{concept.tagline}</p>}
      </header>

      {sections.map((section, i) => (
        <React.Fragment key={k("sec", i)}>
          <PrintSection section={section} index={i} />
          {i === 0 &&
            diagrams.map((d) => (
              <figure className="lp-figure" key={d.id}>
                <Diagram id={d.id} />
                {d.caption && <figcaption>{d.caption}</figcaption>}
              </figure>
            ))}
        </React.Fragment>
      ))}

      {keyPoints.length > 0 && (
        <section className="lp-section lp-keypoints">
          <h2 className="lp-h2">Key takeaways</h2>
          <ul className="lp-points">
            {keyPoints.map((pt, i) => (
              <li key={k("kp", i)}>{pt}</li>
            ))}
          </ul>
        </section>
      )}

      {checklist.length > 0 && (
        <section className="lp-section lp-checklist">
          <h2 className="lp-h2">Checklist</h2>
          <ul className="lp-check">
            {checklist.map((item, i) => (
              <li key={k("ck", i)}>
                <span className="lp-box" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {quiz.length > 0 && (
        <section className="lp-section lp-quiz">
          <h2 className="lp-h2">Quick check</h2>
          {quiz.map((q, qi) => (
            <div className="lp-quiz-item" key={k("q", qi)}>
              <p className="lp-quiz-q">
                {qi + 1}. {q.q}
              </p>
              <ul className="lp-quiz-options">
                {(q.options || []).map((opt, oi) => (
                  <li key={k("o", oi)} className={oi === q.answer ? "is-answer" : ""}>
                    {oi === q.answer ? "✓ " : "○ "}
                    {opt}
                  </li>
                ))}
              </ul>
              {q.explain && <p className="lp-quiz-explain">{q.explain}</p>}
            </div>
          ))}
        </section>
      )}
    </article>
  );
}

// Mount-to-print controller. Portals the print tree to <body>, sets the body
// class the print stylesheet keys off plus a friendly document.title (Chrome
// uses it as the suggested PDF filename), then opens the print dialog after two
// frames so layout + SVGs settle. Restores everything on `afterprint` (or on
// unmount) and calls onDone so the caller can drop the portal.
export function LearnPrintPortal({ concepts, title, onDone }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;
    document.body.classList.add("learn-printing");

    const finish = () => {
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("learn-printing");
      document.title = prevTitle;
      doneRef.current?.();
    };
    window.addEventListener("afterprint", finish);

    // Open the dialog once the print tree has painted. A rAF covers the normal
    // case (fires next frame); a short timeout is the fallback in case rAF is
    // throttled (e.g. the tab loses focus right after the click) so the portal
    // can't get stuck mounted. `printed` guards against firing twice.
    let printed = false;
    const fire = () => {
      if (printed) return;
      printed = true;
      window.print();
    };
    const raf = requestAnimationFrame(fire);
    const timer = setTimeout(fire, 150);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("learn-printing");
      document.title = prevTitle;
    };
    // Re-run only if the document title changes; onDone is read via ref.
  }, [title]);

  const list = Array.isArray(concepts) ? concepts.filter(Boolean) : [];
  const isPack = list.length > 1;

  return createPortal(
    <div className="learn-print-root" role="document">
      {isPack && (
        <header className="lp-cover">
          <div className="lp-cover-mark">Claire · Interview Prep</div>
          <h1>{title}</h1>
          <p className="lp-cover-sub">
            {list.length} pages · printed study pack
          </p>
          <ol className="lp-cover-toc">
            {list.map((c) => (
              <li key={c.id}>{c.title || c.label}</li>
            ))}
          </ol>
        </header>
      )}
      {list.map((c) => (
        <ConceptPrintArticle concept={c} key={c.id} />
      ))}
    </div>,
    document.body
  );
}

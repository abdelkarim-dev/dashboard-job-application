import React from "react";
import { splitWithGlossary, collectGlossaryTerms } from "./glossary.js";

// One inline jargon term: shows a dotted underline, and reveals its plain-language
// definition in a popover on hover and on keyboard focus / tap (tabIndex makes it
// focusable, so it works on touch where there is no hover). Purely
// CSS-driven — no state — so it is cheap to render hundreds of times.
function GlossaryTerm({ text, term, def }) {
  return (
    <span className="learn-gloss" tabIndex={0} role="note" aria-label={`${term}: ${def}`}>
      {text}
      <span className="learn-gloss-pop" aria-hidden="true">
        <strong>{term}</strong>
        {def}
      </span>
    </span>
  );
}

/**
 * Render a paragraph of body text with known jargon turned into hoverable
 * definitions. Pass the same `seen` Set across a whole page so each term is
 * highlighted only at its first mention (later mentions render as plain text).
 */
export function GlossaryText({ text, seen }) {
  const segments = splitWithGlossary(text, seen);
  return (
    <>
      {segments.map((seg, i) =>
        seg.term ? (
          <GlossaryTerm key={i} text={seg.text} term={seg.term} def={seg.def} />
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        )
      )}
    </>
  );
}

// Pre-segmented variant: when a page has already run splitWithGlossary (to share
// one `seen` set across sections), render the resulting segments directly.
export function GlossarySegments({ segments }) {
  if (!Array.isArray(segments)) return null;
  return (
    <>
      {segments.map((seg, i) =>
        seg.term ? (
          <GlossaryTerm key={i} text={seg.text} term={seg.term} def={seg.def} />
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        )
      )}
    </>
  );
}

// Aside card listing every jargon term used on the current page, with its
// definition — a scannable glossary so a reader new to the vocabulary can get
// oriented before (or instead of) hunting term by term.
export function JargonCard({ concept }) {
  const terms = collectGlossaryTerms(concept);
  if (!terms.length) return null;
  return (
    <section className="learn-aside-card learn-jargon-card">
      <h3>
        Jargon decoder
        <span className="learn-jargon-count">{terms.length}</span>
      </h3>
      <p className="learn-jargon-hint">Every acronym and term-of-art on this page, in plain language. Underlined terms in the text explain themselves on hover or tap.</p>
      <dl className="learn-jargon-list">
        {terms.map((t) => (
          <div className="learn-jargon-item" key={t.term}>
            <dt>{t.term}</dt>
            <dd>{t.def}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

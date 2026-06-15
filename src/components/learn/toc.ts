// First TypeScript module in the Learn hub — the typed source of truth for a
// concept's shape and the "On this page" navigator entries. Imported by the
// (still .jsx) ConceptPage; Vite compiles it natively. See tsconfig.json /
// `npm run typecheck` for the incremental-adoption setup.

/** One reading section of a concept page (only the fields the TOC needs are typed). */
export interface ConceptSection {
  heading?: string;
  body?: string[];
  // Concept sections carry richer optional blocks (callout, table, steps, code,
  // card, …); they're not needed here, so allow them without over-specifying.
  [extra: string]: unknown;
}

/** A Learn-hub concept page (the data shape rendered by ConceptPage). */
export interface Concept {
  id: string;
  group?: string;
  label?: string;
  title?: string;
  tagline?: string;
  sections?: ConceptSection[];
  keyPoints?: string[];
  checklist?: string[];
  quiz?: unknown[];
  [extra: string]: unknown;
}

/** One entry in the "On this page" navigator. */
export interface TocItem {
  id: string;
  label: string;
}

/**
 * Build the navigator entries for a concept: one per titled section (anchored to
 * `sec-<index>`, matching the ids ConceptPage puts on each <section>), plus a
 * trailing "Key takeaways" entry when the page has key points.
 */
export function buildToc(concept: Concept | null | undefined): TocItem[] {
  const sections = concept?.sections ?? [];
  const items: TocItem[] = sections
    .map((section, index): TocItem => ({ id: `sec-${index}`, label: section.heading ?? "" }))
    .filter((item) => item.label.length > 0);

  if ((concept?.keyPoints?.length ?? 0) > 0) {
    items.push({ id: "sec-keypoints", label: "Key takeaways" });
  }

  return items;
}

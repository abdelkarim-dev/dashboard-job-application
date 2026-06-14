import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import Practice from "./Practice.jsx";
import SystemDesign from "./SystemDesign.jsx";
import ConceptPage, { loadConceptProgress } from "./learn/ConceptPage.jsx";
import { CONCEPTS, CONCEPTS_BY_ID } from "./learn/concepts.js";
import { PERSONALIZED_CONCEPTS } from "./learn/personalized.js";

const SolidPractice = lazy(() => import("./SolidPractice.jsx"));
const CleanArchitecture = lazy(() => import("./CleanArchitecture.jsx"));
const StudyPlans = lazy(() => import("./StudyPlans.jsx"));

// Code labs reuse their existing components; concept pages are data (concepts.js
// + personalized.js) rendered by ConceptPage. Both kinds live in one sub-rail.
const LAB_ITEMS = [
  { id: "study-plans", group: "Code labs", label: "Study Plans", icon: "◷", sub: "Plan & track prep" },
  { id: "leetcode", group: "Code labs", label: "LeetCode", icon: "⌨", sub: "Data structures & algorithms" },
  { id: "solid", group: "Code labs", label: "SOLID Lab", icon: "◆", sub: "Java refactor exercises" },
  { id: "clean-architecture", group: "Code labs", label: "Clean Architecture", icon: "🧱", sub: "Boundaries & dependencies" },
  { id: "system-design", group: "Code labs", label: "System Design", icon: "🏗", sub: "Scaling & trade-offs" },
];

const LAB_IDS = new Set(LAB_ITEMS.map((l) => l.id));

// "For You" (personalized) first so it's the most prominent; then the companies
// you're actively looping with, then planning/code, then the reading tracks.
const GROUP_ORDER = ["For You", "Companies", "Code labs", "Principles", "Interview", "Knowledge"];

const DEFAULT_SUB = "study-plans";

function conceptToItem(c) {
  return {
    id: c.id,
    group: c.group,
    label: c.label,
    icon: c.icon || "•",
    sub: (c.tagline || "").length > 46 ? `${c.tagline.slice(0, 44)}…` : c.tagline || "",
    isConcept: true,
  };
}

export default function Learn({ sub, onNavigate, practiceProps = {}, onTrainPlan }) {
  const allConcepts = useMemo(() => [...PERSONALIZED_CONCEPTS, ...CONCEPTS], []);
  const conceptById = useMemo(
    () => ({ ...CONCEPTS_BY_ID, ...Object.fromEntries(PERSONALIZED_CONCEPTS.map((c) => [c.id, c])) }),
    []
  );

  const groups = useMemo(() => {
    const items = [...LAB_ITEMS, ...allConcepts.map(conceptToItem)];
    const byGroup = {};
    for (const item of items) {
      (byGroup[item.group] ||= []).push(item);
    }
    return GROUP_ORDER.filter((g) => byGroup[g]?.length).map((g) => ({ name: g, items: byGroup[g] }));
  }, [allConcepts]);

  const knownIds = useMemo(() => new Set([...LAB_IDS, ...allConcepts.map((c) => c.id)]), [allConcepts]);
  const activeSub = knownIds.has(sub) ? sub : DEFAULT_SUB;

  // Reviewed checkmarks for concept items; refresh when ConceptPage signals.
  const [reviewed, setReviewed] = useState(loadConceptProgress);
  useEffect(() => {
    const onProgress = () => setReviewed(loadConceptProgress());
    document.addEventListener("learn:progress", onProgress);
    return () => document.removeEventListener("learn:progress", onProgress);
  }, []);

  const renderContent = () => {
    switch (activeSub) {
      case "leetcode":
        return <Practice {...practiceProps} />;
      case "study-plans":
        return (
          <Suspense fallback={<div className="learning-empty"><strong>Loading study plans…</strong></div>}>
            <StudyPlans onTrainPlan={onTrainPlan} />
          </Suspense>
        );
      case "solid":
        return (
          <Suspense fallback={<div className="learning-empty"><strong>Loading SOLID lab…</strong></div>}>
            <SolidPractice />
          </Suspense>
        );
      case "clean-architecture":
        return (
          <Suspense fallback={<div className="learning-empty"><strong>Loading Clean Architecture…</strong></div>}>
            <CleanArchitecture />
          </Suspense>
        );
      case "system-design":
        return <SystemDesign />;
      default: {
        const concept = conceptById[activeSub];
        return concept ? <ConceptPage concept={concept} /> : null;
      }
    }
  };

  return (
    <div className="learn-shell">
      <aside className="learn-rail" aria-label="Learning sections">
        <div className="learn-rail-head">
          <strong>Interview Prep</strong>
          <span>{LAB_ITEMS.length + allConcepts.length}</span>
        </div>
        {groups.map((group) => (
          <div className="learn-rail-group" key={group.name}>
            <div className="learn-rail-group-title">{group.name}</div>
            {group.items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`learn-rail-item ${activeSub === item.id ? "active" : ""}`}
                onClick={() => onNavigate(item.id)}
              >
                <span className={`learn-rail-badge ${item.isConcept && reviewed[item.id] ? "done" : ""}`}>
                  {item.isConcept && reviewed[item.id] ? "✓" : item.icon}
                </span>
                <span className="learn-rail-text">
                  <strong>{item.label}</strong>
                  {item.sub && <small>{item.sub}</small>}
                </span>
              </button>
            ))}
          </div>
        ))}
      </aside>
      <div className="learn-content">{renderContent()}</div>
    </div>
  );
}

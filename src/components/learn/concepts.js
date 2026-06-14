// Concept registry for the Learn hub.
//
// Each concept is a *reading* subpage rendered generically by ConceptPage.jsx.
// Adding a new concept (e.g. another principle or an AI topic) is just adding an
// entry here — no new component, no new route wiring. Code labs (LeetCode, SOLID
// Lab, etc.) are NOT here; those reuse their existing components and are wired in
// Learn.jsx.
//
// Shape of a concept:
//   {
//     id, group, label, icon, title, tagline,
//     sections: [{ heading, body: [paragraph, ...], code?: { lang, source } }],
//     keyPoints: [string, ...],
//     quiz?: [{ q, options: [string, ...], answer: index, explain }],
//   }

import { GENERATED_CONCEPTS } from "./concepts.generated.js";

// Hand-authored principle pages live here; the AI/ML, interview, and company
// pages are research-generated (concepts.generated.js). See scripts/gen-concepts.mjs.
const PRINCIPLES = [
  // ── Principles ────────────────────────────────────────────────
  {
    id: "dry",
    group: "Principles",
    label: "DRY",
    icon: "♻",
    title: "DRY — Don't Repeat Yourself",
    tagline: "Every piece of knowledge should have a single, authoritative representation in the system.",
    sections: [
      {
        heading: "What it actually means",
        body: [
          "DRY is about knowledge, not about text. Two blocks of code that happen to look identical today are only a violation if they encode the same decision. If they can change for different reasons, leaving them separate is correct.",
          "The goal is that when a rule changes, you change it in exactly one place — and nothing else silently goes stale.",
        ],
      },
      {
        heading: "The Rule of Three",
        body: [
          "Don't abstract on the second occurrence. Wait for the third. With only two examples you can't yet see the real shape of the abstraction, and a wrong abstraction is more expensive than a little duplication.",
          "Sandi Metz: \"Duplication is far cheaper than the wrong abstraction.\" When in doubt, inline it and wait.",
        ],
      },
      {
        heading: "Coincidental vs real duplication",
        body: [
          "Coincidental: a tax calc and a shipping calc both multiply by 1.2 right now. Merging them couples two unrelated rules — when tax changes to 1.25, shipping breaks.",
          "Real: the same validation rule pasted into three controllers. That is one decision in three places; extract it.",
        ],
      },
      {
        heading: "In an interview",
        body: [
          "Name the trade-off, don't recite the acronym. Say what knowledge is duplicated and what changes together. Showing you know when NOT to DRY signals seniority more than mechanically extracting helpers.",
        ],
      },
    ],
    keyPoints: [
      "DRY = single source of truth for a decision, not 'no repeated characters'.",
      "Rule of Three: tolerate duplication until the third occurrence.",
      "The wrong abstraction costs more than duplication — prefer inlining when unsure.",
      "Ask: do these change together, or for different reasons?",
    ],
    quiz: [
      {
        q: "Two functions contain identical code but model unrelated business rules. The most DRY-aligned move is to…",
        options: [
          "Immediately extract a shared helper",
          "Leave them separate — they aren't the same knowledge",
          "Copy one into the other to centralize",
          "Add a config flag to switch behavior",
        ],
        answer: 1,
        explain: "Identical text isn't duplicated knowledge. Merging unrelated rules creates false coupling.",
      },
    ],
  },
  {
    id: "kiss",
    group: "Principles",
    label: "KISS",
    icon: "○",
    title: "KISS — Keep It Simple",
    tagline: "Prefer the simplest design that fully solves the problem. Complexity is a cost you pay forever.",
    sections: [
      {
        heading: "Simple is a feature",
        body: [
          "Every layer, generic, or indirection you add is something the next reader has to hold in their head and the next change has to route around. Simplicity isn't laziness — it's optimizing for the total cost of ownership.",
          "A good test: could a competent teammate understand this in one pass without you explaining it? If not, justify the complexity or remove it.",
        ],
      },
      {
        heading: "Signs you've over-built",
        body: [
          "A factory that only ever makes one thing. An interface with a single implementation 'for flexibility'. A config option no one sets. Three layers of wrapping to call one library function.",
          "These are usually speculative — solving a problem you imagine rather than one you have.",
        ],
      },
      {
        heading: "Simple ≠ easy ≠ few lines",
        body: [
          "Simple means few concepts and clear flow. A clever one-liner can be deeply un-simple. Sometimes more lines (an explicit loop, named steps) is the simpler design.",
        ],
      },
    ],
    keyPoints: [
      "Complexity is a permanent tax — add it only when the problem demands it.",
      "One implementation behind an interface is a smell, not flexibility.",
      "Optimize for the reader, not for cleverness.",
      "Simple (few concepts) is not the same as short (few characters).",
    ],
    quiz: [
      {
        q: "You add an abstraction layer to 'make it flexible' but there's only one concrete use today. KISS says…",
        options: [
          "Keep it — flexibility is always good",
          "Remove it; add the layer when a second case actually appears",
          "Add a second fake implementation to justify it",
          "Document it heavily instead",
        ],
        answer: 1,
        explain: "Speculative flexibility is complexity with no payer yet — this is also YAGNI.",
      },
    ],
  },
  {
    id: "yagni",
    group: "Principles",
    label: "YAGNI",
    icon: "⊘",
    title: "YAGNI — You Aren't Gonna Need It",
    tagline: "Don't build for an imagined future. Implement things when you actually need them, not when you foresee needing them.",
    sections: [
      {
        heading: "The core idea",
        body: [
          "Speculative features carry real cost — to write, to test, to read, and to drag along through every future refactor — while the predicted need often never arrives or arrives in a different shape than you guessed.",
          "YAGNI says: build the thing in front of you well, and add the next thing when it's actually in front of you. You'll know more then.",
        ],
      },
      {
        heading: "The four costs of speculation",
        body: [
          "Cost of build: time spent now on something unused. Cost of carry: every reader and refactor pays for code that does nothing yet. Cost of delay: the speculative work pushed out the real work. Cost of repair: if you guessed wrong, you now have to un-build it.",
        ],
      },
      {
        heading: "YAGNI vs KISS vs DRY",
        body: [
          "KISS is about the simplest design for what you're building. YAGNI is about not building it at all yet. DRY is about not duplicating a decision once it exists. They reinforce each other — YAGNI removes the speculative abstractions that violate KISS.",
        ],
      },
      {
        heading: "When NOT to apply it",
        body: [
          "YAGNI is about features and abstractions, not about cutting corners on things you DO need: security, error handling, and one-way-door architectural decisions that are expensive to reverse later still deserve thought up front.",
        ],
      },
    ],
    keyPoints: [
      "Add capability when needed, not when foreseen.",
      "Speculative generality has four costs: build, carry, delay, repair.",
      "YAGNI removes complexity; KISS keeps what's left simple; DRY de-dupes it.",
      "Doesn't excuse skipping security, error handling, or hard-to-reverse decisions.",
    ],
    quiz: [
      {
        q: "A teammate wants to add multi-currency support 'because we'll probably go international someday'. There's no such requirement now. YAGNI suggests…",
        options: [
          "Build it now while the code is fresh",
          "Don't build it; revisit when internationalization is a real requirement",
          "Build half of it as a compromise",
          "Add the database columns but not the logic",
        ],
        answer: 1,
        explain: "No current requirement = speculative. Build it when the need is real and better understood.",
      },
    ],
  },
  {
    id: "clean-code",
    group: "Principles",
    label: "Clean Code",
    icon: "✎",
    title: "Clean Code",
    tagline: "Code is read far more than it's written. Optimize relentlessly for the reader.",
    sections: [
      {
        heading: "Not the same as Clean Architecture",
        body: [
          "Clean Code (Robert C. Martin) is about the small scale: names, functions, comments, error handling, formatting. Clean Architecture is about the large scale: dependency direction, boundaries, use cases. You have a separate lab for that — this page is the micro level.",
        ],
      },
      {
        heading: "Names carry the design",
        body: [
          "A good name answers why it exists, what it does, and how it's used — so it needs no comment. Prefer intention-revealing names over comments that explain bad ones. `elapsedDays` beats `d`; `isEligible` beats `flag`.",
        ],
      },
      {
        heading: "Functions: small and one job",
        body: [
          "A function should do one thing at one level of abstraction. Few arguments (zero–two ideal). No surprising side effects. If you need a comment to separate sections inside a function, those sections want to be functions.",
        ],
        code: {
          lang: "js",
          source:
            "// before: does three things, mixed levels\nfunction handle(o){ if(!o.id) throw 'bad'; const t = o.items.reduce((s,i)=>s+i.p,0); save(o.id, t*1.2); }\n\n// after: one job each, names tell the story\nfunction handleOrder(order) {\n  validate(order);\n  const total = withTax(subtotal(order.items));\n  persist(order.id, total);\n}",
        },
      },
      {
        heading: "Comments and error handling",
        body: [
          "Good comments explain why, not what (the code already says what). Delete commented-out code — version control remembers it. Prefer exceptions to error codes, fail fast, and never swallow an error silently.",
        ],
      },
    ],
    keyPoints: [
      "Micro-scale discipline; Clean Architecture is the macro counterpart.",
      "Intention-revealing names remove the need for comments.",
      "Functions do one thing at one level of abstraction.",
      "Comments explain why; delete dead/commented-out code.",
      "Fail fast; never silently swallow errors.",
    ],
    quiz: [
      {
        q: "The best response to 'this function needs a comment to explain what each block does' is usually to…",
        options: [
          "Write detailed comments for each block",
          "Extract each block into a well-named function",
          "Add a docstring at the top",
          "Leave it — comments are documentation",
        ],
        answer: 1,
        explain: "Blocks that need section comments are functions waiting to be named.",
      },
    ],
  },
];

export const CONCEPTS = [...PRINCIPLES, ...GENERATED_CONCEPTS];

export const CONCEPTS_BY_ID = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

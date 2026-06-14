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

export const CONCEPTS = [
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

  // ── Interview ─────────────────────────────────────────────────
  {
    id: "behavioral",
    group: "Interview",
    label: "Behavioral",
    icon: "🗣",
    title: "Behavioral Interviews",
    tagline: "They're testing how you actually operate — structured stories beat adjectives.",
    sections: [
      {
        heading: "Use STAR, every time",
        body: [
          "Situation: brief context. Task: what you specifically owned. Action: what YOU did (say 'I', not 'we'). Result: the outcome, quantified if possible, plus what you learned.",
          "Keep Situation/Task short (~20%) and spend most of the answer on Action and Result. Interviewers reward specificity and ownership.",
        ],
      },
      {
        heading: "Build a story bank",
        body: [
          "Prepare 6–8 real stories you can reshape on the fly: a shipped project, a conflict, a failure, a tight deadline, leading without authority, a data-driven decision, a tough trade-off, going above scope.",
          "Most behavioral questions map onto one of these. You're not memorizing answers — you're indexing experiences so you can retrieve one fast.",
        ],
      },
      {
        heading: "Amazon Leadership Principles",
        body: [
          "If you're targeting Amazon (or AWS), the bar-raiser loop is explicitly LP-driven. Tag each of your stories with the principles it demonstrates: Customer Obsession, Ownership, Invent and Simplify, Dive Deep, Bias for Action, Deliver Results, Disagree and Commit, Earn Trust.",
          "Expect deep follow-ups: 'What was the data?', 'What would you do differently?', 'What did others think?'. They probe past the rehearsed surface — know your stories cold.",
        ],
      },
      {
        heading: "Common prompts to rehearse",
        body: [
          "Tell me about a time you disagreed with your manager. A time you failed. A time you had to make a decision without enough data. The hardest bug you debugged. A time you took on something outside your role. A conflict with a teammate and how you resolved it.",
        ],
      },
    ],
    keyPoints: [
      "STAR structure; weight toward Action + Result.",
      "Say 'I' — they're scoring your contribution, not the team's.",
      "Prepare 6–8 reusable real stories, tagged to themes/LPs.",
      "Quantify results and always include what you learned.",
      "Expect 'dive deep' follow-ups — know the details, not a script.",
    ],
    quiz: [
      {
        q: "In a STAR answer, where should most of your time go?",
        options: [
          "Situation and Task (the setup)",
          "Action and Result (what you did and the outcome)",
          "An even split across all four",
          "The Result only",
        ],
        answer: 1,
        explain: "Setup should be brief; interviewers score your actions and the measurable outcome.",
      },
    ],
  },
  {
    id: "interview-questions",
    group: "Interview",
    label: "General Questions",
    icon: "❓",
    title: "General Interview Questions",
    tagline: "The recurring non-technical questions — have a crisp, honest answer ready for each.",
    sections: [
      {
        heading: "\"Tell me about yourself\"",
        body: [
          "Not your life story. A 60–90s arc: present (what you do now + a signature strength), past (one or two relevant proof points), future (why this role is the logical next step). End by handing the conversation back.",
        ],
      },
      {
        heading: "\"Why this company / role?\"",
        body: [
          "Show you did homework: name something specific — a product, a value, a problem they're solving — and connect it to what you want to do. Generic answers ('great culture') read as no answer.",
        ],
      },
      {
        heading: "Strengths, weaknesses, failure",
        body: [
          "Strength: pick one relevant to the role and back it with evidence. Weakness: a real one plus the concrete system you've built to manage it — no humblebrags ('I work too hard'). Failure: own it plainly, then focus on what changed afterward.",
        ],
      },
      {
        heading: "\"Where do you see yourself / why leaving?\"",
        body: [
          "Future: show ambition aligned with growth they can offer, not a rigid title demand. Leaving: stay positive — pull toward opportunity, never trash the current employer. Negativity is the fastest way to lose a room.",
        ],
      },
      {
        heading: "\"Do you have questions for us?\"",
        body: [
          "Always yes. Ask about how success is measured in the role, what the team is struggling with, or how decisions get made. Thoughtful questions are part of the evaluation, not an afterthought.",
        ],
      },
    ],
    keyPoints: [
      "'Tell me about yourself': present → past → future, ~90 seconds.",
      "'Why us?': cite something specific and tie it to your goals.",
      "Weakness = a real one + how you manage it.",
      "Never badmouth a current/past employer.",
      "Always have 2–3 sharp questions ready to ask them.",
    ],
  },

  // ── Knowledge ─────────────────────────────────────────────────
  {
    id: "ai-knowledge-base",
    group: "Knowledge",
    label: "AI Knowledge Base",
    icon: "🧠",
    title: "AI / ML Knowledge Base",
    tagline: "Fundamentals to prep for AI-focused roles — ML basics through LLMs, RAG, and AWS AI services.",
    sections: [
      {
        heading: "ML fundamentals",
        body: [
          "Supervised vs unsupervised vs reinforcement learning. The bias–variance trade-off and how it drives over/underfitting. Train/validation/test splits and why leakage invalidates results. Core metrics: accuracy vs precision/recall/F1, and when accuracy lies (imbalanced data); regression metrics (MAE, RMSE).",
          "Regularization (L1/L2, dropout), cross-validation, and feature engineering as the levers you reach for in practice.",
        ],
      },
      {
        heading: "Deep learning & transformers",
        body: [
          "Neural net basics: layers, activations, backprop, gradient descent and learning rate. Why transformers replaced RNNs: self-attention captures long-range dependencies in parallel. Tokens, embeddings, positional encoding, the attention mechanism (Q/K/V), and the encoder/decoder split.",
        ],
      },
      {
        heading: "LLMs in practice",
        body: [
          "Pretraining vs fine-tuning vs in-context learning. Prompt engineering, temperature/top-p sampling, context windows, and tokens as the unit of cost and limit. Hallucination and why grounding matters. Parameter-efficient tuning (LoRA) at a high level.",
        ],
      },
      {
        heading: "RAG & evaluation",
        body: [
          "Retrieval-Augmented Generation: embed documents into a vector store, retrieve the most relevant chunks at query time, and feed them as context so the model answers from your data instead of guessing. Key levers: chunking, embedding model, similarity search, re-ranking.",
          "Evaluating LLM systems: offline eval sets, LLM-as-judge, groundedness/faithfulness, and human review. 'It looked good in the demo' is not evaluation.",
        ],
      },
      {
        heading: "AWS AI services (Amazon-focused roles)",
        body: [
          "Amazon Bedrock: managed access to foundation models with a unified API; Knowledge Bases for managed RAG; Guardrails for safety. Amazon SageMaker: train, tune, host, and monitor custom models end to end. Higher-level services: Comprehend (NLP), Rekognition (vision), Textract (documents), Transcribe/Polly (speech).",
          "Know the split: Bedrock = use/customize foundation models; SageMaker = build/train your own.",
        ],
      },
    ],
    keyPoints: [
      "Know the bias–variance trade-off and which metric to trust on imbalanced data.",
      "Self-attention is why transformers scale; tokens are the unit of cost & limits.",
      "RAG grounds an LLM in your data via retrieval over a vector store.",
      "Evaluate LLM systems deliberately (eval sets, judges, groundedness).",
      "Bedrock = use foundation models; SageMaker = build/train your own.",
    ],
    quiz: [
      {
        q: "Your model scores 99% accuracy on a dataset that's 99% one class. What's the problem?",
        options: [
          "Nothing — 99% is excellent",
          "Accuracy is misleading on imbalanced data; check precision/recall/F1",
          "The model is overfitting by definition",
          "You need a bigger model",
        ],
        answer: 1,
        explain: "A trivial 'always majority' classifier hits 99% here. Precision/recall/F1 reveal the truth.",
      },
      {
        q: "Which best describes RAG?",
        options: [
          "Fine-tuning a model on your private data",
          "Retrieving relevant documents and adding them to the prompt as context",
          "Running multiple models and voting",
          "Compressing the model to run on-device",
        ],
        answer: 1,
        explain: "RAG retrieves relevant chunks at query time and grounds the model's answer in them — no retraining.",
      },
    ],
  },
];

export const CONCEPTS_BY_ID = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

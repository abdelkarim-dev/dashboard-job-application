// Generates src/components/learn/concepts.generated.js from the
// interview-kb-research workflow output (a Workflow task .output file).
//
// Usage:  node scripts/gen-concepts.mjs <path-to-workflow.output>
//
// The workflow returns an array of { key, group, title, sections, keyPoints, quiz }.
// This script attaches presentation metadata (id, label, icon, tagline, checklist)
// per topic and emits a plain ES module the Learn hub imports. Re-run it if the
// research workflow is re-run; do not hand-edit the generated file.

import { readFileSync, writeFileSync } from "node:fs";

// id/label/icon/tagline/checklist per research topic key, plus the render order
// within each rail group. Content (sections/keyPoints/quiz) comes from research.
const META = {
  // ── Interview ──
  "behavioral-mastery": {
    id: "behavioral", group: "Interview", label: "Behavioral", icon: "🗣", order: 10,
    tagline: "What senior interviewers actually score, and STAR-L.",
    checklist: [
      "3-4 stories rehearsed in STAR-L, ~70% on Action",
      "A real, owned failure story ready",
      "Can re-aim one story at three different prompts",
      "Numbers automatic in every Result",
      "Say 'I' not 'we'; setup kept short",
    ],
  },
  "amazon-lp": {
    id: "amazon-lp", group: "Interview", label: "Amazon LPs", icon: "▲", order: 11,
    tagline: "How the LP loop is graded, principle by principle.",
    checklist: [
      "One story pre-mapped per high-priority LP",
      "Disagree & Commit story shows both halves",
      "'What I'd do differently' ready per story",
      "Key numbers memorized cold",
    ],
  },
  "general-questions-pro": {
    id: "interview-questions", group: "Interview", label: "General Questions", icon: "❓", order: 12,
    tagline: "Recurring non-technical questions, senior answers.",
    checklist: [
      "Why-this-company has 2-3 specific reasons",
      "Weakness = a real one + the mitigation",
      "Salary range researched; floor known privately",
      "3-5 reverse questions ready per company",
      "Why-leaving is forward-looking, no blame",
    ],
  },
  "interview-tactics": {
    id: "interview-tactics", group: "Interview", label: "Interview Tactics", icon: "🎯", order: 13,
    tagline: "Logistics, the live-coding loop, negotiation, red flags.",
    checklist: [
      "Remote setup tested: camera, audio, screen-share",
      "Live-coding loop: clarify → examples → brute → optimize → test",
      "State complexity unprompted",
      "Negotiation: don't anchor first; negotiate total comp",
      "Thank-you / follow-up note template ready",
      "Can reset cleanly after a bad round and drive a vague design prompt",
      "Reverse questions prepared per interviewer altitude (peer / manager / exec)",
    ],
    extraSections: [
      {
        heading: "Recovering from a bad round mid-loop",
        body: [
          "One weak round rarely sinks a loop. Interviewers calibrate per round and the debrief weighs the whole signal, so the worst thing you can do is carry a bad room into the next one. Reset physically between rounds (water, a slow breath, stand up), and treat each interviewer as a clean slate who has not seen the previous one.",
          "If you fumble a question inside a round, recover in-place rather than spiraling: a calm \"I'd actually approach that differently, here's how\" shows exactly the adaptability they are looking for, and it scores better than a flawless-but-rigid answer. Do not over-apologize; one acknowledgement and a correction is enough. If you realize a coding bug late, say what you see and fix it out loud, because catching your own mistake is a positive signal.",
        ],
      },
      {
        heading: "When the system-design prompt is deliberately vague",
        body: [
          "Some interviewers keep the prompt vague on purpose to test whether you can impose structure. Do not start drawing boxes. Restate the goal in your words, ask two or three sharp scoping questions (who the users are, the scale, the single most important requirement), state your assumptions explicitly, and name non-goals out loud (\"I'll treat analytics reporting as out of scope for now\").",
          "Then commit to a focused slice and design it well, checking in once (\"does it make sense to go deep on the write path first?\"). They are grading your ability to drive clarity and make defensible choices under ambiguity, not your recall of a canonical solution. A candidate who scopes crisply and goes deep on one thing beats one who lists every component shallowly.",
        ],
      },
      {
        heading: "Reverse questions by interviewer altitude",
        body: [
          "Match your questions to who is in the room. Peer engineer: what is the on-call and tech-debt reality, what would you change about the codebase, how does code review work. Hiring manager: how is success measured at six and twelve months, how are technical decisions made and disagreements resolved, what does the path to the next level look like.",
          "Executive or skip-level (VP, CTO, CPO): where is the org betting over the next two to three years, how does this team's roadmap ladder into that, and what distinguishes staff scope from senior here. Asking an exec a peer-level question (or vice versa) reads as not calibrating to the room, which itself is a judgment signal for senior roles.",
        ],
      },
    ],
  },

  // ── Knowledge ──
  "system-design-core": {
    id: "system-design-core", group: "Knowledge", label: "System Design Core", icon: "🏛", order: 20,
    tagline: "The framework, building blocks, and distributed-systems patterns.",
    checklist: [
      "Can run the framework on the clock (reqs → estimate → design → deep dive)",
      "Building blocks cold: caching, sharding, replication, queues, CAP",
      "Can design a rate limiter, news feed, and a RAG system",
      "Each case study answers 'what breaks at 10x'",
    ],
  },
  "ml-fundamentals": {
    id: "ml-fundamentals", group: "Knowledge", label: "ML Fundamentals", icon: "📊", order: 21,
    tagline: "Metrics, bias-variance, data leakage, evaluation.",
    checklist: [
      "Can explain bias-variance and over/underfitting",
      "Know when accuracy lies; reach for precision/recall/F1",
      "Can name three data-leakage traps and the fix",
      "Know train/val/test and time-based splits",
    ],
  },
  "deep-learning-transformers": {
    id: "deep-learning-transformers", group: "Knowledge", label: "Deep Learning", icon: "🧠", order: 22,
    tagline: "Neural nets, self-attention, and the transformer.",
    checklist: [
      "Can explain self-attention (Q/K/V) in 60 seconds",
      "Know why transformers replaced RNNs/LSTMs",
      "Can explain embeddings and positional encoding",
      "Know the quadratic cost of attention",
    ],
  },
  "llms-in-practice": {
    id: "llms-in-practice", group: "Knowledge", label: "LLMs in Practice", icon: "🤖", order: 23,
    tagline: "Fine-tune vs RAG vs prompt, decoding, agents.",
    checklist: [
      "Can decide fine-tune vs RAG vs prompt",
      "Know temperature/top-p and tokens as cost/limit",
      "Can explain tool-calling and agents at a high level",
      "Know what LoRA/QLoRA buy you",
    ],
    extraSections: [
      {
        heading: "Fine-tune vs RAG vs prompt at a glance",
        body: [
          "The one-line rule: prompt for everything you can get away with, RAG for knowledge, fine-tune for behavior. The table makes the trade-offs explicit so you can defend the choice.",
        ],
        table: {
          headers: ["Approach", "Best for", "Update cost", "Main risk"],
          rows: [
            ["Prompt / in-context", "Quick wins, few-shot patterns, formatting", "Instant (edit the prompt)", "Hits a capability ceiling; token cost per call"],
            ["RAG", "Fresh or proprietary knowledge that changes", "Low (re-index)", "Retrieval quality; latency + token cost of context"],
            ["Fine-tune (LoRA/QLoRA)", "Consistent behavior, style, or domain format", "High (a training run + data)", "Goes stale on facts; needs labeled data"],
          ],
        },
        callout: {
          kind: "key",
          title: "Say this in the room",
          text: "These compose: fine-tune the style, RAG the facts, prompt the rest. Naming the failure each one prevents reads more senior than picking a favorite.",
        },
      },
    ],
  },
  "rag-vector-search": {
    id: "rag-vector-search", group: "Knowledge", label: "RAG & Vector Search", icon: "🔎", order: 24,
    tagline: "Chunking, embeddings, hybrid search, re-ranking, eval.",
    checklist: [
      "Can walk RAG end to end (ingest → retrieve → generate)",
      "Know hybrid search + re-ranking and why",
      "Can name RAG eval metrics (groundedness, recall@k)",
      "Know the top failure modes (chunking, lost-in-the-middle)",
    ],
  },
  "aws-ai-services": {
    id: "aws-ai-services", group: "Knowledge", label: "AWS AI Services", icon: "☁", order: 25,
    tagline: "Bedrock vs SageMaker vs the higher-level services.",
    checklist: [
      "Can decide Bedrock vs SageMaker vs a managed service",
      "Know Bedrock Knowledge Bases, Guardrails, Agents",
      "Can map your RAG pipeline onto AWS services",
    ],
  },
  "ai-system-design": {
    id: "ai-system-design", group: "Knowledge", label: "AI System Design", icon: "🧩", order: 26,
    tagline: "Designing an LLM/RAG feature under real constraints.",
    checklist: [
      "Can scope latency, accuracy, and cost up front",
      "Can draw a RAG feature on AWS (async, caching)",
      "Know guardrails, prompt-injection defense, eval in prod",
    ],
  },

  // ── Companies ──
  "toast-interview": {
    id: "toast-interview", group: "Companies", label: "Toast", icon: "🍞", order: 30,
    tagline: "Loop, what they test, and how to tailor your stories.",
    checklist: [
      "Pitch tailored to Toast (reliability + throughput)",
      "Stories mapped to Toast's rounds",
      "Reverse questions specific to Toast ready",
      "Can narrate a payments incident: stop the bleed → diagnose → prevent",
    ],
    extraSections: [
      {
        heading: "Worked example: on-call and incident response in payments",
        body: [
          "Toast is a payments and restaurant-operations platform, so reliability is graded harder than in generic SaaS, and interviewers probe how you think about money-correctness. Know the distinction: an incident is a correctness or money event (a charge double-applied, an order lost, funds not settled) and is high severity regardless of volume; a degradation (latency spike, a slow dashboard) is budgeted against your error budget. Saying that distinction out loud signals you understand payments.",
          "A worked incident narration: a payments webhook consumer starts double-applying charges after a deploy. Detection comes from a reconciliation alert (expected versus settled mismatch), not a customer ticket. Triage: stop the bleed first, disable the consumer or flip a feature flag so no further double-charges happen. Diagnose: a retry without an idempotency key re-applied the charge on redelivery. Fix: add an idempotency key on the charge id plus a dedup table, then refund or reconcile the doubles with a backfill job. Prevent: an idempotency-key check in the payment path, a reconciliation canary, and a runbook.",
          "What they are scoring: do you reach for idempotency, reconciliation, and stop-the-bleed-before-root-cause; do you weigh blast radius and customer trust; do you communicate status to stakeholders during the incident. Tailor from your real work: the WAF false-positive surge (Story 2) is judgment under live pressure, and your SQS/Lambda/DynamoDB batch system already runs on idempotent, at-least-once delivery, which is the exact muscle this round tests. Lead reliability stories with blast radius and money-correctness, not just uptime.",
        ],
      },
    ],
  },
  "autodesk-interview": {
    id: "autodesk-interview", group: "Companies", label: "Autodesk", icon: "📐", order: 31,
    tagline: "Loop, what they test, and how to tailor.",
    checklist: [
      "Pitch tailored to Autodesk (product depth + full-stack)",
      "Stories mapped to Autodesk's rounds",
      "Reverse questions specific to Autodesk ready",
      "A 15-min project pitch rehearsed: decision + trade-off first, not chronology",
    ],
    extraSections: [
      {
        heading: "Worked example: nailing the 15-minute project discussion",
        body: [
          "Autodesk's senior loop often includes a 15 to 20 minute project discussion graded on depth, clarity, and judgment, not on the size of the project. Use a fixed arc so you do not ramble: about 2 minutes of context (what it was, why it mattered, your specific role), about 8 minutes on the meat (the hardest problem, the options you weighed, the decision and its trade-offs, what you personally did), about 3 minutes of results (quantified), and about 2 minutes of reflection (what you would change). Calibrate depth to the interviewer and pause for questions; lead with the decision and trade-off, not a timeline.",
          "Worked pitch using your public lead-capture API: context, a public, WAF-hardened API that 40+ partners depend on, business-critical to the group. The hard problem, keep it available through 1,000 to 10,000 attack attempts on spike days without false-positive blocks that break real partners, while keeping a stable contract across 40+ consumers. The options, blanket WAF tightening versus per-partner handling and targeted exceptions, and how you balanced security against partner availability. What you did, the rule supervision and false-positive hunting. Results, availability held and partner traffic kept flowing. Reflection, you would add a per-partner canary so a false-positive pages you in minutes.",
          "The failure mode is under-delivering (too shallow for a senior bar) or narrating chronologically until time runs out. Pick the project that matches the role: for Autodesk's product depth and growing AI focus, the solo .NET to Spring Boot and React rewrite (end-to-end product ownership) or the Bedrock RAG pipeline (a product-layer AI feature) are both strong alternates.",
        ],
      },
    ],
  },
  "treasure-data-interview": {
    id: "treasure-data-interview", group: "Companies", label: "Treasure Data", icon: "🌊", order: 32,
    tagline: "Loop, realtime / data-platform focus, and tailoring.",
    checklist: [
      "Pitch tailored to Treasure Data (realtime / data platform)",
      "Streaming / event-driven stories front and center",
      "Reverse questions specific to Treasure Data ready",
      "Can run the realtime customer-profile design end to end (~8 min)",
    ],
    extraSections: [
      {
        heading: "Worked example: design a realtime customer-profile service",
        body: [
          "This is the design question to have cold for a CDP. A tight ~8-minute script. Functional requirements: ingest events from many sources, resolve identities into one profile, serve low-latency profile reads for personalization, and support segment queries. Non-functional: events per second, read p99 (say under 50 ms), a freshness SLA (profile reflects an event within N seconds), and the consistency model. Estimate scale out loud (events/sec, number of profiles, read QPS) so the design is grounded.",
          "Architecture: events land on a log (Kafka or Kinesis); a stream processor does identity resolution and upserts the profile; the profile store is a key-value store (DynamoDB or Cassandra) keyed by customer id, fronted by a serving cache for hot reads; a batch path handles backfills and reprocessing. Handle late and duplicate events with event-time plus idempotent upserts and watermarks, so a replay or a straggler does not corrupt the profile. Identity resolution merges deterministic keys (email, user id) and probabilistic signals; design the merge to be idempotent and reversible. Consistency: read-your-writes for the session doing the update, eventual elsewhere. At 10x, watch for hot keys (a few huge profiles) and identity-merge fan-out, and shard or queue accordingly.",
          "Tailor it from your real work: you have built event-driven, serverless pipelines on SQS, Lambda, and DynamoDB, and you evolved a group-wide customer-record system ingesting around 10,000 notifications a day over SQS and 200,000 to 300,000 records per batch. That is a smaller version of this exact problem, so narrate the design as something you have lived, then scale it up.",
        ],
      },
    ],
  },
};

const outPath = process.argv[2];
if (!outPath) {
  console.error("Usage: node scripts/gen-concepts.mjs <path-to-workflow.output>");
  process.exit(1);
}

const parsed = JSON.parse(readFileSync(outPath, "utf8"));
const data = Array.isArray(parsed) ? parsed : Array.isArray(parsed.result) ? parsed.result : JSON.parse(parsed.result);

const concepts = data
  .filter((t) => !t.failed && META[t.key])
  .map((t) => {
    const m = META[t.key];
    return {
      id: m.id,
      group: m.group,
      label: m.label,
      icon: m.icon,
      title: t.title,
      tagline: m.tagline,
      // extraSections/extraChecklist are hand-authored additions appended after
      // the researched content (e.g. company worked examples), so they survive
      // regeneration from the same workflow output.
      sections: [...t.sections, ...(m.extraSections || [])],
      keyPoints: t.keyPoints,
      checklist: [...m.checklist, ...(m.extraChecklist || [])],
      quiz: t.quiz,
      _order: m.order,
    };
  })
  .sort((a, b) => a._order - b._order)
  .map(({ _order, ...c }) => c);

const missing = data.filter((t) => t.failed || !META[t.key]).map((t) => t.key);
if (missing.length) console.warn("Skipped (failed or no META):", missing.join(", "));

const header = `// AUTO-GENERATED by scripts/gen-concepts.mjs from the interview-kb-research
// workflow output. Do not edit by hand; re-run the generator if research changes.
// ${concepts.length} researched, fact-checked concept pages (AI/ML, interview, companies).

export const GENERATED_CONCEPTS = `;

const target = new URL("../src/components/learn/concepts.generated.js", import.meta.url);
writeFileSync(target, header + JSON.stringify(concepts, null, 2) + ";\n");
console.log(`Wrote ${concepts.length} concepts to ${target.pathname}`);

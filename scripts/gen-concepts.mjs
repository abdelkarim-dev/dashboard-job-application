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
    ],
  },
  "autodesk-interview": {
    id: "autodesk-interview", group: "Companies", label: "Autodesk", icon: "📐", order: 31,
    tagline: "Loop, what they test, and how to tailor.",
    checklist: [
      "Pitch tailored to Autodesk (product depth + full-stack)",
      "Stories mapped to Autodesk's rounds",
      "Reverse questions specific to Autodesk ready",
    ],
  },
  "treasure-data-interview": {
    id: "treasure-data-interview", group: "Companies", label: "Treasure Data", icon: "🌊", order: 32,
    tagline: "Loop, realtime / data-platform focus, and tailoring.",
    checklist: [
      "Pitch tailored to Treasure Data (realtime / data platform)",
      "Streaming / event-driven stories front and center",
      "Reverse questions specific to Treasure Data ready",
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
      sections: t.sections,
      keyPoints: t.keyPoints,
      checklist: m.checklist,
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

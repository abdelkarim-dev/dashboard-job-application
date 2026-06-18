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
import { CLOUD_CONCEPTS } from "./cloud.js";

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

// Hand-authored extras that complement the generated pages and the code labs.
const EXTRA_CONCEPTS = [
  {
    id: "coding-patterns",
    group: "Interview",
    label: "Coding Patterns",
    icon: "⌨",
    title: "Coding Interview Patterns",
    tagline: "Recognize the ~15 patterns from the prompt and you solve problems you've never seen. Pair this with the LeetCode lab.",
    sections: [
      {
        heading: "Recognize the pattern, don't grind problems",
        body: [
          "Interview problems are recombinations of about fifteen patterns. The skill that transfers is recognizing which pattern a prompt maps to, then applying the technique you already know. Grinding hundreds of random problems without naming the pattern is the slow path; drilling one or two problems per pattern until the recognition is automatic is the fast one.",
          "For Staff and Senior loops the bar is not competitive-programming speed. It is clean, correct, well-communicated code with the right complexity. Talk through the approach before you type, state the brute force first, then optimize, and state time and space complexity unprompted. A correct medium solved calmly while narrating beats a rushed hard.",
        ],
        callout: {
          kind: "tip",
          title: "The move",
          text: "Read the prompt for the cue word (sorted, longest substring, top-K, all combinations) and name the pattern out loud before you write a line. Naming it is half the solve.",
        },
      },
      {
        heading: "Arrays, strings, stacks",
        body: [
          "Arrays and Hashing: cue is \"have I seen this\", counting, dedup, or O(1) lookup. Technique: a hash map or set for membership and frequency. Usually O(n) time, O(n) space. (Two Sum, Group Anagrams.)",
          "Two Pointers: cue is a sorted array, pairs, palindrome, or in-place work. Technique: pointers from both ends or same direction. O(n) time, O(1) space. (Valid Palindrome, 3Sum.) Sliding Window: cue is \"longest/shortest subarray or substring with...\". Technique: expand right, shrink left, track window state. O(n). (Longest Substring Without Repeating, Min Window Substring.)",
          "Stack: cue is matching pairs, nesting, \"next greater\", or undo. Technique: LIFO, and a monotonic stack for next-greater problems. O(n). (Valid Parentheses, Daily Temperatures.) Intervals: cue is overlapping ranges, merge, or meeting rooms. Technique: sort by start, then sweep. O(n log n). Bit Manipulation: cue is XOR tricks, single number, or subsets via bitmask.",
        ],
      },
      {
        heading: "Searching, ordering, and selection",
        body: [
          "Binary Search: cue is a sorted input, or \"minimize/maximize a feasible value\". Technique: halve the search space, or binary-search on the answer. O(log n). (Search Rotated Array, Koko Eating Bananas.) The \"binary search on the answer\" variant is the one senior candidates miss most, so practice it.",
          "Heap / Priority Queue: cue is \"top K\", \"K-th largest\", merge K lists, or a streaming median. Technique: a min or max heap, often size-K. O(n log k). (Top K Frequent, Merge K Sorted Lists.)",
        ],
      },
      {
        heading: "Linked lists, trees, and graphs",
        body: [
          "Linked List: cue is reorder, cycle detection, nth-from-end, or merge. Technique: fast/slow pointers, a dummy head, and in-place reversal. O(n) time, O(1) space.",
          "Trees (BFS/DFS): cue is hierarchy, paths, level-order, or ancestors. Technique: recursion for DFS, a queue for BFS. O(n). (Level Order, Validate BST.) Tries: cue is prefix matching, autocomplete, or word search. Technique: a tree of characters.",
          "Graphs: cue is nodes and edges, connectivity, shortest path, or dependencies. Technique: BFS/DFS, Union-Find, topological sort, or Dijkstra. O(V+E). (Number of Islands, Course Schedule.) Many \"hard\" problems are a graph traversal in disguise, so practice spotting the implicit graph.",
        ],
      },
      {
        heading: "Optimization: backtracking, DP, greedy",
        body: [
          "Backtracking: cue is \"all combinations / permutations / subsets\" or constraint satisfaction. Technique: DFS with choose, explore, un-choose. Exponential but pruned. (Subsets, Combination Sum.)",
          "Dynamic Programming: cue is \"number of ways\", optimal reuse of sub-results, or overlapping subproblems. Technique: define the state, write the recurrence, then memoize or tabulate. Complexity is states times transitions. (Climbing Stairs, House Robber, Coin Change, Longest Common Subsequence.) Greedy: cue is that a local optimum yields the global one, often with intervals or scheduling. Technique: sort, take the best each step, and be ready to argue why it is correct.",
        ],
      },
      {
        heading: "The drill spine and the per-problem process",
        body: [
          "A tight spine, one to two problems per pattern: Two Sum and Group Anagrams; Valid Palindrome and 3Sum; Longest Substring Without Repeating and Min Window Substring; Valid Parentheses and Daily Temperatures; Search Rotated Array and Koko Eating Bananas; Level Order and Validate BST; Top K Frequent and Merge K Sorted Lists; Number of Islands and Course Schedule; Subsets and Combination Sum; Climbing Stairs, House Robber, Coin Change, and Longest Common Subsequence.",
          "Run every problem through the same five-step loop, out loud, and use the LeetCode lab to run your solution against tests:",
        ],
        steps: [
          "Restate the problem and confirm constraints and edge cases out loud.",
          "State the brute force and its time/space complexity.",
          "Name the pattern and describe the optimized approach.",
          "Code it cleanly, with intention-revealing names.",
          "Walk one example, then state the final time and space complexity.",
        ],
      },
    ],
    keyPoints: [
      "Interview problems are ~15 patterns recombined; recognition is the transferable skill.",
      "Name the pattern from the prompt within ~60 seconds, then apply the technique.",
      "Always state the brute force before optimizing, and state complexity unprompted.",
      "Staff/Senior bar: clean, correct, communicated, not raw speed.",
      "Binary-search-on-the-answer and implicit-graph spotting are the most-missed senior skills.",
      "DP = define state, write recurrence, memoize/tabulate.",
      "Drill 1-2 problems per pattern (the spine), not hundreds at random.",
    ],
    checklist: [
      "Can name the pattern from a prompt within 60 seconds",
      "Always state brute force + its complexity before optimizing",
      "Always state final time/space complexity unprompted",
      "Narrate while coding; don't go silent",
      "Drilled the spine: 1-2 problems per pattern in the LeetCode lab",
    ],
    quiz: [
      {
        q: "A prompt asks for the \"longest substring with at most K distinct characters.\" Which pattern?",
        options: ["Binary search", "Sliding window", "Backtracking", "Union-Find"],
        answer: 1,
        explain: "\"Longest/shortest substring with a constraint\" is the sliding-window signature: expand right, shrink left.",
      },
      {
        q: "\"Minimize the maximum load so the job finishes in D days.\" The strong approach is…",
        options: [
          "Greedy by largest first",
          "Dynamic programming over days",
          "Binary search on the answer (the feasible load)",
          "A max heap of loads",
        ],
        answer: 2,
        explain: "\"Minimize/maximize a feasible value\" signals binary-searching the answer and testing feasibility.",
      },
      {
        q: "For a Staff-level coding round, what matters most?",
        options: [
          "Solving the hardest possible problem fastest",
          "Clean, correct, well-communicated code with stated complexity",
          "Using the most clever one-liner",
          "Writing the fewest lines",
        ],
        answer: 1,
        explain: "Staff signal is correctness, clarity, and communication, including stating complexity, not raw speed.",
      },
    ],
  },
  {
    id: "production-operability",
    group: "Knowledge",
    label: "Production & Operability",
    icon: "📈",
    title: "Production & Operability",
    tagline: "The Staff-level layer system design interviews probe: observability, streaming semantics, API evolution, cost, and resilience.",
    sections: [
      {
        heading: "Observability: the three pillars",
        body: [
          "Metrics are cheap aggregate time series you alert on (request rate, error rate, latency percentiles, queue depth). Logs are structured, per-event records you search after the fact; attach a correlation/request id and sample high-volume paths so cost stays sane. Traces stitch one request's path across services so you can see where the time and the failure actually went; tail-sample to keep the interesting ones.",
          "Two cheat-sheets interviewers like: RED for services (Rate, Errors, Duration) and USE for resources (Utilization, Saturation, Errors). The senior move is to alert on user-facing symptoms (an SLO burning) rather than on every internal cause, so you page humans for things that matter and let dashboards hold the rest.",
        ],
      },
      {
        heading: "SLOs, SLIs, and error budgets",
        body: [
          "An SLI is a measured ratio of good events to total (for example, the fraction of requests served under 300 ms). An SLO is the target for that SLI (say 99.9 percent over 30 days). The error budget is one minus the SLO: the allowed amount of failure. You spend the budget on shipping velocity, and when it is burning fast you slow down and harden instead.",
          "This is the language of reliability-serious orgs, which matters directly for Toast (payments) and any realtime platform. Tie it to your experience: keeping the public lead-capture API available through attack surges is exactly an availability-SLO conversation, and a false-positive partner block is an error-budget event.",
        ],
      },
      {
        heading: "Streaming semantics: event-time, ordering, exactly-once",
        body: [
          "Event-time is when something happened; processing-time is when your system saw it. They diverge under lag, so windowed aggregations key on event-time and use watermarks plus an allowed-lateness window to decide when a window is closeable and what to do with stragglers. Ordering is only guaranteed within a partition or key, never globally, so design keys deliberately.",
          "Delivery semantics: at-least-once with idempotent consumers is the practical default; you dedupe on a stable id so a redelivery is harmless. \"Exactly-once\" in practice is effectively-once, achieved with dedup keys or a transactional outbox, not magic. This is core for Treasure Data (realtime CDP) and Toast (payment events), and it connects to your SQS/Lambda/DynamoDB batch system.",
        ],
      },
      {
        heading: "Evolving an API without breaking partners",
        body: [
          "Once partners depend on you, changes must be backward compatible: add fields, never repurpose or remove them silently, and keep defaults safe. For breaking changes use expand-contract (parallel change): ship the new shape alongside the old, migrate consumers, then retire the old one on a published deprecation timeline.",
          "Know the versioning options and their trade-offs: URI versioning (/v2) is explicit and cache-friendly but forks surface area; header or content-negotiation versioning keeps URLs stable but is easier to get wrong. Consumer-driven contract tests catch breakage before release. You have lived this at the scale of 40+ partner integrations, so narrate it from there.",
        ],
      },
      {
        heading: "Cost as a design axis (TCO)",
        body: [
          "Staff engineers reason about cost while designing, not after. Name the levers: DynamoDB on-demand versus provisioned with autoscaling, Lambda versus an always-on container at sustained load, cache-versus-recompute, storage tiering (S3 standard versus infrequent access versus Glacier), and data egress, which is the bill people forget. Put a rough dollar or unit-economics number on the dominant cost.",
          "This is a strength of yours: scaling the batch 233 percent with no new hardware and right-sizing the carve-out's RDS are both total-cost-of-ownership wins. Frame them as deliberate cost engineering, not luck.",
        ],
      },
      {
        heading: "Resilience and operability",
        body: [
          "Default to defensive integration: timeouts on every remote call, retries with exponential backoff and jitter (never a synchronized retry storm), circuit breakers to stop hammering a failing dependency, and bulkheads to isolate one failure from sinking the whole service. Prefer graceful degradation (serve stale or a reduced feature) over a hard outage.",
          "Operability is a feature: idempotency keys so retries are safe, dead-letter queues for poison messages, runbooks for the top failure modes, and dashboards plus alerts wired before launch, not after the first incident. Interviewers read \"how would you operate this\" as a seniority signal.",
        ],
      },
    ],
    keyPoints: [
      "Three pillars: metrics (alert), logs (search, correlation ids), traces (per-request causality).",
      "Alert on SLO burn / user-facing symptoms, not on every internal cause.",
      "SLI = good/total ratio; SLO = target; error budget = 1 − SLO, spent on velocity.",
      "Event-time + watermarks for late data; ordering only per partition; exactly-once = dedup/outbox.",
      "Backward-compatible by default; breaking changes via expand-contract + deprecation windows.",
      "Design for cost: on-demand vs provisioned, cache vs recompute, egress; put a number on it.",
      "Resilience kit: timeouts, backoff+jitter, circuit breaker, bulkhead, idempotency, DLQ, runbooks.",
    ],
    checklist: [
      "Can define SLI / SLO / error budget and give an example from my own systems",
      "Can explain event-time vs processing-time and exactly-once = effectively-once",
      "Can walk an expand-contract API migration for the 40+ partner API",
      "Can name the cost levers and put a rough number on the dominant cost",
      "Can list the resilience kit and where each applies in a design",
    ],
    quiz: [
      {
        q: "Your service depends on a downstream that starts failing. The best first-line protection is…",
        options: [
          "Retry immediately and indefinitely until it recovers",
          "A circuit breaker plus timeouts, with retries using backoff and jitter",
          "Scale up your own service",
          "Remove the dependency from the request path permanently",
        ],
        answer: 1,
        explain: "Circuit breaker + timeouts stop you hammering a sick dependency; backoff with jitter avoids a synchronized retry storm.",
      },
      {
        q: "\"Exactly-once\" delivery in a distributed pipeline is usually achieved by…",
        options: [
          "A magic flag on the broker",
          "At-least-once delivery plus idempotent/deduplicated consumers (effectively-once)",
          "Turning off retries",
          "Processing everything single-threaded",
        ],
        answer: 1,
        explain: "Real systems get effectively-once via dedup keys or a transactional outbox on top of at-least-once.",
      },
      {
        q: "You must add a required field to an API 40 partners use. The safe path is…",
        options: [
          "Add it as required immediately",
          "Add it optional with a safe default, then migrate consumers (expand-contract)",
          "Remove the old field and tell partners to adapt",
          "Version only via a new hostname overnight",
        ],
        answer: 1,
        explain: "Backward-compatible first: ship it optional, migrate consumers, then tighten — never break dependents in place.",
      },
    ],
  },
  {
    id: "after-the-loop",
    group: "Interview",
    label: "After the Loop",
    icon: "🎬",
    title: "After the Loop: Offers, Rejection, First 90 Days",
    tagline: "The part most prep skips: evaluating an offer beyond comp, the first-90-days question, and handling rejection well.",
    sections: [
      {
        heading: "Evaluate the offer beyond compensation",
        body: [
          "When an offer lands, money is one input among several. Weigh the manager and immediate team, which is your single biggest day-to-day variable; the scope and technical leverage of the role; the growth ceiling and the real path to the next level; the org's stability and funding runway; how clear the first-100-days mandate is; and your escape velocity if it turns out to be a bad fit (would the brand and the work make your next move easy).",
          "Ask the questions that surface these before you sign: how success is measured at six and twelve months, why the role is open, what the team is struggling with, and how decisions get made. You are interviewing them as hard as they interviewed you.",
        ],
      },
      {
        heading: "Red flags that should outweigh a strong number",
        body: [
          "Walk carefully if you get evasive answers about attrition or why the seat is open, a manager you did not connect with, no crisp definition of success, visible reorg churn, or comp framed as \"prove it first and we will level you later.\" A high offer into a bad team or an unstable org is often a worse outcome than a slightly lower offer into a good one.",
          "Trust pattern over hope. If multiple interviewers dodged the same question, that is signal, not coincidence.",
        ],
      },
      {
        heading: "The first 30/60/90 day question",
        body: [
          "This is common for senior and staff roles, and it tests judgment, humility, and how fast you create impact without breaking things. A strong arc: the first 30 days you learn the org, the codebase, and the customers, and you find the highest-leverage problem; days 30 to 60 you ship one visible, trust-building win; by day 90 you propose and start driving a direction.",
          "The failure mode is arriving to \"rewrite everything\" or making big changes before you understand why the current system is the way it is. Lead with listening and a quick win, not a manifesto.",
        ],
      },
      {
        heading: "Handling rejection and feedback",
        body: [
          "If a loop ends in a no, ask the recruiter for feedback within a day or two, framed as wanting to learn rather than to dispute the decision; you will often get one useful theme even when policy limits detail. Separate signal (a pattern across loops, like system-design pacing) from noise (one off round or a calibration miss). Many rejections are fit or leveling, not a verdict on your worth.",
          "Stay gracious: recruiters and interviewers move between companies, and a clean exit keeps the door open. Most places let you reapply in six to twelve months, and a candidate who took feedback and came back stronger is a good story.",
        ],
      },
      {
        heading: "Juggling multiple offers and timelines",
        body: [
          "If you have several processes running, be transparent about your timeline and ask to align decision dates so you can compare. Never invent or bluff an offer you do not have; it is easy to get caught and it poisons trust. Real competing offers are legitimate leverage when used respectfully: state the facts, say where this role is your preference if it is, and ask whether they can close a specific gap.",
        ],
      },
    ],
    keyPoints: [
      "Offer = manager/team + scope/leverage + growth ceiling + stability + mandate clarity + escape velocity, not just comp.",
      "Pattern beats hope: repeated evasive answers are a red flag worth a strong number.",
      "First 90 days: learn → one visible win → propose a direction. Never 'rewrite everything' on day one.",
      "Ask for feedback within ~48h, framed as learning; separate signal from noise.",
      "Most rejections are fit/leveling, not worth; reapply window is usually 6-12 months.",
      "Stay gracious — interviewers move companies; never bluff an offer you don't have.",
    ],
    checklist: [
      "Offer-evaluation criteria written down (not just the number)",
      "A crisp first-30/60/90 answer rehearsed",
      "Recruiter feedback requested within 48h of any no",
      "Decision dates aligned across active processes",
      "Negotiation grounded in real, honestly-stated leverage",
    ],
    quiz: [
      {
        q: "You get a strong offer but never clicked with the hiring manager and got vague answers on attrition. The senior move is…",
        options: [
          "Take it — the comp is great",
          "Treat the manager fit and attrition signals as heavily weighted, and dig further before deciding",
          "Ignore it; managers change anyway",
          "Decline immediately without asking more",
        ],
        answer: 1,
        explain: "Your manager is your biggest day-to-day variable; weigh fit and attrition signals against the number, and probe before signing.",
      },
      {
        q: "Best framing for a '30/60/90 day plan' answer?",
        options: [
          "Rewrite the legacy system in the first month",
          "Learn the org and find leverage, ship one visible win, then propose a direction",
          "Avoid commitments until you're settled",
          "Reorganize the team structure first",
        ],
        answer: 1,
        explain: "Listen and find leverage, earn trust with a quick win, then drive direction — impact without breaking what you don't yet understand.",
      },
    ],
  },
  {
    id: "behavioral-question-bank",
    group: "Interview",
    label: "Question Bank",
    icon: "🗂",
    title: "Behavioral Question Bank",
    tagline: "The actual questions you'll hear, each pre-mapped to one of your stories so you never stall picking an example. Drill aloud.",
    sections: [
      {
        heading: "How to drill with this bank",
        body: [
          "The other behavioral pages teach the method (STAR-L, the Leadership Principles, what's scored). This page is for reps: the concrete questions you will actually be asked. For each one, pre-decide which story from your Story Bank you would reach for, so under pressure you retrieve fast instead of stalling. The story numbers below refer to your STAR-L Story Bank under For You.",
          "Rehearse out loud, not in your head, and time yourself to roughly two to three minutes per answer. Expect the deep follow-ups on every story: what was the data, what did others think, and what would you do differently. Say \"I\", not \"we\". A single story can answer several of these by changing what you emphasize, so practice re-aiming.",
        ],
      },
      {
        heading: "Ownership and impact",
        body: [
          "Tell me about a project you owned end to end. (Story 3, the solo .NET rewrite.)",
          "Tell me about a time you took on something outside your role. (Story 11 reporting automation, or Story 10 the GDPR app.)",
          "What's the project you're most proud of, and why? (Story 4 microservices migration, or Story 1 batch scaling.)",
          "Tell me about a long-term or hard-to-reverse decision you made. (Story 4, picking the first service boundary.)",
          "Tell me about a time you delivered despite serious obstacles. (Story 5 carve-out, or Story 2 WAF surge.)",
          "Tell me about something you improved that nobody asked you to. (Story 11 reporting, or Story 6 CI/CD consolidation.)",
        ],
      },
      {
        heading: "Dive deep and technical judgment",
        body: [
          "What's the hardest bug or incident you've debugged? (Story 7 query-time cut, or Story 2 WAF false positives.)",
          "Tell me about a time you went deeper than others to find the root cause. (Story 1 batch profiling, or Story 7 query-plan analysis.)",
          "Describe a significant technical decision and the trade-offs you weighed. (Story 4 monolith split, or Story 3 stack choice.)",
          "Tell me about a time data changed your mind or your approach. (Story 1, the profile data versus the add-hardware instinct.)",
          "Tell me about a performance or scale problem you solved. (Story 1 batch +233%, or Story 7 the 30% cut.)",
          "Tell me about a time you simplified something complex. (Story 6 seven templates into one, or Story 4 invent-and-simplify.)",
        ],
      },
      {
        heading: "Conflict, influence, and leadership",
        body: [
          "Tell me about a time you disagreed with your manager or a senior decision. (Use a real backbone-then-commit story; the batch add-hardware default in Story 1 works as a disagreement with the default.)",
          "Tell me about a conflict with a peer and how you resolved it. (Pick a real one; keep it about substance, not personality.)",
          "Tell me about a time you influenced people without authority. (Story 6 getting the team onto one CI/CD source, or coordinating the France team in Story 9.)",
          "Tell me about a time you convinced others of a technical direction. (Story 4 microservices POC.)",
          "Tell me about a time you mentored or grew someone. (Story 9 Orange Teaming, onboarding 2 devs + the lead tester.)",
          "Tell me about a time you led through ambiguity. (Story 5 carve-out, or Story 13 dual TL/PO.)",
        ],
      },
      {
        heading: "Failure, ambiguity, and pressure",
        body: [
          "Tell me about a time you failed or made a real mistake. (Your written failure story, archetype 4 in the Story Bank, with a process-level Learning.)",
          "Tell me about a time you missed a deadline or a target. (Be honest; pair it with what you changed.)",
          "Tell me about a decision you had to make without enough data. (Story 4 migration, or Story 5 carve-out under time pressure.)",
          "Tell me about the most pressure you've worked under. (Story 2 attack surge, or Story 5 carve-out deadline.)",
          "Tell me about a time requirements were unclear or kept shifting. (Story 13 dual TL/PO discovery, or Story 12 scoping the RAG pipeline.)",
          "Tell me about a high-pressure production incident. (Story 2; narrate stop-the-bleed then root cause.)",
        ],
      },
      {
        heading: "Customer, quality, and culture",
        body: [
          "Tell me about a time you went above and beyond for a customer or user. (Story 2 protecting 40+ partners, or Story 10 the legal team as an internal customer.)",
          "Tell me about a time you balanced speed against quality. (Story 5 carve-out, or the WAF tuning in Story 2.)",
          "Tell me about a time you raised the bar or insisted on a higher standard. (Story 8 passwordless security, or Story 9 setting review standards.)",
          "Tell me about a time you disagreed and committed. (Show both halves: the principled push-back and the full commitment after the decision.)",
          "Tell me about a tough trade-off you had to make. (Story 1 frugality versus speed, or Story 5 cost versus lift-and-shift.)",
        ],
      },
    ],
    keyPoints: [
      "Pre-map every question to a story so you retrieve fast instead of stalling.",
      "Rehearse aloud, ~2-3 minutes, with the numbers automatic.",
      "Expect follow-ups: what was the data, what did others think, what would you do differently.",
      "Say 'I', not 'we'; weight the answer toward Action and Result.",
      "Re-aim one story across questions by changing emphasis, not by inventing new ones.",
      "Have your written failure story ready — it is the most-probed and most-revealing question.",
    ],
    checklist: [
      "Every question above has a story assigned",
      "3-4 core stories rehearsed aloud, cold, under 3 minutes",
      "Failure story written and rehearsed (not improvised)",
      "A 'what I'd do differently' ready for each core story",
      "Practiced re-aiming one story at two different questions",
    ],
    quiz: [
      {
        q: "The interviewer asks a behavioral question and you blank on which example to use. The bank's whole purpose is to prevent this by…",
        options: [
          "Memorizing a word-for-word script per question",
          "Pre-mapping each question type to a specific story you can retrieve fast",
          "Having one universal story for everything",
          "Improvising a new example each time",
        ],
        answer: 1,
        explain: "Index your experiences to question types ahead of time; you retrieve a story, then tell it with structure, not a memorized script.",
      },
      {
        q: "On the failure question, the strongest answer…",
        options: [
          "Reframes a strength as a weakness ('I care too much')",
          "Names a real, owned failure and focuses on the durable change you made",
          "Blames external circumstances",
          "Picks the smallest possible mistake",
        ],
        answer: 1,
        explain: "Interviewers score self-awareness and recovery; a real owned failure with a process-level learning beats a humblebrag.",
      },
    ],
  },
  {
    id: "ai-fluency",
    group: "Interview",
    label: "AI Fluency",
    icon: "🤖",
    title: "AI Fluency — Your Amazon Q & Bedrock Narrative",
    tagline:
      "Every senior loop now quietly asks one thing: are you an engineer who uses AI to go faster, or someone nervous and avoiding it? You're the first — you use Q daily and shipped a Bedrock RAG chatbot. This is the vocabulary to say it crisply and the story to tell smoothly.",
    sections: [
      {
        heading: "Why this travels into every loop",
        body: [
          "Every senior and staff loop now checks for AI fluency. They are not testing whether you can build a model from scratch — they are quietly answering one question: is this person an engineer who uses AI to go faster and build new things, or is this someone nervous and avoiding it. You want to land firmly as the first kind: calmly, with concrete proof, not buzzwords.",
          "The good news is you already are that person. You use Amazon Q in your day-to-day coding, and you built a real AI feature — a Bedrock retrieval chatbot. You are not pretending. You just need the vocabulary to talk about it crisply and a clean way to tell the story. This same narrative travels into all four loops, so the reps here pay off four times.",
        ],
        callout: {
          kind: "tip",
          title: "The rep that counts",
          text: "Tell the Bedrock story out loud, start to finish, as if asked 'tell me about something you built with AI.' If you can tell it smoothly once, you own it.",
        },
      },
      {
        heading: "The vocabulary, each one a sentence",
        body: [
          "Take the AI words that get thrown around and make each a plain sentence. Every one below is a sentence, not a mountain — that is the whole working vocabulary you need to talk fluently.",
        ],
        defs: [
          { term: "Large language model (LLM)", def: "A system trained on huge amounts of text that predicts the most likely next words." },
          { term: "Foundation model", def: "A big general-purpose model you build on top of, like Claude or Amazon's own models. You don't train these — you use them." },
          { term: "Prompt", def: "The instruction and information you send the model." },
          { term: "Context window", def: "How much text the model can consider at once — the prompt plus its answer. It's finite, so you can't just dump unlimited data in. That limit is why retrieval matters." },
          { term: "Hallucination", def: "When the model confidently states something false. It's not lying — it's filling a gap with a plausible-sounding guess. The single most important limitation to name, because the senior move is showing you design around it." },
          { term: "RAG (retrieval-augmented generation)", def: "On its own a model only knows what it was trained on and will hallucinate about your private data. RAG searches your own documents for the most relevant passages at question time, pastes them into the prompt, and says 'answer using this' — so the model reads from your source of truth instead of guessing." },
          { term: "Embeddings", def: "Turning a piece of text into a list of numbers that captures its meaning, so two passages that mean similar things end up close together." },
          { term: "Vector database", def: "A store built to answer one question: find me the passages most similar in meaning to this query." },
          { term: "Semantic search", def: "Finding by meaning rather than by exact keyword." },
          { term: "Agent", def: "A model given tools and allowed to take actions in steps, not just answer — for example, one that can call an API, read the result, and decide what to do next." },
          { term: "Guardrails", def: "The safety layer around a model that blocks unwanted inputs and outputs — filtering harmful content, or stopping it leaking sensitive data." },
          { term: "Evals (evaluations)", def: "How you measure whether your AI feature is actually any good: testing it against known questions and checking the answers. Mentioning that you evaluate, rather than ship and hope, is a senior signal almost nobody offers." },
        ],
      },
      {
        heading: "Three ways to make a model useful — and when to pick which",
        body: [
          "Knowing when to reach for which is a strong signal. Prompting is cheapest and first to try. RAG is the right choice when answers must come from your own knowledge that changes over time. Fine-tuning is the most expensive and the last resort.",
        ],
        table: {
          headers: ["Approach", "What it is", "When to reach for it"],
          rows: [
            ["Prompting", "Writing good instructions", "Cheapest, always try first"],
            ["RAG", "Giving the model your data at question time", "When answers must come from your own knowledge that changes over time"],
            ["Fine-tuning", "Further training the model on your examples to change its behavior or style", "Most expensive, last resort — rarely the first answer"],
          ],
        },
        callout: {
          kind: "key",
          title: "Interview-ready line",
          text: "Most problems are solved with good prompting and RAG; fine-tuning is rarely the first answer.",
        },
      },
      {
        heading: "Story 1 — Amazon Q in your daily workflow",
        body: [
          "Amazon Q is AWS's generative AI assistant, and the developer version lives in your editor. You use it to scaffold boilerplate, generate unit tests, explain unfamiliar code, and answer AWS questions without leaving your work.",
          "The framing that sounds senior, and is true: you let it handle the rote, repetitive parts so you can spend your judgment on the architecture and the hard decisions. You are not outsourcing thinking — you are removing typing. Say it that way.",
        ],
      },
      {
        heading: "Story 2 — the Bedrock retrieval chatbot (your headline)",
        body: [
          "This is your headline AI story, so know it one layer deeper than the summary. Amazon Bedrock is AWS's managed service for building with foundation models: instead of hosting a model yourself, you reach a range of models through one API, and it provides the surrounding pieces — managed retrieval, guardrails, and agents.",
          "Your chatbot used the RAG pattern: documents were broken into chunks, embedded, and stored, and when a user asked a question the system retrieved the most relevant chunks and fed them to the model to ground the answer.",
          "Be ready for the deeper pokes — a real engineer hits these and you did. You don't need perfect answers; you need to show you met these trade-offs head on, because that is exactly what separates someone who built it from someone who read about it.",
        ],
        defs: [
          { term: "How did you chunk the documents?", def: "Chunks too big waste the context window; chunks too small lose meaning. The trade-off lives there." },
          { term: "How did you keep retrieval quality high?", def: "So the right passages came back for each question." },
          { term: "How did you handle hallucination?", def: "Instruct the model to answer only from the provided context, and to say it doesn't know when the context is thin." },
          { term: "How did you know it worked?", def: "Evaluate against a set of real questions — you measured it, you didn't ship and hope." },
        ],
      },
      {
        heading: "The common questions, with crisp answers",
        body: [
          "These four come up everywhere. Pre-decide the shape of each so you answer calmly, not searching.",
        ],
        defs: [
          { term: "How do you use AI in your work?", def: "Two parts. Day to day, Amazon Q for the rote coding so my time goes to design. And I've shipped an AI feature — a retrieval chatbot on Bedrock — so I've built with this, not just used it." },
          { term: "Tell me about something you built with AI.", def: "The Bedrock RAG story, structured: the problem it solved, the RAG approach in plain terms, the trade-offs you hit on chunking and retrieval and hallucination, and how you evaluated it." },
          { term: "What are the risks or limitations?", def: "Your chance to shine — name them calmly: hallucination (handled with retrieval and grounding), data privacy (be careful what data reaches a model), cost and latency at scale, and the need for evaluation and guardrails rather than shipping on faith. Knowing the limits is the strongest fluency signal there is." },
          { term: "How does AI change engineering?", def: "Grounded and unworried: it amplifies engineers and raises the bar on judgment and review — now you must be good at reading and verifying generated code, not just writing it. It does not remove the need to understand systems." },
        ],
        callout: {
          kind: "tip",
          title: "Tone",
          text: "Confident and current, not hyped and not afraid. Naming the limitations calmly reads as more senior than any amount of enthusiasm.",
        },
      },
    ],
    keyPoints: [
      "The loop is answering one question: do you use AI to go faster, or avoid it? Land as the first — calmly, with proof.",
      "You have proof: Amazon Q daily, and a shipped Bedrock RAG chatbot. The only gap was the words.",
      "Every AI term is one sentence: LLM, foundation model, prompt, context window, hallucination, RAG, embeddings, vector DB, semantic search, agent, guardrails, evals.",
      "Three ways to make a model useful: prompting (first), RAG (your own changing data), fine-tuning (last resort).",
      "Q framing: you remove typing so your judgment goes to architecture — not outsourcing thinking.",
      "Bedrock = one API to many foundation models + managed retrieval, guardrails, agents; your chatbot was chunk → embed → store → retrieve → ground.",
      "Know the deeper pokes: chunking trade-off, retrieval quality, hallucination via 'answer only from context', and evaluation.",
      "Naming risks (hallucination, data privacy, cost/latency, the need for evals + guardrails) is the strongest fluency signal.",
    ],
    checklist: [
      "Can define all twelve AI terms in one sentence each, cold",
      "Can state when to use prompting vs RAG vs fine-tuning",
      "Can give the Amazon Q answer (remove typing, keep judgment) in two sentences",
      "Can tell the Bedrock RAG story end to end in under 2 minutes",
      "Have answers ready for chunking, retrieval quality, hallucination, and how you evaluated it",
      "Can name the risks (hallucination, privacy, cost/latency, evals + guardrails) calmly",
      "Told the Bedrock story out loud, smoothly, at least once",
    ],
    quiz: [
      {
        q: "An interviewer asks how you'd make a model answer questions about your company's private, frequently-changing docs. The right first reach is…",
        options: [
          "Fine-tune the model on the docs",
          "RAG — retrieve the relevant passages at question time and have the model answer from them",
          "Put all the docs into a single prompt",
          "Train a new foundation model",
        ],
        answer: 1,
        explain: "RAG is the right choice when answers must come from your own knowledge that changes over time. Fine-tuning is expensive and rarely the first answer; the context window is finite so you can't just dump everything in.",
      },
      {
        q: "Asked about the risks of AI, the strongest 'senior' answer leads with…",
        options: [
          "How fast models are improving",
          "Naming hallucination and how you design around it with retrieval, grounding, evals, and guardrails",
          "That there are basically no real risks anymore",
          "How many tokens the latest model supports",
        ],
        answer: 1,
        explain: "Hallucination is the most important limitation to name, and the senior move is showing you design around it. Knowing the limits — and that you evaluate rather than ship on faith — is the strongest fluency signal.",
      },
      {
        q: "Why does chunking matter in your Bedrock RAG chatbot?",
        options: [
          "It makes the model train faster",
          "Chunks too big waste the context window; chunks too small lose meaning — it's a real trade-off you tuned",
          "It encrypts the documents",
          "It replaces the need for a vector database",
        ],
        answer: 1,
        explain: "Chunking is a genuine trade-off: oversized chunks burn the finite context window, undersized chunks lose meaning. Showing you met that trade-off is what separates someone who built it from someone who read about it.",
      },
    ],
  },
  {
    id: "system-design-framework",
    group: "Knowledge",
    label: "SD Framework",
    icon: "🧭",
    title: "System Design — The Framework",
    tagline:
      "There's no single right answer. The score comes from driving a vague problem to a reasonable architecture and reasoning about trade-offs out loud. Here's the skeleton, the numbers, and the building blocks.",
    sections: [
      {
        heading: "The mindset: drive, trade off, start simple",
        body: [
          "System design interviews don't have a right answer — they test whether you can take an open-ended problem, ask the right questions, propose a reasonable architecture, and reason about trade-offs out loud. The interviewer is watching how you think, not checking whether you reproduced a diagram. Three rules carry the whole round.",
          "First, drive the conversation — don't wait to be told what to build; clarify, propose, justify. Second, there is always a trade-off; every choice costs something, and naming the cost ('this buys speed but weakens consistency') is what scores points. Third, start simple, then scale — build the naive version, then evolve it as load and constraints grow. Jumping straight to 'we'll shard everything' without explaining why reads as cargo-culting.",
          "What sinks people isn't lack of knowledge — it's freezing, hedging ('I guess we'd use a database?'), and being vague. Say what you'd do and why, plainly.",
        ],
        callout: {
          kind: "tip",
          title: "The move",
          text: "Think out loud the entire time — silence reads as being stuck. A calm, narrated, slightly-imperfect design beats a silent 'perfect' one you never explained.",
        },
      },
      {
        heading: "The 5-step framework — use it on every question",
        body: [
          "Memorize the steps, not answers. The framework is what stops you freezing, because you always know what to do next.",
          "Clarify (3–5 min): separate functional requirements (what it does — 'users place orders, kitchen sees them') from non-functional ones (how well — how many users, read:write ratio, latency target, consistency needs, availability). Write the answers down; they drive every later decision. Estimate (3–5 min): rough numbers to size the problem — one server or a thousand? This tells you whether caching, sharding, and queues are even warranted. High-level design (~10 min): draw the major boxes and data flow (clients → load balancer → app servers → databases / caches / queues) and get agreement before going deep. Deep dive (10–15 min): detail one or two components — the data model, how you scale the DB, how the queue avoids duplicates. Bottlenecks & trade-offs (~5 min): where it breaks under load, single points of failure, what you'd monitor, what you traded away.",
        ],
        steps: [
          "Clarify — functional + non-functional requirements; write them down.",
          "Estimate — QPS, storage, bandwidth; size the problem.",
          "High-level design — boxes and arrows; agree before deep-diving.",
          "Deep dive — one or two components in real detail.",
          "Bottlenecks & trade-offs — failure modes, monitoring, what you gave up.",
        ],
      },
      {
        heading: "Back-of-the-envelope numbers",
        body: [
          "You don't need precision — you need the right order of magnitude. Two anchors do most of the work: there are ~86,400 seconds in a day (round to 100k for speed), and peak traffic is usually 2–3× the average. Always state the read:write ratio out loud — a 100:1 read-heavy system is designed very differently from a write-heavy one.",
          "Worked estimate: '1 million daily active users, 10 requests each per day.' That's 10M requests/day ÷ 86,400 ≈ ~115 req/sec average, so ~300 req/sec at peak. At 1 KB/request that's trivial bandwidth; at 1 KB/user/day of new data it's ~1 GB/day, ~365 GB/year — and now you can size storage. The latency table is why caching and CDNs exist: memory is ~thousands of times faster than disk, and crossing continents dominates everything.",
        ],
        table: {
          headers: ["Operation", "Rough time"],
          rows: [
            ["Memory reference", "~100 ns"],
            ["Read 1 MB from memory", "~10 µs"],
            ["SSD random read", "~100 µs"],
            ["Round trip within a datacenter", "~500 µs"],
            ["Read 1 MB from SSD", "~1 ms"],
            ["Disk seek (spinning)", "~10 ms"],
            ["Round trip across continents", "~150 ms"],
          ],
        },
      },
      {
        heading: "The building blocks",
        body: [
          "These are the LEGO pieces almost every design assembles from. Know what each does, when to add it, and its cost — adding one should be a justified response to a number from your estimate, never reflex.",
        ],
        defs: [
          { term: "Load balancer", def: "Spreads requests across servers and routes around dead ones — the basis of horizontal scaling and high availability. Algorithms: round-robin, least-connections, IP-hash (sticky). L4 (fast, transport) vs L7 (application-aware, routes by URL/header). Cost: it can become a single point of failure, so run it redundantly." },
          { term: "Cache (Redis/Memcached)", def: "Keeps hot data in memory so you don't re-fetch or recompute. Patterns: cache-aside (default), write-through (consistent, slower), write-back (fast, risk of loss). Evict with LRU/TTL. The hard part is invalidation — a stale cache serves wrong answers." },
          { term: "SQL vs NoSQL", def: "SQL (Postgres/MySQL): fixed schema, JOINs, ACID transactions — pick it when relationships and strong consistency matter (orders, payments). NoSQL (DynamoDB/Cassandra): flexible, built to scale writes out — pick it for huge scale with simple access patterns (feeds, sessions). The senior move is naming both with reasons." },
          { term: "Replication", def: "Copy data to read replicas to absorb read load; writes go to the primary and replicate out. Trade-off: replication lag means a replica can be momentarily stale (eventual consistency)." },
          { term: "Sharding (partitioning)", def: "Split data across machines by a key when one machine can't hold the data or the write volume. Shard-key choice is critical — a bad key creates hot shards. Cross-shard queries and transactions get hard; rebalancing is operationally painful." },
          { term: "CDN", def: "Edge servers that cache static content near users, killing the ~150 ms cross-continent round trip and offloading your origin. Use for assets and increasingly cached API responses." },
          { term: "Message queue / stream", def: "A buffer between producers and consumers so work runs asynchronously and survives spikes. A queue (SQS, RabbitMQ) delivers to one consumer then deletes; a log/stream (Kafka, Pulsar, Kinesis) keeps an ordered, replayable record many consumers can read. Trade-off: eventual consistency, plus you must handle duplicates and ordering." },
          { term: "API gateway", def: "A single entry point in front of your services for routing, auth, rate limiting, and request shaping — so each service doesn't reimplement cross-cutting concerns." },
          { term: "Rate limiter", def: "Caps requests per client per window to protect against abuse and overload. Token bucket (allows bursts), leaky bucket (smooth rate), sliding window (accurate counts)." },
        ],
      },
      {
        heading: "The core theory you'll be asked to name",
        body: [
          "A handful of distributed-systems concepts come up again and again. Know the name and the one-line property of each — you lose points for hand-waving and gain them for precision.",
        ],
        defs: [
          { term: "CAP theorem", def: "During a network partition you must choose Consistency (every read sees the latest write) or Availability (every request answers, possibly stale). Partition tolerance isn't optional, so the real choice is C vs A. CP for banking/orders/inventory; AP for feeds/catalogs." },
          { term: "ACID vs BASE", def: "ACID (SQL transactions): Atomic, Consistent, Isolated, Durable — strong guarantees, right for money. BASE (many NoSQL): Basically Available, Soft state, Eventually consistent — relaxed guarantees traded for scale and availability." },
          { term: "Strong vs eventual consistency", def: "Strong: after a write, all reads reflect it immediately — simpler to reason about, costs latency/availability. Eventual: reads may be briefly stale but converge — enables scale. Fine for a likes count, dangerous for an account balance." },
          { term: "Idempotency", def: "An operation you can safely repeat with the same result. With queues and retries (at-least-once delivery), an idempotency key stops a redelivered 'charge card' from charging twice. Design for it wherever you have retries." },
          { term: "Consistent hashing", def: "Distributes keys across nodes so adding/removing a node moves only a small fraction of keys instead of remapping everything. Used by distributed caches and DBs (Cassandra, DynamoDB) to resize smoothly." },
        ],
      },
      {
        heading: "Worked example — restaurant order processing",
        body: [
          "This mirrors the kind of problem a Toast-style company asks; walk it through the five steps. Clarify: tablets place orders → orders sync to the cloud → kitchen display shows them → customers track status, with no lost or duplicated order changes. Non-functional: ~1B order changes/week (≈1,650/sec average, ~5,000/sec peak) across 150k+ restaurants, high availability, order accuracy critical → lean CP for the order record itself.",
          "High-level: tablets → API gateway → Order Service, which writes to a sharded Postgres (by restaurant_id) and publishes to an event stream (Pulsar/Kafka). The kitchen display, analytics, and device-sync each consume the stream independently. Deep dive: the stream decouples the write path from every consumer, so slow analytics never slows the kitchen, and a consumer that was down catches up by re-reading the log. No lost updates because the stream persists durably and consumers ack after processing (at-least-once). No duplicates because each change carries an idempotency key (order_id + version) that consumers dedupe on — this is the key insight to the 'no duplicates' requirement. Shard by restaurant_id so load spreads and a restaurant's queries stay on one shard; partition the stream by order_id so one order's changes stay ordered while different orders process in parallel.",
          "Bottlenecks & trade-offs: a giant chain could create a hot shard (sub-shard by location); the stream is critical infra (replicate across AZs). The trade-off taken: eventual consistency for the downstream views (analytics, sync) in exchange for decoupling and resilience — but strong consistency for the order record itself. Naming that split is the senior-level point.",
        ],
      },
      {
        heading: "Worked example — URL shortener",
        body: [
          "A simpler one to keep ready; it teaches read-heavy design. Requirements: long URL in → short code out; visiting the code redirects; ~100:1 read:write; low redirect latency. The core question is how to generate the code: either a counter encoded in base-62 (a–z, A–Z, 0–9 → 7 chars covers trillions, collision-free but needs coordination) or a hash of the URL truncated to N chars (no central counter, but handle collisions).",
          "Design: on write, generate the code and store {code → long URL} in a key-value store (DynamoDB fits perfectly). On read, check a Redis cache first and only fall through to the DB on a miss, then populate the cache — redirects are massively read-heavy, so the cache is the main performance lever. Trade-off: the counter approach needs coordination so two servers don't mint the same number; solve it by handing each server a range of IDs, or use a distributed ID generator.",
        ],
      },
      {
        heading: "Common mistakes",
        body: [
          "These are the recurring ways candidates lose points — most are about process, not knowledge.",
        ],
        defs: [
          { term: "Jumping to a solution", def: "Drawing before clarifying. Always nail functional + non-functional requirements first." },
          { term: "Hedging", def: "'I guess we'd maybe use a cache?' → 'I'd put a Redis cache in front of the DB because reads dominate 100:1.' State it and justify it." },
          { term: "Over-engineering", def: "Sharding and five queues for 100 users. Match complexity to the scale your estimate justified." },
          { term: "Ignoring trade-offs", def: "Every component has a cost — name it, unprompted." },
          { term: "Forgetting failure", def: "No single points of failure, what happens when a component dies, how you'd monitor it. Raise these before you're asked." },
          { term: "Not knowing your numbers", def: "'3× faster' → 'startup dropped from 90s to 15s.' Specifics signal you did the work." },
        ],
      },
      {
        heading: "The words that scared you, made friendly",
        body: [
          "These are the exact terms that make you feel like you don't know enough — and each is a sentence, not a mountain. None of it is low-level genius; it was just words nobody had handed you yet. Say each in two sentences and you sound fluent.",
        ],
        defs: [
          { term: "Latency", def: "How long one request takes from start to finish. You click, the page shows up in 200 ms — that 200 ms is the latency. Lower is better." },
          { term: "Throughput", def: "How many requests you can handle per second. Latency is one request being fast; throughput is handling many at once. A checkout lane is quick for one person (latency); a store can open many lanes (throughput). Different dials, tuned separately." },
          { term: "p99", def: "Line up 1,000 request times fastest to slowest. p50 is the median (the typical experience); p99 is the request at the 99th percentile — 99% were that fast or faster, only the slowest 1% were worse. Engineers watch the tail because averages lie: a 50 ms average can still leave 1-in-100 users waiting 5 seconds, which at a million users is 10,000 angry people. p99 is just 'how bad is it for my unluckiest 1%.'" },
          { term: "Load balancer (L4 vs L7)", def: "A traffic director in front of several identical servers that spreads requests so no one server gets buried, and stops sending traffic to a server that falls over. L4 works at the network level, just shuffling connections (fast); L7 works at the application level and can peek at the request to route by content (e.g. all image requests to one group) — the smarter one." },
          { term: "Vertical vs horizontal scaling", def: "Vertical = make one machine bigger (more CPU/memory) — simpler, but you hit a ceiling and it's a single point of failure. Horizontal = add more machines and share the work — how everything large is built, because you keep adding boxes and survive any one dying. When in doubt, scale horizontally and put a load balancer in front." },
          { term: "Caching (TTL, LRU, CDN)", def: "Keep a copy of frequently-used data somewhere faster (Redis) so you don't redo slow work every time. Caches go stale, so you set a TTL (time-to-live) after which data refreshes, and an eviction policy for when it fills — commonly LRU (least recently used), evicting whatever nobody has touched longest. A CDN is just caching pushed geographically close to users, so Tokyo gets your images from a Tokyo server, not Virginia." },
          { term: "Replication", def: "Keep copies of your database so reads are faster and you survive failures: one primary takes writes, several read replicas take reads (most apps read far more than they write). Trade-off: a tiny delay before a write shows up on the replicas, so a user might not see their own write for a heartbeat — eventual consistency in the wild." },
          { term: "Sharding", def: "Split one database that's grown too big into pieces so no single machine holds all of it (last names A–M on DB one, N–Z on DB two). You shard when one box can't keep up. The hard, interesting part is choosing the split key so pieces stay roughly even and related data stays together — a bad key sends all traffic to one shard while the others sit idle." },
          { term: "Message queue", def: "A buffer that lets you do work later. A request comes in, you drop a task on the queue and immediately tell the user 'got it'; a separate worker picks it off and does the slow part in the background (like sending a confirmation email after a purchase). It decouples the system, smooths traffic spikes, and if the email service is down a minute the tasks just wait instead of failing. Names you'll hear: SQS and Kafka." },
        ],
        callout: {
          kind: "tip",
          title: "The consistency one-liner",
          text: "Default to eventual consistency for most things (it scales better and is simpler), but insist on strong consistency for anything involving money or inventory, where being wrong for even a second is unacceptable.",
        },
      },
      {
        heading: "Toast practice prompts — anchor everything to your real system",
        body: [
          "Toast's senior loop reliably includes a dedicated system-design round (Tech Lead plus engineers), and it's concrete, not abstract box-drawing: SQL schema and queries, client/connection pools, persistent repositories. One reported prompt is literally 'calculate employee hours from login/logout times' — your target team's exact domain (employee lifecycle), so expect timesheet, payroll, and scheduling-style designs.",
          "Your starting advantage: you are not learning system design from zero. You built a distributed, event-driven lead-ingestion API for 40+ partners with dedup, business-rule routing, and downstream processing on AWS — precisely the kind of system these rounds probe. So your strongest move on every prompt is to anchor it to that real system: present it with the 5-step framework, then map the new prompt onto patterns you already shipped (dedup → idempotency keys, partner fan-out → event stream, routing → business rules). Make that one fluent.",
        ],
        steps: [
          "Your own lead-ingestion API, as a design answer — rehearse presenting it with the framework. Strongest asset; make it fluent.",
          "Employee timesheet / hours system: clock-in/out events → computed hours → payroll. (Closest to the reported Toast prompt.)",
          "Employee-lifecycle event pipeline: onboarding / role-change events fan out to dependent systems.",
          "Shift-reminder notification system: scheduling + delivery + retries.",
        ],
        callout: {
          kind: "key",
          title: "Drive the room (Staff differentiator)",
          text: "Don't wait to be led. Propose the scope yourself, raise cross-team concerns unprompted, and state trade-offs before being asked. Driving the conversation is what separates Staff from Senior.",
        },
      },
      {
        heading: "How to actually talk in the room",
        body: [
          "The content is half of it; delivery is the other half, and it's the trainable part. Four habits carry the round.",
          "Think out loud the entire time — silence reads as being stuck, a running narration of your reasoning reads as competence. State your assumptions before building on them ('I'll assume this is read-heavy, ~1M daily users, fair?') so everything is anchored and the interviewer can correct you, which is a gift. Lead with the simple version, then improve it when they push — get it working end to end, then say 'now if we needed to scale this, here's the first thing I'd change'; that progression is exactly the seniority they're scoring.",
        ],
        callout: {
          kind: "warn",
          title: "Never give a flat no — bridge instead",
          text: "When you don't know something, don't dead-end. Say: 'I haven't used that exact feature in production, but conceptually here's how it works and when I'd reach for it.' That single habit turns every gap from a dead end into a demonstration of how you think. Practice it until it's automatic.",
        },
      },
    ],
    keyPoints: [
      "No right answer — you're scored on driving the problem and reasoning about trade-offs out loud.",
      "Five steps every time: Clarify → Estimate → High-level → Deep dive → Bottlenecks.",
      "Anchors: ~86,400 s/day, peak ≈ 2–3× average, always state the read:write ratio.",
      "Building blocks (LB, cache, SQL/NoSQL, replication, sharding, CDN, queue, gateway, rate limiter) — add each as a justified response to a number.",
      "Name the theory precisely: CAP (C vs A during a partition), ACID vs BASE, idempotency for retries, consistent hashing for smooth resizing.",
      "Event stream + idempotency key = reliable fan-out with no lost or duplicate updates (the order-processing pattern).",
      "The scary words are sentences: latency (one request fast), throughput (many at once), p99 (your unluckiest 1%), L4 vs L7, vertical vs horizontal, TTL/LRU/CDN, replication lag, shard-key choice, queues.",
      "For Toast: anchor every prompt to your 40+-partner lead-ingestion API; expect timesheet/payroll/scheduling designs (e.g. hours from login/logout).",
      "Delivery: think out loud, state assumptions, lead simple then scale, and never give a flat no — bridge to what you do know.",
      "Start simple, then scale; think out loud; never go silent.",
    ],
    checklist: [
      "Can run a blank prompt through all five steps without notes",
      "Can do the 1M-DAU estimate (≈115/sec avg, ~300/sec peak) out loud",
      "Can recite the latency ladder (memory → SSD → cross-continent) and what it implies",
      "Can justify SQL vs NoSQL and when to add a cache / queue / shard",
      "Can define CAP, ACID/BASE, idempotency, consistent hashing in one line each",
      "Can explain latency, throughput, p99, L4/L7, vertical/horizontal, TTL/LRU/CDN, replication, sharding, queue in two sentences each",
      "Walked the order-processing design end to end, naming the consistency split",
      "Have the URL-shortener read-heavy design ready as a second example",
      "Can present the lead-ingestion API as a design answer, and map a Toast timesheet prompt onto it",
      "Rehearsed the bridge sentence for 'I don't know that' until it's automatic",
    ],
    quiz: [
      {
        q: "An order system must never lose or duplicate an order change, with many independent consumers. The cleanest pattern is…",
        options: [
          "Synchronous calls from the writer to each consumer",
          "A durable event stream with consumers that ack, plus an idempotency key per change",
          "A single shared database table everyone polls",
          "Fire-and-forget messages to each consumer",
        ],
        answer: 1,
        explain: "A replayable stream gives at-least-once delivery (no loss); an idempotency key (order_id + version) lets consumers dedupe redeliveries (no duplicates).",
      },
      {
        q: "~1M daily active users make ~10 requests each per day. Roughly what average QPS are you sizing for?",
        options: ["~12 req/sec", "~115 req/sec", "~1,200 req/sec", "~12,000 req/sec"],
        answer: 1,
        explain: "10M requests ÷ ~86,400 s ≈ 115/sec average; peak is ~2–3× that, so ~300/sec.",
      },
      {
        q: "During a network partition, a payments system should favour…",
        options: [
          "Availability — always answer, even if possibly stale",
          "Consistency — refuse rather than serve wrong data",
          "Neither; CAP doesn't apply to payments",
          "Whichever has lower latency",
        ],
        answer: 1,
        explain: "Money is a CP case: better to reject than to serve or accept an inconsistent balance. Feeds and catalogs lean AP.",
      },
    ],
  },
  {
    id: "rag-bedrock",
    group: "Knowledge",
    label: "RAG on Bedrock",
    icon: "📚",
    title: "RAG on AWS Bedrock",
    tagline:
      "Change the task from 'answer from memory' to 'answer using only these documents.' How the pipeline works, where Bedrock fits, the two APIs to know cold, and the levers that separate a demo from a system.",
    sections: [
      {
        heading: "The mental model",
        body: [
          "A language model only knows its training data and will confidently invent answers about your private data. RAG (Retrieval-Augmented Generation) changes the task from 'answer from memory' to 'here are the relevant documents — answer using only these.' You keep your data in a searchable store, fetch the relevant pieces at query time, and inject them into the prompt. The model becomes a reasoning-and-phrasing engine over your facts.",
          "Why RAG over fine-tuning: data stays current (update the store, not the model), it's cheaper, answers are grounded and citable, and you don't bake proprietary data into model weights. Fine-tuning changes style/behaviour; RAG supplies knowledge. They're complementary, but for 'answer questions over our docs', RAG is the default.",
        ],
      },
      {
        heading: "The pipeline: two phases",
        body: [
          "Phase A — ingestion (offline, runs when data changes): take your documents, chunk them into passages (you can't usefully embed a 50-page PDF as one unit), embed each chunk into a vector with an embedding model, and store the vectors + text + metadata in a vector database indexed for nearest-neighbour search. Chunking strategy is the single biggest lever on quality. Use the same embedding model for indexing and querying.",
          "Phase B — serving (online, per question): embed the question with that same model, retrieve the top-K nearest chunks, build a prompt with those chunks as context plus the question and an instruction ('answer only from this context; if it's not here, say so'), and send it to the model to generate a grounded answer with citations. A chatbot just wraps Phase B in a loop and carries conversation history so follow-ups work.",
        ],
      },
      {
        heading: "Where Bedrock fits — and the two APIs",
        body: [
          "Amazon Bedrock is a fully-managed service giving you one API to call many foundation models (Claude, Amazon Nova/Titan, Llama, Cohere) with no GPUs to host. Bedrock Knowledge Bases is managed RAG: point it at a data source and it does all of Phase A (fetch, chunk, embed, store) and gives you APIs for Phase B, with built-in session context for multi-turn. Two APIs are worth knowing cold:",
        ],
        defs: [
          { term: "RetrieveAndGenerate", def: "'RAG in one call' — embeds the query, searches, augments the prompt, calls the model, and returns an answer with source attribution. Use it to ship fast." },
          { term: "Retrieve", def: "Returns just the chunks and lets you do the prompting/generation. Use it when you need control: custom prompts, your own reranking, hybrid search, or multi-model routing." },
        ],
        callout: {
          kind: "tip",
          title: "The one-liner",
          text: "Start with RetrieveAndGenerate to ship; move to Retrieve + custom orchestration when retrieval quality becomes the bottleneck.",
        },
      },
      {
        heading: "Reference architecture — chatbot over a knowledge base",
        body: [
          "It maps cleanly onto a serverless stack. Documents land in S3. A Bedrock Knowledge Base ingests them (chunk → embed with Titan/Cohere → store) into a vector index — OpenSearch Serverless, Aurora pgvector, or Pinecone. A user hits API Gateway → Lambda, which calls Retrieve or RetrieveAndGenerate: vector search for the top-K, optional rerank + metadata filter, then a foundation model (Claude/Nova) returns the answer with citations. Session history is kept per user; Bedrock Guardrails screen both input and output. Infra is defined in Terraform.",
          "The diagram above shows the two bands: ingestion offline into the Knowledge Base, serving online from user to answer, with the vector store feeding retrieval at query time.",
        ],
      },
      {
        heading: "Production levers — what separates a demo from a system",
        body: [
          "A basic knowledge base 'works' but gives mediocre answers. The fixes are almost always about retrieval quality, not a bigger model.",
        ],
        defs: [
          { term: "Chunking strategy", def: "Fixed-size (fast, for dev), semantic (model finds natural breaks), hierarchical (parent/child — retrieve a focused child, pull surrounding parent context; a robust production default), or custom. Recommended default: hierarchical + hybrid search + reranking." },
          { term: "Hybrid search", def: "Combine semantic (vector) and keyword (BM25) search. Vectors catch meaning; keywords catch exact terms, product codes, and acronyms. Improves recall." },
          { term: "Reranking", def: "After a broad first retrieval, a cross-encoder reranker (Amazon Rerank, Cohere Rerank) re-scores candidates and keeps only the most relevant before the model. High ROI." },
          { term: "Metadata filtering", def: "Tag chunks (date, department, region) and filter before search ('only 2026 docs'). Kills whole classes of wrong answers cheaply." },
          { term: "Guardrails", def: "Bedrock Guardrails do content filtering, PII redaction, denied topics, and a contextual grounding check that flags answers unsupported by the retrieved context — your anti-hallucination guard. Apply on input and output." },
          { term: "Evaluation", def: "Don't eyeball it. Build a ground-truth Q&A set and measure Faithfulness (grounded in context?), Correctness, and Context Relevance. The mature take: invest in evaluation before you fuss over chunking." },
          { term: "Observability", def: "CloudWatch is infra-focused (latency, logs) and won't show cost-per-conversation or per-user token usage; teams add LLM observability (Datadog LLM Observability, Langfuse, LangSmith)." },
        ],
      },
      {
        heading: "The honest trade-off (this is the senior answer)",
        body: [
          "Bedrock Knowledge Bases is 'RAG in a box' — fast to stand up, but somewhat of a black box: you're constrained on chunking/retrieval internals, and debugging a bad answer through CloudWatch alone is painful. Teams that outgrow it sometimes rebuild retrieval directly on OpenSearch or Pinecone to regain control over accuracy.",
          "The mature framing isn't 'managed vs DIY' — it's start managed to ship, then break out the parts you need control over when your evaluation tells you to. Driven by measurement, not dogma. Saying that is what reads as senior.",
        ],
      },
      {
        heading: "The two code patterns",
        body: [
          "Pattern 1 is managed — one call returns the answer plus citations. Pattern 2 gives you control — retrieve the chunks, then prompt and generate yourself. The same operations exist in the AWS SDK for Java (BedrockAgentRuntimeClient), which is what you'd use at a Java/Kotlin shop.",
        ],
        code: {
          lang: "python",
          source: `import boto3
rt = boto3.client("bedrock-agent-runtime", region_name="us-east-1")

# Pattern 1 — managed, one call (answer + citations)
resp = rt.retrieve_and_generate(
    input={"text": "What is our refund policy for enterprise customers?"},
    retrieveAndGenerateConfiguration={
        "type": "KNOWLEDGE_BASE",
        "knowledgeBaseConfiguration": {
            "knowledgeBaseId": KB_ID,
            "modelArn": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
            "retrievalConfiguration": {"vectorSearchConfiguration": {"numberOfResults": 5}},
        },
    },
)
print(resp["output"]["text"])  # resp["citations"] for sources

# Pattern 2 — control: retrieve, then generate yourself
hits = rt.retrieve(
    knowledgeBaseId=KB_ID,
    retrievalQuery={"text": user_question},
    retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 8}},
)
context = "\\n\\n".join(h["content"]["text"] for h in hits["retrievalResults"])
brt = boto3.client("bedrock-runtime", region_name="us-east-1")
answer = brt.converse(
    modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
    messages=[{"role": "user", "content": [{"text":
        f"Answer using ONLY the context. If it's not there, say you don't know.\\n\\n"
        f"Context:\\n{context}\\n\\nQuestion: {user_question}"}]}],
)
print(answer["output"]["message"]["content"][0]["text"])`,
        },
      },
    ],
    keyPoints: [
      "RAG = retrieve relevant chunks at query time and answer only from them — grounded, current, citable.",
      "RAG supplies knowledge; fine-tuning changes behaviour. For 'answer over our docs', RAG is the default.",
      "Two phases: ingest offline (chunk → embed → store); serve online (embed query → retrieve top-K → augment → generate).",
      "Use the SAME embedding model for indexing and querying; chunking is the biggest quality lever.",
      "Bedrock: RetrieveAndGenerate to ship fast; Retrieve + your own orchestration when you need control.",
      "Quality fixes are about retrieval, not a bigger model: hierarchical chunking + hybrid search + reranking + metadata filters.",
      "Stop hallucination with grounding + 'answer only from context', Guardrails' grounding check, citations, and a faithfulness eval.",
      "Senior framing: start managed (Knowledge Bases), break out to OpenSearch/Pinecone when evaluation demands it.",
    ],
    checklist: [
      "Can explain RAG vs fine-tuning in two sentences",
      "Can draw the two-phase pipeline from memory",
      "Can say when to use RetrieveAndGenerate vs Retrieve",
      "Can name four retrieval-quality levers (chunking, hybrid, rerank, metadata)",
      "Can give the anti-hallucination stack (grounding, Guardrails check, citations, faithfulness eval)",
      "Can state the managed-vs-DIY trade-off as a measurement-driven decision",
    ],
    quiz: [
      {
        q: "Answers from your Bedrock knowledge base are mediocre. What do you tune first?",
        options: [
          "Swap in a larger / more expensive model",
          "Retrieval: better chunking, hybrid search, reranking, metadata filters — measured against an eval set",
          "Raise the temperature",
          "Add more few-shot examples to the prompt",
        ],
        answer: 1,
        explain: "Mediocre RAG is almost always a retrieval problem, not a model problem. Fix chunking/hybrid/rerank/filters and measure faithfulness before reaching for a bigger model.",
      },
      {
        q: "You need to ship a doc-Q&A bot fast with source attribution. The quickest Bedrock path is…",
        options: [
          "Retrieve, then hand-build prompting and generation",
          "RetrieveAndGenerate — it embeds, searches, augments, calls the model, and returns citations in one call",
          "Fine-tune a model on the docs",
          "Embed everything into one giant prompt",
        ],
        answer: 1,
        explain: "RetrieveAndGenerate is 'RAG in one call' with built-in source attribution. Move to Retrieve + custom orchestration only when retrieval quality becomes the bottleneck.",
      },
      {
        q: "Which best stops the bot from making things up?",
        options: [
          "A bigger model",
          "Ground answers in retrieved context, instruct 'answer only from context else say you don't know', add a grounding guardrail, and measure faithfulness",
          "Turning off retrieval",
          "Asking the model to be confident",
        ],
        answer: 1,
        explain: "Hallucination is controlled by grounding + an explicit 'only from context' instruction + Bedrock's contextual grounding check + citations, verified against a faithfulness eval — not by model size.",
      },
    ],
  },
  {
    id: "api-data-realtime",
    group: "Knowledge",
    label: "APIs, Real-time & DBs",
    icon: "🔌",
    title: "APIs, Real-time & Databases — Choosing the Right Tool",
    tagline:
      "Pick the API style, the delivery model, and the datastore from the access pattern — and name the one tradeoff each choice buys you. The senior signal here is matching the verb to the tool, not knowing every tool.",
    sections: [
      {
        heading: "The frame: choose by access pattern, name the tradeoff",
        card: true,
        tag: "Read first",
        body: [
          "Every choice on this page is the same move: look at how the data is accessed (read-heavy vs write-heavy, point lookup vs join, one-way vs bidirectional, internal vs public) and pick the tool that fits it, then say out loud what that choice costs. That second half — naming the tradeoff unprompted — is what reads as senior. \"I'd use gRPC here\" is a fact; \"I'd use gRPC for the internal hop because it's faster and strictly typed, trading away browser-friendliness and human-readable payloads\" is an architect.",
          "These choices are not separate from system design — they ARE the API, data-model, and storage steps of the design framework. So treat this page as the deep-dive vocabulary for those steps: when the interviewer says \"how do clients talk to it\" you reach here, and when they say \"where does the data live\" you reach here.",
        ],
        callout: {
          kind: "key",
          title: "The one habit",
          text: "For every API/transport/DB you name, follow it immediately with \"…which buys me X and costs me Y.\" One decision, one tradeoff, every time.",
        },
      },
      {
        heading: "API styles — REST vs gRPC vs GraphQL",
        body: [
          "REST is the default web API: resources addressed by URL, manipulated with HTTP verbs, usually JSON over HTTP/1.1. It is ubiquitous, debuggable from a browser or curl, and cacheable by ordinary HTTP infrastructure because a GET is just a GET. The cost is that it's loosely contracted (JSON has no enforced schema unless you bolt on OpenAPI) and chatty — fetching a screen often means several round trips.",
          "gRPC is a binary RPC framework: you define the service and messages in a .proto file (Protocol Buffers), and it generates strongly-typed client and server stubs. It rides HTTP/2, so it multiplexes calls over one connection and supports streaming in both directions. It is compact and fast and gives you a strict, versioned contract — which is exactly why it shines for internal service-to-service calls in a mesh where latency matters. The cost: it's not natively browser-friendly (needs a proxy like gRPC-Web), the binary payloads aren't human-readable, and standard HTTP caches don't understand it.",
          "GraphQL is a query language for your API: the client sends one query describing exactly the fields it wants, and the server returns precisely that shape. This kills over-fetching (pulling fields you don't need) and under-fetching (needing N follow-up calls), which is why it's loved for rich, varied front-end and mobile clients. The cost: HTTP caching is hard (it's usually one POST to /graphql, so the URL no longer identifies the response), server complexity rises (resolvers, the N+1 query problem, query-cost limiting to stop a malicious deep query), and observability is harder because every request hits the same endpoint.",
          "Say the heuristic plainly: REST for public, broadly-consumed, cache-friendly APIs; gRPC for internal, latency-sensitive, strongly-contracted service-to-service hops and streaming; GraphQL when diverse clients need to shape their own data and over/under-fetching is the real pain.",
        ],
        table: {
          headers: ["Dimension", "REST", "gRPC", "GraphQL"],
          rows: [
            ["Transport / wire", "HTTP/1.1, usually JSON (text)", "HTTP/2, Protocol Buffers (binary)", "HTTP, JSON; one POST endpoint"],
            ["Contract", "Loose (OpenAPI optional)", "Strict, codegen'd from .proto", "Strict, typed schema (SDL)"],
            ["Best fit", "Public / broadly-consumed APIs", "Internal service-to-service, low latency", "Rich/varied clients shaping data"],
            ["Streaming", "Not native (SSE/WS bolt-on)", "First-class, bidirectional", "Subscriptions (over WS)"],
            ["Caching", "Easy (HTTP GET semantics)", "Hard (binary, no HTTP cache)", "Hard (POST, no URL identity)"],
            ["Main cost", "Chatty, untyped by default", "Not browser-native, opaque payloads", "Server complexity, N+1, caching"],
          ],
        },
        callout: {
          kind: "tip",
          title: "Which API style?",
          text: "Browser/third-party clients and you want HTTP caching → REST. Internal microservice mesh where latency and a tight contract matter (and you control both ends) → gRPC. One backend feeding many client shapes (web + iOS + Android) drowning in round trips → GraphQL.",
        },
      },
      {
        heading: "API design essentials (REST-flavored, mostly transferable)",
        body: [
          "These are the cross-cutting concerns an interviewer expects you to volunteer once you've picked a style. They apply to any HTTP API; gRPC bakes some in via its framework.",
        ],
        defs: [
          { term: "Resources & verbs", def: "Model nouns as resources (/orders/123), use HTTP verbs for the action: GET read, POST create, PUT replace, PATCH partial update, DELETE remove. Keep verbs out of URLs (/orders, not /getOrders). GET must be safe (no side effects)." },
          { term: "Status codes", def: "2xx success (200 OK, 201 Created, 204 No Content), 3xx redirect, 4xx client error (400 bad request, 401 unauthenticated, 403 unauthorized, 404 not found, 409 conflict, 429 too many requests), 5xx server error. Use them honestly — don't return 200 with an error body." },
          { term: "Idempotency", def: "PUT/DELETE are naturally idempotent; POST is not. For unsafe-to-repeat operations (charge a card), accept a client-supplied Idempotency-Key and dedupe on it so a retried request doesn't double-act. Essential anywhere retries exist." },
          { term: "Pagination", def: "Never return an unbounded list. Offset/limit is simple but drifts and gets slow deep into the data; cursor/keyset pagination (give me items after this token) is stable under inserts and scales — prefer it for large or live datasets." },
          { term: "Versioning", def: "Plan for change up front. URI versioning (/v2/...) is explicit and cache-friendly but forks your surface area; header/media-type versioning keeps URLs stable but is easier to get wrong. Add fields, never repurpose or remove them silently (backward compatibility)." },
          { term: "Rate limiting", def: "Cap requests per client per window to protect against abuse and overload; return 429 with a Retry-After. Token bucket allows bursts, leaky bucket smooths the rate, sliding window counts accurately." },
          { term: "Auth", def: "Authentication = who you are (OAuth2/OIDC + JWTs, or API keys for service clients); authorization = what you may do (scopes/roles, least privilege). Carry credentials in the Authorization header over TLS — never in the URL." },
        ],
      },
      {
        heading: "Real-time delivery — polling vs SSE vs WebSockets",
        body: [
          "When the client needs fresh data without the user hammering refresh, the question is how the server pushes (or appears to push) updates. There are four rungs, from cheapest/dumbest to richest/most operationally demanding.",
          "Short polling: the client asks \"anything new?\" on a fixed timer. Trivial to build and stateless, but it wastes requests when nothing changed and adds latency equal to the poll interval. Long polling: the request is held open until there's data (or a timeout), then the client immediately re-requests — near-real-time over plain HTTP, but it ties up a connection per client and is fiddly. Server-Sent Events (SSE): a single long-lived HTTP connection over which the server streams text events to the client; it's one-way (server→client), auto-reconnects, and is dead simple — ideal for live feeds, notifications, dashboards, and streaming LLM tokens. WebSockets: a persistent, full-duplex TCP connection upgraded from HTTP; both sides send anytime with low overhead — the right tool for genuinely bidirectional, interactive, low-latency things (chat, multiplayer, collaborative editing, live trading).",
          "The decision: if updates flow only server→client, SSE — it's simpler, rides ordinary HTTP, and reconnects for free. Reach for WebSockets only when the client also needs to push frequently and interactively. Polling is the fallback when you can't hold connections (or the update cadence is slow enough that it doesn't matter).",
        ],
        table: {
          headers: ["Mechanism", "Direction", "How it works", "Reach for it when"],
          rows: [
            ["Short polling", "Client pulls", "Repeated requests on a timer", "Simplest; slow-changing data, no infra for push"],
            ["Long polling", "Client pulls (held open)", "Server holds request until data/timeout", "Near-real-time but must stay on plain HTTP"],
            ["SSE", "Server → client only", "One long-lived HTTP stream of text events", "One-way live feeds, notifications, token streaming"],
            ["WebSockets", "Bidirectional, full-duplex", "Persistent TCP upgraded from HTTP", "Chat, multiplayer, collab, low-latency two-way"],
          ],
        },
        callout: {
          kind: "warn",
          title: "Scaling stateful connections",
          text: "SSE and WebSockets are stateful — each open connection pins a client to a server, so you can't just round-robin behind a plain load balancer. You need sticky routing, a shared pub/sub backplane (e.g. Redis) so any node can deliver to any client, and a plan for connection limits and reconnect storms. Polling is stateless and scales like any other HTTP endpoint — that simplicity is a real argument for it.",
        },
      },
      {
        heading: "Database types — what each is for",
        body: [
          "There's no \"best\" database, only a best fit for an access pattern. Know the family, the one-line job, and an example engine for each — that's enough to make and defend a choice.",
        ],
        defs: [
          { term: "Relational (SQL)", def: "Structured rows with a fixed schema, joins across tables, and ACID transactions. The default for anything with relationships and strong-consistency needs (orders, payments, users). Engines: PostgreSQL, MySQL, AWS Aurora/RDS." },
          { term: "Key-value", def: "A giant hash map: get/put by key, blisteringly fast point lookups, no joins. For sessions, caches, feature flags, simple high-throughput lookups. Engines: Redis, Amazon DynamoDB, Memcached." },
          { term: "Document", def: "Stores self-contained JSON-like documents with flexible schema; good when each record is mostly read/written as a whole and the shape varies. For catalogs, user profiles, content. Engines: MongoDB, DynamoDB, Couchbase." },
          { term: "Wide-column", def: "Rows keyed by a partition key with sparse, wide columns; built for massive write throughput and horizontal scale with a known query pattern. For time series at scale, event logs, IoT. Engines: Apache Cassandra, ScyllaDB, Google Bigtable." },
          { term: "Graph", def: "First-class nodes and edges with fast relationship traversal; for data where the connections are the point. For social graphs, recommendations, fraud rings, knowledge graphs. Engines: Neo4j, Amazon Neptune." },
          { term: "Search", def: "An inverted index for full-text search, relevance ranking, and faceted filtering — not a system of record, but a fast queryable view alongside one. For product/site search, log search. Engines: Elasticsearch/OpenSearch, Apache Solr." },
          { term: "Time-series", def: "Optimized for append-heavy, timestamped data with time-windowed queries, downsampling, and retention/rollup policies. For metrics, monitoring, sensor data. Engines: InfluxDB, TimescaleDB, Amazon Timestream, Prometheus." },
        ],
      },
      {
        heading: "Choosing a database — the decision procedure",
        body: [
          "Don't pattern-match on hype. Walk the same procedure every time, out loud, and the choice (and its defense) falls out.",
        ],
        steps: [
          "Start from the access patterns: list what you read and write, the read:write ratio, the query shapes (point lookup? join? range scan? full-text? traversal?), and how often each runs. The dominant pattern drives everything.",
          "State the consistency and scale needs: must reads always see the latest write (money/inventory), or is briefly-stale fine (feed, count)? How big does the data get and how fast do writes arrive — does it outgrow one machine?",
          "Default to SQL (relational). If you have relationships, joins, ad-hoc queries, or transactions, a managed relational DB is almost always the right starting point — it's flexible, well-understood, and ACID. Don't reach past it without a reason.",
          "Reach for NoSQL when you have a known, fixed access pattern that must scale horizontally beyond one machine — then pick the family by pattern: key-value/document for point lookups, wide-column for high-write time series, graph for traversals, search for full-text. Design the schema AROUND those queries (especially DynamoDB/Cassandra), not around a tidy normalized model.",
          "Consistency one-liner: default to eventual consistency (it scales better and is simpler), but insist on strong consistency for anything involving money or inventory, where being wrong for even a second is unacceptable.",
          "It's fine — and senior — to use more than one: a relational system of record plus a search index plus a cache (polyglot persistence). Name the sync/consistency cost of doing so.",
        ],
        callout: {
          kind: "tip",
          title: "The rule that scores points",
          text: "\"Design around access patterns.\" For SQL you can query flexibly later; for NoSQL the schema is the query plan, so the worst trap is modeling the data tidily and discovering it can't answer your real queries without a full scan. Say which patterns you're optimizing for before you pick.",
        },
      },
      {
        heading: "Tie it back to system design",
        body: [
          "In a design round, these are not trivia — they're the API step (how clients talk to the system: REST/gRPC/GraphQL and the real-time transport), the data-model step (the DB family that fits the access pattern), and the storage step (how that DB survives load). When you pick a datastore, immediately name how you'd scale and protect it, because the interviewer will ask anyway.",
          "Indexing makes a query fast by avoiding a full scan — but each index slows writes and costs space, so index for your read patterns, not reflexively. Sharding (partitioning) splits data across machines by a key when one machine can't hold the data or the write volume; the shard-key choice is critical (a bad key creates a hot shard). Replication copies data to read replicas to absorb read load and survive failures, at the cost of replication lag (brief staleness). Caching keeps hot data in memory (Redis) so you don't re-fetch or recompute — the hard part is invalidation. These are the same building blocks as the System Design Framework page; this page just decides which API and which DB you're scaling.",
        ],
        // suggested diagram: client → API (REST/gRPC/GraphQL) → service → [cache] → DB family, with a side branch showing SSE/WebSocket push back to the client. (Diagrams live in a separate file.)
      },
    ],
    keyPoints: [
      "Pick by access pattern; name one tradeoff per choice — that's the senior signal.",
      "REST = ubiquitous, cacheable, loosely typed; gRPC = binary/HTTP-2/streaming/strict, best internal service-to-service & low latency; GraphQL = client-shaped queries (no over/under-fetch), pays in caching & server complexity.",
      "API hygiene to volunteer: resources+verbs, honest status codes, idempotency keys for retried writes, cursor pagination, additive versioning, rate limits (429), auth in the header over TLS.",
      "Real-time ladder: short poll → long poll → SSE (one-way) → WebSockets (two-way). Server→client only → SSE; truly bidirectional → WebSockets.",
      "SSE/WebSockets are stateful: need sticky routing + a pub/sub backplane; polling stays stateless.",
      "DB families: relational (joins/ACID), key-value (fast lookups), document (flexible records), wide-column (high-write time series), graph (traversals), search (full-text index), time-series (metrics).",
      "SQL by default; go NoSQL for a known access pattern that must scale horizontally, and design the schema around the queries.",
      "Consistency: default eventual; insist on strong for money/inventory.",
      "Scaling the DB = indexing (read speed, costs writes), sharding (split by key, beware hot shards), replication (read scale + survival, costs lag), caching (hot data, costs invalidation).",
      "These choices are the API / data-model / storage steps of the system-design framework.",
    ],
    checklist: [
      "Can state when to pick REST vs gRPC vs GraphQL and the one tradeoff each buys",
      "Can explain idempotency keys and why POST needs them but PUT/DELETE don't",
      "Can justify cursor over offset pagination for large or live datasets",
      "Can rank short poll / long poll / SSE / WebSockets and pick SSE vs WS for a given direction",
      "Can explain why stateful connections need sticky routing + a pub/sub backplane",
      "Can name each DB family's job and an example engine in one line",
      "Can walk the choose-a-database procedure (access pattern → consistency/scale → SQL default → NoSQL when) out loud",
      "Can give the eventual-vs-strong consistency one-liner and define indexing/sharding/replication/caching",
    ],
    quiz: [
      {
        q: "Two internal services in your mesh need a fast, strongly-typed, low-latency call (you own both ends). Best API style, and the tradeoff to name?",
        options: [
          "REST/JSON — and mention HTTP caching",
          "gRPC — and mention it's not browser-native and payloads aren't human-readable",
          "GraphQL — and mention over-fetching",
          "Long polling — and mention connection cost",
        ],
        answer: 1,
        explain: "Internal, latency-sensitive, both ends under your control → gRPC (binary over HTTP/2, codegen'd contract, streaming). The honest tradeoff: not browser-friendly without a proxy and the payloads are opaque, so it's a poor public API.",
      },
      {
        q: "You need to push a one-way live activity feed from server to browser. SSE or WebSockets?",
        options: [
          "WebSockets — you always want full-duplex",
          "SSE — it's one-way server→client, rides plain HTTP, and auto-reconnects",
          "Short polling — connections don't scale",
          "GraphQL subscriptions are the only option",
        ],
        answer: 1,
        explain: "For server→client only, SSE is simpler: one long-lived HTTP stream with built-in reconnection. WebSockets are for when the client also pushes frequently (chat, collab) — overkill for a one-way feed.",
      },
      {
        q: "A high-write workload of timestamped sensor readings, queried mostly by time window at large scale. Which database family?",
        options: [
          "A single relational table with a B-tree index on timestamp",
          "A graph database",
          "A time-series (or wide-column) store built for append-heavy, time-windowed data",
          "A full-text search index",
        ],
        answer: 2,
        explain: "Append-heavy, timestamped, time-windowed queries at scale is the textbook time-series case (InfluxDB/Timescale/Timestream), or wide-column (Cassandra). A plain relational table struggles with that write volume and retention/rollup needs.",
      },
      {
        q: "Order data with rich relationships, joins across customers/items, and transactions that must be exactly right. SQL or NoSQL?",
        options: [
          "NoSQL — it always scales better",
          "SQL (relational) — joins + ACID transactions are exactly what it's for; only go NoSQL with a reason",
          "Either; the choice doesn't matter",
          "A key-value store, then join in application code",
        ],
        answer: 1,
        explain: "Relationships, joins, and transactional correctness are the relational default. Reach past SQL only when you have a known access pattern that must scale horizontally beyond one machine — not before.",
      },
      {
        q: "A POST endpoint that charges a card may be retried by clients on a flaky network. How do you stop double-charges?",
        options: [
          "Return 200 even on failure so clients don't retry",
          "Make the endpoint a GET",
          "Accept a client-supplied Idempotency-Key and dedupe on it server-side",
          "Rate-limit the client to one request per minute",
        ],
        answer: 2,
        explain: "POST isn't idempotent, so a retry can act twice. An idempotency key lets the server recognize the redelivery and return the original result without re-charging — the standard fix wherever retries exist.",
      },
    ],
  },
];

// Company-specific intel pages were removed (2026-06-17, per request): the
// per-company prep packs aren't pulling their weight against the prep sources.
// Filtered here rather than editing the auto-generated file, so a future
// `gen-concepts.mjs` run stays clean.
const REMOVED_COMPANY_IDS = new Set(["toast-interview", "autodesk-interview", "treasure-data-interview"]);
const VISIBLE_GENERATED_CONCEPTS = GENERATED_CONCEPTS.filter((c) => !REMOVED_COMPANY_IDS.has(c.id));

export const CONCEPTS = [...PRINCIPLES, ...VISIBLE_GENERATED_CONCEPTS, ...EXTRA_CONCEPTS, ...CLOUD_CONCEPTS];

export const CONCEPTS_BY_ID = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

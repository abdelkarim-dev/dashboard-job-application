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
          "Process every problem the same way: restate it and confirm constraints and edge cases out loud; state the brute force and its complexity; name the pattern and the optimized approach; code it cleanly with good names; then walk one example and state final time and space complexity. Use the LeetCode lab to run these against tests.",
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
];

export const CONCEPTS = [...PRINCIPLES, ...GENERATED_CONCEPTS, ...EXTRA_CONCEPTS];

export const CONCEPTS_BY_ID = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

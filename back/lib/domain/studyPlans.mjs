// Study plans: user-curated, ordered lists of bank problems to train on as a
// focused "flow". Plans reference practice-bank problem ids; missing ids are
// tolerated (a referenced problem may not be in the bank yet) and filtered out
// at display time. Stored as a single JSON blob in app_settings ("studyPlans").
import { cleanTimestamp } from "../core/dates.mjs";
import { clean, slugify, stringList } from "../core/util.mjs";

const PLAN_ACCENTS = ["violet", "sky", "amber", "emerald", "rose", "cyan"];

// Default plans mirror the user's Tier roadmap. Each entry is an ordered list of
// bank problem ids; the tiers intentionally interleave existing and newly-seeded
// problems so "Tier 1 (start here, in order)" trains exactly the user's list.
const TIER_1_PROBLEM_IDS = [
  "lc-two-sum",
  "lc-valid-anagram",
  "lc-group-anagrams",
  "lc-top-k-frequent-elements",
  "lc-product-of-array-except-self",
  "lc-valid-palindrome",
  "lc-two-sum-ii",
  "lc-three-sum",
  "lc-container-with-most-water",
  "lc-best-time-to-buy-and-sell-stock",
  "lc-longest-substring-without-repeating-characters",
  "lc-longest-repeating-character-replacement",
  "lc-valid-parentheses",
  "lc-min-stack",
  "lc-evaluate-reverse-polish-notation",
  "lc-daily-temperatures",
  "lc-reverse-words-in-a-string",
  "lc-reverse-string",
  "lc-reverse-words-keep-punctuation",
];

const TIER_2_PROBLEM_IDS = [
  "lc-invert-binary-tree",
  "lc-maximum-depth-of-binary-tree",
  "lc-binary-tree-level-order-traversal",
  "lc-lowest-common-ancestor-of-a-bst",
  "lc-diameter-of-binary-tree",
  "lc-binary-search",
  "lc-search-in-rotated-sorted-array",
  "lc-median-of-two-sorted-arrays",
  "lc-kth-largest-element-in-a-stream",
  "lc-last-stone-weight",
  "lc-merge-k-sorted-lists",
  "lc-merge-intervals",
  "lc-insert-interval",
  "lc-meeting-rooms",
  "lc-reverse-linked-list",
  "lc-merge-two-sorted-lists",
];

const TIER_3_PROBLEM_IDS = [
  "lc-lru-cache",
  "lc-ttl-store",
  "lc-subsets",
  "lc-permutations",
  "lc-combination-sum",
  "lc-number-of-islands",
  "lc-course-schedule",
  "lc-climbing-stairs",
  "lc-house-robber",
  "lc-coin-change",
  "lc-longest-common-subsequence",
];

const defaultStudyPlansStore = {
  version: 1,
  plans: [
    {
      id: "plan-tier-1",
      name: "Tier 1 — Start here, in order",
      description: "Arrays & Hashing, Two Pointers, Sliding Window, Stack, Strings. The core patterns to drill first.",
      accent: "violet",
      seeded: true,
      problemIds: TIER_1_PROBLEM_IDS,
    },
    {
      id: "plan-tier-2",
      name: "Tier 2 — Next",
      description: "Trees + BFS/DFS, Binary Search, Heaps, Intervals, Linked Lists.",
      accent: "sky",
      seeded: true,
      problemIds: TIER_2_PROBLEM_IDS,
    },
    {
      id: "plan-tier-3",
      name: "Tier 3 — Only if time",
      description: "Design, Backtracking, Graphs, and DP recognition (don't rabbit-hole).",
      accent: "amber",
      seeded: true,
      problemIds: TIER_3_PROBLEM_IDS,
    },
  ],
};

function normalizeProblemIds(value) {
  const list = Array.isArray(value) ? value : stringList(value);
  const seen = new Set();
  const ids = [];
  for (const raw of list) {
    const id = clean(raw);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function normalizeStudyPlan(input = {}, existing = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const base = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  const name = clean(source.name ?? base.name) || "Untitled plan";
  const slug = slugify(name) || "plan";
  const id = clean(source.id ?? base.id) || `plan-${slug}-${Date.now()}`;
  const accent = PLAN_ACCENTS.includes(source.accent)
    ? source.accent
    : (PLAN_ACCENTS.includes(base.accent) ? base.accent : PLAN_ACCENTS[0]);
  const problemIds = source.problemIds !== undefined || source.problems !== undefined
    ? normalizeProblemIds(source.problemIds ?? source.problems)
    : normalizeProblemIds(base.problemIds);
  return {
    id,
    name,
    description: String(source.description ?? base.description ?? ""),
    accent,
    seeded: Boolean(source.seeded ?? base.seeded ?? false),
    problemIds,
    createdAt: cleanTimestamp(source.createdAt) || cleanTimestamp(base.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeStudyPlansStore(input = {}) {
  let source = input;
  if (typeof input === "string") {
    try {
      source = JSON.parse(input);
    } catch {
      source = {};
    }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) source = {};
  const rawPlans = Array.isArray(source.plans) ? source.plans : null;
  // First run (no stored value): seed the Tier roadmap. An explicit empty array
  // is respected so a user who deletes every plan keeps an empty board.
  const plans = (rawPlans === null ? defaultStudyPlansStore.plans : rawPlans)
    .map((plan) => normalizeStudyPlan(plan))
    .filter(Boolean);
  const seen = new Set();
  const deduped = plans.filter((plan) => {
    if (seen.has(plan.id)) return false;
    seen.add(plan.id);
    return true;
  });
  return { version: 1, plans: deduped };
}

export {
  defaultStudyPlansStore,
  PLAN_ACCENTS,
  normalizeStudyPlan,
  normalizeStudyPlansStore,
};

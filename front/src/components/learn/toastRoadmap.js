// Toast coding-screen roadmap — the curriculum the LeetCode lab is organized
// around. Data only (no React), sourced verbatim-in-spirit from the prep files:
//   sources/subjects-roadmap.md        → the 8 subjects, ideas, status, problems
//   sources/technical-prep-plan.md     → screen format/date, fast-track order, habits
//   sources/toast-coding-question-bank.md → the "if you only do 10" highest-yield list
//   sources/subjects-1-3-summary.md    → the recursion checklist
//
// Problem entries carry the LeetCode number (for the external link) and the
// canonical title. ToastRoadmap.jsx matches a title against the local runnable
// bank (by normalized title) so in-bank problems become one-click loadable.

export const TOAST_SCREEN = {
  company: "Toast",
  team: "Employee Lifecycle (ELM)",
  window: "~Jun 23–25, 2026",
  format:
    "One coding problem on a shared, runnable editor (easy/medium). Solve in ~20 min, then heavy follow-ups: edge cases, complexity, alternatives. You write your own tests, and you narrate throughout.",
  scope:
    "Coding only. No system design, no behavioral on the screen — those sit behind it (the panel is realistically July).",
  difficulty:
    "Glassdoor reads ~medium. Medium = two easy ideas combined plus more edge cases — not a different universe from the trees work that's already done.",
};

// The recursion checklist from subjects-1-3-summary.md — the named weak spot.
export const RECURSION_CHECK = [
  "Recurse into a smaller piece (a child — never the parent or the same node).",
  "Use what the call returns (check it, combine it — don't discard it).",
];

// The 4 habits that "beat raw problem count" (technical-prep-plan.md).
export const HABITS = [
  "Out loud, every time. Brute force first, then optimize.",
  "Re-solve from scratch two days later — recall beats recognition.",
  "Three to five problems understood beats twenty rushed.",
  "Learn ~6 shapes, not 150 answers.",
];

// Confirmed Toast-favorite problems to hit by name (technical-prep-plan.md).
export const TOAST_FAVORITES = [
  { title: "Binary Tree Bottom-Left Value", lc: 513, note: "confirmed Toast problem" },
  { title: "DFS over deeply nested input", lc: 339, note: "confirmed Toast problem (Nested List Weight Sum shape)" },
  { title: "Merge Two Sorted Lists", lc: 21 },
  { title: "Implement Queue using Stacks", lc: 232 },
  { title: "Is Graph Bipartite?", lc: 785 },
  { title: "Coin Change", lc: 322 },
  { title: "Best Time to Buy and Sell Stock", lc: 121 },
];

// The "if you only do 10" list — highest yield, all screen-level, ordered.
export const TOP_TEN = [
  { rank: 1, title: "Number of Provinces", lc: 547, pattern: "graphs + visited" },
  { rank: 2, title: "Clone Graph", lc: 133, pattern: "graphs + visited" },
  { rank: 3, title: "Word Search", lc: 79, pattern: "grid DFS" },
  { rank: 4, title: "Diameter of Binary Tree", lc: 543, pattern: "tree DFS, return up" },
  { rank: 5, title: "Lowest Common Ancestor of a Binary Tree", lc: 236, pattern: "tree DFS" },
  { rank: 6, title: "Subarray Sum Equals K", lc: 560, pattern: "hashmap prefix sum" },
  { rank: 7, title: "Sort Characters By Frequency", lc: 451, pattern: "hashmap / Counter" },
  { rank: 8, title: "K Closest Points to Origin", lc: 973, pattern: "heap" },
  { rank: 9, title: "Maximum Subarray", lc: 53, pattern: "Kadane" },
  { rank: 10, title: "Merge Sorted Array", lc: 88, pattern: "two pointers (warm-up)" },
];

// status: "done" | "next" | "later"
export const SUBJECTS = [
  {
    n: 1,
    title: "Recursive DFS on trees",
    status: "done",
    level: "easy",
    idea:
      "Pre/in/post-order differ only by where you visit the node; base case is `if node is None`. Every tree problem: do something here, then trust the same function on the children.",
    built: ["preorder", "inorder", "postorder", "max_depth", "count_nodes", "contains"],
    problems: [
      { title: "Lowest Common Ancestor of a Binary Tree", lc: 236 },
      { title: "Binary Tree Right Side View", lc: 199 },
      { title: "Path Sum II", lc: 113 },
      { title: "Diameter of Binary Tree", lc: 543, note: "easy label, medium technique: return info up" },
    ],
  },
  {
    n: 2,
    title: "BFS / level-order",
    status: "done",
    level: "easy",
    idea:
      "Process row by row with a `deque`; freeze `len(queue)` at the top of the loop to separate one level from the next.",
    built: ["bfs", "level_order"],
    problems: [
      { title: "Rotting Oranges", lc: 994, note: "multi-source BFS" },
      { title: "Binary Tree Zigzag Level Order Traversal", lc: 103 },
      { title: "Binary Tree Right Side View", lc: 199, note: "BFS version" },
    ],
  },
  {
    n: 3,
    title: "Iterative DFS + nested data",
    status: "done",
    level: "easy/med",
    idea:
      "Recursion made visible with a stack (push right first so left pops first). The same shape as `contains`, generalized to nested dict/list with `isinstance`.",
    built: ["dfs_iterative", "find_in_json"],
    problems: [
      { title: "Nested List Weight Sum", lc: 339, note: "confirmed Toast-style problem" },
      { title: "Flatten Nested List Iterator", lc: 341 },
    ],
  },
  {
    n: 4,
    title: "Graphs + `visited`",
    status: "done",
    level: "first mediums",
    idea:
      "A graph is a tree that can loop; a `visited` set stops infinite loops; the count is the number of fresh traversals you start.",
    built: ["number_of_provinces (547)", "num_islands (200)"],
    problems: [
      { title: "Max Area of Island", lc: 695, note: "gentle next step" },
      { title: "Clone Graph", lc: 133 },
      { title: "Course Schedule", lc: 207, note: "topological sort" },
      { title: "Word Search", lc: 79, note: "grid DFS backtracking" },
    ],
  },
  {
    n: 5,
    title: "Binary Search Trees",
    status: "next",
    level: "medium",
    idea:
      "The ordering rule `left < node < right` lets you skip half the tree. In-order traversal of a BST visits values in sorted order.",
    built: [],
    problems: [
      { title: "Validate Binary Search Tree", lc: 98 },
      { title: "Lowest Common Ancestor of a Binary Search Tree", lc: 235 },
      { title: "Kth Smallest Element in a BST", lc: 230 },
    ],
  },
  {
    n: 6,
    title: "Hash maps & sets",
    status: "later",
    level: "medium",
    idea: "Trade memory for O(n) speed; remember what you have seen. The most common screen pattern.",
    built: [],
    problems: [
      { title: "Two Sum", lc: 1 },
      { title: "Group Anagrams", lc: 49 },
      { title: "Subarray Sum Equals K", lc: 560 },
      { title: "Sort Characters By Frequency", lc: 451 },
    ],
  },
  {
    n: 7,
    title: "Two pointers & sliding window",
    status: "later",
    level: "medium",
    idea: "Two indices over data to avoid nested loops; a moving window for longest/shortest substring.",
    built: [],
    problems: [
      { title: "Valid Palindrome", lc: 125 },
      { title: "3Sum", lc: 15 },
      { title: "Longest Substring Without Repeating Characters", lc: 3 },
      { title: "Longest Repeating Character Replacement", lc: 424 },
    ],
  },
  {
    n: 8,
    title: "Binary search & stacks",
    status: "later",
    level: "medium",
    idea: "Halve a sorted space each step; a monotonic stack for next-greater problems.",
    built: [],
    problems: [
      { title: "Binary Search", lc: 704 },
      { title: "Search in Rotated Sorted Array", lc: 33 },
      { title: "Valid Parentheses", lc: 20 },
      { title: "Daily Temperatures", lc: 739 },
    ],
  },
];

// Normalize a title for matching against the local bank: lowercase, strip
// punctuation, drop leading articles ("a"/"an"/"the") so "Diameter of a Binary
// Tree" matches the bank's "Diameter of Binary Tree".
export function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && w !== "a" && w !== "an" && w !== "the")
    .join(" ")
    .trim();
}

export const STATUS_META = {
  done: { label: "Done", tone: "done" },
  next: { label: "Up now", tone: "next" },
  later: { label: "After the screen", tone: "later" },
};

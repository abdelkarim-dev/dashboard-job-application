import test from "node:test";
import assert from "node:assert/strict";

import {
  clean,
  choice,
  stringList,
  clampInt,
  normalizeOptionalNumber,
  slugify,
  makeId,
  cloneJson,
  clampScore,
  isStringMatrixOfChars,
  isPlaceholderSolutionCode,
  looksLikeSolutionDraft,
  comparableCode,
  editDistanceWithin,
} from "../lib/core/util.mjs";

test("clean collapses whitespace and trims", () => {
  assert.equal(clean("  a   b\tc\n "), "a b c");
  assert.equal(clean(null), "");
  assert.equal(clean(undefined), "");
});

test("choice matches case-insensitively and falls back", () => {
  const allowed = ["Low", "High"];
  assert.equal(choice("high", allowed, "Low"), "High");
  assert.equal(choice("HIGH", allowed, "Low"), "High");
  assert.equal(choice("nope", allowed, "Low"), "Low");
});

test("stringList splits on separators, cleans, and caps at 24", () => {
  assert.deepEqual(stringList("a, b; c\nd"), ["a", "b", "c", "d"]);
  assert.deepEqual(stringList(["  x ", "", "y"]), ["x", "y"]);
  assert.equal(stringList(Array.from({ length: 50 }, (_, i) => `s${i}`)).length, 24);
});

test("clampInt rounds, clamps, and guards non-finite", () => {
  assert.equal(clampInt(3.6, 0, 10), 4);
  assert.equal(clampInt(-5, 0, 10), 0);
  assert.equal(clampInt(99, 0, 10), 10);
  assert.equal(clampInt("not a number", 2, 10), 2);
});

test("normalizeOptionalNumber returns a finite number or null", () => {
  assert.equal(normalizeOptionalNumber("42"), 42);
  assert.equal(normalizeOptionalNumber("abc"), null); // NaN -> null
  assert.equal(normalizeOptionalNumber(Infinity), null); // non-finite -> null
  assert.equal(normalizeOptionalNumber(""), 0); // Number("") === 0, which is finite
});

test("slugify produces a url-safe slug with a fallback", () => {
  assert.equal(slugify("Hello, World!"), "hello-world");
  assert.equal(slugify("   "), "item");
  assert.equal(slugify("***"), "item");
});

test("makeId builds an app-prefixed slug", () => {
  const id = makeId("Acme Corp", "Backend Engineer");
  assert.match(id, /^app-acme-corp-backend-engineer-\d+$/);
});

test("cloneJson deep-clones via JSON round-trip", () => {
  const source = { a: 1, b: { c: [2, 3] } };
  const copy = cloneJson(source);
  assert.deepEqual(copy, source);
  copy.b.c.push(4);
  assert.deepEqual(source.b.c, [2, 3]);
});

test("clampScore clamps to 0..100 and rounds", () => {
  assert.equal(clampScore(73.4), 73);
  assert.equal(clampScore(-10), 0);
  assert.equal(clampScore(150), 100);
  assert.equal(clampScore("nan"), 0);
});

test("isStringMatrixOfChars detects char grids", () => {
  assert.equal(isStringMatrixOfChars([["a", "b"], ["c", "d"]]), true);
  assert.equal(isStringMatrixOfChars([["ab"]]), false); // length > 1
  assert.equal(isStringMatrixOfChars([]), false);
  assert.equal(isStringMatrixOfChars("nope"), false);
});

test("isPlaceholderSolutionCode flags empty / pass / stub solutions", () => {
  assert.equal(isPlaceholderSolutionCode(""), true);
  assert.equal(isPlaceholderSolutionCode("# only a comment"), true);
  assert.equal(isPlaceholderSolutionCode("def f():\n    pass"), true);
  assert.equal(isPlaceholderSolutionCode("def f():\n    return None"), true);
  assert.equal(isPlaceholderSolutionCode("def f():\n    return -1"), true);
  assert.equal(isPlaceholderSolutionCode("class LRUCache:\n    pass"), true);
  // A real, multi-line implementation is not a placeholder.
  const real = [
    "def two_sum(nums, target):",
    "    seen = {}",
    "    for i, n in enumerate(nums):",
    "        if target - n in seen:",
    "            return [seen[target - n], i]",
    "        seen[n] = i",
    "    return []",
  ].join("\n");
  assert.equal(isPlaceholderSolutionCode(real), false);
});

test("comparableCode strips punctuation/whitespace (keeping underscores) and lowercases", () => {
  assert.equal(comparableCode("Foo_Bar(42);"), "foo_bar42");
  assert.equal(comparableCode("a b\tc"), "abc");
  assert.equal(comparableCode(""), "");
});

test("editDistanceWithin honors the limit", () => {
  assert.equal(editDistanceWithin("kitten", "kitten", 0), true);
  assert.equal(editDistanceWithin("kitten", "sitten", 1), true);
  assert.equal(editDistanceWithin("kitten", "sitting", 1), false);
  assert.equal(editDistanceWithin("kitten", "sitting", 3), true);
});

test("looksLikeSolutionDraft detects near-identical drafts", () => {
  // Identical comparable code.
  assert.equal(looksLikeSolutionDraft("return a + b", "return a+b;"), true);
  // Empty inputs are never a draft match.
  assert.equal(looksLikeSolutionDraft("", "return 1"), false);
  // Short snippets (< 40 chars comparable) are ignored even when different.
  assert.equal(looksLikeSolutionDraft("foo()", "bar()"), false);
  // A long draft that differs substantially is not flagged.
  const a = "def solve(nums):\n    return sorted(set(nums))[:10]\n# padding padding padding";
  const b = "class TotallyDifferent:\n    def __init__(self):\n        self.value = 999999999";
  assert.equal(looksLikeSolutionDraft(a, b), false);
});

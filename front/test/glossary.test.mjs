import test from "node:test";
import assert from "node:assert/strict";

import {
  lookupTerm,
  splitWithGlossary,
  collectGlossaryTerms,
  GLOSSARY_ENTRIES,
} from "../src/components/learn/glossary.js";

test("lookupTerm resolves canonical terms and aliases case-insensitively", () => {
  assert.equal(lookupTerm("p99").term, "p99");
  assert.equal(lookupTerm("P99").term, "p99");
  assert.equal(lookupTerm("QPS").term, "QPS");
  // alias -> canonical entry
  assert.equal(lookupTerm("requests per second").term, "QPS");
  assert.equal(lookupTerm("LSM").term, "LSM-tree");
  assert.equal(lookupTerm("write-behind").term, "write-back");
  assert.equal(lookupTerm("nope-not-a-term"), null);
});

test("splitWithGlossary marks a known term and preserves surrounding text", () => {
  const segs = splitWithGlossary("Target a 200ms p99 latency.");
  const joined = segs.map((s) => s.text).join("");
  assert.equal(joined, "Target a 200ms p99 latency.");
  const hit = segs.find((s) => s.term === "p99");
  assert.ok(hit, "p99 should be marked");
  assert.equal(hit.text, "p99");
  assert.match(hit.def, /percentile/i);
});

test("matched text keeps the original casing but resolves the canonical term", () => {
  const segs = splitWithGlossary("ACID transactions matter.");
  const hit = segs.find((s) => s.term);
  assert.equal(hit.text, "ACID");
  assert.equal(hit.term, "ACID");
});

test("does not match a term embedded inside a larger word", () => {
  // "acidic" must not trigger the ACID entry; "QPSX" must not trigger QPS.
  const segs = splitWithGlossary("an acidic QPSX value");
  assert.equal(segs.filter((s) => s.term).length, 0);
});

test("p99 does not partial-match p999", () => {
  const segs = splitWithGlossary("the p999 budget");
  const hit = segs.find((s) => s.term);
  assert.ok(hit, "p999 is itself a known alias of p99");
  assert.equal(hit.text, "p999");
});

test("longer phrases win over their shorter substrings", () => {
  const segs = splitWithGlossary("watch the tail latency closely");
  const hit = segs.find((s) => s.term);
  assert.equal(hit.text, "tail latency");
  assert.equal(hit.term, "tail latency");
});

test("seen set marks only the first occurrence of a term", () => {
  const seen = new Set();
  const first = splitWithGlossary("p99 is the latency tail", seen);
  const second = splitWithGlossary("again the p99 budget", seen);
  assert.ok(first.some((s) => s.term === "p99"));
  assert.ok(!second.some((s) => s.term === "p99"), "second mention should not be re-marked");
});

test("case-sensitive acronyms ignore the common English word", () => {
  // "CAP" the theorem matches; "cap" the verb/noun does not.
  assert.ok(splitWithGlossary("the CAP theorem").some((s) => s.term === "CAP theorem"));
  assert.equal(splitWithGlossary("we cap the request rate").filter((s) => s.term).length, 0);
  // "BASE" the model matches; "base" / "knowledge base" do not.
  assert.ok(splitWithGlossary("a BASE store").some((s) => s.term === "BASE"));
  assert.equal(splitWithGlossary("the knowledge base grew").filter((s) => s.term).length, 0);
});

test("collectGlossaryTerms returns distinct terms in first-appearance order", () => {
  const concept = {
    sections: [
      { body: ["We set a p99 SLO and shard the data."] },
      { body: ["The p99 again, plus a circuit breaker."] },
    ],
    keyPoints: ["Use idempotent consumers."],
  };
  const terms = collectGlossaryTerms(concept).map((t) => t.term);
  assert.deepEqual(terms, ["p99", "SLO", "sharding", "circuit breaker", "idempotent"]);
});

test("every entry has a non-trivial plain-language definition", () => {
  for (const e of GLOSSARY_ENTRIES) {
    assert.ok(e.term && typeof e.term === "string", "entry needs a term");
    assert.ok(e.short && e.short.length > 20, `definition too short for ${e.term}`);
  }
});

test("no two entries claim the same term/alias key", () => {
  const seen = new Map();
  for (const e of GLOSSARY_ENTRIES) {
    for (const form of [e.term, ...(e.aliases || [])]) {
      const k = form.toLowerCase();
      assert.ok(!seen.has(k), `duplicate glossary key "${form}" in "${e.term}" and "${seen.get(k)}"`);
      seen.set(k, e.term);
    }
  }
});

import test from "node:test";
import assert from "node:assert/strict";

import { normalizeStudyPlan, normalizeStudyPlansStore } from "../server.mjs";

test("normalizeStudyPlansStore seeds the default Tier roadmap on first run", () => {
  const store = normalizeStudyPlansStore();
  assert.equal(store.version, 1);
  assert.equal(store.plans.length, 3);
  assert.deepEqual(
    store.plans.map((plan) => plan.id),
    ["plan-tier-1", "plan-tier-2", "plan-tier-3"]
  );
  // The seeded Tier 1 plan keeps its ordered problem list.
  assert.ok(store.plans[0].problemIds.includes("lc-two-sum"));
  assert.equal(store.plans[0].seeded, true);
});

test("normalizeStudyPlansStore respects an explicit empty board", () => {
  const store = normalizeStudyPlansStore({ plans: [] });
  assert.deepEqual(store, { version: 1, plans: [] });
});

test("normalizeStudyPlansStore parses a JSON string payload", () => {
  const json = JSON.stringify({ plans: [{ id: "plan-a", name: "A", problemIds: ["x"] }] });
  const store = normalizeStudyPlansStore(json);
  assert.equal(store.plans.length, 1);
  assert.equal(store.plans[0].id, "plan-a");
  assert.deepEqual(store.plans[0].problemIds, ["x"]);
});

test("normalizeStudyPlansStore falls back to defaults on invalid JSON string", () => {
  const store = normalizeStudyPlansStore("{ not valid json");
  assert.equal(store.plans.length, 3);
});

test("normalizeStudyPlansStore treats non-object/array input as first run", () => {
  for (const input of [42, true, ["array", "is", "not", "a", "store"]]) {
    const store = normalizeStudyPlansStore(input);
    assert.equal(store.plans.length, 3, `input ${JSON.stringify(input)} should seed defaults`);
  }
});

test("normalizeStudyPlansStore de-duplicates plans sharing an id", () => {
  const store = normalizeStudyPlansStore({
    plans: [
      { id: "plan-dup", name: "First" },
      { id: "plan-dup", name: "Second" },
    ],
  });
  assert.equal(store.plans.length, 1);
  assert.equal(store.plans[0].name, "First");
});

test("normalizeStudyPlan applies defaults for a bare input", () => {
  const plan = normalizeStudyPlan();
  assert.equal(plan.name, "Untitled plan");
  assert.ok(plan.id.startsWith("plan-"));
  assert.equal(plan.description, "");
  assert.equal(plan.accent, "violet"); // first accent is the default
  assert.equal(plan.seeded, false);
  assert.deepEqual(plan.problemIds, []);
  assert.ok(plan.createdAt);
  assert.ok(plan.updatedAt);
});

test("normalizeStudyPlan validates accent against the allowed palette", () => {
  assert.equal(normalizeStudyPlan({ accent: "sky" }).accent, "sky");
  // Unknown accent falls back to the existing value, then to the default.
  assert.equal(normalizeStudyPlan({ accent: "neon" }, { accent: "amber" }).accent, "amber");
  assert.equal(normalizeStudyPlan({ accent: "neon" }).accent, "violet");
});

test("normalizeStudyPlan dedupes and cleans problem ids, honoring the `problems` alias", () => {
  const plan = normalizeStudyPlan({ name: "P", problems: ["  a  ", "a", "", "b", null] });
  assert.deepEqual(plan.problemIds, ["a", "b"]);
});

test("normalizeStudyPlan inherits problem ids from the existing plan when omitted", () => {
  const existing = { id: "plan-x", problemIds: ["one", "two"] };
  const plan = normalizeStudyPlan({ name: "Renamed" }, existing);
  assert.equal(plan.id, "plan-x");
  assert.deepEqual(plan.problemIds, ["one", "two"]);
});

test("normalizeStudyPlan coerces description to a string and preserves createdAt", () => {
  const created = "2026-01-02T03:04:05.000Z";
  const plan = normalizeStudyPlan(
    { name: "P", description: 123, createdAt: created },
    {}
  );
  assert.equal(plan.description, "123");
  assert.equal(plan.createdAt, created);
});

test("normalizeStudyPlan generates a slug-based id from the name", () => {
  const plan = normalizeStudyPlan({ name: "My Cool Plan!" });
  assert.match(plan.id, /^plan-my-cool-plan-\d+$/);
});

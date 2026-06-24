import test from "node:test";
import assert from "node:assert/strict";

import {
  makeGemmaCacheKey,
  getGemmaCache,
  setGemmaCache,
  gemmaCache,
  buildExtractionPrompt,
  buildEvaluationPrompt,
  buildProfileEvaluationInstructions,
  buildLearnTutorPrompt,
  buildLearnQuizPrompt,
  preferredGemmaModels,
  parseApplicationJson,
  parseEvaluationJson,
  normalizeCategoryMappings,
  normalizeEvaluation,
  gemmaStatus,
  runFallbackSkillAnalysis,
} from "../lib/gemma.mjs";

// --- cache key + TTL cache -------------------------------------------------

test("makeGemmaCacheKey is deterministic and namespaced by kind", () => {
  const a = makeGemmaCacheKey("extract", { prompt: "hello" });
  const b = makeGemmaCacheKey("extract", { prompt: "hello" });
  const c = makeGemmaCacheKey("extract", { prompt: "world" });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.ok(a.startsWith("extract:"));
});

test("setGemmaCache stores a clone and getGemmaCache returns a clone", () => {
  const key = makeGemmaCacheKey("test-clone", { n: 1 });
  const stored = { ok: true, nested: { v: 1 } };
  setGemmaCache(key, stored);
  const got = getGemmaCache(key);
  assert.deepEqual(got, stored);
  assert.notEqual(got, stored); // different object reference (deep clone)
  // Mutating the original after storing must not change the cached copy.
  stored.nested.v = 999;
  assert.equal(getGemmaCache(key).nested.v, 1);
  gemmaCache.delete(key);
});

test("getGemmaCache returns null for a missing key and evicts an expired one", () => {
  assert.equal(getGemmaCache("does-not-exist"), null);
  const key = makeGemmaCacheKey("expired", { n: 2 });
  // Hand-place an already-expired entry, then confirm it is purged on read.
  gemmaCache.set(key, { expiresAt: Date.now() - 1000, result: { ok: true } });
  assert.equal(getGemmaCache(key), null);
  assert.equal(gemmaCache.has(key), false);
});

// --- prompt builders -------------------------------------------------------

test("buildExtractionPrompt embeds the title, hints, and page text", () => {
  const prompt = buildExtractionPrompt({
    title: "Senior Backend Engineer",
    pageText: "We use Java and AWS.",
    rulesGuess: { company: "Acme", role: "Backend Engineer", skills: ["Java", "AWS"] },
  });
  assert.match(prompt, /You extract structured data/);
  assert.match(prompt, /Senior Backend Engineer/);
  assert.match(prompt, /Acme/);
  assert.match(prompt, /We use Java and AWS\./);
});

test("buildExtractionPrompt caps page text at 6000 chars", () => {
  const huge = "x".repeat(7000);
  const prompt = buildExtractionPrompt({ pageText: huge, rulesGuess: {} });
  assert.equal(prompt.includes("x".repeat(6000)), true);
  assert.equal(prompt.includes("x".repeat(6001)), false);
});

test("buildProfileEvaluationInstructions prefers a custom prompt, else builds from profile", () => {
  assert.equal(
    buildProfileEvaluationInstructions({ gemmaPrompt: "  custom rubric  " }),
    "custom rubric"
  );
  const built = buildProfileEvaluationInstructions({ about: "About me", strongFit: "Backend" });
  assert.match(built, /My profile:/);
  assert.match(built, /About me/);
  assert.match(built, /Backend/);
});

test("buildEvaluationPrompt folds in the profile instructions and the JSON schema", () => {
  const prompt = buildEvaluationPrompt(
    { pageText: "A remote backend role", rulesGuess: { location: "Remote" } },
    { gemmaPrompt: "MY-CUSTOM-RUBRIC" }
  );
  assert.match(prompt, /Evaluate this job for me/);
  assert.match(prompt, /MY-CUSTOM-RUBRIC/);
  assert.match(prompt, /"applyOrSkip"/);
  assert.match(prompt, /A remote backend role/);
});

test("buildLearnTutorPrompt includes the question and falls back to a default background", () => {
  const prompt = buildLearnTutorPrompt(
    { background: "" },
    { question: "Explain consistent hashing", title: "Caching" }
  );
  assert.match(prompt, /Explain consistent hashing/);
  assert.match(prompt, /Caching/);
  assert.match(prompt, /Senior backend \/ platform engineer/); // default background
});

test("buildLearnQuizPrompt clamps the count to 1..8 and embeds the material", () => {
  assert.match(buildLearnQuizPrompt({ count: 99, title: "Kafka", context: "partitions" }), /8 multiple-choice/);
  assert.match(buildLearnQuizPrompt({ count: -3 }), /1 multiple-choice/); // lower clamp (0 is falsy -> default 5, so use a negative)
  assert.match(buildLearnQuizPrompt({ count: 3, context: "ISR replicas" }), /ISR replicas/);
  assert.match(buildLearnQuizPrompt({}), /5 multiple-choice/); // default count
});

// --- model selection -------------------------------------------------------

test("preferredGemmaModels prefers gemma, falls back to any, then to defaults", () => {
  assert.deepEqual(preferredGemmaModels(["llama3", "gemma3:4b", "mistral"]), ["gemma3:4b"]);
  assert.deepEqual(preferredGemmaModels(["llama3", "mistral"]), ["llama3", "mistral"]);
  const defaults = preferredGemmaModels([]);
  assert.ok(defaults.includes("gemma3:4b"));
  assert.ok(defaults.length >= 6);
});

// --- parsers ---------------------------------------------------------------

test("parseApplicationJson extracts an embedded object and rejects junk", () => {
  assert.equal(parseApplicationJson("not json at all"), null);
  assert.equal(parseApplicationJson(""), null);
  const fromBare = parseApplicationJson('{"role":"Engineer","company":"Acme"}');
  assert.ok(fromBare && typeof fromBare === "object");
  // JSON embedded in surrounding prose is still recovered.
  const fromProse = parseApplicationJson('Here you go:\n{"role":"SRE","company":"Globex"}\nThanks');
  assert.ok(fromProse && typeof fromProse === "object");
});

test("parseEvaluationJson normalizes a recovered evaluation object", () => {
  assert.equal(parseEvaluationJson("nope"), null);
  const ev = parseEvaluationJson('{"applyOrSkip":"Apply","matchScore":88}');
  assert.equal(ev.applyOrSkip, "Apply");
  assert.equal(ev.matchScore, 88);
});

// --- normalizers -----------------------------------------------------------

test("normalizeCategoryMappings unwraps {mappings}, accepts flat maps, drops blanks", () => {
  assert.deepEqual(normalizeCategoryMappings(null), {});
  assert.deepEqual(normalizeCategoryMappings(["array"]), {});
  assert.deepEqual(
    normalizeCategoryMappings({ mappings: { "app-1": "Backend Engineering" } }),
    { "app-1": "Backend Engineering" }
  );
  // Flat form, plus a blank category that must be dropped.
  assert.deepEqual(
    normalizeCategoryMappings({ "app-2": "Platform Engineering", "app-3": "   " }),
    { "app-2": "Platform Engineering" }
  );
});

test("normalizeEvaluation applies the default schema for an empty input", () => {
  const ev = normalizeEvaluation({});
  assert.equal(ev.applyOrSkip, "Maybe");
  assert.equal(ev.matchScore, 0);
  assert.equal(ev.remoteFromCanada, "unclear");
  assert.equal(ev.compensation180k, "unclear");
  assert.equal(ev.roleCategory, "backend/platform");
  assert.deepEqual(ev.strongMatches, []);
  assert.deepEqual(ev.gapsRisks, []);
  assert.deepEqual(ev.cvEmphasis, []);
});

test("normalizeEvaluation coerces and clamps provided values", () => {
  const ev = normalizeEvaluation({
    applyOrSkip: "skip",
    matchScore: 250,
    remoteFromCanada: "likely",
    strongMatches: "Java, AWS",
    recruiterMessage: "  hi  ",
  });
  assert.equal(ev.applyOrSkip, "Skip"); // case-insensitive choice match
  assert.equal(ev.matchScore, 100); // clamped to 0..100
  assert.equal(ev.remoteFromCanada, "likely");
  assert.deepEqual(ev.strongMatches, ["Java", "AWS"]);
  assert.equal(ev.recruiterMessage, "hi");
});

// --- status + fallback analysis -------------------------------------------

test("gemmaStatus maps the controller result to an HTTP status", () => {
  assert.equal(gemmaStatus({ ok: true }), 200);
  assert.equal(gemmaStatus({ busy: true }), 429);
  assert.equal(gemmaStatus({ ok: false }), 503);
  assert.equal(gemmaStatus(null), 503);
  assert.equal(gemmaStatus(undefined), 503);
});

test("runFallbackSkillAnalysis splits demanded skills into matches and gaps", () => {
  const analysis = runFallbackSkillAnalysis(
    { resumeText: "Strong in Java and AWS", background: "" },
    [
      { skills: ["Java", "Kafka"] },
      { skills: "AWS; Terraform" }, // string form is also supported
    ]
  );
  assert.ok(analysis.matchingSkills.includes("Java"));
  assert.ok(analysis.matchingSkills.includes("AWS"));
  assert.ok(analysis.criticalGaps.includes("Kafka"));
  assert.ok(analysis.criticalGaps.includes("Terraform"));
  assert.ok(analysis.alignmentScore >= 30 && analysis.alignmentScore <= 95);
  assert.equal(analysis.learningRoadmap.length, 2);
});

test("runFallbackSkillAnalysis fills sensible defaults when there is no signal", () => {
  const analysis = runFallbackSkillAnalysis({}, []);
  assert.ok(analysis.matchingSkills.length > 0);
  assert.ok(analysis.criticalGaps.length > 0);
  assert.equal(analysis.matchingSkills.includes("Java"), true);
  assert.equal(analysis.criticalGaps.includes("Kubernetes"), true);
});

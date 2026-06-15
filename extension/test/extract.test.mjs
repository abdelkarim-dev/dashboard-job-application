import test from "node:test";
import assert from "node:assert/strict";

// extension/lib/extract.js is CommonJS (extension/package.json marks the dir
// commonjs); import its module.exports as the default and destructure.
import extract from "../lib/extract.js";

const {
  clean,
  escapeHtml,
  escapeRegExp,
  isPlaceholderUrl,
  isGenericJobIdentity,
  cleanRole,
  findSalary,
  findLevel,
  denoiseLines,
  normalizeChoiceText,
  isGenericChoiceValue,
  choiceValueMeansYes,
  choiceValueMeansNo,
  optionLooksYes,
  optionLooksNo,
  tokensInclude,
  isPlaceholderOptionText,
  scoreOptionEntries,
} = extract;

test("clean normalizes whitespace and tolerates nullish", () => {
  assert.equal(clean("  hello   world  "), "hello world");
  assert.equal(clean("a\t\n  b"), "a b");
  assert.equal(clean("   "), "");
  assert.equal(clean(""), "");
  assert.equal(clean(null), "");
  assert.equal(clean(undefined), "");
});

test("escapeHtml escapes the five HTML-sensitive characters", () => {
  assert.equal(escapeHtml("<script>alert('x')</script>"), "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
  assert.equal(escapeHtml("Tom & Jerry"), "Tom &amp; Jerry");
  assert.equal(escapeHtml('"q"'), "&quot;q&quot;");
  assert.equal(escapeHtml("plain"), "plain");
  assert.equal(escapeHtml(null), "");
});

test("escapeRegExp escapes regex metacharacters", () => {
  assert.equal(escapeRegExp("c++"), "c\\+\\+");
  assert.equal(escapeRegExp("node.js"), "node\\.js");
  assert.equal(escapeRegExp("a[b]c"), "a\\[b\\]c");
  assert.equal(escapeRegExp("plain text"), "plain text");
  // The escaped output must match the literal string when used in a RegExp.
  assert.ok(new RegExp(escapeRegExp("a.b+c")).test("a.b+c"));
  assert.ok(!new RegExp(escapeRegExp("a.b+c")).test("axbxc"));
});

test("isPlaceholderUrl flags fake/stand-in URLs, keeps real ones", () => {
  assert.equal(isPlaceholderUrl("https://example.com"), true);
  assert.equal(isPlaceholderUrl("https://www.yourwebsite.com"), true);
  assert.equal(isPlaceholderUrl("google.com"), true);
  assert.equal(isPlaceholderUrl("https://janedoe.dev"), true);
  assert.equal(isPlaceholderUrl("  https://example.com  "), true);
  assert.equal(isPlaceholderUrl("https://acme.com"), false);
  assert.equal(isPlaceholderUrl("https://github.com/archie"), false);
  assert.equal(isPlaceholderUrl(""), false);
});

test("isGenericJobIdentity rejects boilerplate labels, keeps real identities", () => {
  assert.equal(isGenericJobIdentity("job"), true);
  assert.equal(isGenericJobIdentity("Job Application"), true);
  assert.equal(isGenericJobIdentity("embed"), true);
  assert.equal(isGenericJobIdentity("open_role"), true);
  assert.equal(isGenericJobIdentity("job-board"), true);
  assert.equal(isGenericJobIdentity("   "), true);
  assert.equal(isGenericJobIdentity("Senior Engineer"), false);
  assert.equal(isGenericJobIdentity("Acme Corp"), false);
});

test("cleanRole strips company/location suffixes and rejects generic titles", () => {
  assert.equal(cleanRole("Senior Software Engineer at Google"), "Senior Software Engineer");
  assert.equal(cleanRole("Frontend Engineer - Remote"), "Frontend Engineer");
  assert.equal(cleanRole("Product Manager | San Francisco"), "Product Manager");
  assert.equal(cleanRole("  Backend   Engineer  "), "Backend Engineer");
  assert.equal(cleanRole("job"), "");
});

test("findSalary extracts ranges and single figures, else empty", () => {
  assert.equal(findSalary("$120,000 - $150,000"), "$120,000 - $150,000");
  assert.equal(findSalary("$80k–$110k"), "$80k–$110k");
  assert.equal(findSalary("Compensation: $150,000 CAD"), "$150,000 CAD");
  assert.equal(findSalary("competitive salary"), "");
  assert.equal(findSalary("we pay well"), "");
});

test("findLevel detects seniority, combining and mapping aliases", () => {
  assert.equal(findLevel("This is a junior developer role"), "Junior");
  assert.equal(findLevel("Looking for a mid-level engineer"), "Mid");
  assert.equal(findLevel("Senior or Staff engineer"), "Senior+");
  assert.equal(findLevel("Principal Engineer"), "Senior+");
  assert.equal(findLevel("junior and mid-level positions"), "Junior, Mid");
  assert.equal(findLevel("Entry role, no seniority named"), "");
});

test("denoiseLines drops boilerplate lines, de-dupes short chrome, collapses blanks", () => {
  assert.equal(denoiseLines("Job description\nCopyright 2024\nPrivacy Policy"), "Job description");
  assert.equal(denoiseLines("Menu\nReal content here\nSign in"), "Real content here");
  assert.equal(denoiseLines("a\na\na"), "a");
  assert.equal(denoiseLines("x\n\n\n\n\ny"), "x\n\ny");
  assert.equal(denoiseLines(""), "");
  // Long prose lines (>= 60 chars) are NOT de-duped — real description content.
  const long = "This is a genuinely long requirement line that exceeds sixty characters.";
  assert.equal(denoiseLines(`${long}\n${long}`), `${long}\n${long}`);
  // maxChars cap is honored.
  assert.equal(denoiseLines("abcdef", 3), "abc");
});

test("normalizeChoiceText lowercases and collapses non-alphanumerics to spaces", () => {
  assert.equal(normalizeChoiceText("Yes, I agree!"), "yes i agree");
  assert.equal(normalizeChoiceText("  Multiple   Spaces  "), "multiple spaces");
  assert.equal(normalizeChoiceText("N/A"), "n a");
});

test("isGenericChoiceValue only matches the on/off checkbox defaults", () => {
  assert.equal(isGenericChoiceValue("on"), true);
  assert.equal(isGenericChoiceValue("off"), true);
  assert.equal(isGenericChoiceValue("yes"), false);
  assert.equal(isGenericChoiceValue("true"), false);
});

test("choiceValueMeansYes / choiceValueMeansNo classify affirmations and negations", () => {
  assert.equal(choiceValueMeansYes("Yes"), true);
  assert.equal(choiceValueMeansYes("I agree"), true);
  assert.equal(choiceValueMeansYes("accepted"), true);
  assert.equal(choiceValueMeansYes("No"), false);

  assert.equal(choiceValueMeansNo("No"), true);
  assert.equal(choiceValueMeansNo("decline"), true);
  assert.equal(choiceValueMeansNo("Yes"), false);
});

test("optionLooksYes / optionLooksNo read {label,value} option objects", () => {
  assert.equal(optionLooksYes({ label: "Yes", value: "true" }), true);
  assert.equal(optionLooksYes({ label: "I agree", value: "on" }), true);
  assert.equal(optionLooksYes({ label: "No", value: "false" }), false);

  assert.equal(optionLooksNo({ label: "No", value: "false" }), true);
  assert.equal(optionLooksNo({ label: "Decline", value: "off" }), true);
  assert.equal(optionLooksNo({ label: "Yes", value: "true" }), false);
});

test("tokensInclude matches whole tokens only (the 'know' contains 'no' bug)", () => {
  assert.equal(tokensInclude("yes i agree", "agree"), true);
  assert.equal(tokensInclude("i do not know", "no"), false);
  assert.equal(tokensInclude("remote united states", "united states"), true);
  assert.equal(tokensInclude("", "no"), false);
  assert.equal(tokensInclude("anything", ""), false);
});

test("isPlaceholderOptionText recognizes select placeholders and dashes", () => {
  assert.equal(isPlaceholderOptionText("Select..."), true);
  assert.equal(isPlaceholderOptionText("-- Please choose --"), true);
  assert.equal(isPlaceholderOptionText("---"), true);
  assert.equal(isPlaceholderOptionText(""), true);
  assert.equal(isPlaceholderOptionText("Please select an option"), true);
  assert.equal(isPlaceholderOptionText("Master's Degree"), false);
  assert.equal(isPlaceholderOptionText("United States"), false);
});

test("scoreOptionEntries returns the single clear winner, else null on tie/weak", () => {
  const entries = [
    { index: 5, text: "senior engineer" },
    { index: 6, text: "junior analyst" },
  ];
  assert.equal(scoreOptionEntries(entries, "senior engineer").index, 5);

  // Tie -> null (refuse to guess).
  const tied = [
    { index: 0, text: "data science" },
    { index: 1, text: "data science" },
  ];
  assert.equal(scoreOptionEntries(tied, "data science"), null);

  // Weak overlap (< 0.5) -> null.
  assert.equal(scoreOptionEntries([{ index: 0, text: "data science engineering role" }], "marketing"), null);

  // Empty target -> null.
  assert.equal(scoreOptionEntries(entries, ""), null);
});

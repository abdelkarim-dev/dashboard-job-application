// Java type inference shared by the starter-code scaffolding (domain/problems)
// and the run harness (code-runner/java). A core leaf so neither importer
// creates an upward edge.
import { clean, isStringMatrixOfChars } from "./util.mjs";

function sanitizeJavaIdentifier(value, fallback = "solve") {
  const identifier = clean(value).replace(/[^A-Za-z0-9_$]/g, "");
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(identifier)) return identifier;
  return fallback;
}

function inferJavaArgType(value, typeHint = "", problem = {}, index = 0) {
  const hint = clean(typeHint).toLowerCase();
  if (hint === "tree" || hint === "binary_tree") return "TreeNode";
  if (hint === "listnode" || hint === "linked_list") return "ListNode";
  if (hint === "listnode[]" || hint === "linked_list[]") return "ListNode[]";
  if (typeof value === "string") return "String";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "int" : "double";
  if (Array.isArray(value)) {
    if (isStringMatrixOfChars(value)) return "char[][]";
    if (value.every((item) => typeof item === "string")) return "List<String>";
    if (value.every((item) => Array.isArray(item) && item.every((inner) => typeof inner === "number"))) return "int[][]";
    if (value.every((item) => typeof item === "number")) return "int[]";
    if (value.length === 0 && /word/i.test(clean(problem.title)) && index >= 2) return "List<String>";
    if (value.length === 0) return "int[]";
  }
  return "Object";
}

function inferJavaReturnType(expected, expectedType = "", problem = {}) {
  const hint = clean(expectedType).toLowerCase();
  const methodName = clean(problem.methodName);
  const title = clean(problem.title);
  if (hint === "tree" || hint === "binary_tree") return "TreeNode";
  if (hint === "listnode" || hint === "linked_list") return "ListNode";
  if (hint === "listnode[]" || hint === "linked_list[]") return "ListNode[]";
  if (/median/i.test(methodName) || /median/i.test(title)) return "double";
  if (typeof expected === "boolean") return "boolean";
  if (typeof expected === "number") return Number.isInteger(expected) ? "int" : "double";
  if (typeof expected === "string") return "String";
  if (Array.isArray(expected)) {
    if (expected.every((item) => typeof item === "number")) return "int[]";
    if (expected.every((item) => Array.isArray(item) && item.every((inner) => typeof inner === "number"))) {
      if (/three\s*sum/i.test(title) || /level\s*order/i.test(title)) return "List<List<Integer>>";
      return "int[][]";
    }
    if (expected.every((item) => typeof item === "string")) return "List<String>";
    if (expected.length === 0 && /three\s*sum|level\s*order/i.test(title)) return "List<List<Integer>>";
    if (expected.length === 0) return "int[]";
  }
  return "Object";
}

function javaDefaultReturnLine(returnType = "Object") {
  if (returnType === "void") return "return;";
  if (returnType === "boolean") return "return false;";
  if (returnType === "int") return "return 0;";
  if (returnType === "double") return "return 0.0;";
  if (returnType === "String") return 'return "";';
  if (returnType === "int[]") return "return new int[0];";
  if (returnType === "int[][]") return "return new int[0][];";
  if (returnType === "char[][]") return "return new char[0][];";
  if (returnType === "List<String>") return "return new ArrayList<>();";
  if (returnType === "List<List<Integer>>") return "return new ArrayList<>();";
  return "return null;";
}

function inferJavaParameterTypes(problem = {}) {
  const tests = Array.isArray(problem.customTests) ? problem.customTests : [];
  const maxArgs = tests.reduce((max, test) => Math.max(max, Array.isArray(test.args) ? test.args.length : 0), 0);
  return Array.from({ length: maxArgs }, (_, index) => {
    const hinted = tests.find((test) => Array.isArray(test.argTypes) && clean(test.argTypes[index]))?.argTypes[index] || "";
    const sample = tests.find((test) => {
      if (!Array.isArray(test.args) || !(index in test.args)) return false;
      const value = test.args[index];
      return !(Array.isArray(value) && value.length === 0);
    }) || tests.find((test) => Array.isArray(test.args) && index in test.args);
    return inferJavaArgType(sample?.args?.[index], hinted, problem, index);
  });
}

export {
  sanitizeJavaIdentifier,
  inferJavaArgType,
  inferJavaReturnType,
  javaDefaultReturnLine,
  inferJavaParameterTypes,
};

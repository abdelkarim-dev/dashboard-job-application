// Python practice runner: type prelude, generated harness and execution.
import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { normalizePracticeProblem } from "../domain/practice.mjs";
import { parseRunnerPayload, runProcess, stripRunnerPayload } from "./process.mjs";

async function runPythonProblem(problemInput, codeInput = "", options = {}) {
  const problem = normalizePracticeProblem(problemInput);
  const code = String(codeInput || problem.draft || "");
  const timeoutMs = Math.max(500, Number(options.timeoutMs) || 3000);
  const tests = problem.customTests || [];
  const usesOperationHarness = tests.some((test) => Array.isArray(test.operations) && test.operations.length > 0);
  if (!code.trim()) return { ok: false, error: "No Python code to run.", passed: 0, total: tests.length, results: [] };
  if (!problem.methodName && !usesOperationHarness) return { ok: false, error: "Set a method name or add a locked operation test before running.", passed: 0, total: tests.length, results: [] };
  if (!tests.length) return { ok: false, error: "No locked local tests are available for this problem yet.", passed: 0, total: 0, results: [] };

  const tempDir = await mkdtemp(path.join(tmpdir(), "job-hunt-practice-"));
  const solutionFile = path.join(tempDir, "solution.py");
  const runnerFile = path.join(tempDir, "runner.py");
  const testsFile = path.join(tempDir, "tests.json");
  await writeFile(solutionFile, withPythonTypePrelude(code), "utf8");
  await writeFile(testsFile, JSON.stringify(tests), "utf8");
  await writeFile(
    runnerFile,
    usesOperationHarness ? buildPythonOperationHarness() : buildPythonHarness(problem.methodName),
    "utf8"
  );

  try {
    const result = await runProcess("python3", [runnerFile], { cwd: tempDir, timeoutMs });
    const parsed = parseRunnerPayload(result.stdout);
    if (!parsed) {
      return {
        ok: false,
        error: result.timedOut ? "Python timed out." : "The Python runner did not return a result.",
        stdout: result.stdout,
        stderr: result.stderr,
        passed: 0,
        total: tests.length,
        results: [],
      };
    }
    return {
      ok: !result.timedOut && !parsed.error,
      error: result.timedOut ? "Python timed out." : (parsed.error || ""),
      passed: parsed.passed || 0,
      total: parsed.total || tests.length,
      results: parsed.results || [],
      stdout: stripRunnerPayload(result.stdout),
      stderr: result.stderr,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function withPythonTypePrelude(code = "") {
  const prelude = [
    "from typing import *",
    "",
    "class TreeNode:",
    "    def __init__(self, val=0, left=None, right=None):",
    "        self.val = val",
    "        self.left = left",
    "        self.right = right",
    "",
    "class ListNode:",
    "    def __init__(self, val=0, next=None):",
    "        self.val = val",
    "        self.next = next",
    "",
  ].join("\n");
  const lines = String(code || "").split("\n");
  let insertAt = 0;
  while (
    insertAt < lines.length
    && (lines[insertAt].startsWith("#!") || /coding[:=]/.test(lines[insertAt]))
  ) {
    insertAt += 1;
  }
  while (insertAt < lines.length && /^from\s+__future__\s+import\s+/.test(lines[insertAt].trim())) {
    insertAt += 1;
  }
  return [...lines.slice(0, insertAt), prelude, ...lines.slice(insertAt)].join("\n");
}

function buildPythonHarness(methodName) {
  return `import copy\nimport json\nimport traceback\nfrom collections import deque\n\npayload = {"results": [], "passed": 0, "total": 0, "error": ""}\n\ndef build_tree(values):\n    if values is None or values == []:\n        return None\n    nodes = [None if value is None else TreeNode(value) for value in values]\n    if not nodes or nodes[0] is None:\n        return None\n    kids = nodes[::-1]\n    root = kids.pop()\n    for node in nodes:\n        if node is not None:\n            if kids:\n                node.left = kids.pop()\n            if kids:\n                node.right = kids.pop()\n    return root\n\ndef tree_to_list(root):\n    if not root:\n        return []\n    result = []\n    queue = deque([root])\n    while queue:\n        node = queue.popleft()\n        if node is None:\n            result.append(None)\n            continue\n        result.append(node.val)\n        queue.append(node.left)\n        queue.append(node.right)\n    while result and result[-1] is None:\n        result.pop()\n    return result\n\ndef build_list(values):\n    dummy = ListNode(0)\n    tail = dummy\n    for value in values or []:\n        tail.next = ListNode(value)\n        tail = tail.next\n    return dummy.next\n\ndef list_to_array(head):\n    result = []\n    seen = set()\n    while head and id(head) not in seen:\n        seen.add(id(head))\n        result.append(head.val)\n        head = head.next\n    return result\n\ndef transform_arg(value, type_name):\n    if type_name in ("tree", "binary_tree"):\n        return build_tree(value)\n    if type_name in ("listnode", "linked_list"):\n        return build_list(value)\n    if type_name in ("listnode[]", "linked_list[]"):\n        return [build_list(item) for item in (value or [])]\n    return value\n\ndef normalize_actual(value, expected_type):\n    if expected_type in ("tree", "binary_tree"):\n        return tree_to_list(value)\n    if expected_type in ("listnode", "linked_list"):\n        return list_to_array(value)\n    if expected_type in ("listnode[]", "linked_list[]"):\n        return [list_to_array(item) for item in (value or [])]\n    return value\n\ndef normalize_nested(values):\n    return sorted([list(item) for item in values or []])\n\ndef compare_actual(actual, expected, raw_args, validator):\n    if validator == "twoSumIndices":\n        if not isinstance(actual, (list, tuple)) or len(actual) != 2:\n            return False\n        nums = raw_args[0] if len(raw_args) > 0 else []\n        target = raw_args[1] if len(raw_args) > 1 else None\n        i, j = actual\n        return isinstance(i, int) and isinstance(j, int) and i != j and 0 <= i < len(nums) and 0 <= j < len(nums) and nums[i] + nums[j] == target\n    if validator == "unorderedList":\n        return sorted(actual or []) == sorted(expected or [])\n    if validator == "unorderedNestedList":\n        return normalize_nested(actual) == normalize_nested(expected)\n    if validator == "unorderedDeepNestedList":\n        return sorted([sorted(item) for item in actual or []]) == sorted([sorted(item) for item in expected or []])\n    return actual == expected\n\ntry:\n    with open("tests.json", "r", encoding="utf-8") as fh:\n        tests = json.load(fh)\n    payload["total"] = len(tests)\n    import solution as solution_module\n    TreeNode = solution_module.TreeNode\n    ListNode = solution_module.ListNode\n    solution = solution_module.Solution()\n    method = getattr(solution, ${JSON.stringify(methodName)})\n    for index, test in enumerate(tests):\n        raw_args = copy.deepcopy(test.get("args", []))\n        raw_kwargs = copy.deepcopy(test.get("kwargs", {}))\n        arg_types = test.get("argTypes", [])\n        expected_type = test.get("expectedType", "")\n        expected = test.get("expected")\n        expected_display = test.get("expectedDescription", expected)\n        validator = test.get("validator", "")\n        name = test.get("name") or f"test {index + 1}"\n        try:\n            args = [transform_arg(copy.deepcopy(value), arg_types[i] if i < len(arg_types) else "") for i, value in enumerate(raw_args)]\n            kwargs = copy.deepcopy(raw_kwargs)\n            actual_raw = method(*args, **kwargs)\n            actual = normalize_actual(actual_raw, expected_type)\n            passed = compare_actual(actual, expected, raw_args, validator)\n            if passed:\n                payload["passed"] += 1\n            payload["results"].append({"name": name, "passed": passed, "args": raw_args, "kwargs": raw_kwargs, "expected": expected_display, "actual": actual})\n        except Exception:\n            payload["results"].append({"name": name, "passed": False, "args": raw_args, "kwargs": raw_kwargs, "expected": expected_display, "actual": None, "error": traceback.format_exc(limit=4)})\nexcept Exception:\n    payload["error"] = traceback.format_exc(limit=6)\nprint("__JH_RESULT__" + json.dumps(payload, default=str))\n`;
}

function buildPythonOperationHarness() {
  return `import copy\nimport json\nimport traceback\n\npayload = {"results": [], "passed": 0, "total": 0, "error": ""}\ntry:\n    with open("tests.json", "r", encoding="utf-8") as fh:\n        tests = json.load(fh)\n    payload["total"] = len(tests)\n    import solution as solution_module\n    for index, test in enumerate(tests):\n        operations = test.get("operations", [])\n        operation_args = test.get("operationArgs", test.get("args", []))\n        expected = test.get("expected")\n        class_name = test.get("className") or (operations[0] if operations else "")\n        name = test.get("name") or f"test {index + 1}"\n        actual = []\n        instance = None\n        try:\n            cls = getattr(solution_module, class_name)\n            for op_index, operation in enumerate(operations):\n                args = copy.deepcopy(operation_args[op_index] if op_index < len(operation_args) else [])\n                if operation == class_name:\n                    instance = cls(*args)\n                    actual.append(None)\n                else:\n                    actual.append(getattr(instance, operation)(*args))\n            passed = actual == expected\n            if passed:\n                payload["passed"] += 1\n            payload["results"].append({"name": name, "passed": passed, "operations": operations, "operationArgs": operation_args, "expected": expected, "actual": actual})\n        except Exception:\n            payload["results"].append({"name": name, "passed": False, "operations": operations, "operationArgs": operation_args, "expected": expected, "actual": actual, "error": traceback.format_exc(limit=4)})\nexcept Exception:\n    payload["error"] = traceback.format_exc(limit=6)\nprint("__JH_RESULT__" + json.dumps(payload, default=str))\n`;
}

export {
  withPythonTypePrelude,
  buildPythonHarness,
  buildPythonOperationHarness,
  runPythonProblem,
};

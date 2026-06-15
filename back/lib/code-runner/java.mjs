// Java practice runner: type prelude, generated test harness, value-expression
// codegen and execution.
import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { clean, isStringMatrixOfChars } from "../core/util.mjs";
import { normalizePracticeProblem } from "../domain/practice.mjs";
import { inferJavaParameterTypes, sanitizeJavaIdentifier } from "../core/java-types.mjs";
import { parseRunnerPayload, runProcess, stripRunnerPayload } from "./process.mjs";

async function runJavaProblem(problemInput, codeInput = "", options = {}) {
  const problem = normalizePracticeProblem(problemInput);
  const tests = problem.customTests || [];
  const code = String(codeInput || problem.languageDrafts?.java || "");
  const timeoutMs = Math.max(500, Number(options.timeoutMs) || 4000);
  const usesOperationHarness = tests.some((test) => Array.isArray(test.operations) && test.operations.length > 0);
  if (!code.trim()) return { ok: false, error: "No Java code to compile.", passed: 0, total: tests.length, results: [] };
  if (!problem.methodName && !usesOperationHarness) return { ok: false, error: "Set a method name or add a locked operation test before running.", passed: 0, total: tests.length, results: [] };
  if (!tests.length) return { ok: false, error: "No locked local tests are available for this problem yet.", passed: 0, total: 0, results: [] };

  const tempDir = await mkdtemp(path.join(tmpdir(), "job-hunt-practice-java-"));
  await writeFile(path.join(tempDir, "Solution.java"), withJavaTypePrelude(code), "utf8");
  await writeFile(path.join(tempDir, "TestRunner.java"), buildJavaHarness(problem), "utf8");

  try {
    const compiled = await runProcess("javac", ["Solution.java", "TestRunner.java"], { cwd: tempDir, timeoutMs });
    if (compiled.timedOut) {
      return { ok: false, error: "Java compilation timed out.", passed: 0, total: tests.length, results: [] };
    }
    if (compiled.code !== 0) {
      return {
        ok: false,
        error: `Java compilation failed.\n${compiled.stderr || compiled.stdout}`.trim(),
        passed: 0,
        total: tests.length,
        results: [],
        stdout: compiled.stdout,
        stderr: compiled.stderr,
      };
    }

    const executed = await runProcess("java", ["-cp", tempDir, "TestRunner"], { cwd: tempDir, timeoutMs });
    if (executed.timedOut) {
      return { ok: false, error: "Java tests timed out.", passed: 0, total: tests.length, results: [] };
    }
    const parsed = parseRunnerPayload(executed.stdout);
    if (!parsed) {
      return {
        ok: false,
        error: executed.stderr || "The Java runner did not return a result.",
        passed: 0,
        total: tests.length,
        results: [],
        stdout: executed.stdout,
        stderr: executed.stderr,
      };
    }
    return {
      ok: executed.code === 0 && !parsed.error,
      error: parsed.error || (executed.code === 0 ? "" : (executed.stderr || "Java execution failed.")),
      passed: parsed.passed || 0,
      total: parsed.total || tests.length,
      results: parsed.results || [],
      stdout: stripRunnerPayload(executed.stdout),
      stderr: executed.stderr,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function withJavaTypePrelude(code = "") {
  const source = /^\s*import\s+java\.util\./m.test(String(code || ""))
    ? String(code || "")
    : `import java.util.*;\n${String(code || "")}`;
  const preludeParts = [];
  if (!/\bclass\s+TreeNode\b/.test(source)) {
    preludeParts.push([
      "class TreeNode {",
      "    int val;",
      "    TreeNode left;",
      "    TreeNode right;",
      "    TreeNode() {}",
      "    TreeNode(int val) { this.val = val; }",
      "    TreeNode(int val, TreeNode left, TreeNode right) {",
      "        this.val = val;",
      "        this.left = left;",
      "        this.right = right;",
      "    }",
      "}",
    ].join("\n"));
  }
  if (!/\bclass\s+ListNode\b/.test(source)) {
    preludeParts.push([
      "class ListNode {",
      "    int val;",
      "    ListNode next;",
      "    ListNode() {}",
      "    ListNode(int val) { this.val = val; }",
      "    ListNode(int val, ListNode next) { this.val = val; this.next = next; }",
      "}",
    ].join("\n"));
  }
  if (!preludeParts.length) return source;
  const lines = source.split("\n");
  let insertAt = 0;
  while (insertAt < lines.length && lines[insertAt].trim() === "") insertAt += 1;
  while (insertAt < lines.length && /^import\s+/.test(lines[insertAt].trim())) insertAt += 1;
  return [
    ...lines.slice(0, insertAt),
    "",
    preludeParts.join("\n\n"),
    "",
    ...lines.slice(insertAt),
  ].join("\n");
}

function buildJavaHarness(problem = {}) {
  const tests = Array.isArray(problem.customTests) ? problem.customTests : [];
  const parameterTypes = inferJavaParameterTypes(problem);
  const body = tests.map((test, index) => (
    Array.isArray(test.operations) && test.operations.length > 0
      ? buildJavaOperationTestBlock(test, index)
      : buildJavaMethodTestBlock(problem, test, index, parameterTypes)
  )).join("\n");
  return `import java.util.*;
import java.io.*;

public class TestRunner {
    private static final List<String> results = new ArrayList<>();
    private static int passed = 0;
    private static int total = 0;

    public static void main(String[] args) {
        String topLevelError = "";
        try {
            run();
        } catch (Throwable error) {
            topLevelError = stackSummary(error);
        }
        System.out.println("__JH_RESULT__" + "{"
            + "\\"results\\":[" + String.join(",", results) + "],"
            + "\\"passed\\":" + passed + ","
            + "\\"total\\":" + total + ","
            + "\\"error\\":" + jsonString(topLevelError)
            + "}");
    }

    private static void run() throws Exception {
${indentJava(body, 8)}
    }

    private static void emitResult(boolean condition, String name, Object input, Object expected, Object actual, String error) {
        total += 1;
        if (condition) passed += 1;
        results.add("{"
            + "\\"name\\":" + jsonString(name) + ","
            + "\\"passed\\":" + condition + ","
            + "\\"args\\":" + jsonValue(input) + ","
            + "\\"expected\\":" + jsonValue(expected) + ","
            + "\\"actual\\":" + jsonValue(actual) + ","
            + "\\"error\\":" + jsonString(error)
            + "}");
    }

    private static void emitOperationResult(boolean condition, String name, Object operations, Object operationArgs, Object expected, Object actual, String error) {
        total += 1;
        if (condition) passed += 1;
        results.add("{"
            + "\\"name\\":" + jsonString(name) + ","
            + "\\"passed\\":" + condition + ","
            + "\\"operations\\":" + jsonValue(operations) + ","
            + "\\"operationArgs\\":" + jsonValue(operationArgs) + ","
            + "\\"expected\\":" + jsonValue(expected) + ","
            + "\\"actual\\":" + jsonValue(actual) + ","
            + "\\"error\\":" + jsonString(error)
            + "}");
    }

    private static boolean compareActual(Object actual, Object expected, Object[] rawArgs, String validator) {
        Object normalizedActual = normalize(actual);
        Object normalizedExpected = normalize(expected);
        if ("twoSumIndices".equals(validator)) return isValidTwoSum(normalizedActual, rawArgs);
        if ("unorderedList".equals(validator)) return sortedJsonList(normalizedActual).equals(sortedJsonList(normalizedExpected));
        if ("unorderedNestedList".equals(validator)) return sortedJsonList(normalizedActual).equals(sortedJsonList(normalizedExpected));
        if ("unorderedDeepNestedList".equals(validator)) return deepSortedJsonList(normalizedActual).equals(deepSortedJsonList(normalizedExpected));
        return valuesEqual(normalizedActual, normalizedExpected);
    }

    private static boolean isValidTwoSum(Object actual, Object[] rawArgs) {
        Object normalized = normalize(actual);
        if (!(normalized instanceof List<?> indices) || indices.size() != 2) return false;
        if (!(indices.get(0) instanceof Number) || !(indices.get(1) instanceof Number)) return false;
        int first = ((Number) indices.get(0)).intValue();
        int second = ((Number) indices.get(1)).intValue();
        if (first == second) return false;
        Object numsObject = rawArgs.length > 0 ? normalize(rawArgs[0]) : Collections.emptyList();
        Object targetObject = rawArgs.length > 1 ? rawArgs[1] : null;
        if (!(numsObject instanceof List<?> nums) || !(targetObject instanceof Number)) return false;
        int target = ((Number) targetObject).intValue();
        if (first < 0 || second < 0 || first >= nums.size() || second >= nums.size()) return false;
        Object a = nums.get(first);
        Object b = nums.get(second);
        return a instanceof Number && b instanceof Number && ((Number) a).intValue() + ((Number) b).intValue() == target;
    }

    private static List<String> sortedJsonList(Object value) {
        Object normalized = normalize(value);
        List<String> output = new ArrayList<>();
        if (normalized instanceof List<?> list) {
            for (Object item : list) output.add(jsonValue(normalize(item)));
        }
        Collections.sort(output);
        return output;
    }

    private static List<String> deepSortedJsonList(Object value) {
        Object normalized = normalize(value);
        List<String> output = new ArrayList<>();
        if (normalized instanceof List<?> list) {
            for (Object item : list) {
                Object normItem = normalize(item);
                if (normItem instanceof List<?> inner) {
                    List<String> innerJson = new ArrayList<>();
                    for (Object element : inner) innerJson.add(jsonValue(normalize(element)));
                    Collections.sort(innerJson);
                    output.add(innerJson.toString());
                } else {
                    output.add(jsonValue(normItem));
                }
            }
        }
        Collections.sort(output);
        return output;
    }

    private static boolean valuesEqual(Object left, Object right) {
        Object a = normalize(left);
        Object b = normalize(right);
        if (a instanceof Number && b instanceof Number) {
            return Math.abs(((Number) a).doubleValue() - ((Number) b).doubleValue()) < 1e-9;
        }
        if (a instanceof List<?> leftList && b instanceof List<?> rightList) {
            if (leftList.size() != rightList.size()) return false;
            for (int i = 0; i < leftList.size(); i += 1) {
                if (!valuesEqual(leftList.get(i), rightList.get(i))) return false;
            }
            return true;
        }
        return Objects.equals(a, b);
    }

    private static Object normalizeActual(Object value, String expectedType) {
        String type = expectedType == null ? "" : expectedType.toLowerCase(Locale.ROOT);
        if ("tree".equals(type) || "binary_tree".equals(type)) return value == null ? new ArrayList<Object>() : treeToList((TreeNode) value);
        if ("listnode".equals(type) || "linked_list".equals(type)) return value == null ? new ArrayList<Object>() : listToArray((ListNode) value);
        if (("listnode[]".equals(type) || "linked_list[]".equals(type)) && value instanceof ListNode[] nodes) {
            List<Object> output = new ArrayList<>();
            for (ListNode node : nodes) output.add(listToArray(node));
            return output;
        }
        return normalize(value);
    }

    private static Object normalize(Object value) {
        if (value == null) return null;
        if (value instanceof TreeNode node) return treeToList(node);
        if (value instanceof ListNode node) return listToArray(node);
        if (value instanceof int[] array) {
            List<Integer> output = new ArrayList<>();
            for (int item : array) output.add(item);
            return output;
        }
        if (value instanceof int[][] matrix) {
            List<Object> output = new ArrayList<>();
            for (int[] row : matrix) output.add(normalize(row));
            return output;
        }
        if (value instanceof char[][] matrix) {
            List<Object> output = new ArrayList<>();
            for (char[] row : matrix) {
                List<String> chars = new ArrayList<>();
                for (char item : row) chars.add(String.valueOf(item));
                output.add(chars);
            }
            return output;
        }
        if (value instanceof Object[] array) {
            List<Object> output = new ArrayList<>();
            for (Object item : array) output.add(normalize(item));
            return output;
        }
        if (value instanceof List<?> list) {
            List<Object> output = new ArrayList<>();
            for (Object item : list) output.add(normalize(item));
            return output;
        }
        return value;
    }

    private static TreeNode buildTree(Integer[] values) {
        if (values == null || values.length == 0 || values[0] == null) return null;
        TreeNode root = new TreeNode(values[0]);
        Queue<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        int index = 1;
        while (!queue.isEmpty() && index < values.length) {
            TreeNode node = queue.poll();
            if (index < values.length && values[index] != null) {
                node.left = new TreeNode(values[index]);
                queue.add(node.left);
            }
            index += 1;
            if (index < values.length && values[index] != null) {
                node.right = new TreeNode(values[index]);
                queue.add(node.right);
            }
            index += 1;
        }
        return root;
    }

    private static List<Object> treeToList(TreeNode root) {
        List<Object> output = new ArrayList<>();
        if (root == null) return output;
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();
            if (node == null) {
                output.add(null);
            } else {
                output.add(node.val);
                queue.add(node.left);
                queue.add(node.right);
            }
        }
        while (!output.isEmpty() && output.get(output.size() - 1) == null) output.remove(output.size() - 1);
        return output;
    }

    private static ListNode buildList(int[] values) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        for (int value : values) {
            tail.next = new ListNode(value);
            tail = tail.next;
        }
        return dummy.next;
    }

    private static List<Object> listToArray(ListNode head) {
        List<Object> output = new ArrayList<>();
        Set<ListNode> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        while (head != null && !seen.contains(head)) {
            seen.add(head);
            output.add(head.val);
            head = head.next;
        }
        return output;
    }

    private static ListNode[] buildListArray(int[][] values) {
        ListNode[] output = new ListNode[values.length];
        for (int i = 0; i < values.length; i += 1) output[i] = buildList(values[i]);
        return output;
    }

    private static String jsonValue(Object value) {
        Object normalized = normalize(value);
        if (normalized == null) return "null";
        if (normalized instanceof String text) return jsonString(text);
        if (normalized instanceof Number || normalized instanceof Boolean) return String.valueOf(normalized);
        if (normalized instanceof List<?> list) {
            List<String> parts = new ArrayList<>();
            for (Object item : list) parts.add(jsonValue(item));
            return "[" + String.join(",", parts) + "]";
        }
        return jsonString(String.valueOf(normalized));
    }

    private static String jsonString(String value) {
        if (value == null) return "null";
        StringBuilder builder = new StringBuilder("\\"");
        for (int i = 0; i < value.length(); i += 1) {
            char ch = value.charAt(i);
            if (ch == '\\\\') builder.append("\\\\\\\\");
            else if (ch == '"') builder.append("\\\\\\"");
            else if (ch == '\\n') builder.append("\\\\n");
            else if (ch == '\\r') builder.append("\\\\r");
            else if (ch == '\\t') builder.append("\\\\t");
            else if (ch < 32) builder.append(String.format("\\\\u%04x", (int) ch));
            else builder.append(ch);
        }
        builder.append("\\"");
        return builder.toString();
    }

    private static String stackSummary(Throwable error) {
        if (error == null) return "";
        StringWriter writer = new StringWriter();
        error.printStackTrace(new PrintWriter(writer));
        return writer.toString();
    }
}
`;
}

function buildJavaMethodTestBlock(problem, test, index, parameterTypes = []) {
  const methodName = sanitizeJavaIdentifier(problem.methodName, "solve");
  const rawArgs = Array.isArray(test.args) ? test.args : [];
  const argExpressions = rawArgs.map((value, argIndex) => javaValueExpression(value, parameterTypes[argIndex] || ""));
  const rawArgExpressions = rawArgs.map((value, argIndex) => javaValueExpression(value, parameterTypes[argIndex] || ""));
  const expectedExpression = javaValueExpression(test.expected);
  const expectedDisplay = test.expectedDescription !== undefined ? test.expectedDescription : test.expected;
  return `{
    Object inputDisplay = ${javaObjectExpression(rawArgs)};
    Object expectedDisplay = ${javaObjectExpression(expectedDisplay)};
    Object expected = ${expectedExpression};
    Object[] rawArgs = new Object[] { ${rawArgExpressions.join(", ")} };
    try {
        Solution solution = new Solution();
        Object actualRaw = solution.${methodName}(${argExpressions.join(", ")});
        Object actual = normalizeActual(actualRaw, ${javaStringLiteral(test.expectedType || "")});
        boolean condition = compareActual(actual, expected, rawArgs, ${javaStringLiteral(test.validator || "")});
        emitResult(condition, ${javaStringLiteral(test.name || `test ${index + 1}`)}, inputDisplay, expectedDisplay, actual, "");
    } catch (Throwable error) {
        emitResult(false, ${javaStringLiteral(test.name || `test ${index + 1}`)}, inputDisplay, expectedDisplay, null, stackSummary(error));
    }
}`;
}

function buildJavaOperationTestBlock(test, index) {
  const operations = Array.isArray(test.operations) ? test.operations : [];
  const operationArgs = Array.isArray(test.operationArgs) ? test.operationArgs : (Array.isArray(test.args) ? test.args : []);
  const className = sanitizeJavaIdentifier(test.className || operations[0], "Solution");
  const lines = [
    `${className} instance = null;`,
    "List<Object> actual = new ArrayList<>();",
  ];
  operations.forEach((operation, opIndex) => {
    const safeOperation = sanitizeJavaIdentifier(operation, operation);
    const args = Array.isArray(operationArgs[opIndex]) ? operationArgs[opIndex] : [];
    const argExpressions = args.map((value) => javaValueExpression(value));
    if (safeOperation === className) {
      lines.push(`instance = new ${className}(${argExpressions.join(", ")});`);
      lines.push("actual.add(null);");
      return;
    }
    const call = `instance.${safeOperation}(${argExpressions.join(", ")})`;
    const expectedValue = Array.isArray(test.expected) ? test.expected[opIndex] : undefined;
    if (expectedValue === null || expectedValue === undefined) {
      lines.push(`${call};`);
      lines.push("actual.add(null);");
    } else {
      lines.push(`actual.add(${call});`);
    }
  });
  return `{
    Object operationsDisplay = ${javaObjectExpression(operations)};
    Object operationArgsDisplay = ${javaObjectExpression(operationArgs)};
    Object expected = ${javaObjectExpression(test.expected)};
    try {
${indentJava(lines.join("\n"), 8)}
        boolean condition = valuesEqual(actual, expected);
        emitOperationResult(condition, ${javaStringLiteral(test.name || `test ${index + 1}`)}, operationsDisplay, operationArgsDisplay, expected, actual, "");
    } catch (Throwable error) {
        emitOperationResult(false, ${javaStringLiteral(test.name || `test ${index + 1}`)}, operationsDisplay, operationArgsDisplay, expected, null, stackSummary(error));
    }
}`;
}

function javaValueExpression(value, typeHint = "") {
  const hint = clean(typeHint);
  const lowerHint = hint.toLowerCase();
  if (lowerHint === "treenode" || lowerHint === "tree" || lowerHint === "binary_tree") {
    return `buildTree(${javaIntegerArrayExpression(Array.isArray(value) ? value : [])})`;
  }
  if (lowerHint === "listnode" || lowerHint === "listnode" || lowerHint === "linked_list") {
    return `buildList(${javaIntArrayExpression(Array.isArray(value) ? value : [])})`;
  }
  if (lowerHint === "listnode[]" || lowerHint === "linked_list[]") {
    return `buildListArray(${javaIntMatrixExpression(Array.isArray(value) ? value : [])})`;
  }
  if (lowerHint === "char[][]") return javaCharMatrixExpression(Array.isArray(value) ? value : []);
  if (lowerHint === "int[][]") return javaIntMatrixExpression(Array.isArray(value) ? value : []);
  if (lowerHint === "int[]") return javaIntArrayExpression(Array.isArray(value) ? value : []);
  if (lowerHint === "list<string>") return javaStringListExpression(Array.isArray(value) ? value : []);
  if (value === undefined || value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : `${Number(value)}`;
  if (typeof value === "string") return javaStringLiteral(value);
  if (Array.isArray(value)) {
    if (isStringMatrixOfChars(value)) return javaCharMatrixExpression(value);
    if (value.every((item) => typeof item === "string")) return javaStringListExpression(value);
    if (value.every((item) => Array.isArray(item) && item.every((inner) => typeof inner === "number"))) return javaIntMatrixExpression(value);
    if (value.every((item) => typeof item === "number")) return javaIntArrayExpression(value);
    if (value.length === 0) return "new int[] {}";
  }
  return javaObjectExpression(value);
}

function javaObjectExpression(value) {
  if (value === undefined || value === null) return "null";
  if (typeof value === "boolean") return value ? "Boolean.TRUE" : "Boolean.FALSE";
  if (typeof value === "number") return Number.isInteger(value) ? `Integer.valueOf(${value})` : `Double.valueOf(${Number(value)})`;
  if (typeof value === "string") return javaStringLiteral(value);
  if (Array.isArray(value)) {
    if (!value.length) return "new ArrayList<Object>()";
    return `new ArrayList<Object>(Arrays.asList(${value.map(javaObjectExpression).join(", ")}))`;
  }
  return javaStringLiteral(JSON.stringify(value));
}

function javaIntArrayExpression(values = []) {
  return `new int[] { ${values.map((value) => Math.trunc(Number(value) || 0)).join(", ")} }`;
}

function javaIntegerArrayExpression(values = []) {
  return `new Integer[] { ${values.map((value) => value === null || value === undefined ? "null" : `Integer.valueOf(${Math.trunc(Number(value) || 0)})`).join(", ")} }`;
}

function javaIntMatrixExpression(values = []) {
  return `new int[][] { ${values.map((row) => javaIntArrayExpression(Array.isArray(row) ? row : [])).join(", ")} }`;
}

function javaCharMatrixExpression(values = []) {
  const rows = values.map((row) => {
    const chars = Array.isArray(row) ? row : [];
    return `new char[] { ${chars.map(javaCharLiteral).join(", ")} }`;
  });
  return `new char[][] { ${rows.join(", ")} }`;
}

function javaStringListExpression(values = []) {
  if (!values.length) return "new ArrayList<String>()";
  return `new ArrayList<String>(Arrays.asList(${values.map(javaStringLiteral).join(", ")}))`;
}

function javaCharLiteral(value) {
  const char = String(value || "\0").charAt(0);
  if (char === "\\") return "'\\\\'";
  if (char === "'") return "'\\''";
  if (char === "\n") return "'\\n'";
  if (char === "\r") return "'\\r'";
  if (char === "\t") return "'\\t'";
  return `'${char}'`;
}

function javaStringLiteral(value = "") {
  return `"${String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")}"`;
}

function indentJava(source = "", spaces = 2) {
  const pad = " ".repeat(spaces);
  return String(source || "")
    .split("\n")
    .map((line) => (line ? `${pad}${line}` : line))
    .join("\n");
}

export {
  withJavaTypePrelude,
  buildJavaHarness,
  buildJavaMethodTestBlock,
  buildJavaOperationTestBlock,
  javaValueExpression,
  javaObjectExpression,
  javaIntArrayExpression,
  javaIntegerArrayExpression,
  javaIntMatrixExpression,
  javaCharMatrixExpression,
  javaStringListExpression,
  javaCharLiteral,
  javaStringLiteral,
  indentJava,
  runJavaProblem,
};

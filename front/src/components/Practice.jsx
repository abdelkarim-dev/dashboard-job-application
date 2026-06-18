import React, { useState, useEffect, useRef } from "react";
import { awardPoints } from "../lib/points.mjs";

function ToolbarIcon({ name }) {
  const common = {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    focusable: "false",
  };
  const paths = {
    play: <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />,
    pause: (
      <>
        <line x1="9" y1="5" x2="9" y2="19" />
        <line x1="15" y1="5" x2="15" y2="19" />
      </>
    ),
    reset: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v6h6" />
      </>
    ),
    save: (
      <>
        <path d="M5 3h12l2 2v16H5z" />
        <path d="M8 3v6h8V3" />
        <path d="M8 21v-7h8v7" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    check: (
      <>
        <path d="M20 6 9 17l-5-5" />
      </>
    ),
    chevronDown: <path d="m6 9 6 6 6-6" />,
    chevronUp: <path d="m18 15-6-6-6 6" />,
    codeReset: (
      <>
        <path d="M4 7h10a6 6 0 1 1-5.2 9" />
        <path d="M4 7l4-4" />
        <path d="M4 7l4 4" />
      </>
    ),
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function IconButton({ label, icon, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <ToolbarIcon name={icon} />
    </button>
  );
}

const PATTERN_GROUPS = [
  { name: "DFS", tags: ["Depth-First Search"] },
  { name: "BFS", tags: ["Breadth-First Search"] },
  { name: "Dynamic Programming", tags: ["Dynamic Programming"] },
  { name: "Binary Search", tags: ["Binary Search"] },
  { name: "Sliding Window", tags: ["Sliding Window", "Monotonic Queue"] },
  { name: "Two Pointers", tags: ["Two Pointers"] },
  { name: "Graph", tags: ["Graph", "Topological Sort"] },
  { name: "Tree", tags: ["Tree", "Binary Tree"] },
  { name: "Stack", tags: ["Stack", "Monotonic Stack"] },
  { name: "Heap", tags: ["Heap", "Priority Queue"] },
  { name: "Hash Table", tags: ["Hash Table"] },
  { name: "Intervals & Sorting", tags: ["Sorting", "Intervals"] },
  { name: "Linked List", tags: ["Linked List"] },
  { name: "Matrix", tags: ["Matrix"] },
  { name: "Greedy", tags: ["Greedy"] },
  { name: "Prefix Sum", tags: ["Prefix Sum"] },
  { name: "Design", tags: ["Design"] },
  { name: "Array & String", tags: ["Array", "String"] },
];

const PRACTICE_LANGUAGES = [
  { id: "python", label: "Python", aceMode: "ace/mode/python", runtimeLabel: "python3" },
  { id: "java", label: "Java", aceMode: "ace/mode/java", runtimeLabel: "javac/java" },
];

function getPracticeLanguage(language) {
  return PRACTICE_LANGUAGES.find((item) => item.id === language) || PRACTICE_LANGUAGES[0];
}

function getStoredPracticeLanguage() {
  try {
    const saved = window.localStorage?.getItem("leetcodePracticeLanguage");
    return getPracticeLanguage(saved).id;
  } catch {
    return "python";
  }
}

function getIdleCompilerStatus(language) {
  const meta = getPracticeLanguage(language);
  return `Runs locked local ${meta.runtimeLabel} tests. Ctrl-Enter to compile.`;
}

function getProblemMethodName(problem) {
  return String(problem?.methodName || "").trim();
}

function inferClientJavaArgType(value, typeHint = "", problem = {}, index = 0) {
  const hint = String(typeHint || "").toLowerCase();
  if (hint === "tree" || hint === "binary_tree") return "TreeNode";
  if (hint === "listnode" || hint === "linked_list") return "ListNode";
  if (hint === "listnode[]" || hint === "linked_list[]") return "ListNode[]";
  if (typeof value === "string") return "String";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "int" : "double";
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((row) => Array.isArray(row) && row.every((item) => typeof item === "string" && item.length <= 1))) return "char[][]";
    if (value.every((item) => typeof item === "string")) return "List<String>";
    if (value.every((item) => Array.isArray(item) && item.every((inner) => typeof inner === "number"))) return "int[][]";
    if (value.every((item) => typeof item === "number")) return "int[]";
    if (value.length === 0 && /word/i.test(String(problem?.title || "")) && index >= 2) return "List<String>";
  }
  return "Object";
}

function inferClientJavaReturnType(expected, expectedType = "", problem = {}) {
  const hint = String(expectedType || "").toLowerCase();
  const title = String(problem?.title || "");
  const methodName = getProblemMethodName(problem);
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
      return /three\s*sum|level\s*order/i.test(title) ? "List<List<Integer>>" : "int[][]";
    }
    if (expected.every((item) => typeof item === "string")) return "List<String>";
  }
  return "Object";
}

function getClientJavaDefaultReturn(returnType) {
  if (returnType === "boolean") return "return false;";
  if (returnType === "int") return "return 0;";
  if (returnType === "double") return "return 0.0;";
  if (returnType === "String") return 'return "";';
  if (returnType === "int[]") return "return new int[0];";
  if (returnType === "int[][]") return "return new int[0][];";
  if (returnType === "List<String>" || returnType === "List<List<Integer>>") return "return new ArrayList<>();";
  return "return null;";
}

function makeClientJavaStarter(problem = {}) {
  const methodName = getProblemMethodName(problem);
  const title = String(problem?.title || "");
  if (!methodName && /lru cache/i.test(title)) {
    return "import java.util.*;\n\nclass LRUCache {\n    public LRUCache(int capacity) {\n    }\n\n    public int get(int key) {\n        return -1;\n    }\n\n    public void put(int key, int value) {\n    }\n}\n";
  }
  if (!methodName) {
    return "import java.util.*;\n\nclass Solution {\n    public Object solve() {\n        return null;\n    }\n}\n";
  }
  const tests = Array.isArray(problem.customTests) ? problem.customTests : [];
  const maxArgs = tests.reduce((max, test) => Math.max(max, Array.isArray(test.args) ? test.args.length : 0), 0);
  const params = Array.from({ length: maxArgs }, (_, index) => {
    const hinted = tests.find((test) => Array.isArray(test.argTypes) && test.argTypes[index])?.argTypes[index] || "";
    const sample = tests.find((test) => Array.isArray(test.args) && index in test.args && !(Array.isArray(test.args[index]) && test.args[index].length === 0))
      || tests.find((test) => Array.isArray(test.args) && index in test.args);
    return `${inferClientJavaArgType(sample?.args?.[index], hinted, problem, index)} arg${index + 1}`;
  });
  const sample = tests.find((test) => "expected" in test) || {};
  const returnType = inferClientJavaReturnType(sample.expected, sample.expectedType, problem);
  return `import java.util.*;\n\nclass Solution {\n    public ${returnType} ${methodName}(${params.join(", ")}) {\n        ${getClientJavaDefaultReturn(returnType)}\n    }\n}\n`;
}

function getLanguageDraft(problem, language) {
  if (!problem) return "";
  const drafts = problem.languageDrafts || {};
  if (language === "java") return drafts.java || makeClientJavaStarter(problem);
  return drafts.python || problem.draft || problem.starterCode || "";
}

function getLanguageStarter(problem, language) {
  if (!problem) return "";
  if (language === "java") return makeClientJavaStarter(problem);
  return problem.starterCode || "";
}

function patchProblemDraft(problem, language, code) {
  if (!problem) return problem;
  const nextDrafts = { ...(problem.languageDrafts || {}), [language]: code };
  return {
    ...problem,
    draft: language === "python" ? code : problem.draft,
    languageDrafts: nextDrafts,
  };
}

function getProblemTags(problem) {
  return Array.isArray(problem?.tags) ? problem.tags : [];
}

function matchesPattern(problem, pattern) {
  const tags = getProblemTags(problem);
  return pattern.tags.some((tag) => tags.includes(tag));
}

function formatValue(value) {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// ---- HackerRank-style basic autofill completer (single-token only) ----
// Every completion's `value` is a bare identifier/keyword/method name — a single
// token with no whitespace or newline — so Ace's $insertString only ever inserts
// one token. No item carries a `snippet` field, so nothing template-expands. This
// replaces the old completer whose `value` was a whole multi-line code block,
// which dumped an entire template into the editor on a single keystroke.
const PRACTICE_WORDS = {
  java: {
    keyword: [
      "class", "interface", "enum", "public", "private", "protected", "static",
      "final", "void", "return", "new", "this", "super", "extends", "implements",
      "import", "package", "if", "else", "for", "while", "do", "switch", "case",
      "default", "break", "continue", "try", "catch", "finally", "throw", "throws",
      "instanceof", "true", "false", "null", "abstract", "synchronized",
    ],
    type: [
      "int", "long", "double", "float", "boolean", "char", "byte", "short",
      "String", "Object", "List", "Map", "Set", "HashMap", "HashSet", "TreeMap",
      "TreeSet", "LinkedHashMap", "ArrayList", "LinkedList", "ArrayDeque", "Deque",
      "PriorityQueue", "Queue", "Stack", "StringBuilder", "Arrays", "Collections",
      "Integer", "Long", "Double", "Float", "Boolean", "Character", "Byte",
      "Math", "Optional", "Comparator", "Iterator", "Comparable",
    ],
    method: [
      "put", "get", "getOrDefault", "putIfAbsent", "containsKey", "containsValue",
      "add", "addAll", "addFirst", "addLast", "remove", "removeFirst", "removeLast",
      "poll", "pollFirst", "pollLast", "offer", "push", "pop", "peek", "peekFirst",
      "peekLast", "size", "length", "isEmpty", "clear", "contains", "indexOf",
      "charAt", "substring", "toCharArray", "split", "trim", "replace", "append",
      "insert", "reverse", "toString", "valueOf", "parseInt", "sort", "fill",
      "copyOf", "asList", "max", "min", "abs", "pow", "sqrt", "floor", "ceil",
      "round", "compareTo", "equals", "hashCode", "keySet", "values", "entrySet",
      "getKey", "getValue", "stream", "collect", "mapToInt", "forEach", "of",
    ],
  },
  python: {
    keyword: [
      "def", "class", "return", "yield", "lambda", "if", "elif", "else", "for",
      "while", "break", "continue", "pass", "import", "from", "as", "with",
      "try", "except", "finally", "raise", "and", "or", "not", "in", "is",
      "None", "True", "False", "global", "nonlocal", "del", "assert", "self",
    ],
    type: [
      "int", "float", "bool", "str", "list", "dict", "set", "frozenset", "tuple",
      "bytes", "complex", "deque", "Counter", "defaultdict", "OrderedDict",
      "List", "Dict", "Set", "Tuple", "Optional", "heapq", "bisect", "math",
    ],
    method: [
      "append", "extend", "insert", "pop", "popleft", "appendleft", "remove",
      "clear", "index", "count", "sort", "sorted", "reverse", "reversed", "copy",
      "get", "keys", "values", "items", "setdefault", "update", "add", "discard",
      "union", "intersection", "difference", "len", "range", "enumerate", "zip",
      "map", "filter", "sum", "max", "min", "abs", "round", "split", "join",
      "strip", "lstrip", "rstrip", "replace", "lower", "upper", "find", "startswith",
      "endswith", "format", "ord", "chr", "bin", "isdigit", "isalpha", "heappush",
      "heappop", "heapify", "bisect_left", "bisect_right", "gcd", "sqrt", "ceil",
      "floor", "most_common", "groupby",
    ],
  },
};

// A single identifier-shaped prefix (no whitespace/newline). Gates the popup so
// it never fires on punctuation or empty input.
const PRACTICE_PREFIX_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

// Pull identifiers already typed in the buffer so locals (variable/method names)
// autocomplete like HackerRank. A fresh /g regex per call avoids shared lastIndex.
function harvestBufferIdentifiers(session, prefix) {
  const seen = new Set();
  const out = [];
  const text = typeof session?.getValue === "function" ? session.getValue() : "";
  const re = /[A-Za-z_$][A-Za-z0-9_$]*/g;
  let m;
  while ((m = re.exec(text))) {
    const word = m[0];
    if (word.length < 2 || word === prefix || seen.has(word)) continue;
    seen.add(word);
    out.push(word);
    if (out.length >= 400) break;
  }
  return out;
}

// Returns an Ace completer. getLanguage() must return "java" or "python".
// Wire as the ONLY completer on the editor (editor.completers = [...]) — NOT via
// languageTools.addCompleter, which appends to Ace's default list (incl. the
// snippet completer that template-expands on accept).
function buildPracticeCompleter(getLanguage) {
  return {
    id: "practiceBasicAutofill",
    identifierRegexps: [/[A-Za-z_$][A-Za-z0-9_$]*/],
    getCompletions(editor, session, pos, prefix, callback) {
      if (!prefix || !PRACTICE_PREFIX_RE.test(prefix)) {
        callback(null, []);
        return;
      }
      const language = (typeof getLanguage === "function" && getLanguage() === "python")
        ? "python"
        : "java";
      const words = PRACTICE_WORDS[language];
      const lowerPrefix = prefix.toLowerCase();
      const startsWith = (w) => w.toLowerCase().startsWith(lowerPrefix);

      const candidates = [];
      const pushAll = (list, meta, score) => {
        for (const word of list) {
          if (startsWith(word)) candidates.push({ word, meta, score });
        }
      };

      pushAll(harvestBufferIdentifiers(session, prefix), "local", 1000);
      pushAll(words.method, "method", 900);
      pushAll(words.type, "type", 850);
      pushAll(words.keyword, "keyword", 800);

      const byToken = new Map();
      for (const c of candidates) {
        if (!byToken.has(c.word)) byToken.set(c.word, c);
      }

      const completions = Array.from(byToken.values())
        .slice(0, 50)
        .map((c) => ({
          caption: c.word,
          value: c.word, // single token only — never spans multiple lines
          meta: c.meta,
          score: c.score,
        }));

      callback(null, completions);
    },
  };
}

export default function Practice({ timerState, setTimerState, activePlan = null, onExitPlan }) {
  const [store, setStore] = useState(null);
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(() => getStoredPracticeLanguage());

  // Editor and compiler states
  const [reflection, setReflection] = useState("");
  const [notes, setNotes] = useState("");
  const [runResults, setRunResults] = useState(null);
  const [compilerStatus, setCompilerStatus] = useState(() => getIdleCompilerStatus(selectedLanguage));
  const [running, setRunning] = useState(false);
  const [sidePanelMode, setSidePanelMode] = useState("description");
  const [openPatterns, setOpenPatterns] = useState({});
  const [sidebarWidth, setSidebarWidth] = useState(330);
  const [editorPaneWidth, setEditorPaneWidth] = useState(620);
  const [consoleHeight, setConsoleHeight] = useState(264);

  // Read the persisted timer that lives in App.jsx so it survives tab navigation.
  const focusMinutes = timerState?.focusMinutes ?? 25;
  const timerSeconds = timerState?.seconds ?? focusMinutes * 60;
  const timerRunning = Boolean(timerState?.running);
  const setFocusMinutes = (value) => {
    const next = Math.max(0, Number(value) || 0);
    setTimerState((prev) => ({
      ...prev,
      focusMinutes: next,
      seconds: prev?.running ? prev.seconds : next * 60,
    }));
  };
  const setTimerRunning = (updater) => {
    setTimerState((prev) => {
      const nextRunning = typeof updater === "function" ? updater(prev?.running) : updater;
      return { ...prev, running: Boolean(nextRunning) };
    });
  };
  const resetTimer = () => {
    setTimerState((prev) => ({
      ...prev,
      seconds: Math.max(0, Number(prev?.focusMinutes) || 0) * 60,
      running: false,
    }));
  };

  const aceEditorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const selectedLanguageRef = useRef(selectedLanguage);
  const practiceLayoutRef = useRef(null);
  const editorShellRef = useRef(null);
  const rightPaneRef = useRef(null);

  useEffect(() => {
    fetchPracticeStore();
  }, []);

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
    try {
      window.localStorage?.setItem("leetcodePracticeLanguage", selectedLanguage);
    } catch {}
    const editor = editorInstanceRef.current;
    if (editor) {
      editor.session.setMode(getPracticeLanguage(selectedLanguage).aceMode);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      editorInstanceRef.current?.resize();
    }, 0);
    return () => window.clearTimeout(id);
  }, [sidebarWidth, editorPaneWidth, consoleHeight]);

  const fetchPracticeStore = async (selectId = null) => {
    try {
      const res = await fetch("/api/practice");
      if (res.ok) {
        const data = await res.json();
        setStore(data);
        setProblems(data.problems || []);
        
        if (data.problems && data.problems.length > 0) {
          const defaultSelect = selectId 
            ? data.problems.find((p) => p.id === selectId)
            : data.problems[0];
          handleSelectProblem(defaultSelect || data.problems[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch practice store", err);
    }
  };

  const handleSelectProblem = (problem) => {
    const language = selectedLanguageRef.current;
    setSelectedProblem(problem);
    setNotes(problem.notes || "");
    setReflection(problem.reflection || "");
    setRunResults(null);
    setCompilerStatus(getIdleCompilerStatus(language));
    setSidePanelMode("description");
    
    if (editorInstanceRef.current) {
      editorInstanceRef.current.session.setMode(getPracticeLanguage(language).aceMode);
      editorInstanceRef.current.setValue(getLanguageDraft(problem, language), -1);
      editorInstanceRef.current.clearSelection();
    }
  };

  // When a study plan is active, keep the selection inside the plan. Entering a
  // plan (or its problems finishing loading) jumps to the first plan problem.
  useEffect(() => {
    if (!activePlan || problems.length === 0) return;
    const planProblems = activePlan.problemIds
      .map((id) => problems.find((p) => p.id === id))
      .filter(Boolean);
    if (planProblems.length === 0) return;
    if (!selectedProblem || !planProblems.some((p) => p.id === selectedProblem.id)) {
      handleSelectProblem(planProblems[0]);
    }
  }, [activePlan, problems]);

  // Ace Editor Setup
  useEffect(() => {
    if (window.ace && aceEditorRef.current && !editorInstanceRef.current) {
      window.ace.config.set("basePath", "/vendor/ace");
      window.ace.config.set("modePath", "/vendor/ace");
      window.ace.config.set("themePath", "/vendor/ace");
      window.ace.config.set("workerPath", "/vendor/ace");

      // Load the autocomplete UI/commands, but do NOT use addCompleter — that
      // appends to Ace's shared default completers (incl. the snippet completer,
      // which template-expands on accept). We install our own completer below.
      window.ace.require("ace/ext/language_tools");

      const editor = window.ace.edit(aceEditorRef.current);
      editor.setTheme("ace/theme/one_dark");
      editor.session.setMode(getPracticeLanguage(selectedLanguageRef.current).aceMode);
      editor.session.setTabSize(4);
      editor.session.setUseSoftTabs(true);
      editor.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: false,
        fontSize: 14,
        highlightActiveLine: true,
        showPrintMargin: false,
        wrap: true,
      });
      // Our single-token completer is the ONLY completer on this editor, so the
      // popup can never insert a multi-line template — HackerRank-style autofill.
      editor.completers = [buildPracticeCompleter(() => selectedLanguageRef.current)];

      editor.commands.addCommand({
        name: "runLockedTests",
        bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" },
        exec: () => handleCompileAndRun(),
      });

      editorInstanceRef.current = editor;

      // Load initial code if selected
      if (selectedProblem) {
        editor.setValue(getLanguageDraft(selectedProblem, selectedLanguageRef.current), -1);
        editor.clearSelection();
      }
    }

    return () => {
      // Intentionally left as-is, Ace manages cleanups nicely or let React re-mount handle it
    };
  }, [problems.length]);

  const getCode = () => {
    return editorInstanceRef.current ? editorInstanceRef.current.getValue() : "";
  };

  const updateProblemDraftLocally = (problem, language, code) => {
    if (!problem) return problem;
    const patched = patchProblemDraft(problem, language, code);
    setProblems((items) => items.map((item) => (item.id === patched.id ? patched : item)));
    setStore((prev) => prev ? {
      ...prev,
      problems: (prev.problems || []).map((item) => (item.id === patched.id ? patched : item)),
    } : prev);
    return patched;
  };

  const handleLanguageChange = (language) => {
    const nextLanguage = getPracticeLanguage(language).id;
    const currentLanguage = selectedLanguageRef.current;
    if (nextLanguage === currentLanguage) return;
    selectedLanguageRef.current = nextLanguage;
    setSelectedLanguage(nextLanguage);
    setRunResults(null);
    setCompilerStatus(getIdleCompilerStatus(nextLanguage));
    let problemForNextLanguage = selectedProblem;
    try {
      if (selectedProblem && editorInstanceRef.current) {
        problemForNextLanguage = updateProblemDraftLocally(selectedProblem, currentLanguage, getCode());
        editorInstanceRef.current.setValue(getLanguageDraft(problemForNextLanguage, nextLanguage), -1);
        editorInstanceRef.current.clearSelection();
        editorInstanceRef.current.session.setMode(getPracticeLanguage(nextLanguage).aceMode);
      }
    } catch (err) {
      console.error("Failed to switch practice language", err);
    }
    setSelectedProblem(problemForNextLanguage);
  };

  const startPaneResize = (kind, event) => {
    event.preventDefault();
    const layoutRect = practiceLayoutRef.current?.getBoundingClientRect();
    const shellRect = editorShellRef.current?.getBoundingClientRect();
    const rightRect = rightPaneRef.current?.getBoundingClientRect();
    document.body.classList.add("pane-resizing");

    const handleMove = (moveEvent) => {
      if (kind === "sidebar" && layoutRect) {
        const max = Math.min(560, Math.max(260, layoutRect.width * 0.48));
        setSidebarWidth(clamp(moveEvent.clientX - layoutRect.left, 240, max));
      }
      if (kind === "editor" && shellRect) {
        const max = Math.max(420, shellRect.width - 340);
        setEditorPaneWidth(clamp(moveEvent.clientX - shellRect.left - 12, 380, max));
      }
      if (kind === "console" && rightRect) {
        const max = Math.max(220, rightRect.height - 260);
        setConsoleHeight(clamp(rightRect.bottom - moveEvent.clientY, 180, max));
      }
    };

    const stopResize = () => {
      document.body.classList.remove("pane-resizing");
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopResize);
      editorInstanceRef.current?.resize();
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopResize, { once: true });
  };

  const handleResizeKey = (kind, event) => {
    const keyDeltas = {
      ArrowLeft: -24,
      ArrowRight: 24,
      ArrowUp: -24,
      ArrowDown: 24,
    };
    if (!(event.key in keyDeltas)) return;
    event.preventDefault();
    const delta = keyDeltas[event.key];
    if (kind === "sidebar") setSidebarWidth((value) => clamp(value + delta, 240, 560));
    if (kind === "editor") setEditorPaneWidth((value) => clamp(value + delta, 380, 1100));
    if (kind === "console") setConsoleHeight((value) => clamp(value - delta, 180, 520));
  };

  const formatTimer = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return `${minutes}:${String(rest).padStart(2, "0")}`;
  };

  const getConfiguredTestSummary = () => {
    const total = selectedProblem?.customTests?.length || 0;
    return {
      label: `${total} locked ${total === 1 ? "test" : "tests"}`,
      invalid: false,
    };
  };

  // Compile & Run
  const handleCompileAndRun = async (mode = "run") => {
    if (!selectedProblem || running) return;
    const language = selectedLanguageRef.current;
    setRunning(true);
    setCompilerStatus(mode === "submit"
      ? `Submitting ${getPracticeLanguage(language).label} against locked local tests...`
      : `Running locked local ${getPracticeLanguage(language).label} tests...`);
    setRunResults(null);

    const payload = {
      language,
      code: getCode(),
      timeSpentMinutes: focusMinutes,
      notes,
      solutionRevealed: selectedProblem.solutionRevealed || sidePanelMode === "solution",
    };

    try {
      const res = await fetch(`/api/practice/problems/${encodeURIComponent(selectedProblem.id)}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        setRunResults(result);
        const allPassed = result.ok && result.total > 0 && result.passed === result.total;
        if (result.ok) {
          setCompilerStatus(`${mode === "submit" ? "Submit" : "Run"} complete. Passed ${result.passed}/${result.total} test cases.`);
        } else {
          setCompilerStatus(`Run failed: ${result.error || "Execution error."}`);
        }

        if (mode === "submit" && allPassed) {
          const solvedRes = await fetch(`/api/practice/problems/${encodeURIComponent(selectedProblem.id)}/mark-solved`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              language,
              draft: getCode(),
              timeSpentMinutes: focusMinutes,
              reflection: reflection || "Auto-solved after successful submit.",
            }),
          });
          if (solvedRes.ok) {
            setCompilerStatus(`Submitted. All ${result.total} tests passed. Marked solved automatically.`);
            // Points for solving — only the first time, so re-runs don't farm.
            if (!selectedProblem.solved) awardPoints("problemSolved");
          }
        }

        // Reload store quietly to capture attempts/draft save
        const storeRes = await fetch("/api/practice");
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          setStore(storeData);
          setProblems(storeData.problems || []);
          const updated = storeData.problems.find((x) => x.id === selectedProblem.id);
          if (updated) {
            setSelectedProblem(updated);
          }
        }
      } else {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detail = body.error;
        } catch {}
        setCompilerStatus(res.status === 403
          ? `Run blocked: ${detail}`
          : `Run failed: ${detail}`);
      }
    } catch (err) {
      console.error(err);
      setCompilerStatus("Network connection error.");
    } finally {
      setRunning(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedProblem) return;
    const language = selectedLanguageRef.current;
    const payload = {
      language,
      draft: getCode(),
      notes,
      reflection,
      solutionRevealed: selectedProblem.solutionRevealed || sidePanelMode === "solution",
    };

    try {
      const res = await fetch(`/api/practice/problems/${encodeURIComponent(selectedProblem.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        setCompilerStatus(`${getPracticeLanguage(language).label} draft saved successfully.`);
        setStore((prev) => ({
          ...prev,
          problems: prev.problems.map((x) => (x.id === saved.id ? saved : x)),
        }));
        setSelectedProblem(saved);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkSolved = async () => {
    if (!selectedProblem) return;
    const language = selectedLanguageRef.current;
    const payload = {
      language,
      draft: getCode(),
      timeSpentMinutes: focusMinutes,
      reflection,
      solutionRevealed: selectedProblem.solutionRevealed || sidePanelMode === "solution",
    };

    try {
      const res = await fetch(`/api/practice/problems/${encodeURIComponent(selectedProblem.id)}/mark-solved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        setCompilerStatus("Problem marked as SOLVED! SRS schedule advanced.");
        await fetchPracticeStore(saved.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkFailed = async () => {
    if (!selectedProblem) return;
    const language = selectedLanguageRef.current;
    const payload = {
      language,
      draft: getCode(),
      timeSpentMinutes: focusMinutes,
      reflection,
      solutionRevealed: selectedProblem.solutionRevealed || sidePanelMode === "solution",
    };

    try {
      const res = await fetch(`/api/practice/problems/${encodeURIComponent(selectedProblem.id)}/mark-failed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        setCompilerStatus("Problem marked as FAILED. SRS reset to Level 0 review.");
        await fetchPracticeStore(saved.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createNewPracticeProblem = async () => {
    const title = window.prompt("Enter problem title:");
    if (!title) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const difficulty = window.prompt("Enter difficulty (Easy, Medium, Hard):") || "Easy";
    const methodName = window.prompt("Enter execution methodName:") || "solve";

    const newProblem = {
      id: `custom-${slug}`,
      title,
      slug,
      difficulty,
      tags: [],
      methodName,
      customTests: [],
      starterCode: `class Solution:\n    def ${methodName}(self):\n        pass\n`,
      languageDrafts: {
        python: `class Solution:\n    def ${methodName}(self):\n        pass\n`,
        java: `import java.util.*;\n\nclass Solution {\n    public Object ${methodName}() {\n        return null;\n    }\n}\n`,
      },
    };

    try {
      const res = await fetch("/api/practice/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProblem),
      });
      if (res.ok) {
        const saved = await res.json();
        await fetchPracticeStore(saved.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const useStarterCode = () => {
    if (!selectedProblem || !editorInstanceRef.current) return;
    const language = selectedLanguageRef.current;
    if (window.confirm(`Discard your ${getPracticeLanguage(language).label} draft and restore the starter template?`)) {
      editorInstanceRef.current.setValue(getLanguageStarter(selectedProblem, language), -1);
      editorInstanceRef.current.clearSelection();
      setCompilerStatus("Starter template restored.");
    }
  };

  const toggleSolutionPanel = () => {
    if (!selectedProblem) return;
    setSidePanelMode((mode) => (mode === "solution" ? "description" : "solution"));
    setCompilerStatus(sidePanelMode === "solution" ? "Problem description restored." : "Solution opened on the right.");
  };

  // Robust Line-by-Line Markdown Parser
  const renderMarkdown = (desc) => {
    if (!desc) return null;
    
    const lines = desc.split("\n");
    const elements = [];
    let inCodeBlock = false;
    let codeLines = [];
    let listItems = [];
    let paragraphLines = [];

    const flushParagraph = (key) => {
      if (paragraphLines.length > 0) {
        const text = paragraphLines.join(" ");
        paragraphLines = [];
        elements.push(
          <p
            key={`p-${key}`}
            dangerouslySetInnerHTML={{ __html: parseInline(text) }}
          />
        );
      }
    };

    const flushList = (key) => {
      if (listItems.length > 0) {
        const items = [...listItems];
        listItems = [];
        elements.push(
          <ul key={`ul-${key}`}>
            {items.map((item, idx) => (
              <li
                key={idx}
                dangerouslySetInnerHTML={{ __html: parseInline(item) }}
              />
            ))}
          </ul>
        );
      }
    };

    const escapeInlineHtml = (value) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const safeMarkdownHref = (value) => {
      try {
        const parsed = new URL(String(value || "").trim(), window.location.origin);
        return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
      } catch {
        return "";
      }
    };

    const parseInline = (text) => {
      const linkHtml = [];
      const tokenized = String(text || "").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label, href) => {
        const safeHref = safeMarkdownHref(href);
        const safeLabel = escapeInlineHtml(label);
        const token = `@@JH_LINK_${linkHtml.length}@@`;
        linkHtml.push(
          safeHref
            ? `<a href="${escapeInlineHtml(safeHref)}" target="_blank" rel="noreferrer">${safeLabel}</a>`
            : safeLabel
        );
        return token;
      });

      let output = escapeInlineHtml(tokenized)
        .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");
      linkHtml.forEach((html, index) => {
        output = output.replace(`@@JH_LINK_${index}@@`, html);
      });
      return output;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("```")) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${i}`} className="problem-description-pre">
              <code>{codeLines.join("\n")}</code>
            </pre>
          );
          codeLines = [];
          inCodeBlock = false;
        } else {
          flushParagraph(i);
          flushList(i);
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      if (trimmed === "") {
        flushParagraph(i);
        flushList(i);
        continue;
      }

      if (trimmed.startsWith("# ")) {
        flushParagraph(i);
        flushList(i);
        elements.push(
          <h1
            key={`h1-${i}`}
            dangerouslySetInnerHTML={{ __html: parseInline(trimmed.slice(2)) }}
          />
        );
      } else if (trimmed.startsWith("## ")) {
        flushParagraph(i);
        flushList(i);
        elements.push(
          <h2
            key={`h2-${i}`}
            dangerouslySetInnerHTML={{ __html: parseInline(trimmed.slice(3)) }}
          />
        );
      } else if (trimmed.startsWith("### ")) {
        flushParagraph(i);
        flushList(i);
        elements.push(
          <h3
            key={`h3-${i}`}
            dangerouslySetInnerHTML={{ __html: parseInline(trimmed.slice(4)) }}
          />
        );
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        flushParagraph(i);
        listItems.push(trimmed.slice(2));
      } else {
        flushList(i);
        paragraphLines.push(trimmed);
      }
    }

    flushParagraph(lines.length);
    flushList(lines.length);
    if (inCodeBlock && codeLines.length > 0) {
      elements.push(
        <pre key="code-eof" className="problem-description-pre">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
    }

    return elements;
  };

  const getAllCompanies = () => {
    const set = new Set();
    problems.forEach((p) => (p.companies || []).forEach((c) => set.add(c)));
    return Array.from(set).sort();
  };

  const getFilteredProblems = (list = problems) => {
    const search = searchText.toLowerCase();
    return list.filter((problem) => {
      const matchesSearch = !search
        || problem.title.toLowerCase().includes(search)
        || problem.tags.some((t) => t.toLowerCase().includes(search))
        || (problem.companies || []).some((c) => c.toLowerCase().includes(search));
      const matchesDiff = !difficultyFilter || problem.difficulty === difficultyFilter;
      const matchesStatus = !statusFilter ||
        (statusFilter === "due" && store?.due?.some((x) => x.id === problem.id)) ||
        (statusFilter === "solved" && problem.solved) ||
        (statusFilter === "unsolved" && !problem.solved);
      const matchesCompany = !companyFilter || (problem.companies || []).includes(companyFilter);

      return matchesSearch && matchesDiff && matchesStatus && matchesCompany;
    });
  };

  const getGroupedProblems = (items) => {
    const groups = PATTERN_GROUPS
      .map((pattern) => ({
        name: pattern.name,
        problems: items.filter((problem) => matchesPattern(problem, pattern)),
      }))
      .filter((group) => group.problems.length > 0);

    const uncategorized = items.filter((problem) => (
      !PATTERN_GROUPS.some((pattern) => matchesPattern(problem, pattern))
    ));

    if (uncategorized.length > 0) {
      groups.push({ name: "Other", problems: uncategorized });
    }

    return groups;
  };

  const renderDescription = () => {
    if (!selectedProblem) return null;
    let desc = (selectedProblem.description || "").trim();
    if (!desc) {
      desc = `### ${selectedProblem.title}\n\nNo local description has been saved for this custom problem yet.\n\n**Difficulty:** ${selectedProblem.difficulty}\n**Tags:** ${(selectedProblem.tags || []).join(", ") || "No tags"}`;
    }
    return (
      <div className="problem-description-render">
        {renderMarkdown(desc)}
      </div>
    );
  };

  const renderSolution = () => {
    if (!selectedProblem) return null;
    const solutionLanguage = getPracticeLanguage(selectedLanguage);
    const solutionCode = (
      selectedLanguage === "java"
        ? selectedProblem.languageSolutions?.java
        : (selectedProblem.languageSolutions?.python || selectedProblem.solutionCode)
    || "").trim();
    return (
      <div className="problem-solution-wrap">
        <div className="solution-header">
          <strong>Reference solution</strong>
          <span>{solutionLanguage.label} - {selectedProblem.methodName || selectedProblem.title}</span>
        </div>
        {solutionCode ? (
          <pre className="solution-code-block"><code>{solutionCode}</code></pre>
        ) : (
          <div className="solution-empty">
            <strong>No saved solution yet</strong>
            <span>This problem still has a starter template only.</span>
          </div>
        )}
      </div>
    );
  };

  const renderProblemRow = (prob) => (
    <button
      key={prob.id}
      className={`problem-row ${selectedProblem?.id === prob.id ? "active" : ""} ${prob.solved ? "solved" : ""}`}
      onClick={() => handleSelectProblem(prob)}
      type="button"
    >
      <div className="problem-row-head">
        <strong>{prob.title}</strong>
        <span className={`diff-tag ${prob.difficulty.toLowerCase()}`}>{prob.difficulty}</span>
      </div>
      <div className="problem-row-meta">
        <span>{(prob.tags || []).slice(0, 3).join(", ") || "No tags"}</span>
        {prob.nextReviewAt && <span>Due: {prob.nextReviewAt}</span>}
      </div>
      {(prob.companies || []).length > 0 && (
        <div className="problem-company-tags">
          {prob.companies.slice(0, 4).map((c) => (
            <span key={c} className="company-chip">{c}</span>
          ))}
          {prob.companies.length > 4 && (
            <span className="company-chip more">+{prob.companies.length - 4}</span>
          )}
        </div>
      )}
    </button>
  );

  const renderPatternGroup = (group, index) => {
    const selectedInGroup = group.problems.some((problem) => problem.id === selectedProblem?.id);
    const isOpen = openPatterns[group.name] ?? (index < 4 || selectedInGroup);
    return (
      <section
        key={group.name}
        className={`pattern-group ${isOpen ? "open" : ""}`}
      >
        <button
          type="button"
          className="pattern-summary"
          aria-expanded={isOpen}
          onClick={() => setOpenPatterns((prev) => ({ ...prev, [group.name]: !isOpen }))}
        >
          <ToolbarIcon name={isOpen ? "chevronUp" : "chevronDown"} />
          <span>{group.name}</span>
          <small>{group.problems.length}</small>
        </button>
        {isOpen && (
          <div className="pattern-problems">
            {group.problems.map(renderProblemRow)}
          </div>
        )}
      </section>
    );
  };

  const renderTestValue = (label, value) => (
    <div className="test-value">
      <span>{label}</span>
      <pre>{formatValue(value)}</pre>
    </div>
  );

  const renderTestResult = (result, index) => {
    const hasKwargs = result.kwargs && Object.keys(result.kwargs).length > 0;
    const inputValue = result.operations
      ? { operations: result.operations, args: result.operationArgs || result.args || [] }
      : (hasKwargs ? { args: result.args || [], kwargs: result.kwargs } : (result.args || []));

    return (
      <div key={`${result.name || "test"}-${index}`} className={`test-case-card ${result.passed ? "passed" : "failed"}`}>
        <div className="test-case-card-head">
          <strong>{result.passed ? "Pass" : "Fail"}</strong>
          <span>{result.name || `Test ${index + 1}`}</span>
        </div>
        <div className="test-case-grid">
          {renderTestValue("Input", inputValue)}
          {renderTestValue("Expected", result.expected)}
          {renderTestValue("Your output", result.actual)}
        </div>
        {result.error && <pre className="run-error-block compact">{result.error}</pre>}
      </div>
    );
  };

  const handleDeleteHistory = async () => {
    if (!selectedProblem) return;
    if (!window.confirm(`Clear all attempts, sessions, and history for "${selectedProblem.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/practice/problems/${encodeURIComponent(selectedProblem.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: [], attempts: [], sessions: [] }),
      });
      if (res.ok) {
        const saved = await res.json();
        setSelectedProblem(saved);
        setStore((prev) => prev ? { ...prev, problems: prev.problems.map((x) => (x.id === saved.id ? saved : x)) } : prev);
        setCompilerStatus("History cleared.");
      }
    } catch (err) {
      console.error(err);
      setCompilerStatus("Failed to clear history.");
    }
  };

  const renderHistory = () => {
    if (!selectedProblem) return null;

    const parseDateTime = (str) => {
      if (!str) return 0;
      const parsed = Date.parse(str);
      return isNaN(parsed) ? 0 : parsed;
    };

    const rows = [
      ...(selectedProblem.history || []).map((item) => ({ type: item.type, at: item.at, note: item.note })),
      ...(selectedProblem.attempts || []).slice(0, 12).map((item) => ({
        type: item.passed ? "attempt passed" : "attempt failed",
        at: item.createdAt,
        note: `${item.passedTests}/${item.totalTests} tests${item.timeSpentMinutes ? ` · ${item.timeSpentMinutes}m` : ""}`,
      })),
    ].sort((a, b) => parseDateTime(b.at) - parseDateTime(a.at));

    return (
      <div className="history-panel">
        <div className="history-toolbar">
          <span className="history-count">
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </span>
          {rows.length > 0 && (
            <button
              type="button"
              className="btn-ghost btn-sm danger"
              onClick={handleDeleteHistory}
            >
              Clear history
            </button>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="mini-empty">No history yet</p>
        ) : (
          <div className="history-list">
            {rows.map((row, idx) => (
              <div className="history-row" key={idx}>
                <span className={`history-type ${row.type.replace(/\s+/g, "-")}`}>{row.type}</span>
                <span className="history-note">{row.note}</span>
                <span className="history-date">
                  {new Date(row.at).toLocaleDateString(undefined, { dateStyle: "short" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // In plan mode the sidebar is scoped to the plan's problems, kept in plan order.
  const planProblems = activePlan
    ? activePlan.problemIds.map((id) => problems.find((p) => p.id === id)).filter(Boolean)
    : null;
  const planSolvedCount = planProblems ? planProblems.filter((p) => p.solved).length : 0;
  const filteredProblems = getFilteredProblems(planProblems || problems);
  const groupedProblems = getGroupedProblems(filteredProblems);
  const testSummary = getConfiguredTestSummary();
  return (
    <div className="tab-content-container active learning-view">
      <div className="learning-header">
        <div>
          <p className="eyebrow">Interview training</p>
          <h2>LeetCode</h2>
        </div>
      </div>

      <div
        className="practice-layout"
        ref={practiceLayoutRef}
        style={{ "--practice-sidebar-width": `${sidebarWidth}px` }}
      >
        {/* Sidebar */}
        <aside className="practice-sidebar">
          {activePlan && (
            <div className="plan-mode-banner">
              <div className="plan-mode-meta">
                <span className="plan-mode-eyebrow">Training plan</span>
                <strong>{activePlan.name}</strong>
                <small>{planSolvedCount}/{planProblems.length} solved</small>
              </div>
              <button type="button" className="btn-ghost btn-sm" onClick={onExitPlan}>
                Exit plan
              </button>
            </div>
          )}
          <div className="learning-card compact">
            <div className="learning-filter-grid">
              <input
                className="learning-input"
                type="search"
                placeholder="Search problems..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <select
                className="learning-input"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <option value="">All difficulty</option>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
              <select
                className="learning-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All status</option>
                <option value="due">Due</option>
                <option value="solved">Solved</option>
                <option value="unsolved">Unsolved</option>
              </select>
              <select
                className="learning-input"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <option value="">All companies</option>
                {getAllCompanies().map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
 
          <div className={`problem-list ${activePlan ? "plan-ordered-list" : "pattern-list"}`}>
            {filteredProblems.length === 0 ? (
              <p className="mini-empty">
                {activePlan ? "This plan has no trainable problems yet." : "No matching problems"}
              </p>
            ) : activePlan ? (
              filteredProblems.map(renderProblemRow)
            ) : (
              groupedProblems.map(renderPatternGroup)
            )}
          </div>
        </aside>

        <div
          className="pane-resizer vertical layout-resizer"
          role="separator"
          aria-label="Resize problem list"
          aria-orientation="vertical"
          tabIndex={0}
          onPointerDown={(event) => startPaneResize("sidebar", event)}
          onKeyDown={(event) => handleResizeKey("sidebar", event)}
        />

        {/* Practice Workspace Workspace */}
        <section className="practice-detail">
          {!selectedProblem ? (
            <div className="learning-empty">
              <strong>Select a problem</strong>
              <span>Pick a problem from the list, or build a focused set in Study Plans.</span>
            </div>
          ) : (
            <div
              className="practice-editor-shell"
              ref={editorShellRef}
              style={{ "--editor-pane-width": `${editorPaneWidth}px` }}
            >
              {/* Left Column: Code Editor & Compiler */}
              <div className="practice-right-pane" ref={rightPaneRef}>
                <div className="code-toolbar">
                  <div className="editor-toolbar-actions" aria-label="Editor actions">
                    <IconButton label="Reset starter" icon="codeReset" onClick={useStarterCode} />
                    <IconButton
                      label={sidePanelMode === "solution" ? "Show description" : "Show solution"}
                      icon="eye"
                      className={sidePanelMode === "solution" ? "active" : ""}
                      onClick={toggleSolutionPanel}
                    />
                    <IconButton label="Save draft" icon="save" onClick={handleSaveDraft} />
                    <IconButton
                      label={running ? "Running tests" : "Run tests"}
                      icon="play"
                      onClick={() => handleCompileAndRun("run")}
                      disabled={running}
                    />
                    <IconButton
                      label={running ? "Submitting solution" : "Submit solution"}
                      icon="check"
                      className="primary"
                      onClick={() => handleCompileAndRun("submit")}
                      disabled={running}
                    />
                    <div className="language-toggle" aria-label="Editor language">
                      {PRACTICE_LANGUAGES.map((language) => (
                        <button
                          key={language.id}
                          type="button"
                          aria-pressed={selectedLanguage === language.id}
                          className={selectedLanguage === language.id ? "active" : ""}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            handleLanguageChange(language.id);
                          }}
                          onClick={() => handleLanguageChange(language.id)}
                        >
                          {language.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="editor-settings">
                    <div className={`focus-timer ${timerRunning ? "running" : ""}`}>
                      <strong>{formatTimer(timerSeconds)}</strong>
                      <IconButton
                        label={timerRunning ? "Pause timer" : "Start timer"}
                        icon={timerRunning ? "pause" : "play"}
                        className="timer-icon"
                        onClick={() => setTimerRunning((value) => !value)}
                      />
                      <IconButton
                        label="Reset timer"
                        icon="reset"
                        className="timer-icon"
                        onClick={resetTimer}
                      />
                    </div>
                    <label className="toolbar-label">
                      <span>Timer (m)</span>
                      <input
                        className="learning-input small"
                        type="number"
                        min="0"
                        step="5"
                        value={focusMinutes}
                        onChange={(e) => setFocusMinutes(parseInt(e.target.value) || 0)}
                      />
                    </label>
                  </div>
                </div>

                <div className="code-editor-wrap ace-ready">
                  <div
                    ref={aceEditorRef}
                    className="ace-editor"
                    style={{ width: "100%", height: "100%" }}
                  ></div>
                </div>

                <div
                  className="pane-resizer horizontal console-resizer"
                  role="separator"
                  aria-label="Resize console"
                  aria-orientation="horizontal"
                  tabIndex={0}
                  onPointerDown={(event) => startPaneResize("console", event)}
                  onKeyDown={(event) => handleResizeKey("console", event)}
                />

                {/* Compiler panel */}
                <div
                  className="compiler-panel open"
                  style={{ "--console-height": `${consoleHeight}px` }}
                >
                  <div className="compiler-toggle">
                    <span className="compiler-title-wrap">
                      <strong>Console</strong>
                      <small>{compilerStatus}</small>
                    </span>
                    <span className={`compiler-test-count ${testSummary.invalid ? "invalid" : ""}`}>
                      {testSummary.label}
                    </span>
                  </div>

                  <div className="compiler-body" id="compilerPanelBody">
                      {!runResults && (
                        <div className="run-results idle">
                          <strong>No run yet</strong>
                          <span>Run the locked tests or submit to see input, expected output, and your output.</span>
                        </div>
                      )}

                      {runResults && (
                        <div className={`run-results ${runResults.ok && runResults.passed === runResults.total ? "success" : "failed"}`}>
                          {runResults.ok ? (
                            <>
                              <div className="run-result-head">
                                <strong>{runResults.passed === runResults.total ? "All tests passed" : "Test assertions failed"}</strong>
                                <span>{`Passed ${runResults.passed}/${runResults.total}`}</span>
                              </div>
                              {runResults.results && runResults.results.map(renderTestResult)}
                              {runResults.stdout && (
                                <pre className="stdout-block">
                                  <strong>Stdout:</strong>{"\n"}{runResults.stdout}
                                </pre>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="run-result-head failed">
                                <strong>Compilation or execution error</strong>
                              </div>
                              <pre className="run-error-block">{runResults.error}</pre>
                            </>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              </div>

              <div
                className="pane-resizer vertical editor-resizer"
                role="separator"
                aria-label="Resize editor and reference panes"
                aria-orientation="vertical"
                tabIndex={0}
                onPointerDown={(event) => startPaneResize("editor", event)}
                onKeyDown={(event) => handleResizeKey("editor", event)}
              />

              {/* Left Column: Description / solution reference */}
              <div className="practice-left-pane">
                <div className="practice-detail-top">
                  <div>
                    <p className="eyebrow" style={{ color: "var(--md-primary)", fontWeight: "bold" }}>
                      {sidePanelMode === "solution" ? "Solution" : "Problem"}
                    </p>
                    <h2>{selectedProblem.title}</h2>
                  </div>
                </div>

                <div className="practice-left-content">
                  {sidePanelMode === "solution" ? renderSolution() : renderDescription()}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

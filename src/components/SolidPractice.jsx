import React, { useEffect, useRef, useState } from "react";
import ace from "ace-builds/src-noconflict/ace.js";
import "ace-builds/src-noconflict/ext-language_tools.js";
import "ace-builds/src-noconflict/mode-java.js";
import "ace-builds/src-noconflict/snippets/java.js";
import "ace-builds/src-noconflict/theme-one_dark.js";

const STORAGE_KEY = "solidJavaLabProgressV1";

const LESSONS = [
  {
    id: "foundation",
    badge: "00",
    title: "Why SOLID exists",
    duration: "8 min",
    summary: "Use SOLID as a change-management toolkit, not a checklist of tiny classes.",
    points: [
      "Design quality shows up when requirements change: can one behavior evolve without surprising the rest of the system?",
      "A class can be short and still own several reasons to change. A large class can still have one cohesive responsibility.",
      "Apply principles where volatility and coupling hurt. Do not create an interface for every noun by reflex.",
    ],
    example: `// Ask what changes together, then keep it together.
final class CheckoutService {
    private final PricingPolicy pricing;
    private final PaymentGateway payments;

    CheckoutService(PricingPolicy pricing, PaymentGateway payments) {
        this.pricing = pricing;
        this.payments = payments;
    }
}`,
  },
  {
    id: "srp",
    badge: "S",
    title: "Single Responsibility",
    duration: "12 min",
    summary: "A unit should have one reason to change and one clear owner of that change.",
    points: [
      "Separate policy from delivery: calculating an invoice and formatting it as HTML belong to different concerns.",
      "Watch for methods that validate, persist, send email, and render output in one transaction-shaped class.",
      "The goal is cohesion. Related behavior should remain close together.",
    ],
    example: `final class InvoiceCalculator {
    Money total(Invoice invoice) { /* pricing rules */ }
}

final class InvoiceEmailer {
    void send(Invoice invoice) { /* delivery concern */ }
}`,
  },
  {
    id: "ocp",
    badge: "O",
    title: "Open / Closed",
    duration: "12 min",
    summary: "Prefer adding a new implementation over repeatedly editing stable branching logic.",
    points: [
      "A growing switch over payment types, discount tiers, or export formats is a strong signal.",
      "Introduce an abstraction around the axis that changes, then compose the desired implementation.",
      "Do not abstract speculative variation. Start when a real second behavior arrives.",
    ],
    example: `interface DiscountPolicy {
    int apply(int subtotal);
}

final class VipDiscount implements DiscountPolicy {
    public int apply(int subtotal) { return subtotal * 80 / 100; }
}`,
  },
  {
    id: "lsp",
    badge: "L",
    title: "Liskov Substitution",
    duration: "14 min",
    summary: "A subtype must honor the expectations established by its parent abstraction.",
    points: [
      "A subtype should not strengthen preconditions, weaken guarantees, or throw for valid parent operations.",
      "If Penguin inherits fly() and can only throw UnsupportedOperationException, the abstraction is wrong.",
      "Model capabilities explicitly. A smaller honest hierarchy beats a convenient fictional one.",
    ],
    example: `interface Bird { void move(); }
interface FlyingBird extends Bird { void fly(); }

final class Penguin implements Bird {
    public void move() { System.out.println("swim"); }
}`,
  },
  {
    id: "isp",
    badge: "I",
    title: "Interface Segregation",
    duration: "10 min",
    summary: "Clients should depend only on the capabilities they actually use.",
    points: [
      "Avoid forcing a simple printer to implement scan() and fax() with empty methods or exceptions.",
      "Split broad role interfaces into focused capabilities that can be combined where needed.",
      "Small interfaces reduce accidental coupling and make tests easier to write.",
    ],
    example: `interface Printer { void print(String document); }
interface Scanner { String scan(); }

final class SimplePrinter implements Printer {
    public void print(String document) { /* print */ }
}`,
  },
  {
    id: "dip",
    badge: "D",
    title: "Dependency Inversion",
    duration: "14 min",
    summary: "Policy code owns abstractions; infrastructure plugs into them.",
    points: [
      "A notification use case should depend on MessageSender, not construct an SmtpClient internally.",
      "Constructor injection makes the dependency visible and allows a test double to cross the same boundary.",
      "Dependency inversion is about source-code direction, not merely using a dependency-injection framework.",
    ],
    example: `final class NotificationService {
    private final MessageSender sender;

    NotificationService(MessageSender sender) {
        this.sender = sender;
    }
}`,
  },
  {
    id: "tradeoffs",
    badge: "07",
    title: "Refactor with judgment",
    duration: "9 min",
    summary: "Use the principles to explain tradeoffs in real Java services and interviews.",
    points: [
      "Start from the behavior that is hard to change or test. Extract one boundary that addresses that pressure.",
      "Keep domain code boring. Framework annotations and transport mapping belong near the application edge.",
      "When explaining a design, name the change it makes cheaper and the complexity it introduces.",
    ],
    example: `// A useful interview sentence:
// "I introduced this port because persistence is an outer detail.
//  The use case stays testable without Spring or a database."`,
  },
];

const QUIZ = [
  {
    id: "q1",
    principle: "SRP",
    question: "An InvoiceService calculates totals, renders a PDF, and emails customers. What is the best first refactor?",
    options: [
      "Split calculation, rendering, and delivery behind focused collaborators",
      "Rename the class to InvoiceManager",
      "Make every method static",
      "Add an AbstractInvoiceService base class",
    ],
    answer: 0,
    explanation: "Those responsibilities change for different reasons: pricing rules, document presentation, and delivery infrastructure.",
  },
  {
    id: "q2",
    principle: "OCP",
    question: "A checkout method gains another if/else branch whenever a new discount type is introduced. Which design pressure is most visible?",
    options: [
      "Stable code is repeatedly modified for each new behavior",
      "Every class needs a database repository",
      "The discount method needs to be synchronized",
      "The code has too many constructors",
    ],
    answer: 0,
    explanation: "A discount policy abstraction lets new behavior arrive as another implementation instead of another branch in stable checkout code.",
  },
  {
    id: "q3",
    principle: "LSP",
    question: "Penguin extends Bird, but fly() throws UnsupportedOperationException. What is the most accurate diagnosis?",
    options: [
      "The subtype violates the expectations of the parent abstraction",
      "The exception needs a more specific type",
      "Bird should be a record",
      "Penguin needs a default constructor",
    ],
    answer: 0,
    explanation: "A caller accepting Bird cannot safely substitute Penguin. Model flying as a narrower capability.",
  },
  {
    id: "q4",
    principle: "ISP",
    question: "A SimplePrinter must implement scan(), fax(), and staple() even though it only prints. What should change?",
    options: [
      "Split the broad interface into focused capability interfaces",
      "Return null from unsupported operations",
      "Throw UnsupportedOperationException from every unused method",
      "Move all methods into an abstract class",
    ],
    answer: 0,
    explanation: "Clients and implementations should depend on the narrow capabilities they actually need.",
  },
  {
    id: "q5",
    principle: "DIP",
    question: "NotificationService constructs SmtpClient directly inside sendWelcomeEmail(). Why is that a problem?",
    options: [
      "Business policy is coupled to an infrastructure detail",
      "SMTP clients cannot be used from Java",
      "The method needs to be private",
      "The service should inherit from SmtpClient",
    ],
    answer: 0,
    explanation: "Depend on a MessageSender port and inject the SMTP adapter. The use case becomes testable and the dependency direction becomes explicit.",
  },
  {
    id: "q8",
    principle: "Judgment",
    question: "When is introducing an interface most defensible?",
    options: [
      "When it protects a real boundary or variation point",
      "For every class before any second implementation exists",
      "Only when a framework requires it",
      "Whenever a class has more than three methods",
    ],
    answer: 0,
    explanation: "Interfaces are useful when they clarify a boundary, protect change, or enable substitution. Blanket abstraction adds noise.",
  },
];

const EXERCISES = [
  {
    id: "srp-invoice",
    principle: "S",
    title: "Split invoice responsibilities",
    difficulty: "Easy",
    time: "15 min",
    prompt: "Create two cohesive classes. InvoiceCalculator owns numeric totals. InvoiceFormatter owns presentation. Keep Solution as a thin orchestration entry point.",
    checks: ["InvoiceCalculator.total(int[], int) applies tax percentage", "InvoiceFormatter.format(String, int) renders the receipt", "Solution.receipt(...) composes both collaborators"],
    starterCode: `final class InvoiceCalculator {
    int total(int[] lineItems, int taxPercent) {
        // TODO: sum items and apply tax percentage.
        return 0;
    }
}

final class InvoiceFormatter {
    String format(String customer, int total) {
        // TODO: return "Invoice for <customer>: $<total>"
        return "";
    }
}

public class Solution {
    String receipt(String customer, int[] lineItems, int taxPercent) {
        // TODO: compose the focused collaborators.
        return "";
    }
}
`,
  },
  {
    id: "ocp-discounts",
    principle: "O",
    title: "Extend discount policies",
    difficulty: "Easy",
    time: "15 min",
    prompt: "Remove the pressure for a growing discount switch. Implement policies that can be added without changing Checkout.",
    checks: ["DiscountPolicy is an interface", "RegularDiscount and VipDiscount implement the port", "Checkout.total delegates to the selected policy"],
    starterCode: `interface DiscountPolicy {
    int apply(int subtotal);
}

final class RegularDiscount implements DiscountPolicy {
    public int apply(int subtotal) {
        // TODO: regular customers pay full price.
        return 0;
    }
}

final class VipDiscount implements DiscountPolicy {
    public int apply(int subtotal) {
        // TODO: VIP customers receive 20% off.
        return 0;
    }
}

public class Solution {
    int total(int subtotal, DiscountPolicy policy) {
        // TODO: stay closed to policy-specific branching.
        return 0;
    }
}
`,
  },
  {
    id: "lsp-birds",
    principle: "L",
    title: "Model honest bird capabilities",
    difficulty: "Easy",
    time: "12 min",
    prompt: "Model movement for all birds and flying only for birds that can fly. Penguin must remain safely substitutable for Bird without fake fly behavior.",
    checks: ["Bird exposes move()", "FlyingBird extends Bird and exposes fly()", "Penguin implements Bird only", "Sparrow implements FlyingBird"],
    starterCode: `interface Bird {
    String move();
}

interface FlyingBird extends Bird {
    String fly();
}

final class Penguin implements Bird {
    public String move() {
        // TODO
        return "";
    }
}

final class Sparrow implements FlyingBird {
    public String move() {
        // TODO
        return "";
    }

    public String fly() {
        // TODO
        return "";
    }
}

public class Solution {
}
`,
  },
  {
    id: "isp-devices",
    principle: "I",
    title: "Segregate office capabilities",
    difficulty: "Easy",
    time: "12 min",
    prompt: "Keep the printer contract small. Combine capabilities only in the device that supports both printing and scanning.",
    checks: ["Printer and Scanner remain separate", "SimplePrinter implements Printer only", "OfficeMachine implements both focused interfaces"],
    starterCode: `interface Printer {
    String print(String document);
}

interface Scanner {
    String scan();
}

final class SimplePrinter implements Printer {
    public String print(String document) {
        // TODO: return "Printed: " + document
        return "";
    }
}

final class OfficeMachine implements Printer, Scanner {
    public String print(String document) {
        // TODO: return "Printed: " + document
        return "";
    }

    public String scan() {
        // TODO: return "Scanned document"
        return "";
    }
}

public class Solution {
}
`,
  },
  {
    id: "dip-messages",
    principle: "D",
    title: "Invert notification delivery",
    difficulty: "Medium",
    time: "18 min",
    prompt: "Make NotificationService depend on a MessageSender abstraction supplied through its constructor. The service should not know whether delivery uses SMTP, SMS, or a test double.",
    checks: ["MessageSender is an interface", "NotificationService receives MessageSender in its constructor", "welcome(String) delegates the expected message"],
    starterCode: `interface MessageSender {
    void send(String message);
}

final class NotificationService {
    private final MessageSender sender;

    NotificationService(MessageSender sender) {
        // TODO
        this.sender = null;
    }

    void welcome(String name) {
        // TODO: delegate "Welcome, <name>!" through the port.
    }
}

public class Solution {
}
`,
  },
];

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
      quizAnswers: parsed.quizAnswers && typeof parsed.quizAnswers === "object" ? parsed.quizAnswers : {},
      drafts: parsed.drafts && typeof parsed.drafts === "object" ? parsed.drafts : {},
      solvedExercises: Array.isArray(parsed.solvedExercises) ? parsed.solvedExercises : [],
      attempts: parsed.attempts && typeof parsed.attempts === "object" ? parsed.attempts : {},
    };
  } catch {
    return { completedLessons: [], quizAnswers: {}, drafts: {}, solvedExercises: [], attempts: {} };
  }
}

function getQuizScore(answers) {
  return QUIZ.reduce((score, question) => score + (answers[question.id] === question.answer ? 1 : 0), 0);
}

function pct(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

export default function SolidPractice() {
  const [mode, setMode] = useState("course");
  const [lessonId, setLessonId] = useState(LESSONS[0].id);
  const [exerciseId, setExerciseId] = useState(EXERCISES[0].id);
  const [quizIndex, setQuizIndex] = useState(0);
  const [progress, setProgress] = useState(loadProgress);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [consoleStatus, setConsoleStatus] = useState("Ready. Run locked local Java tests with Ctrl-Enter.");
  const editorHostRef = useRef(null);
  const editorRef = useRef(null);
  const selectedExerciseRef = useRef(exerciseId);
  const loadingCodeRef = useRef(false);

  const lesson = LESSONS.find((item) => item.id === lessonId) || LESSONS[0];
  const exercise = EXERCISES.find((item) => item.id === exerciseId) || EXERCISES[0];
  const quizQuestion = QUIZ[quizIndex];
  const quizAnswered = Object.keys(progress.quizAnswers).length;
  const quizScore = getQuizScore(progress.quizAnswers);
  const totalCourseProgress = pct(
    progress.completedLessons.length + progress.solvedExercises.length + quizScore,
    LESSONS.length + EXERCISES.length + QUIZ.length,
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    selectedExerciseRef.current = exerciseId;
    setRunResult(null);
    setConsoleStatus("Ready. Run locked local Java tests with Ctrl-Enter.");
    const next = progress.drafts[exerciseId] ?? exercise.starterCode;
    if (editorRef.current) {
      loadingCodeRef.current = true;
      editorRef.current.setValue(next, -1);
      editorRef.current.clearSelection();
      loadingCodeRef.current = false;
    }
  }, [exerciseId]);

  useEffect(() => {
    if (!ace || !editorHostRef.current || editorRef.current) return undefined;
    ace.config.set("basePath", "/vendor/ace");
    ace.config.set("modePath", "/vendor/ace");
    ace.config.set("themePath", "/vendor/ace");
    ace.config.set("workerPath", "/vendor/ace");

    const editor = ace.edit(editorHostRef.current);
    editor.setTheme("ace/theme/one_dark");
    editor.session.setMode("ace/mode/java");
    editor.session.setTabSize(4);
    editor.session.setUseSoftTabs(true);
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
      fontSize: 14,
      highlightActiveLine: true,
      showPrintMargin: false,
      wrap: true,
    });
    editor.commands.addCommand({
      name: "runSolidJavaTests",
      bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" },
      exec: () => document.dispatchEvent(new CustomEvent("solid-java:run")),
    });
    editor.on("change", () => {
      if (loadingCodeRef.current) return;
      const id = selectedExerciseRef.current;
      const draft = editor.getValue();
      setProgress((current) => ({ ...current, drafts: { ...current.drafts, [id]: draft } }));
    });
    editorRef.current = editor;
    loadingCodeRef.current = true;
    editor.setValue(progress.drafts[exerciseId] ?? exercise.starterCode, -1);
    loadingCodeRef.current = false;

    return () => {
      editor.destroy();
      editor.container.remove();
      editorRef.current = null;
    };
  }, [mode]);

  const runExercise = async () => {
    if (running) return;
    setRunning(true);
    setRunResult(null);
    setConsoleStatus("Compiling Solution.java and running locked tests...");
    const code = editorRef.current?.getValue() ?? progress.drafts[exercise.id] ?? exercise.starterCode;
    try {
      const res = await fetch(`/api/solid-java/exercises/${encodeURIComponent(exercise.id)}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await res.json();
      setRunResult(result);
      const passed = result.ok && result.total > 0 && result.passed === result.total;
      setConsoleStatus(passed
        ? `Submitted. All ${result.total} Java tests passed.`
        : result.ok
          ? `Run complete. Passed ${result.passed}/${result.total} tests.`
          : result.error || "Java runner failed.");
      setProgress((current) => ({
        ...current,
        drafts: { ...current.drafts, [exercise.id]: code },
        attempts: { ...current.attempts, [exercise.id]: (current.attempts[exercise.id] || 0) + 1 },
        solvedExercises: passed && !current.solvedExercises.includes(exercise.id)
          ? [...current.solvedExercises, exercise.id]
          : current.solvedExercises,
      }));
    } catch (error) {
      console.error(error);
      setConsoleStatus("Could not reach the local Java runner.");
      setRunResult({ ok: false, error: "Could not reach the local Java runner.", results: [] });
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    const handleRun = () => runExercise();
    document.addEventListener("solid-java:run", handleRun);
    return () => document.removeEventListener("solid-java:run", handleRun);
  }, [exercise.id, running, progress.drafts]);

  const resetStarter = () => {
    if (!window.confirm("Restore the starter template for this exercise?")) return;
    loadingCodeRef.current = true;
    editorRef.current?.setValue(exercise.starterCode, -1);
    editorRef.current?.clearSelection();
    loadingCodeRef.current = false;
    setProgress((current) => ({ ...current, drafts: { ...current.drafts, [exercise.id]: exercise.starterCode } }));
    setRunResult(null);
    setConsoleStatus("Starter template restored.");
  };

  const toggleLesson = () => {
    setProgress((current) => ({
      ...current,
      completedLessons: current.completedLessons.includes(lesson.id)
        ? current.completedLessons.filter((id) => id !== lesson.id)
        : [...current.completedLessons, lesson.id],
    }));
  };

  const answerQuiz = (optionIndex) => {
    setProgress((current) => ({
      ...current,
      quizAnswers: { ...current.quizAnswers, [quizQuestion.id]: optionIndex },
    }));
  };

  const resetQuiz = () => {
    setQuizIndex(0);
    setProgress((current) => ({ ...current, quizAnswers: {} }));
  };

  const renderCourse = () => (
    <div className="solid-course-layout">
      <aside className="solid-rail">
        <div className="solid-rail-head">
          <strong>Learning path</strong>
          <span>{progress.completedLessons.length}/{LESSONS.length}</span>
        </div>
        {LESSONS.map((item) => (
          <button
            className={`solid-rail-item ${lesson.id === item.id ? "active" : ""}`}
            key={item.id}
            onClick={() => setLessonId(item.id)}
            type="button"
          >
            <span className={`solid-rail-badge ${progress.completedLessons.includes(item.id) ? "done" : ""}`}>
              {progress.completedLessons.includes(item.id) ? "✓" : item.badge}
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.duration}</small>
            </span>
          </button>
        ))}
      </aside>
      <article className="solid-lesson-card">
        <div className="solid-card-kicker">Lesson {LESSONS.findIndex((item) => item.id === lesson.id) + 1} of {LESSONS.length}</div>
        <h3>{lesson.title}</h3>
        <p className="solid-lead">{lesson.summary}</p>
        <ul className="solid-point-list">
          {lesson.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
        <div className="solid-code-sample">
          <div><span>Java example</span><small>Keep the dependency direction visible</small></div>
          <pre><code>{lesson.example}</code></pre>
        </div>
        {lesson.id === "clean-architecture" && (
          <div className="solid-layer-map" aria-label="Clean Architecture dependency direction">
            <span>Frameworks</span><b>→</b><span>Adapters</span><b>→</b><span>Use cases</span><b>→</b><span>Entities</span>
          </div>
        )}
        <div className="solid-lesson-actions">
          <button className={progress.completedLessons.includes(lesson.id) ? "btn-ghost" : "btn-primary"} onClick={toggleLesson} type="button">
            {progress.completedLessons.includes(lesson.id) ? "✓ Completed" : "Mark lesson complete"}
          </button>
          <button className="btn-ghost" onClick={() => setMode("quiz")} type="button">Test understanding →</button>
        </div>
      </article>
    </div>
  );

  const renderQuiz = () => {
    const selected = progress.quizAnswers[quizQuestion.id];
    const answered = selected !== undefined;
    return (
      <div className="solid-quiz-layout">
        <aside className="solid-quiz-map">
          <div className="solid-rail-head">
            <strong>Knowledge check</strong>
            <span>{quizAnswered}/{QUIZ.length}</span>
          </div>
          <div className="solid-quiz-dots">
            {QUIZ.map((question, index) => (
              <button
                className={`${index === quizIndex ? "active" : ""} ${progress.quizAnswers[question.id] !== undefined ? "answered" : ""}`}
                key={question.id}
                onClick={() => setQuizIndex(index)}
                type="button"
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="solid-score-card">
            <span>Current score</span>
            <strong>{quizScore}/{QUIZ.length}</strong>
            <small>Answers save locally as you go.</small>
          </div>
        </aside>
        <article className="solid-quiz-card">
          <div className="solid-card-kicker">{quizQuestion.principle} · Question {quizIndex + 1} of {QUIZ.length}</div>
          <h3>{quizQuestion.question}</h3>
          <div className="solid-options">
            {quizQuestion.options.map((option, index) => {
              const isSelected = selected === index;
              const className = answered
                ? index === quizQuestion.answer ? "correct" : isSelected ? "incorrect" : ""
                : "";
              return (
                <button className={className} key={option} onClick={() => answerQuiz(index)} type="button">
                  <span>{String.fromCharCode(65 + index)}</span>
                  <strong>{option}</strong>
                </button>
              );
            })}
          </div>
          {answered && (
            <div className={`solid-explanation ${selected === quizQuestion.answer ? "correct" : "incorrect"}`}>
              <strong>{selected === quizQuestion.answer ? "Correct" : "Not quite"}</strong>
              <p>{quizQuestion.explanation}</p>
            </div>
          )}
          <div className="solid-quiz-actions">
            <button className="btn-ghost" disabled={quizIndex === 0} onClick={() => setQuizIndex((index) => index - 1)} type="button">← Previous</button>
            <button className="btn-ghost" onClick={resetQuiz} type="button">Reset quiz</button>
            <button className="btn-primary" disabled={quizIndex === QUIZ.length - 1} onClick={() => setQuizIndex((index) => index + 1)} type="button">Next →</button>
          </div>
        </article>
      </div>
    );
  };

  const renderExercises = () => (
    <div className="solid-exercise-layout">
      <aside className="solid-rail solid-exercise-rail">
        <div className="solid-rail-head">
          <strong>Java kata</strong>
          <span>{progress.solvedExercises.length}/{EXERCISES.length}</span>
        </div>
        {EXERCISES.map((item) => (
          <button
            className={`solid-rail-item ${exercise.id === item.id ? "active" : ""}`}
            key={item.id}
            onClick={() => setExerciseId(item.id)}
            type="button"
          >
            <span className={`solid-rail-badge ${progress.solvedExercises.includes(item.id) ? "done" : ""}`}>
              {progress.solvedExercises.includes(item.id) ? "✓" : item.principle}
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.difficulty} · {item.time}</small>
            </span>
          </button>
        ))}
      </aside>
      <section className="solid-ide">
        <div className="solid-task-pane">
          <div className="solid-card-kicker">{exercise.principle} principle · {exercise.difficulty}</div>
          <h3>{exercise.title}</h3>
          <p>{exercise.prompt}</p>
          <h4>Locked checks</h4>
          <ul className="solid-check-list">
            {exercise.checks.map((check) => <li key={check}>{check}</li>)}
          </ul>
          <div className="solid-task-note">
            <strong>Java 23 local runner</strong>
            <span>Your source compiles locally. Tests inspect behavior and the shape of your design.</span>
          </div>
        </div>
        <div className="solid-editor-pane">
          <div className="solid-editor-toolbar">
            <div>
              <strong>Solution.java</strong>
              <span>Java · Ctrl-Enter to run</span>
            </div>
            <div>
              <button className="btn-ghost" onClick={resetStarter} type="button">Reset</button>
              <button className="btn-primary" disabled={running} onClick={runExercise} type="button">
                {running ? "Running..." : "Run tests"}
              </button>
            </div>
          </div>
          <div className="solid-ace-shell">
            <div ref={editorHostRef} className="solid-ace-editor" />
          </div>
          <div className="solid-console">
            <div className="solid-console-head">
              <div>
                <strong>Console</strong>
                <span>{consoleStatus}</span>
              </div>
              <small>{progress.attempts[exercise.id] || 0} runs</small>
            </div>
            {runResult && (
              <div className={`solid-test-results ${runResult.ok && runResult.passed === runResult.total ? "success" : "failed"}`}>
                {!runResult.ok && <pre>{runResult.error}</pre>}
                {runResult.results?.map((result) => (
                  <div className={result.passed ? "pass" : "fail"} key={result.name}>
                    <strong>{result.passed ? "PASS" : "FAIL"}</strong>
                    <span>{result.name}</span>
                    {result.message && <small>{result.message}</small>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="tab-content-container active solid-page">
      <header className="solid-header">
        <div>
          <p className="eyebrow">Java design gym</p>
          <h2>SOLID Principles</h2>
          <p>Learn the rules, test your reasoning, then refactor against locked Java checks.</p>
        </div>
        <span className="solid-java-chip">JAVA 23</span>
      </header>

      <div className="solid-overview">
        <article><span>Course</span><strong>{progress.completedLessons.length}/{LESSONS.length}</strong><small>lessons complete</small></article>
        <article><span>Quiz</span><strong>{quizScore}/{QUIZ.length}</strong><small>{quizAnswered} answered</small></article>
        <article><span>Exercises</span><strong>{progress.solvedExercises.length}/{EXERCISES.length}</strong><small>Java kata solved</small></article>
        <article className="accent"><span>Mastery</span><strong>{totalCourseProgress}%</strong><small>across the full track</small></article>
      </div>

      <nav className="solid-mode-tabs" aria-label="SOLID learning modes">
        {[
          ["course", "01", "Course"],
          ["quiz", "02", "Quiz"],
          ["exercises", "03", "Java exercises"],
        ].map(([id, number, label]) => (
          <button className={mode === id ? "active" : ""} key={id} onClick={() => setMode(id)} type="button">
            <span>{number}</span>{label}
          </button>
        ))}
      </nav>

      <div className="solid-content">
        {mode === "course" && renderCourse()}
        {mode === "quiz" && renderQuiz()}
        {mode === "exercises" && renderExercises()}
      </div>
    </div>
  );
}

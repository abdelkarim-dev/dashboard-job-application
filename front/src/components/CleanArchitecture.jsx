import React, { useEffect, useRef, useState } from "react";
import ace from "ace-builds/src-noconflict/ace.js";
import "ace-builds/src-noconflict/ext-language_tools.js";
import "ace-builds/src-noconflict/mode-java.js";
import "ace-builds/src-noconflict/snippets/java.js";
import "ace-builds/src-noconflict/theme-one_dark.js";

const STORAGE_KEY = "cleanArchLabProgressV1";

const LESSONS = [
  {
    id: "why-clean-arch",
    badge: "00",
    title: "Why Clean Architecture",
    duration: "8 min",
    summary: "Structure code so that business rules can be understood, tested, and changed without touching delivery infrastructure.",
    points: [
      "A codebase is hard to change when business logic is tangled with frameworks, databases, and HTTP handlers.",
      "Clean Architecture puts business rules at the center and pushes all infrastructure concerns to the outside.",
      "The goal: swap the database, replace the web framework, or add a new delivery channel with minimal disruption to domain code.",
    ],
    example: `// Wrong: business logic mixed into a Spring controller
@RestController
class OrderController {
    @Autowired JpaOrderRepository db;

    @PostMapping("/orders")
    Order create(@RequestBody OrderRequest req) {
        if (req.quantity < 1) throw new ResponseStatusException(400);
        Order o = new Order(req.product, req.quantity);
        return db.save(o); // JPA entity leaks into HTTP layer
    }
}`,
  },
  {
    id: "clean-architecture",
    badge: "CA",
    title: "The Dependency Rule",
    duration: "18 min",
    summary: "Keep business rules independent from delivery mechanisms, databases, and frameworks.",
    points: [
      "Dependencies point inward: frameworks → adapters → use cases → entities.",
      "Use cases define ports such as OrderRepository. Database adapters implement those ports.",
      "Cross boundaries with plain data structures. Keep HTTP, ORM, and framework types near the outer edge.",
    ],
    example: `interface OrderRepository {
    void save(Order order);
}

final class CreateOrder {
    private final OrderRepository orders;
    CreateOrder(OrderRepository orders) { this.orders = orders; }
}`,
  },
  {
    id: "ports-adapters",
    badge: "PA",
    title: "Hexagonal Architecture (Ports & Adapters)",
    duration: "14 min",
    summary: "Name boundaries explicitly as ports (interfaces owned by the domain) and adapters (implementations owned by infrastructure).",
    points: [
      "A driving port is an inbound API: the interface a REST controller or CLI invokes to call a use case.",
      "A driven port is an outbound API: the interface a use case calls to persist data or send a message.",
      "Adapters translate between the protocol of the outside world (HTTP, SQL, Kafka) and the language of the domain.",
    ],
    example: `// Driving port — the use case exposes this to callers
interface PlaceOrderUseCase {
    Order execute(String product, int qty);
}

// Driven port — the use case depends on this
interface OrderRepository {
    void save(Order order);
}

// Adapter — adapts HTTP to the driving port
@RestController
class OrderController {
    private final PlaceOrderUseCase useCase;
    @PostMapping("/orders")
    OrderDto create(@RequestBody Req req) {
        return toDto(useCase.execute(req.product, req.qty));
    }
}`,
  },
  {
    id: "use-cases",
    badge: "UC",
    title: "Use Cases & Application Services",
    duration: "12 min",
    summary: "A use case orchestrates domain objects to fulfill a single business intent — and nothing else.",
    points: [
      "A use case class has one public method. Its name is a verb-noun pair: CreateOrder, CancelSubscription.",
      "Use cases coordinate: they call domain objects and driven ports, but do not contain business rules themselves.",
      "Keep use cases thin and readable. Business rules live in entities; infrastructure lives in adapters.",
    ],
    example: `final class CreateOrder implements PlaceOrderUseCase {
    private final OrderRepository orders;
    private final EventPublisher events;

    public Order execute(String product, int qty) {
        Order order = Order.create(product, qty); // domain rule: validates
        orders.save(order);                        // driven port
        events.publish(new OrderCreated(order.id())); // driven port
        return order;
    }
}`,
  },
  {
    id: "boundaries",
    badge: "BN",
    title: "Crossing Boundaries Safely",
    duration: "10 min",
    summary: "Use plain data objects when crossing layer boundaries so the inner layer never depends on outer-layer types.",
    points: [
      "A use case that returns a JPA entity forces the caller to depend on the persistence layer — a classic violation.",
      "Define a request DTO (crossing inward) and a response DTO (crossing outward) for each use case.",
      "DTOs are bags of primitives; they carry no behavior and no dependencies on frameworks.",
    ],
    example: `// Plain request DTO — no Spring, no JPA
record CreateOrderRequest(String product, int quantity) {}
record CreateOrderResponse(String orderId, String status) {}

final class CreateOrder {
    CreateOrderResponse execute(CreateOrderRequest req) {
        Order order = Order.create(req.product(), req.quantity());
        orders.save(order);
        return new CreateOrderResponse(order.id(), "CREATED");
    }
}`,
  },
];

const QUIZ = [
  {
    id: "q-ca-1",
    principle: "CA",
    question: "Where should a Spring Data repository implementation sit in Clean Architecture?",
    options: [
      "In an outer adapter layer implementing an inward-facing port",
      "Inside the domain entity",
      "Inside every controller",
      "In the use case interface itself",
    ],
    answer: 0,
    explanation: "Database and framework code are outer details. The use case owns the repository port it needs.",
  },
  {
    id: "q-ca-2",
    principle: "CA",
    question: "Which dependency direction follows the dependency rule?",
    options: [
      "REST controller → use case → repository port",
      "Entity → REST controller → database",
      "Use case → Spring controller → JPA entity",
      "Repository port → REST response DTO",
    ],
    answer: 0,
    explanation: "Outer delivery code invokes inner application policy. Inner layers should not import HTTP, ORM, or framework concerns.",
  },
  {
    id: "q-ca-3",
    principle: "Ports",
    question: "In Hexagonal Architecture, a REST controller is best described as:",
    options: [
      "A driving adapter — it translates HTTP to a use case call",
      "A driven port — it represents the database",
      "A domain entity — it owns business rules",
      "A repository — it persists data",
    ],
    answer: 0,
    explanation: "Driving adapters sit on the left side: they receive external input (HTTP, CLI, events) and translate it into use case calls.",
  },
  {
    id: "q-ca-4",
    principle: "UC",
    question: "A CreateOrder use case checks if the product is in stock, saves the order, and sends a confirmation email all inside one method. What is the best critique?",
    options: [
      "The use case orchestrates correctly but should delegate each driven port to a separate dependency",
      "The use case should extend BaseUseCase",
      "All logic should move into the Order entity",
      "Email sending should be in the REST controller",
    ],
    answer: 0,
    explanation: "Orchestration is fine. The critique is design: InventoryPort, OrderRepository, and EmailSender should be separate constructor-injected driven ports — not collapsed into one.",
  },
  {
    id: "q-ca-5",
    principle: "Boundary",
    question: "A use case returns a JPA entity directly to the controller. What boundary rule does this violate?",
    options: [
      "Inner layers should not return outer-layer types through a boundary",
      "JPA entities must always be abstract",
      "Controllers should not depend on use cases",
      "The persistence adapter must use a NoSQL database",
    ],
    answer: 0,
    explanation: "Returning a JPA entity through the boundary couples the controller to the persistence layer — exactly what DTOs prevent.",
  },
  {
    id: "q-ca-6",
    principle: "Judgment",
    question: "You're adding a new notification channel (push notifications) to an existing email notification use case. What does Clean Architecture make easy?",
    options: [
      "Adding a new driven adapter without changing the use case or domain",
      "Changing the database schema",
      "Rewriting the REST controller",
      "Moving use case logic into the entity",
    ],
    answer: 0,
    explanation: "The use case depends on a NotificationPort. Adding push notifications means writing a new adapter — the use case stays untouched.",
  },
];

const EXERCISES = [
  {
    id: "clean-orders",
    principle: "CA",
    title: "Protect the order use case",
    difficulty: "Medium",
    time: "22 min",
    prompt: "Implement a clean boundary for creating an order. The use case depends on an OrderRepository port. An in-memory adapter implements the port without leaking storage details into the use case.",
    checks: ["Order rejects blank product names", "CreateOrder receives an OrderRepository port", "execute(product, quantity) saves and returns an Order", "InMemoryOrderRepository is an outer adapter"],
    starterCode: `import java.util.ArrayList;
import java.util.List;

final class Order {
    final String product;
    final int quantity;

    Order(String product, int quantity) {
        // TODO: reject blank product and quantity below 1.
        this.product = product;
        this.quantity = quantity;
    }
}

interface OrderRepository {
    void save(Order order);
}

final class CreateOrder {
    private final OrderRepository orders;

    CreateOrder(OrderRepository orders) {
        // TODO
        this.orders = null;
    }

    Order execute(String product, int quantity) {
        // TODO: create, save, and return the order.
        return null;
    }
}

final class InMemoryOrderRepository implements OrderRepository {
    final List<Order> saved = new ArrayList<>();

    public void save(Order order) {
        // TODO
    }
}

public class Solution {
}
`,
  },
  {
    id: "clean-event",
    principle: "UC",
    title: "Use case with event port",
    difficulty: "Medium",
    time: "20 min",
    prompt: "Implement a RegisterUser use case that saves a user, then publishes a UserRegistered event through a driven EventPublisher port. Neither the user entity nor the use case should depend on any delivery mechanism.",
    checks: ["User rejects blank email", "RegisterUser receives UserRepository and EventPublisher in its constructor", "register(email) saves and publishes an event", "InMemoryEventPublisher records published events"],
    starterCode: `import java.util.ArrayList;
import java.util.List;

final class User {
    final String email;

    User(String email) {
        // TODO: reject blank email (throw IllegalArgumentException).
        this.email = email;
    }
}

interface UserRepository {
    void save(User user);
}

interface EventPublisher {
    void publish(String event);
}

final class RegisterUser {
    private final UserRepository users;
    private final EventPublisher events;

    RegisterUser(UserRepository users, EventPublisher events) {
        // TODO
        this.users = null;
        this.events = null;
    }

    User register(String email) {
        // TODO: create user, save, publish "UserRegistered:<email>", return user.
        return null;
    }
}

final class InMemoryEventPublisher implements EventPublisher {
    final List<String> published = new ArrayList<>();

    public void publish(String event) {
        // TODO
    }
}

public class Solution {
}
`,
  },
  {
    id: "clean-boundary",
    principle: "BN",
    title: "Boundary DTOs",
    difficulty: "Easy",
    time: "15 min",
    prompt: "Complete the PlaceOrder use case so that it accepts a plain PlaceOrderRequest and returns a plain PlaceOrderResponse. The use case must not expose or accept the internal Order entity across the boundary.",
    checks: ["PlaceOrderRequest and PlaceOrderResponse are plain data carriers", "PlaceOrder.execute maps request to domain and response from domain", "InMemoryOrderRepo stores orders by id", "execute returns response with the saved order id"],
    starterCode: `import java.util.HashMap;
import java.util.Map;

// Plain boundary objects — no framework dependencies
record PlaceOrderRequest(String product, int quantity) {}
record PlaceOrderResponse(String orderId, String product) {}

// Domain entity
final class Order {
    final String id;
    final String product;
    final int quantity;

    Order(String product, int quantity) {
        if (product == null || product.isBlank()) throw new IllegalArgumentException("blank product");
        if (quantity < 1) throw new IllegalArgumentException("quantity below 1");
        this.id = "order-" + product.toLowerCase() + "-" + quantity;
        this.product = product;
        this.quantity = quantity;
    }
}

// Driven port
interface OrderRepo {
    void save(Order order);
    Order findById(String id);
}

// Use case
final class PlaceOrder {
    private final OrderRepo repo;

    PlaceOrder(OrderRepo repo) {
        this.repo = repo;
    }

    PlaceOrderResponse execute(PlaceOrderRequest req) {
        // TODO: create Order from req, save it, return PlaceOrderResponse with id and product.
        return null;
    }
}

final class InMemoryOrderRepo implements OrderRepo {
    final Map<String, Order> store = new HashMap<>();

    public void save(Order order) {
        // TODO
    }

    public Order findById(String id) {
        return store.get(id);
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

export default function CleanArchitecture() {
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
      name: "runCleanArchTests",
      bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" },
      exec: () => document.dispatchEvent(new CustomEvent("clean-arch:run")),
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
    document.addEventListener("clean-arch:run", handleRun);
    return () => document.removeEventListener("clean-arch:run", handleRun);
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
          <div className="solid-card-kicker">{exercise.principle} · {exercise.difficulty}</div>
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
      <header className="solid-header ca-header">
        <div>
          <p className="eyebrow">Java architecture gym</p>
          <h2>Clean Architecture</h2>
          <p>Learn the dependency rule, test your reasoning, then implement clean boundaries against locked Java checks.</p>
        </div>
        <span className="solid-java-chip ca-chip">JAVA 23</span>
      </header>

      <div className="solid-overview">
        <article><span>Course</span><strong>{progress.completedLessons.length}/{LESSONS.length}</strong><small>lessons complete</small></article>
        <article><span>Quiz</span><strong>{quizScore}/{QUIZ.length}</strong><small>{quizAnswered} answered</small></article>
        <article><span>Exercises</span><strong>{progress.solvedExercises.length}/{EXERCISES.length}</strong><small>Java kata solved</small></article>
        <article className="accent"><span>Mastery</span><strong>{totalCourseProgress}%</strong><small>across the full track</small></article>
      </div>

      <nav className="solid-mode-tabs" aria-label="Clean Architecture learning modes">
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

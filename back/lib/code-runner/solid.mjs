// SOLID Java exercise runner: per-exercise test harnesses and execution.
import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { runProcess } from "./process.mjs";

const SOLID_JAVA_TEST_BODIES = {
  "srp-invoice": `
    InvoiceCalculator calculator = new InvoiceCalculator();
    InvoiceFormatter formatter = new InvoiceFormatter();
    Solution solution = new Solution();
    check(calculator.total(new int[] { 20, 30 }, 10) == 55, "Calculator owns numeric totals", "Expected 55 for [20, 30] with 10% tax.");
    check(calculator.total(new int[] {}, 15) == 0, "Calculator handles empty invoices", "Expected an empty invoice total of 0.");
    check("Invoice for Ada: $42".equals(formatter.format("Ada", 42)), "Formatter owns receipt presentation", "Expected the exact receipt format.");
    check("Invoice for Lin: $120".equals(solution.receipt("Lin", new int[] { 40, 60 }, 20)), "Solution composes both responsibilities", "Expected orchestration to calculate and format the receipt.");
  `,
  "ocp-discounts": `
    Solution solution = new Solution();
    check(DiscountPolicy.class.isInterface(), "DiscountPolicy is an extension point", "Keep DiscountPolicy as an interface.");
    check(DiscountPolicy.class.isAssignableFrom(RegularDiscount.class), "RegularDiscount implements the policy", "RegularDiscount must implement DiscountPolicy.");
    check(DiscountPolicy.class.isAssignableFrom(VipDiscount.class), "VipDiscount implements the policy", "VipDiscount must implement DiscountPolicy.");
    check(solution.total(250, new RegularDiscount()) == 250, "Regular pricing stays unchanged", "Regular customers should pay the subtotal.");
    check(solution.total(250, new VipDiscount()) == 200, "VIP pricing extends checkout", "VIP customers should receive 20% off.");
    DiscountPolicy fixed = subtotal -> 7;
    check(solution.total(999, fixed) == 7, "Checkout delegates to any policy", "Delegate to the supplied policy instead of branching on known types.");
  `,
  "lsp-birds": `
    check(Bird.class.isInterface(), "Bird is a capability", "Keep Bird as an interface.");
    check(Bird.class.isAssignableFrom(FlyingBird.class), "FlyingBird refines Bird", "FlyingBird must extend Bird.");
    check(Bird.class.isAssignableFrom(Penguin.class), "Penguin remains substitutable for Bird", "Penguin must implement Bird.");
    check(!FlyingBird.class.isAssignableFrom(Penguin.class), "Penguin is not forced to fly", "Penguin must not implement FlyingBird.");
    check(FlyingBird.class.isAssignableFrom(Sparrow.class), "Sparrow exposes the flying capability", "Sparrow must implement FlyingBird.");
    check("swim".equals(new Penguin().move()), "Penguin has an honest movement", "Penguin.move() should return swim.");
    check("fly".equals(new Sparrow().move()) && "fly".equals(new Sparrow().fly()), "Sparrow honors both contracts", "Sparrow should move and fly with fly.");
  `,
  "isp-devices": `
    check(Printer.class.isInterface(), "Printer is a focused interface", "Keep Printer as an interface.");
    check(Scanner.class.isInterface(), "Scanner is a focused interface", "Keep Scanner as an interface.");
    check(Printer.class.isAssignableFrom(SimplePrinter.class), "SimplePrinter depends only on printing", "SimplePrinter must implement Printer.");
    check(!Scanner.class.isAssignableFrom(SimplePrinter.class), "SimplePrinter is not forced to scan", "Do not make SimplePrinter implement Scanner.");
    check(Printer.class.isAssignableFrom(OfficeMachine.class) && Scanner.class.isAssignableFrom(OfficeMachine.class), "OfficeMachine combines capabilities", "OfficeMachine should implement Printer and Scanner.");
    check("Printed: roadmap".equals(new SimplePrinter().print("roadmap")), "SimplePrinter fulfills its small contract", "Expected Printed: roadmap.");
    OfficeMachine machine = new OfficeMachine();
    check("Printed: report".equals(machine.print("report")) && "Scanned document".equals(machine.scan()), "OfficeMachine fulfills both contracts", "Implement print and scan behavior.");
  `,
  "dip-messages": `
    final String[] captured = new String[] { "" };
    MessageSender sender = message -> captured[0] = message;
    NotificationService service = new NotificationService(sender);
    service.welcome("Ada");
    check(MessageSender.class.isInterface(), "Delivery is represented by a port", "MessageSender must stay an interface.");
    boolean hasPortConstructor = java.util.Arrays.stream(NotificationService.class.getDeclaredConstructors())
      .anyMatch(constructor -> java.util.Arrays.equals(constructor.getParameterTypes(), new Class<?>[] { MessageSender.class }));
    check(hasPortConstructor, "NotificationService receives the port", "Inject MessageSender through the constructor.");
    check("Welcome, Ada!".equals(captured[0]), "Welcome delegates through the abstraction", "Expected Welcome, Ada! to be sent through MessageSender.");
  `,
  "clean-orders": `
    boolean rejectedBlank = false;
    boolean rejectedQuantity = false;
    try { new Order("  ", 1); } catch (IllegalArgumentException error) { rejectedBlank = true; }
    try { new Order("book", 0); } catch (IllegalArgumentException error) { rejectedQuantity = true; }
    check(rejectedBlank && rejectedQuantity, "Entity protects its invariants", "Reject blank products and quantities below 1.");
    check(OrderRepository.class.isInterface(), "Use case boundary is a port", "Keep OrderRepository as an interface.");
    check(OrderRepository.class.isAssignableFrom(InMemoryOrderRepository.class), "Storage detail is an adapter", "InMemoryOrderRepository must implement the port.");
    InMemoryOrderRepository repository = new InMemoryOrderRepository();
    CreateOrder createOrder = new CreateOrder(repository);
    Order order = createOrder.execute("keyboard", 2);
    check(order != null && "keyboard".equals(order.product) && order.quantity == 2, "Use case returns the domain entity", "Create and return the requested order.");
    check(repository.saved.size() == 1 && repository.saved.get(0) == order, "Use case persists through the port", "Save the order through OrderRepository.");
  `,
  "clean-event": `
    boolean rejectedBlankEmail = false;
    try { new User("  "); } catch (IllegalArgumentException error) { rejectedBlankEmail = true; }
    check(rejectedBlankEmail, "User rejects blank email", "Throw IllegalArgumentException for blank email.");
    check(UserRepository.class.isInterface(), "UserRepository is a port", "Define UserRepository as an interface.");
    check(EventPublisher.class.isInterface(), "EventPublisher is a port", "Define EventPublisher as an interface.");
    final java.util.List<String> savedUsers = new java.util.ArrayList<>();
    UserRepository repo = user -> savedUsers.add(user.email);
    InMemoryEventPublisher events = new InMemoryEventPublisher();
    RegisterUser registerUser = new RegisterUser(repo, events);
    User user = registerUser.register("ada@example.com");
    check(user != null && "ada@example.com".equals(user.email), "register returns the created user", "Return the created User from register().");
    check(savedUsers.contains("ada@example.com"), "register saves the user through the port", "Call repo.save(user) during registration.");
    check(!events.published.isEmpty() && events.published.get(0).contains("ada@example.com"), "register publishes an event through the port", "Call events.publish(\\\"UserRegistered:ada@example.com\\\") or similar.");
  `,
  "clean-boundary": `
    check(PlaceOrderRequest.class.isRecord(), "PlaceOrderRequest is a plain record", "Define PlaceOrderRequest as a Java record.");
    check(PlaceOrderResponse.class.isRecord(), "PlaceOrderResponse is a plain record", "Define PlaceOrderResponse as a Java record.");
    InMemoryOrderRepo repo = new InMemoryOrderRepo();
    PlaceOrder useCase = new PlaceOrder(repo);
    PlaceOrderResponse response = useCase.execute(new PlaceOrderRequest("widget", 3));
    check(response != null, "execute returns a PlaceOrderResponse", "Return a PlaceOrderResponse from execute().");
    check(response != null && "widget".equals(response.product()), "Response carries the product name", "Include the product in PlaceOrderResponse.");
    check(response != null && response.orderId() != null && !response.orderId().isBlank(), "Response carries a non-blank order id", "Include a non-blank orderId in PlaceOrderResponse.");
    check(!repo.store.isEmpty(), "execute saves the order through the repo", "Call repo.save(order) from execute().");
  `,
};

function buildSolidJavaHarness(exerciseId) {
  const body = SOLID_JAVA_TEST_BODIES[exerciseId];
  if (!body) return "";
  return `import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class TestRunner {
    private static int passed = 0;
    private static int total = 0;

    private static String encode(String value) {
        String safe = value == null ? "" : value;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(safe.getBytes(StandardCharsets.UTF_8));
    }

    private static void check(boolean condition, String name, String message) {
        total += 1;
        if (condition) passed += 1;
        System.out.println("__SOLID_TEST__|" + (condition ? "PASS" : "FAIL") + "|" + encode(name) + "|" + encode(condition ? "" : message));
    }

    public static void main(String[] args) {
        try {
            run();
        } catch (Throwable error) {
            check(false, "Unexpected exception", error.getClass().getSimpleName() + ": " + error.getMessage());
        }
        System.out.println("__SOLID_RESULT__|" + passed + "|" + total);
    }

    private static void run() throws Exception {
${body}
    }
}
`;
}

function parseSolidJavaRunner(stdout = "") {
  const decode = (value = "") => {
    try {
      return Buffer.from(value, "base64url").toString("utf8");
    } catch {
      return value;
    }
  };
  const results = [];
  let passed = 0;
  let total = 0;
  for (const line of String(stdout).split(/\r?\n/)) {
    if (line.startsWith("__SOLID_TEST__|")) {
      const [, status, name, message] = line.split("|");
      results.push({ passed: status === "PASS", name: decode(name), message: decode(message) });
    }
    if (line.startsWith("__SOLID_RESULT__|")) {
      const [, passedValue, totalValue] = line.split("|");
      passed = Number(passedValue) || 0;
      total = Number(totalValue) || 0;
    }
  }
  return { passed, total, results };
}

function stripSolidJavaRunnerPayload(stdout = "") {
  return String(stdout)
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("__SOLID_TEST__|") && !line.startsWith("__SOLID_RESULT__|"))
    .join("\n")
    .trim();
}

async function runSolidJavaExercise(exerciseId, codeInput = "", options = {}) {
  const harness = buildSolidJavaHarness(exerciseId);
  const code = String(codeInput || "");
  const timeoutMs = Math.max(500, Number(options.timeoutMs) || 4000);
  if (!harness) return { ok: false, error: "Unknown SOLID Java exercise.", passed: 0, total: 0, results: [] };
  if (!code.trim()) return { ok: false, error: "No Java code to compile.", passed: 0, total: 0, results: [] };

  const tempDir = await mkdtemp(path.join(tmpdir(), "job-hunt-solid-java-"));
  await writeFile(path.join(tempDir, "Solution.java"), code, "utf8");
  await writeFile(path.join(tempDir, "TestRunner.java"), harness, "utf8");

  try {
    const compiled = await runProcess("javac", ["Solution.java", "TestRunner.java"], { cwd: tempDir, timeoutMs });
    if (compiled.timedOut) {
      return { ok: false, error: "Java compilation timed out.", passed: 0, total: 0, results: [] };
    }
    if (compiled.code !== 0) {
      return {
        ok: false,
        error: `Java compilation failed.\n${compiled.stderr || compiled.stdout}`.trim(),
        passed: 0,
        total: 0,
        results: [],
      };
    }

    const executed = await runProcess("java", ["-cp", tempDir, "TestRunner"], { cwd: tempDir, timeoutMs });
    if (executed.timedOut) {
      return { ok: false, error: "Java tests timed out.", passed: 0, total: 0, results: [] };
    }
    const parsed = parseSolidJavaRunner(executed.stdout);
    if (!parsed.total) {
      return {
        ok: false,
        error: executed.stderr || "The Java runner did not return a result.",
        passed: 0,
        total: 0,
        results: [],
      };
    }
    return {
      ok: executed.code === 0,
      error: executed.code === 0 ? "" : (executed.stderr || "Java execution failed."),
      ...parsed,
      stdout: stripSolidJavaRunnerPayload(executed.stdout),
      stderr: executed.stderr,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export {
  SOLID_JAVA_TEST_BODIES,
  buildSolidJavaHarness,
  parseSolidJavaRunner,
  stripSolidJavaRunnerPayload,
  runSolidJavaExercise,
};

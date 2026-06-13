const skillCatalog = [
  "Python",
  "TypeScript",
  "JavaScript",
  "Go",
  "Java",
  "Kotlin",
  "Scala",
  "Ruby",
  "Rails",
  "React",
  "Vue",
  "Angular",
  "Node",
  "Next.js",
  "GraphQL",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "Kafka",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "Azure",
  "Terraform",
  "CI/CD",
  "Bazel",
  "Buildkite",
  "GitHub Actions",
  "Jenkins",
  "Linux",
];

let localProfile = null;
// CV selection: "backend" (resumeText) or "architect" (resumeText2). Gemma auto-selects;
// user can override via the CV toggle button in the floating toolbar.
let selectedCv = "auto"; // "auto" | "backend" | "architect"
let lastFocusedInput = null;
let currentFocusedElement = null;
let inlineTrigger = null;
let inlineDropdown = null;
let isJobPageCache = null;
let lastCachedUrl = "";
let submitTrackerLastDetectedAt = 0;
let submitTrackerLastTrackedAt = 0;
let submitTrackingUserEnabled = false;
// URLs tracked this page session — prevents repeat "application saved" toasts when
// a multi-step ATS form fires multiple submit-like events for the same application.
const trackedAppUrls = new Set();
let dragFloatingActionsState = null;
// Set once the user drags the overlay card by its header; while set, the card
// keeps that position instead of auto-docking to the toolbar. Double-click the
// header to re-dock.
let widgetManualPosition = null;
// ATS providers (Greenhouse, Lever, Ashby embeds…) often render the application
// form inside a cross-origin iframe. The content script runs in every frame
// ("all_frames" in the manifest), but only the top frame owns visible UI
// (toolbar, panel, toasts); subframes fill silently and relay messages up.
const IS_TOP_FRAME = (() => {
  try {
    return window.self === window.top;
  } catch {
    return false;
  }
})();
// Last time this subframe ran an autofill pass — guards against double fills
// when both a direct popup message and the top-frame broadcast arrive.
let lastFrameAutofillAt = 0;
let autofillRunInProgress = false;
let autofillRunStartedAt = 0;
let currentAutofillRunId = "";
let frameAutofillResults = [];
let lastAutofillAuditLog = [];
let lastAutofillSkippedAlreadyFilledCount = 0;
// Auto-open flow: when the toolbar is opened (extension icon), Claire checks
// "Applied?" and then auto-fills if this job isn't already tracked. Set by
// injectWebCopilot; invoked from the TOGGLE_TOOLBAR handler. Guarded per-URL so
// reopening the same page doesn't re-fill.
let runCopilotAutoOpen = null;
let copilotAutoRanForUrl = "";

// ── API Proxy helper ───────────────────────────────────────────
// Content scripts inherit the web page's origin for network requests.
// On HTTPS pages (Greenhouse, Lever, Workday, etc.), direct fetch()
// to http://127.0.0.1 is blocked by mixed-content security policy.
// This helper routes all API calls through the background service worker.
// Full variant: resolves { data, status } so callers can distinguish a freshly
// created record (HTTP 201) from an update to an existing one (HTTP 200).
function apiRequest(url, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "API_PROXY", url, method, body },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response || !response.ok) {
          reject(new Error(response?.error || "API proxy request failed"));
          return;
        }
        resolve({ data: response.data, status: response.status });
      }
    );
  });
}

// Convenience wrapper for the common case where only the response body matters.
async function apiProxy(url, method = "GET", body = null) {
  const { data } = await apiRequest(url, method, body);
  return data;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "EXTRACT_JOB") {
    // Only the top document answers — the popup wants the job posting, not an
    // embedded ATS iframe's form chrome.
    if (!IS_TOP_FRAME) return false;
    sendResponse(extractJob());
    return false;
  }
  if (message?.type === "AUTOFILL_FORM") {
    if (IS_TOP_FRAME) {
      ensureCopilotPanel(message.profile);
      enableSubmitTrackingFromUser("autofill requested", { broadcast: true, silent: true });
      expandWidget();
      autofillWebForm(message.profile, { useAi: true });
    } else {
      enableSubmitTrackingFromUser("autofill requested", { silent: true });
      runFrameAutofill(message.profile, { useAi: true, runId: message.runId || "" });
    }
    return false;
  }
  // Relay from the top frame (via background): fill embedded ATS iframes that
  // the top document cannot script directly.
  if (message?.type === "AUTOFILL_FRAME") {
    if (!IS_TOP_FRAME) {
      if (message.cv) selectedCv = message.cv;
      enableSubmitTrackingFromUser("autofill requested", { silent: true });
      runFrameAutofill(message.profile, { useAi: Boolean(message.useAi), runId: message.runId || "" });
    }
    return false;
  }
  if (message?.type === "AUTOFILL_FRAME_RESULT") {
    if (IS_TOP_FRAME && message.result) {
      if (message.result.runId && currentAutofillRunId && message.result.runId !== currentAutofillRunId) return false;
      frameAutofillResults.push(message.result);
      renderAutofillAudit(lastAutofillAuditLog, { skippedAlreadyFilledCount: lastAutofillSkippedAlreadyFilledCount });
    }
    return false;
  }
  if (message?.type === "ENABLE_SUBMIT_TRACKING") {
    enableSubmitTrackingFromUser(message.reason || "toolbar opened", { silent: true });
    return false;
  }
  // Toolbar "Ask Gemma" field-pick mode, relayed to every frame because the
  // target field may live inside an embedded ATS iframe.
  if (message?.type === "ASK_MODE") {
    if (message.action === "enter") enterAskPickMode(message.instruction || "");
    else exitAskPickMode();
    return false;
  }
  // Result of an Ask Gemma run inside an iframe — the top frame owns the panel.
  if (message?.type === "ASK_RESULT") {
    if (IS_TOP_FRAME && message.result) renderAskResult(message.result);
    return false;
  }
  // Toast relayed up from a subframe — only the top frame renders toasts.
  if (message?.type === "SHOW_TOAST") {
    if (IS_TOP_FRAME && message.text) showToast(message.text);
    return false;
  }
  // Received from background.js when an application was just saved via the
  // extension "+" form. Relay to the dashboard React app via window.postMessage
  // so the drawer opens for the newly-created application.
  if (message?.type === "OPEN_APP_DRAWER") {
    if (!IS_TOP_FRAME) return false;
    window.postMessage({ type: "JH_OPEN_DRAWER", appId: message.appId }, "*");
    sendResponse({ ok: true });
    return false;
  }
  if (message?.type === "TOGGLE_TOOLBAR") {
    if (!IS_TOP_FRAME) return false;
    const actionsBar = document.getElementById("jh-floating-actions");
    const widget = document.getElementById("jh-copilot-widget");
    if (actionsBar && widget) {
      const isHidden = actionsBar.style.display === "none";
      if (isHidden) {
        actionsBar.style.display = "flex";
        widget.style.display = "flex";
        widget.classList.add("minimized");
        enableSubmitTrackingFromUser("toolbar opened", { broadcast: true, silent: true });
        positionWidgetRelativeToToolbar();
        runCopilotAutoOpen?.(); // Applied? → auto-Fill
      } else {
        actionsBar.style.display = "none";
        widget.style.display = "none";
      }
    } else {
      // Explicit user intent (icon/popup click) always wins — never refuse the
      // toolbar just because the page heuristics didn't recognise a job posting.
      ensureProfileLoaded().then((ok) => {
        if (!ok) {
          showToast("Claire can't reach the cockpit server (127.0.0.1:8787). Start it, then retry.");
          return;
        }
        ensureCopilotPanel(localProfile);
        const newActions = document.getElementById("jh-floating-actions");
        const newWidget = document.getElementById("jh-copilot-widget");
        if (newActions && newWidget) {
          newActions.style.display = "flex";
          newWidget.style.display = "flex";
          newWidget.classList.add("minimized");
          enableSubmitTrackingFromUser("toolbar opened", { broadcast: true, silent: true });
          positionWidgetRelativeToToolbar();
          runCopilotAutoOpen?.(); // Applied? → auto-Fill
        }
        if (!looksLikeJobPosting()) {
          showToast("This page doesn't look like a job posting — toolbar enabled anyway.");
        }
      });
    }
    sendResponse({ ok: true });
    return false;
  }
  return false;
});

// Heuristically flag the page as a job posting so the toolbar icon can light up
// before the user even opens the popup.
(function signalIfJobPage() {
  try {
    // Subframes count too: ATS embeds (Greenhouse/Lever/Ashby) put the actual
    // application form in an iframe while the host page is a plain career site.
    if (looksLikeJobPosting() || (!IS_TOP_FRAME && looksLikeApplicationForm())) {
      chrome.runtime
        .sendMessage({ type: "JOB_PAGE_DETECTED", url: locationHref() })
        .catch(() => {});
    }
    // Badge-only detection. Submit tracking stays off until the user explicitly
    // opens Claire or starts autofill/manual tracking.
  } catch {
    // background not ready yet — silent
  }
})();

// Reset job-page caches on SPA navigations so looksLikeJobPosting() re-evaluates
// correctly after the URL changes. Nothing is injected automatically — the toolbar
// only appears when the user clicks the extension icon.
(function initCopilot() {
  let lastObservedUrl = locationHref();
  let formScanTick = 0;
  setInterval(() => {
    const currentUrl = locationHref();
    if (currentUrl !== lastObservedUrl) {
      lastObservedUrl = currentUrl;
      isJobPageCache = null;
      lastCachedUrl = "";
    }
    // SPA ATS flows render the form well after document_idle — keep watching
    // (cheap check, and only until the tracker is attached).
    formScanTick += 1;
    if (submitTrackingUserEnabled && !submitTrackerAttached && formScanTick % 2 === 0 && looksLikeApplicationForm()) {
      attachFormSubmitTracker("application form appeared", { silent: true });
    }
  }, 2000);
})();

/**
 * Stricter check: does this page have an actual application FORM
 * (with name/email/phone type fields) vs just a job description page?
 */
function looksLikeApplicationForm() {
  try {
    const inputs = Array.from(document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select'
    )).filter((el) => !isInCopilotUi(el));
    if (inputs.length < 2) return false;

    // Check if there are identity-type fields (name, email, phone)
    let identityFieldCount = 0;
    inputs.forEach((el) => {
      const label = getLabelText(el).toLowerCase();
      const name = (el.name || "").toLowerCase();
      const id = (el.id || "").toLowerCase();
      const placeholder = (el.placeholder || "").toLowerCase();
      const combined = `${label} ${name} ${id} ${placeholder}`;

      if (/(?:first|last|full|given|family)?[_\-\s]*name|^name$|email|phone|tel|mobile|linkedin/i.test(combined)) {
        identityFieldCount++;
      }
    });

    return identityFieldCount >= 2;
  } catch {
    return false;
  }
}

/**
 * Attach a submit listener on all forms and on common submit buttons
 * to auto-track the job application to the cockpit when the user submits.
 */
let submitTrackerAttached = false;
const COPILOT_UI_SELECTOR = "#jh-copilot-widget, #jh-floating-actions, #jh-inline-dropdown, #jh-inline-trigger, #jh-copilot-toast";

function isInCopilotUi(node) {
  return Boolean(node?.closest?.(COPILOT_UI_SELECTOR));
}

function enableSubmitTrackingFromUser(reason = "toolbar opened", { broadcast = false, silent = true } = {}) {
  submitTrackingUserEnabled = true;
  if (broadcast && IS_TOP_FRAME) {
    try {
      chrome.runtime
        .sendMessage({ type: "JH_BROADCAST_SUBMIT_TRACKING_ENABLED", reason })
        .catch(() => {});
    } catch {
      // Background may be unavailable on restricted pages; top-frame tracking still works.
    }
  }
  if (looksLikeApplicationForm()) {
    attachFormSubmitTracker(reason, { silent });
  } else {
    updateSubmitListenerStatus(`${reason}; waiting for application form`);
  }
}

function attachFormSubmitTracker(reason = "manual", { silent = false } = {}) {
  if (!submitTrackingUserEnabled) {
    updateSubmitListenerStatus("submit tracking waits until you open Claire");
    return false;
  }
  const wasAttached = submitTrackerAttached;
  if (!submitTrackerAttached) {
    submitTrackerAttached = true;

    // Listen for form submit events (bubbles up from any form on the page)
    document.addEventListener("submit", handleApplicationSubmit, { capture: true });

    // Many ATS flows submit via JS buttons rather than native form submit.
    document.addEventListener("click", handlePossibleSubmitClick, { capture: true });
    document.addEventListener("pointerup", handlePossibleSubmitClick, { capture: true });
    document.addEventListener("keydown", handlePossibleSubmitKeydown, { capture: true });
  }

  updateSubmitListenerStatus(reason);
  updatePrefillButtonState();
  if (!wasAttached && !silent) {
    showToast("Submit listener attached. Claire will track the final submit.");
  }
  return true;
}

async function handleApplicationSubmit(e) {
  if (isInCopilotUi(e.target)) return;
  // Don't prevent the actual submit — just piggyback and track
  scheduleTrackJobApplication("native form submit", 0);
}

function handlePossibleSubmitKeydown(e) {
  if (e.key !== "Enter") return;
  const target = e.target;
  if (isInCopilotUi(target)) return;
  if (!target || target.tagName === "TEXTAREA") return;
  const form = target.closest?.("form");
  if (form) {
    scheduleTrackJobApplication("enter key in form", 0);
  }
}

function handlePossibleSubmitClick(e) {
  const target = e.target;
  if (isInCopilotUi(target)) return;
  const control = target?.closest?.(
    'button, input[type="submit"], input[type="button"], a, [role="button"], [data-automation-id], [data-testid]'
  );
  if (!control || !isSubmitLikeControl(control)) return;
  scheduleTrackJobApplication("submit button click", 0);
}

function isSubmitLikeControl(control) {
  if (isInCopilotUi(control)) return false;
  const text = [
    control.textContent,
    control.value,
    control.getAttribute("aria-label"),
    control.getAttribute("title"),
    control.getAttribute("name"),
    control.getAttribute("id"),
    control.getAttribute("class"),
    control.getAttribute("data-automation-id"),
    control.getAttribute("data-testid"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return false;
  if (/\b(submit|submit application|send application|complete application|finish application)\b/i.test(text)) return true;
  if (/\b(apply now|apply for this job|apply)\b/i.test(text)) {
    return Boolean(control.closest("form")) && looksLikeApplicationForm();
  }
  return false;
}

function scheduleTrackJobApplication(trigger, delayMs) {
  if (!submitTrackingUserEnabled) {
    updateSubmitListenerStatus(`ignored ${trigger}; Claire not opened`);
    return;
  }
  const now = Date.now();
  submitTrackerLastDetectedAt = now;
  updateSubmitListenerStatus(`detected ${trigger}`);
  if (now - submitTrackerLastTrackedAt < 3500) return;
  submitTrackerLastTrackedAt = now;
  const run = () => trackJobApplication(trigger);
  if (delayMs > 0) {
    setTimeout(run, delayMs);
  } else {
    run();
  }
}

function updateSubmitListenerStatus(reason = "") {
  const statusEl = document.getElementById("jh-submit-listener-status");
  const detailEl = document.getElementById("jh-submit-listener-detail");
  const dotEl = document.getElementById("jh-submit-listener-dot");
  const counts = getSubmitListenerCounts();

  if (dotEl) {
    dotEl.classList.toggle("active", submitTrackerAttached);
  }
  if (statusEl) {
    statusEl.textContent = submitTrackerAttached ? "Submit listener attached" : "Submit listener off";
  }
  if (detailEl) {
    const pieces = [
      `${counts.forms} form${counts.forms === 1 ? "" : "s"}`,
      `${counts.buttons} submit button${counts.buttons === 1 ? "" : "s"}`,
    ];
    if (reason) pieces.push(reason);
    detailEl.textContent = pieces.join(" • ");
  }
}

function getSubmitListenerCounts() {
  const forms = Array.from(document.querySelectorAll("form")).filter((form) => !isInCopilotUi(form)).length;
  const controls = Array.from(
    document.querySelectorAll('button, input[type="submit"], input[type="button"], a, [role="button"], [data-automation-id], [data-testid]')
  ).filter((control) => !isInCopilotUi(control));
  const buttons = controls.filter(isSubmitLikeControl).length;
  return { forms, buttons };
}

function showCopilotPanel(panelName) {
  ensureCopilotPanel(localProfile);
  const widget = document.getElementById("jh-copilot-widget");
  if (widget) {
    widget.style.display = "flex";
    widget.classList.remove("minimized");
  }

  const panels = {
    eval: document.getElementById("jh-eval-panel"),
    autofill: document.getElementById("jh-autofill-panel"),
    track: document.getElementById("jh-track-panel"),
    company: document.getElementById("jh-company-panel"),
    today: document.getElementById("jh-today-panel"),
    ask: document.getElementById("jh-ask-panel"),
  };
  Object.entries(panels).forEach(([name, panel]) => {
    if (panel) panel.hidden = name !== panelName;
  });
  positionWidgetRelativeToToolbar();
}

function updateWorkflowSteps(scope, steps) {
  const summary = document.getElementById(`jh-${scope}-workflow-summary`);
  const list = document.getElementById(`jh-${scope}-workflow-list`);
  if (!summary || !list) return;

  const activeStep = steps.find((step) => step.status === "active");
  const latestDone = [...steps].reverse().find((step) => step.status === "done");
  const errorStep = steps.find((step) => step.status === "error");
  summary.textContent = errorStep?.label || activeStep?.label || latestDone?.label || "Ready";

  list.replaceChildren();
  steps.forEach((step) => {
    const item = document.createElement("li");
    item.className = `jh-workflow-step ${step.status || "pending"}`;

    const dot = document.createElement("span");
    dot.className = "jh-workflow-dot";
    dot.textContent = step.status === "done" ? "✓" : step.status === "error" ? "!" : step.status === "active" ? "•" : "";

    const text = document.createElement("span");
    text.className = "jh-workflow-text";
    const label = document.createElement("strong");
    label.textContent = step.label;
    text.appendChild(label);
    if (step.detail) {
      const detail = document.createElement("small");
      detail.textContent = step.detail;
      text.appendChild(detail);
    }

    item.appendChild(dot);
    item.appendChild(text);
    list.appendChild(item);
  });
}

function summarizePayloadForPreview(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.length <= 500) return value;
    return `${value.slice(0, 500)}… [${value.length} chars total]`;
  }
  if (typeof value !== "object") return value;
  if (depth >= 3) return Array.isArray(value) ? `[${value.length} items]` : "[object]";
  if (Array.isArray(value)) {
    const preview = value.slice(0, 20).map((item) => summarizePayloadForPreview(item, depth + 1));
    if (value.length > 20) preview.push(`… ${value.length - 20} more item${value.length - 20 === 1 ? "" : "s"}`);
    return preview;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, summarizePayloadForPreview(item, depth + 1)])
  );
}

function renderTrackedPayload(
  payload,
  { panel = "autofill", trigger = "submit", sentAt = "", endpoint = "POST /api/applications", status = "" } = {}
) {
  const card = document.getElementById(`jh-${panel}-payload-card`);
  const meta = document.getElementById(`jh-${panel}-payload-meta`);
  const pre = document.getElementById(`jh-${panel}-payload-json`);
  const copyBtn = document.getElementById(`jh-${panel}-payload-copy`);
  if (!card || !pre) return;

  const fullJson = JSON.stringify(payload || {}, null, 2);
  pre.textContent = JSON.stringify(summarizePayloadForPreview(payload || {}), null, 2);
  if (meta) {
    const when = sentAt ? new Date(sentAt) : new Date();
    const time = Number.isNaN(when.getTime())
      ? new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })
      : when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
    meta.textContent = `${time} • ${trigger} • ${endpoint}${status ? ` • HTTP ${status}` : ""}`;
  }
  if (copyBtn) {
    copyBtn.dataset.fullJson = fullJson;
    copyBtn.disabled = false;
    copyBtn.textContent = "Copy JSON";
  }
  card.hidden = false;
}

function bindPayloadCopyButton(buttonId) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  button.addEventListener("click", async () => {
    const fullJson = button.dataset.fullJson || "";
    if (!fullJson) return;
    try {
      await copyTextToClipboard(fullJson);
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = "Copy JSON";
      }, 1400);
    } catch {
      showToast("Could not copy JSON from this page.");
    }
  });
}

async function copyTextToClipboard(text) {
  const value = String(text || "");
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const ok = document.execCommand("copy");
    textarea.remove();
    if (!ok) throw new Error("copy failed");
    return true;
  }
}

function loadLastTrackedPayloadPreview() {
  if (!IS_TOP_FRAME) return;
  try {
    chrome.runtime.sendMessage({ type: "GET_LAST_TRACKED_PAYLOAD" }, (response) => {
      if (chrome.runtime.lastError || !response?.record?.payload) return;
      const record = response.record;
      const sentTime = Date.parse(record.sentAt || "");
      if (!Number.isFinite(sentTime) || Date.now() - sentTime > 30 * 60 * 1000) return;
      renderTrackedPayload(record.payload, {
        panel: "autofill",
        trigger: record.trigger || "last submit",
        sentAt: record.sentAt,
        endpoint: `${record.method || "POST"} /api/applications`,
        status: record.status || "",
      });
    });
  } catch {
    // Background unavailable on this page; live submit tracking still renders its own payload.
  }
}

function setEvaluationLoadingText(text) {
  const el = document.getElementById("jh-eval-loading-text");
  if (el) el.textContent = text;
}

function hasUserFilledForm() {
  try {
    const mapped = findInputs();
    const nameFields = [...(mapped.firstName || []), ...(mapped.lastName || []), ...(mapped.fullName || [])];
    const emailFields = mapped.email || [];
    
    // If the page doesn't even have standard name or email inputs, let it track
    if (nameFields.length === 0 && emailFields.length === 0) return true;
    
    const hasName = nameFields.some(el => el.value && el.value.trim().length > 2);
    const hasEmail = emailFields.some(el => el.value && el.value.trim().includes("@"));
    
    return hasName && hasEmail;
  } catch (e) {
    return true;
  }
}

async function trackJobApplication(trigger = "submit") {
  try {
    // Guard: only show the panel + track when the form looks filled, unless manually triggered.
    // This prevents accidental button clicks (e.g. "Apply" on a listing page) from
    // forcibly re-opening the widget after the user closed it.
    if (trigger !== "manual button" && !hasUserFilledForm()) {
      updateSubmitListenerStatus(`ignored unfilled click (${trigger})`);
      return;
    }

    showCopilotPanel("autofill");
    updateWorkflowSteps("autofill", [
      { status: "done", label: `Submit detected`, detail: trigger },
      { status: "active", label: "Checking visible form values" },
      { status: "pending", label: "Saving to dashboard" },
      { status: "pending", label: "Evaluating role with Gemma" },
    ]);

    const jobData = extractJob();
    // Set today's date as the applied date (local timezone to match dashboard's todayString)
    const now = new Date();
    const appliedAt = now.toISOString();
    jobData.dateApplied = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    jobData.appliedAt = appliedAt;
    jobData.stageDateTimes = { ...(jobData.stageDateTimes || {}), Applied: appliedAt };
    jobData.status = "Applied";
    renderTrackedPayload(jobData, { panel: "autofill", trigger });

    updateWorkflowSteps("autofill", [
      { status: "done", label: `Submit detected`, detail: trigger },
      { status: "done", label: "Cleaned page text", detail: `${jobData.pageText.length} chars sent to Gemma, no raw HTML/forms.` },
      { status: "active", label: "Saving to dashboard", detail: "Background worker will finish even if the ATS navigates." },
      { status: "pending", label: "Evaluating role with Gemma" },
    ]);

    const result = await trackApplicationViaBackground(jobData, { trigger, runEvaluation: true });
    const status = result.status;
    renderTrackedPayload(jobData, { panel: "autofill", trigger, status });

    if (result.ok) {
      updateWorkflowSteps("autofill", [
        { status: "done", label: `Submit detected`, detail: trigger },
        { status: "done", label: "Cleaned page text", detail: `${jobData.pageText.length} chars sent to Gemma, no raw HTML/forms.` },
        { status: "done", label: status === 200 ? "Updated dashboard card" : "Added dashboard card" },
        result.evaluationSaved
          ? { status: "done", label: "Stored Gemma evaluation", detail: `${result.evaluation?.decision || "Decision"} · ${result.evaluation?.score ?? 0}/100` }
          : result.evaluationQueued
            ? { status: "done", label: "Queued Gemma evaluation", detail: "Dashboard card saved; evaluation will attach when Gemma returns." }
          : { status: result.evaluationError ? "error" : "pending", label: "Gemma evaluation", detail: result.evaluationError || "Not returned by local Gemma." },
      ]);

      // Show toast only once per URL per page session to prevent spam on multi-step
      // forms where each "Next" click looks like a submit and triggers a 200 update.
      const alreadyToasted = jobData.sourceUrl && trackedAppUrls.has(jobData.sourceUrl);
      if (!alreadyToasted) {
        if (jobData.sourceUrl) trackedAppUrls.add(jobData.sourceUrl);
        showToast(status === 200
          ? "↻ Updated this application in Claire."
          : "✅ Application tracked in Claire!");
      }
      updateSubmitListenerStatus(`tracked via ${trigger}`);
    } else {
      throw new Error(result.error || "Background tracker failed.");
    }
  } catch (err) {
    console.warn("Auto-track failed:", err);
    showToast("Submit detected, but tracking failed. Check local app server.");
    updateSubmitListenerStatus(`tracking failed via ${trigger}`);
    updateWorkflowSteps("autofill", [
      { status: "done", label: `Submit detected`, detail: trigger },
      { status: "error", label: "Tracking failed", detail: err.message || "Check local app server." },
      { status: "pending", label: "Saving to dashboard" },
      { status: "pending", label: "Evaluating role with Gemma" },
    ]);
  }
}

async function manualTrackJobApplication() {
  submitTrackerLastTrackedAt = Date.now();
  await trackJobApplication("manual button");
}

function trackApplicationViaBackground(jobData, { trigger = "submit", runEvaluation = true } = {}) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: "TRACK_APPLICATION", jobData, trigger, runEvaluation },
        async (response) => {
          if (chrome.runtime.lastError || !response) {
            try {
              const { data, status } = await apiRequest("http://127.0.0.1:8787/api/applications", "POST", jobData);
              chrome.runtime.sendMessage({ type: "TRACKER_UPDATED" }).catch(() => {});
              resolve({ ok: true, status, app: data, evaluationSaved: false, evaluationError: chrome.runtime.lastError?.message || "" });
            } catch (err) {
              resolve({ ok: false, error: err.message || "Network error" });
            }
            return;
          }
          resolve(response);
        }
      );
    } catch (err) {
      resolve({ ok: false, error: err.message || "Extension background unavailable" });
    }
  });
}

async function ensureProfileLoaded() {
  if (localProfile) return true;
  try {
    localProfile = await apiProxy("http://127.0.0.1:8787/api/profile");
    injectWebCopilot(localProfile);
    return true;
  } catch (e) {
    // Silent: backend server not started yet, or extension context invalidated
  }
  return false;
}

function ensureCopilotPanel(profile = localProfile) {
  if (!IS_TOP_FRAME) return;
  if (!document.getElementById("jh-copilot-widget") && profile) {
    injectWebCopilot(profile);
  }
}

// Lean autofill used inside ATS iframes: no toolbar/panel UI, just fill the
// fields + CV and let toasts relay up to the top frame. Debounced because a
// popup-triggered AUTOFILL_FORM and the top frame's broadcast both arrive.
async function runFrameAutofill(profile, { useAi = false, runId = "" } = {}) {
  if (!profile || IS_TOP_FRAME) return;
  const now = Date.now();
  if (now - lastFrameAutofillAt < 4000) return;
  lastFrameAutofillAt = now;
  // Skip frames with nothing fillable (ad/analytics iframes).
  if (!collectFillableElements().length && !document.querySelector('input[type="file"]')) return;
  localProfile = profile;
  const result = await autofillWebForm(profile, { useAi, runId });
  if (result) {
    try {
      chrome.runtime
        .sendMessage({
          type: "JH_FRAME_AUTOFILL_RESULT",
          result: {
            ...result,
            runId,
            frameHost: location.hostname || "embedded form",
            frameUrl: locationHref(),
          },
        })
        .catch(() => {});
    } catch {
      // Background unavailable; the frame fill itself already completed.
    }
  }
}

function expandWidget() {
  const widget = document.getElementById("jh-copilot-widget");
  if (widget && widget.classList.contains("minimized")) {
    widget.style.display = "flex";
    widget.classList.remove("minimized");
  }
  positionWidgetRelativeToToolbar();
}

// Glue the overlay card to the floating toolbar: same width, aligned, sitting
// just above it (or below when the toolbar is near the top) — never on top of
// it. Re-run whenever the panel opens, the toolbar is dragged, or the window
// resizes; the static CSS position is only a first-paint fallback.
function positionWidgetRelativeToToolbar() {
  const widget = document.getElementById("jh-copilot-widget");
  const bar = document.getElementById("jh-floating-actions");
  if (!widget) return;
  if (widgetManualPosition) {
    applyWidgetManualPosition();
    return;
  }
  if (!bar || bar.style.display === "none") return;
  const rect = bar.getBoundingClientRect();
  if (!rect.width) return;

  const gap = 10;
  const width = clamp(Math.round(rect.width), 320, Math.max(320, window.innerWidth - 16));
  const left = clamp(Math.round(rect.left), 8, Math.max(8, window.innerWidth - width - 8));
  widget.style.width = `${width}px`;
  widget.style.left = `${left}px`;
  widget.style.right = "auto";

  const spaceAbove = rect.top - gap - 8;
  const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
  if (spaceAbove >= 240 || spaceAbove >= spaceBelow) {
    widget.style.bottom = `${Math.round(window.innerHeight - rect.top + gap)}px`;
    widget.style.top = "auto";
    widget.style.maxHeight = `${Math.max(200, Math.floor(spaceAbove))}px`;
    widget.style.transformOrigin = "bottom center";
  } else {
    widget.style.top = `${Math.round(rect.bottom + gap)}px`;
    widget.style.bottom = "auto";
    widget.style.maxHeight = `${Math.max(200, Math.floor(spaceBelow))}px`;
    widget.style.transformOrigin = "top center";
  }
}

// Track active focused inputs/textareas statefully & handle inline prefill prompts
document.addEventListener("focusin", (e) => {
  const el = e.target;
  if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) {
    removeInlineTrigger();
    return;
  }
  
  // Guard against non-text elements
  const type = el.type ? el.type.toLowerCase() : "";
  if (["hidden", "checkbox", "radio", "file", "submit", "button", "password"].includes(type)) {
    removeInlineTrigger();
    return;
  }

  // Ensure we are indeed on a job page before showing assistive prompts
  if (!looksLikeJobPosting()) return;

  currentFocusedElement = el;
  lastFocusedInput = el;
  updateActiveFieldLabel();

  // Only show the inline ⚡ trigger if the user has already activated the
  // extension (toolbar is present). Never auto-inject on focus.
  if (localProfile && document.getElementById("jh-floating-actions")) {
    showInlineTriggerFor(el);
  }
});

// Delay removal of inline elements to allow click events to register
document.addEventListener("focusout", (e) => {
  setTimeout(() => {
    const active = document.activeElement;
    if (active && (active.id === "jh-inline-trigger" || active.closest("#jh-inline-dropdown"))) {
      return;
    }
    removeInlineDropdown();
    removeInlineTrigger();
  }, 220);
});

// Keep inline triggers aligned during page scrolling or sizing adjustments
window.addEventListener("scroll", repositionTrigger, { passive: true });
window.addEventListener("resize", repositionTrigger, { passive: true });

function repositionTrigger() {
  if (inlineTrigger && currentFocusedElement) {
    const rect = currentFocusedElement.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    const triggerWidth = 22;
    const triggerHeight = 22;
    
    const leftPos = rect.right + scrollLeft - triggerWidth - 6;
    const topPos = rect.top + scrollTop + (rect.height - triggerHeight) / 2;
    
    inlineTrigger.style.left = `${leftPos}px`;
    inlineTrigger.style.top = `${topPos}px`;
    
    if (inlineDropdown) {
      const dropdownWidth = 240;
      inlineDropdown.style.left = `${rect.right + scrollLeft - dropdownWidth}px`;
      inlineDropdown.style.top = `${rect.bottom + scrollTop + 6}px`;
    }
  }
}

function extractJob() {
  const title = pickJobTitleText();
  const text = visibleText();
  const role = cleanRole(title);
  const company = findCompany(text);
  const location = findLocation(text);
  const salary = findSalary(text);
  const equity = /\bequity\b/i.test(text) ? "Mentioned" : "";
  const skills = skillCatalog.filter((skill) => new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i").test(text));
  const level = findLevel(text);

  // One clean text blob serves both purposes: `pageText` is the lean version sent
  // to the local model (a small model — keep it tight, don't drown the signal),
  // `description` is the longer copy stored verbatim on the saved record.
  const aiText = text.slice(0, 7000);

  return {
    company,
    role,
    status: "Applied",
    dateApplied: "",
    location,
    salary,
    equity,
    skills,
    level,
    priority: "Medium",
    source: "Extension",
    sourceUrl: locationHref(),
    title: document.title,
    pageText: aiText,
    notes: "",
    description: text.slice(0, 9000),
  };
}

function looksLikeJobPosting() {
  const url = locationHref().toLowerCase();
  if (isJobPageCache !== null && lastCachedUrl === url) {
    return isJobPageCache;
  }
  lastCachedUrl = url;

  let result = false;
  try {
    // 1. Check common ATS domain/URL patterns to cover forms directly
    if (/\b(greenhouse\.io|lever\.co|ashbyhq\.com|smartrecruiters\.com|bamboohr\.com|workable\.com|myworkdayjobs\.com|myworkdaysite\.com|icims\.com|taleo\.net|successfactors\.(?:com|eu)|oraclecloud\.com|jobvite\.com|jazz\.co|jazzhr\.com|applytojob\.com|breezy\.hr|recruitee\.com|personio\.(?:de|com)|teamtailor\.com|pinpointhq\.com|dover\.com|rippling\.com|paylocity\.com|paycomonline\.net|workforcenow\.adp\.com|eightfold\.ai|avature\.net|csod\.com|comeet\.co|hibob\.com|jobs\.sap\.com|wellfound\.com|otta\.com)\b/.test(url)) {
      result = true;
    } else if (/\b(job|jobs|careers?|posting|apply|application|requisition|gh_jid)\b/.test(url)) {
      result = true;
    } else {
      // 2. Headings check using fast textContent
      const h1 = document.querySelector("h1")?.textContent?.toLowerCase() || "";
      if (/\b(engineer|developer|manager|architect|designer|analyst|scientist|director|lead|specialist|coordinator|analyst|intern|operator)\b/.test(h1)) {
        result = true;
      } else {
        // 3. Form cue checks (Is it a job application form?) using fast textContent
        const hasResumeInput = document.querySelector('input[type="file"][accept*="pdf"], input[type="file"][id*="resume" i], input[type="file"][name*="resume" i]') !== null;
        const hasSubmitAppButton = Array.from(document.querySelectorAll('button, input[type="submit"]')).some(btn => {
          const text = (btn.textContent || btn.value || "").toLowerCase();
          return /\b(submit|apply)\s+(application|resume|cv|form)\b/i.test(text) || text === "submit" || text === "apply";
        });
        const hasFields = Array.from(document.querySelectorAll('label, span')).some(el => {
          const text = (el.textContent || "").toLowerCase();
          return /\b(first\s*name|last\s*name|email|phone|linkedin|resume)\b/i.test(text);
        });

        if (hasResumeInput || (hasSubmitAppButton && hasFields)) {
          result = true;
        } else {
          // 4. Text matches (General job description patterns) using textContent to prevent synchronous layout recalc
          const text = (document.body?.textContent || "").toLowerCase();
          const hits = [
            /apply\s+now|apply\s+for\s+this\s+job|submit\s+your\s+application/,
            /responsibilities|requirements|qualifications|about\s+the\s+role/,
            /what\s+you'?ll\s+do|what\s+we'?re\s+looking\s+for|what\s+you\s+need/,
            /years?\s+of\s+experience|\bduties\b/,
          ].filter((re) => re.test(text)).length;
          
          result = hits >= 2;
        }
      }
    }
  } catch (e) {
    console.warn("Error in looksLikeJobPosting classification:", e);
  }

  isJobPageCache = result;
  return result;
}

function pickText(selectors) {
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      const text = (element?.textContent || element?.innerText || "")?.trim();
      if (text) return text;
    } catch (e) {
      console.warn("pickText querySelector error for selector:", selector, e);
    }
  }
  return "";
}

function pickJobTitleText() {
  const selectors = [
    "h1",
    "h2",
    "[data-testid*='title' i]",
    "[class*='job-title' i]",
    "[class*='posting-title' i]",
  ];
  for (const selector of selectors) {
    try {
      const elements = Array.from(document.querySelectorAll(selector));
      for (const element of elements) {
        const text = clean(element?.textContent || element?.innerText || "");
        if (cleanRole(text)) return text;
      }
    } catch (e) {
      console.warn("pickJobTitleText querySelector error for selector:", selector, e);
    }
  }
  return cleanRole(document.title) ? document.title : "";
}

// Structural elements that are page chrome, never the job description itself.
const CONTENT_NOISE_TAGS =
  "script,style,noscript,svg,path,iframe,template,nav,header,footer,aside,form,button,select,input,textarea";
// Class / id / aria fragments that mark cookie bars, related-job rails, menus,
// social buttons and similar boilerplate. Used to prune nodes before reading text.
const CONTENT_NOISE_PATTERN =
  /(cookie|consent|gdpr|newsletter|subscrib|sign[\s_-]?in|log[\s_-]?in|breadcrumb|related|similar|recommend|sidebar|side-bar|\bmenu\b|navbar|nav-bar|social|share-|sharing|footer|header|banner|promo|advert|\bads?\b|skip-link|back-to|toolbar|cookie-?banner)/i;
// Whole lines that are pure navigation/legal noise — dropped after text extraction.
const LINE_NOISE_PATTERN =
  /^(accept( all)?( cookies?)?|manage (cookies|preferences|settings)|we use cookies.*|cookie (policy|settings|preferences)|sign ?in|log ?in|sign ?up|create (an )?account|menu|skip to (content|main).*|share|tweet|back to (jobs|search|results)|view all jobs?|see all jobs?|similar jobs?|related jobs?|recommended.*|©.*|copyright.*|all rights reserved.*|privacy( policy)?|terms( of (service|use))?|powered by.*)$/i;

// Choose the DOM subtree most likely to hold the job description, falling back to
// progressively broader containers and finally <body>.
function pickContentRoot() {
  const selectors = [
    "[data-testid*='job-description' i]",
    "[class*='job-description' i]",
    "[class*='jobdescription' i]",
    "[id*='job-description' i]",
    "[class*='job-details' i]",
    "[class*='posting' i]",
    "[class*='description' i]",
    "article",
    "main",
    "[role='main']",
    "[class*='job' i]",
  ];
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      const len = (el?.innerText || el?.textContent || "").trim().length;
      if (el && len > 200) return el;
    } catch (e) {
      // Ignore invalid selectors
    }
  }
  return document.body;
}

// Tags that should produce a line break in serialized text, so paragraphs and
// list items don't run together into one giant unreadable line.
const READABLE_BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BR", "DD", "DIV", "DL", "DT",
  "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "H1", "H2", "H3", "H4", "H5",
  "H6", "HEADER", "HR", "LI", "MAIN", "OL", "P", "PRE", "SECTION", "TABLE",
  "TBODY", "TR", "UL", "TD", "TH",
]);

// Walk a (pruned, detached) DOM subtree and accumulate readable text into `out`,
// inserting newlines around block elements and bullet markers before list items.
function serializeReadable(node, out) {
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = child.textContent.replace(/[ \t ]+/g, " ");
      if (t.trim()) out.push(t);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const isBlock = READABLE_BLOCK_TAGS.has(child.tagName);
      if (isBlock) out.push("\n");
      if (child.tagName === "LI") out.push("• ");
      serializeReadable(child, out);
      if (isBlock) out.push("\n");
    }
  }
}

// Produce clean, readable, de-noised text from an element: prune page chrome,
// serialize with block-aware line breaks, then drop nav/boilerplate lines and
// duplicates. Keeping the result tight matters — the local model is small, so
// signal-to-noise beats raw volume.
function cleanReadableText(rootEl, maxChars = 9000) {
  if (!rootEl) return "";

  // Prune obvious chrome from a detached clone, then serialize to text ourselves.
  // We deliberately avoid innerText: it needs the node mounted+rendered to compute
  // line breaks, and a hidden/off-screen mount makes its output browser-dependent.
  // A manual block-aware walk is deterministic and side-effect free.
  let raw = "";
  try {
    const clone = rootEl.cloneNode(true);
    clone.querySelectorAll(CONTENT_NOISE_TAGS).forEach((el) => el.remove());
    clone.querySelectorAll("[class],[id],[aria-label],[role]").forEach((el) => {
      const sig = `${el.getAttribute("class") || ""} ${el.id || ""} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("role") || ""}`.toLowerCase();
      if (sig.trim() && CONTENT_NOISE_PATTERN.test(sig)) el.remove();
    });
    if ((clone.textContent || "").trim().length > 120) {
      const out = [];
      serializeReadable(clone, out);
      raw = out.join("");
    } else {
      raw = clone.textContent || "";
    }
  } catch (e) {
    raw = rootEl.textContent || "";
  }

  return denoiseLines(raw, maxChars);
}

// Pure text post-processing: normalize whitespace, drop nav/legal boilerplate
// lines, collapse blank runs, de-dupe short repeated chrome, and cap length.
// Kept separate from the DOM walk so it can be reasoned about and tested directly.
function denoiseLines(raw, maxChars = 9000) {
  const seen = new Set();
  const lines = [];
  let blankRun = 0;
  for (const rawLine of String(raw || "").split("\n")) {
    const line = rawLine.replace(/[ \t ]+/g, " ").trim();
    if (!line) {
      if (lines.length && blankRun === 0) lines.push("");
      blankRun++;
      continue;
    }
    blankRun = 0;
    if (LINE_NOISE_PATTERN.test(line)) continue;
    const key = line.toLowerCase();
    // De-dupe short repeated chrome (menus echoed top & bottom); keep long prose.
    if (line.length < 60 && seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxChars);
}

function visibleText() {
  return cleanReadableText(pickContentRoot(), 9000);
}

const GENERIC_JOB_IDENTITY_RE =
  /^(embed|embedded|iframe|job app|job application|application form|apply|apply now|application|job board|jobs board|job posting|posting|open role|opening|careers?|jobs?|job)$/i;

function isGenericJobIdentity(value) {
  const normalized = clean(value).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return !normalized || GENERIC_JOB_IDENTITY_RE.test(normalized);
}

function cleanRole(title) {
  const role = clean(
    title
      .replace(/\s+[-|]\s+.*$/, "")
      .replace(/\bat\s+[A-Z].*$/, "")
      .replace(/\bjob\b/i, ""),
  );
  return isGenericJobIdentity(role) ? "" : role;
}

function findCompany(text) {
  // Strings that are UI labels / nav text, not company names
  const GARBAGE_RE = /^(back(\s+to\s+job(s)?)?|company|about(\s+the\s+company)?|employer|hiring\s+company|job\s+details?|careers?|apply(\s+now)?|application|jobs?|overview|open\s+positions?|view\s+all\s+jobs?|home|about\s+us|our\s+team|culture|see\s+all|all\s+jobs?)$/i;
  // Known ATS platform names — not the hiring company
  const ATS_PLATFORM_RE = /^(greenhouse|lever|ashby(hq)?|workday|smartrecruiters|bamboohr|workable|jobvite|icims|taleo|successfactors|recruitee|teamtailor|dover|pinpoint|rippling|gem)$/i;

  const isGarbage = (val) => !val || val.length < 2 || GARBAGE_RE.test(val.trim()) || isGenericJobIdentity(val);

  // Slug from URL → readable name (e.g. "my-company-inc" → "My Company Inc")
  const slugToName = (slug) =>
    decodeURIComponent(String(slug || ""))
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const companyFromQuery = (urlObj) => {
    for (const key of ["for", "company", "company_slug", "companyName", "company_name", "organization"]) {
      const value = clean(urlObj.searchParams.get(key) || "");
      if (value && !isGarbage(value)) return slugToName(value);
    }
    return "";
  };

  // 1. URL-based extraction for known ATS platforms (most reliable)
  const url = locationHref();
  const urlLower = url.toLowerCase();
  let urlCompany = "";

  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    if (/greenhouse\.io$/.test(host) || /greenhouse\.io\./.test(host)) {
      const queryCompany = companyFromQuery(urlObj);
      const first = pathParts[0] || "";
      urlCompany = queryCompany || (!isGarbage(first) ? slugToName(first) : "");
    } else if (/lever\.co$/.test(host) || /lever\.co\./.test(host)) {
      const first = pathParts[0] || "";
      const second = pathParts[1] || "";
      urlCompany = first.toLowerCase() === "embed" ? slugToName(second) : slugToName(first);
    } else if (/ashbyhq\.com$/.test(host) || /ashbyhq\.com\./.test(host)) {
      const queryCompany = companyFromQuery(urlObj);
      const first = pathParts[0] || "";
      const second = pathParts[1] || "";
      urlCompany = queryCompany || (first.toLowerCase() === "embed" ? slugToName(second) : slugToName(first));
    } else if (host === "app.careerpuck.com") {
      const boardIndex = pathParts.findIndex((part) => part.toLowerCase() === "job-board");
      if (boardIndex >= 0 && pathParts[boardIndex + 1]) urlCompany = slugToName(pathParts[boardIndex + 1]);
    }
  } catch {
    // Fall back to regex extraction below.
  }

  const ghMatch = urlCompany ? null : urlLower.match(/greenhouse\.io\/([^/?#]+)/);
  if (ghMatch && !isGarbage(ghMatch[1])) urlCompany = slugToName(ghMatch[1]);

  if (!urlCompany) {
    const leverMatch = urlLower.match(/lever\.co\/([^/?#]+)/);
    if (leverMatch && !isGarbage(leverMatch[1])) urlCompany = slugToName(leverMatch[1]);
  }
  if (!urlCompany) {
    const ashbyMatch = urlLower.match(/ashbyhq\.com\/([^/?#]+)/);
    if (ashbyMatch && !isGarbage(ashbyMatch[1])) urlCompany = slugToName(ashbyMatch[1]);
  }
  if (!urlCompany) {
    const srMatch = urlLower.match(/smartrecruiters\.com\/([^/?#]+)/);
    if (srMatch) urlCompany = slugToName(srMatch[1]);
  }
  if (!urlCompany) {
    const bambooMatch = url.match(/^https?:\/\/([^.]+)\.bamboohr\.com/i);
    if (bambooMatch) urlCompany = slugToName(bambooMatch[1]);
  }
  if (!urlCompany) {
    const workdayMatch = url.match(/^https?:\/\/([^.]+)\.myworkdayjobs\.com/i);
    if (workdayMatch) urlCompany = slugToName(workdayMatch[1]);
  }
  if (!urlCompany) {
    const workableMatch = urlLower.match(/workable\.com\/([^/?#]+)/);
    if (workableMatch) urlCompany = slugToName(workableMatch[1]);
  }

  if (urlCompany) {
    const cleaned = clean(urlCompany);
    if (!isGarbage(cleaned)) return cleaned.slice(0, 80);
  }

  // 2. og:site_name — only if it's not an ATS platform name
  const ogSiteName = clean(document.querySelector("meta[property='og:site_name']")?.content || "");
  if (ogSiteName && !ATS_PLATFORM_RE.test(ogSiteName.trim()) && !isGarbage(ogSiteName)) {
    return ogSiteName.slice(0, 80);
  }

  // 3. Specific structured selectors (avoid broad class* matches that catch nav labels)
  const selectorCompany = pickText([
    "[data-testid='company-name']",
    "[data-testid*='company' i]",
    "[class*='companyName' i]",
    "[class*='company-name' i]",
    "[class*='employer-name' i]",
    "[itemprop='hiringOrganization'] [itemprop='name']",
    "[itemprop='name']",
  ]);
  if (selectorCompany && !isGarbage(selectorCompany)) return clean(selectorCompany).slice(0, 80);

  // 4. application-name meta
  const appName = clean(document.querySelector("meta[name='application-name']")?.content || "");
  if (appName && !ATS_PLATFORM_RE.test(appName.trim()) && !isGarbage(appName)) {
    return appName.slice(0, 80);
  }

  // 5. Page title: "Role at Company | ..." or "Company – Role"
  const titleAt = document.title.match(/\bat\s+([^|–-]{2,60})/i)?.[1] || "";
  if (titleAt && !isGarbage(clean(titleAt))) return clean(titleAt).slice(0, 80);

  // 6. Body text pattern
  const textCompany = text.match(/Company\s*:?\s*([A-Z][A-Za-z0-9 .,&-]{2,60})/)?.[1] || "";
  if (textCompany && !isGarbage(clean(textCompany))) return clean(textCompany).slice(0, 80);

  // 7. Last resort: derive a readable name from the host (e.g. jobs.acme.com →
  //    "Acme"). Better an editable guess than an empty Company, which both blocks
  //    the required field on save and collapses every blank capture onto one row.
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    const parts = host.split(".").filter(Boolean);
    const tld = new Set(["com", "co", "io", "org", "net", "app", "ai", "dev", "jobs", "careers", "career", "boards", "work", "gov", "edu"]);
    // Walk from the second-level label outward, skipping generic/ATS tokens.
    const core = [...parts].reverse().find(
      (p) => p.length > 1 && !tld.has(p) && !ATS_PLATFORM_RE.test(p)
    );
    if (core) {
      const derived = clean(slugToName(core));
      if (!isGarbage(derived)) return derived.slice(0, 80);
    }
  } catch (e) {
    // Malformed URL — fall through to empty.
  }

  return "";
}

function findLocation(text) {
  const selectorLocation = pickText([
    "[data-testid*='location' i]",
    "[class*='location' i]",
    "[class*='remote' i]",
  ]);
  const remoteMatch = text.match(/Remote(?:\s+from|\s+in)?\s+[A-Za-z, /-]{2,80}/i)?.[0] || "";
  const locationMatch = text.match(/Location\s*:?\s*([A-Za-z, /-]{2,80})/i)?.[1] || "";
  return clean(selectorLocation || remoteMatch || locationMatch).slice(0, 100);
}

function findSalary(text) {
  const salaryMatch =
    text.match(/\$[0-9]{2,3}(?:,[0-9]{3})?\s*(?:k|K)?\s*[-–]\s*\$?[0-9]{2,3}(?:,[0-9]{3})?\s*(?:k|K)?/) ||
    text.match(/\$[0-9]{2,3}(?:,[0-9]{3})?\s*(?:USD|CAD)?/i);
  return salaryMatch ? clean(salaryMatch[0]) : "";
}

function findLevel(text) {
  const levels = [];
  if (/\bjunior\b/i.test(text)) levels.push("Junior");
  if (/\bmid(?:-|\s)?level\b|\bintermediate\b/i.test(text)) levels.push("Mid");
  if (/\bsenior\b|\bstaff\b|\bprincipal\b/i.test(text)) levels.push("Senior+");
  return levels.join(", ");
}

function locationHref() {
  try {
    return window.location.href;
  } catch {
    return "";
  }
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


/* ==========================================================================
   ⚡ FORM AUTOFILL PREFILL ENGINE (GREENHOUSE, LEVER, WORKDAY COMPATIBLE)
   ========================================================================== */

const FILLABLE_FIELD_SELECTOR =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]):not([type="password"]):not([type="image"]), textarea, select';

function getFieldRoot(el) {
  return el?.getRootNode?.() || document;
}

function getRootElementById(root, id) {
  if (!id) return null;
  try {
    if (root?.getElementById) return root.getElementById(id);
  } catch {
    // Keep falling back to document below.
  }
  try {
    return document.getElementById(id);
  } catch {
    return null;
  }
}

function getComposedParent(node) {
  if (!node) return null;
  if (node.parentElement) return node.parentElement;
  const root = node.getRootNode?.();
  return root?.host || null;
}

function querySelectorAllDeep(root, selector) {
  const results = [];
  const seenRoots = new Set();

  const visit = (scope) => {
    if (!scope || seenRoots.has(scope)) return;
    seenRoots.add(scope);

    let matches = [];
    let elements = [];
    try {
      matches = Array.from(scope.querySelectorAll?.(selector) || []);
      elements = Array.from(scope.querySelectorAll?.("*") || []);
    } catch {
      return;
    }

    results.push(...matches);
    elements.forEach((element) => {
      if (element.shadowRoot) visit(element.shadowRoot);
    });
  };

  visit(root || document);
  return results;
}

function rootQuerySelectorAll(root, selector) {
  try {
    return Array.from((root || document).querySelectorAll?.(selector) || []);
  } catch {
    return [];
  }
}

// Rippling-style rows associate the question with the input by layout only:
// <div><div>Question text…</div><div><input/></div></div> — no <label>, no
// aria link. Climb the wrapper chain and take the CLOSEST previous sibling
// that has short text and contains no interactive controls.
function getQuestionRowElement(input) {
  let node = input;
  for (let depth = 0; node && node !== document.body && depth < 6; depth++) {
    let sib = node.previousElementSibling;
    while (sib) {
      const hasControls = Boolean(sib.querySelector?.('input, textarea, select, button, [role="button"], [role="option"]'));
      if (!hasControls && !isInCopilotUi(sib)) {
        const text = clean(sib.textContent || sib.innerText || "");
        if (text && text.length >= 3 && text.length <= 240) return sib;
      }
      sib = sib.previousElementSibling;
    }
    node = getComposedParent(node);
  }
  return null;
}

function getQuestionRowText(input) {
  const row = getQuestionRowElement(input);
  return row ? clean(row.textContent || row.innerText || "") : "";
}

// Rippling renders the required "*" as CSS ::after content on an empty div —
// invisible to textContent, so requiredness must be read from computed styles.
function elementHasCssRequiredMark(el) {
  if (!el) return false;
  const nodes = [el, ...Array.from(el.querySelectorAll?.("*") || []).slice(0, 30)];
  for (const node of nodes) {
    try {
      if ((getComputedStyle(node, "::after").content || "").includes("*")) return true;
      if ((getComputedStyle(node, "::before").content || "").includes("*")) return true;
    } catch { /* detached or cross-origin — ignore */ }
  }
  return false;
}

// Ashby (and similar) mark a required question with a "*" rendered via CSS
// ::after on a heading label INSIDE the field container (tagged with a
// "_required_" class) — invisible to textContent, and the prompt is a CHILD of
// the <fieldset>, not a previous sibling, so getQuestionRowElement's sibling
// scan never reaches it. Check the field container itself for either signal.
function containerMarksRequired(container) {
  if (!container) return false;
  const nodes = [container, ...Array.from(container.querySelectorAll?.("*") || []).slice(0, 40)];
  for (const node of nodes) {
    const cls = getElementClassText(node);
    // Whole-token "required" class (Ashby: "_required_f7cvd_91"); never match
    // "not-required" / "requirement" / "acquired".
    if (/(?:^|[^a-z])required(?:[^a-z]|$)/i.test(cls) && !/not[_-]?required/i.test(cls)) return true;
  }
  return elementHasCssRequiredMark(container);
}

function getNestedFieldLabelText(input) {
  const pieces = [];
  let node = input;
  let depth = 0;

  while (node && node !== document.body && depth < 6) {
    const parent = getComposedParent(node);
    if (!parent) break;
    const candidates = rootQuerySelectorAll(
      parent,
      'label, legend, [class*="label" i], [data-testid*="label" i], [data-test*="label" i], [aria-label], p, span'
    );

    for (const candidate of candidates) {
      if (candidate === input || candidate.contains?.(input)) continue;
      if (candidate.querySelector?.(FILLABLE_FIELD_SELECTOR)) continue;
      const text = clean(candidate.getAttribute?.("aria-label") || candidate.textContent || candidate.innerText || "");
      if (!text || text.length > 180) continue;
      if (pieces.includes(text)) continue;
      pieces.push(text);
      if (pieces.join(" ").length > 220) break;
    }

    if (pieces.length || depth >= 2) break;
    node = parent;
    depth++;
  }

  return clean(pieces.join(" ")).slice(0, 240);
}

function getLabelText(input) {
  // 1. aria-labelledby: resolve the referenced element(s). Used heavily by
  //    Workday / Greenhouse / Lever and other modern ATS forms.
  const labelledBy = input.getAttribute && input.getAttribute("aria-labelledby");
  const root = getFieldRoot(input);
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => {
        try {
          const el = getRootElementById(root, id);
          return el ? (el.textContent || el.innerText || "") : "";
        } catch {
          return "";
        }
      })
      .join(" ")
      .trim();
    if (text) return text;
  }
  // 2. Explicit aria-label.
  const ariaLabel = input.getAttribute && input.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

  // 3. <label for="id">.
  if (input.id) {
    try {
      const escapedId = CSS.escape(input.id);
      const labelEl =
        root.querySelector?.(`label[for="${escapedId}"]`) ||
        document.querySelector(`label[for="${escapedId}"]`);
      if (labelEl) return labelEl.textContent || labelEl.innerText || "";
    } catch (e) {
      // Ignore syntax exceptions
    }
  }
  let parent = input.parentElement;
  while (parent) {
    if (parent.tagName === "LABEL") {
      return parent.textContent || parent.innerText || "";
    }
    parent = parent.parentElement;
  }
  let sib = input.previousElementSibling;
  if (sib && (sib.tagName === "LABEL" || sib.tagName === "SPAN")) {
    return sib.textContent || sib.innerText || "";
  }
  if (input.parentElement) {
    const parentText = input.parentElement.textContent || input.parentElement.innerText || "";
    if (parentText && parentText.length < 80) return parentText;
  }
  const rowQuestion = getQuestionRowText(input);
  if (rowQuestion) return rowQuestion;
  const nestedLabel = getNestedFieldLabelText(input);
  if (nestedLabel) return nestedLabel;
  return "";
}

function getInputType(input) {
  return (input?.type || "").toLowerCase();
}

function isChoiceInput(input) {
  const type = getInputType(input);
  return input?.tagName === "INPUT" && (type === "radio" || type === "checkbox");
}

function elementLooksVisible(el) {
  if (!el || !el.getBoundingClientRect) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  try {
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  } catch {
    return true;
  }
}

function getRadioGroup(input) {
  if (!input || getInputType(input) !== "radio") return input ? [input] : [];
  if (!input.name) {
    let node = input.parentElement;
    for (let depth = 0; node && node !== document.body && depth < 6; depth++, node = node.parentElement) {
      const radios = Array.from(node.querySelectorAll?.('input[type="radio"]') || [])
        .filter((el) => !isInCopilotUi(el));
      if (radios.length > 1 && radios.length <= 12 && radios.includes(input)) {
        const text = clean(node.textContent || node.innerText || "");
        if (text && text.length <= 900) return radios;
      }
    }
    return [input];
  }
  const root = input.form || getFieldRoot(input) || document;
  return rootQuerySelectorAll(root, 'input[type="radio"]')
    .filter((el) => el.name === input.name && !isInCopilotUi(el));
}

function getChoiceGroup(input) {
  return getInputType(input) === "radio" ? getRadioGroup(input) : (input ? [input] : []);
}

function getRadioGroupKey(input) {
  if (!input || getInputType(input) !== "radio" || !input.name) return "";
  const root = getFieldRoot(input);
  const formIndex = input.form ? Array.from(document.forms).indexOf(input.form) : -1;
  const rootKey = root?.host?.tagName || (root === document ? "document" : "root");
  return `${rootKey}:${formIndex}:${input.name}`;
}

function getChoiceOptionLabel(input) {
  if (!input) return "";
  const explicitLabels = Array.from(input.labels || [])
    .map((label) => clean(label.textContent || label.innerText || ""))
    .filter((text) => text && text.length <= 140);
  if (explicitLabels.length) return clean(explicitLabels.join(" "));

  const closestLabel = input.closest?.("label");
  if (closestLabel) {
    const text = clean(closestLabel.textContent || closestLabel.innerText || "");
    if (text && text.length <= 140) return text;
  }

  const sibling = input.nextElementSibling;
  if (sibling && /^(LABEL|SPAN|DIV)$/i.test(sibling.tagName)) {
    const text = clean(sibling.textContent || sibling.innerText || "");
    if (text && text.length <= 140) return text;
  }

  let nextNode = input.nextSibling;
  for (let scanned = 0; nextNode && scanned < 4; scanned++, nextNode = nextNode.nextSibling) {
    if (nextNode.nodeType === Node.TEXT_NODE) {
      const text = clean(nextNode.textContent || "");
      if (text && text.length <= 140) return text;
    } else if (nextNode.nodeType === Node.ELEMENT_NODE && !nextNode.querySelector?.("input, textarea, select, button")) {
      const text = clean(nextNode.textContent || nextNode.innerText || "");
      if (text && text.length <= 140) return text;
    }
  }

  const group = getChoiceGroup(input);
  let node = input.parentElement;
  for (let depth = 0; node && node !== document.body && depth < 5; depth++, node = node.parentElement) {
    const choices = Array.from(node.querySelectorAll?.('input[type="radio"], input[type="checkbox"]') || [])
      .filter((el) => !isInCopilotUi(el));
    if (choices.length === 1 && choices[0] === input) {
      const text = clean(node.textContent || node.innerText || "");
      if (text && text.length <= 180) return text;
    }
    if (group.length > 1 && group.every((option) => node.contains(option))) break;
  }

  return clean(input.getAttribute("aria-label") || input.value || input.id || input.name || "");
}

function getCommonAncestor(nodes) {
  const validNodes = nodes.filter(Boolean);
  if (!validNodes.length) return null;
  let ancestor = validNodes[0];
  while (ancestor && validNodes.some((node) => !ancestor.contains(node))) {
    ancestor = ancestor.parentElement;
  }
  return ancestor;
}

function getChoiceGroupContainer(input) {
  if (!input) return null;
  const fieldset = input.closest?.("fieldset");
  if (fieldset) return fieldset;

  const roleGroup = input.closest?.('[role="radiogroup"], [role="group"]');
  if (roleGroup) return roleGroup;

  const group = getChoiceGroup(input);
  let ancestor = getCommonAncestor(group);
  while (ancestor && ancestor !== document.body && ancestor !== document.documentElement) {
    const text = clean(ancestor.textContent || ancestor.innerText || "");
    const choiceCount = ancestor.querySelectorAll?.('input[type="radio"], input[type="checkbox"]').length || 0;
    if (text && text.length <= 900 && choiceCount <= Math.max(group.length + 4, 6)) {
      return ancestor;
    }
    ancestor = ancestor.parentElement;
  }

  return input.closest?.("label") || input.parentElement;
}

function getPreviousPromptText(el) {
  const pieces = [];
  let current = el;
  let depth = 0;

  while (current && current !== document.body && depth < 3) {
    let sibling = current.previousElementSibling;
    let scanned = 0;
    while (sibling && scanned < 4) {
      const text = clean(sibling.textContent || sibling.innerText || "");
      const hasControls = Boolean(sibling.querySelector?.("input, textarea, select, button"));
      if (text && text.length <= 600 && !hasControls) pieces.unshift(text);
      sibling = sibling.previousElementSibling;
      scanned++;
    }
    if (pieces.join(" ").length > 600) break;
    current = getComposedParent(current);
    depth++;
  }

  return clean(pieces.join(" ")).slice(0, 700);
}

function getChoiceQuestionText(input) {
  const pieces = [];
  const fieldset = input?.closest?.("fieldset");
  const legend = fieldset?.querySelector?.("legend");
  if (legend) pieces.push(clean(legend.textContent || legend.innerText || ""));

  const container = getChoiceGroupContainer(input);
  const previousPrompt = getPreviousPromptText(container || input);
  if (previousPrompt) pieces.push(previousPrompt);

  if (container) {
    const containerText = clean(container.textContent || container.innerText || "");
    if (containerText && containerText.length <= 900) pieces.push(containerText);
  }

  const label = getLabelText(input);
  if (label) pieces.push(clean(label));

  const uniquePieces = [];
  pieces.forEach((piece) => {
    if (piece && !uniquePieces.includes(piece)) uniquePieces.push(piece);
  });

  return clean(uniquePieces.join(" ")).slice(0, 900);
}

function getChoiceOptions(input) {
  return getChoiceGroup(input).map((option) => ({
    input: option,
    label: getChoiceOptionLabel(option),
    value: clean(option.value || ""),
  }));
}

function isVisibleFillTarget(input) {
  if (elementLooksVisible(input)) return true;
  if (!isChoiceInput(input)) return false;

  const group = getChoiceGroup(input);
  if (group.some(elementLooksVisible)) return true;
  if (group.some((option) => Array.from(option.labels || []).some(elementLooksVisible))) return true;

  const container = getChoiceGroupContainer(input);
  return elementLooksVisible(container) && Boolean(clean(container.textContent || container.innerText || ""));
}

function collectFillableElements({ visibleOnly = false } = {}) {
  const seenRadioGroups = new Set();
  return querySelectorAllDeep(document, FILLABLE_FIELD_SELECTOR).filter((input) => {
    if (isInCopilotUi(input) || isLegacySelectWidgetInput(input)) return false;
    if (input.disabled || input.readOnly || input.getAttribute?.("aria-disabled") === "true") return false;
    if (isReactSelectRequiredInput(input)) return false;
    // intl-tel-input's internal country-search box is widget chrome, not a field.
    if (input.closest?.(".iti__dropdown-content, .iti__country-list")) return false;
    if (visibleOnly && input.tagName !== "SELECT" && !isVisibleFillTarget(input)) return false;
    if (!isChoiceInput(input)) return true;

    const radioGroupKey = getRadioGroupKey(input);
    if (radioGroupKey) {
      if (seenRadioGroups.has(radioGroupKey)) return false;
      seenRadioGroups.add(radioGroupKey);
    }
    return true;
  });
}

function isFieldAlreadyAnswered(input) {
  if (!input) return true;
  if (input.tagName === "SELECT") {
    if (input.selectedIndex < 0) return false;
    const option = input.options?.[input.selectedIndex];
    const text = clean(option?.text || "");
    const value = clean(option?.value || "");
    return Boolean((text && !isPlaceholderOptionText(text)) || (value && !isPlaceholderOptionText(value)));
  }
  if (isChoiceInput(input)) {
    // A hidden checkbox/radio backing a Yes/No button group reflects its answer
    // in the buttons, not in `.checked` — read the group's state instead.
    const backingGroup = getButtonChoiceGroupContainer(input);
    if (backingGroup) return buttonChoiceGroupAnswered(backingGroup);
    const type = getInputType(input);
    if (type === "radio") return getChoiceGroup(input).some((option) => option.checked);
    return input.checked;
  }
  if (isButtonChoiceGroup(input)) return buttonChoiceGroupAnswered(input);
  if (isAriaComboboxInput(input)) return comboboxLooksAnswered(input);
  return Boolean(input.value && input.value.trim());
}

// React-Select-style widgets clear the text input after a pick and show the
// chosen value in a sibling node, so input.value alone under-reports.
function getElementClassText(el) {
  return typeof el?.className === "string" ? el.className : "";
}

function isReactSelectHostCandidate(el) {
  const className = getElementClassText(el);
  return /\bselect__control\b|\bselect-shell\b|(?:^|\s)select(?:\s|$)/i.test(className) ||
    Boolean(el?.matches?.('[role="combobox"], [data-baseweb]'));
}

function getComboboxHost(input) {
  let node = getComposedParent(input);
  while (node && node !== document.body) {
    if (node.querySelector?.('[class*="single-value" i], [class*="singleValue" i]')) return node;
    node = getComposedParent(node);
  }

  node = getComposedParent(input);
  while (node && node !== document.body) {
    if (isReactSelectHostCandidate(node)) return node;
    node = getComposedParent(node);
  }
  return input?.parentElement?.parentElement || input?.parentElement || null;
}

function getComboboxToggleButton(input) {
  const openerSelector = [
    'button[aria-label="Toggle flyout"]',
    'button[title="Toggle flyout"]',
    'button[aria-label="Open menu"]',
    'button[title="Open menu"]',
    'button[aria-haspopup="listbox"]',
  ].join(",");

  let node = getComposedParent(input);
  while (node && node !== document.body) {
    const nodeClass = getElementClassText(node);
    const isLikelyComboboxWrapper =
      isReactSelectHostCandidate(node) ||
      /\bselect__container\b|\bselect__control\b|\bselect-shell\b/i.test(nodeClass);

    if (isLikelyComboboxWrapper && !isInCopilotUi(node)) {
      const opener = Array.from(node.querySelectorAll?.(openerSelector) || [])
        .find((button) => elementLooksVisible(button) && !isSubmitLikeControl(button));
      if (opener) return opener;
    }

    node = getComposedParent(node);
  }

  return null;
}

function getComboboxSelectedText(input) {
  if (input?.value && input.value.trim()) return clean(input.value);
  const host = getComboboxHost(input);
  if (!host || isInCopilotUi(host)) return "";
  const selected = host.querySelector('[class*="single-value" i], [class*="singleValue" i]');
  return clean(selected?.textContent || "");
}

function comboboxValueMatches(input, val) {
  const selected = normalizeChoiceText(getComboboxSelectedText(input));
  const target = normalizeChoiceText(val);
  if (!selected || !target) return false;
  return selected === target ||
    selected.startsWith(target) ||
    target.startsWith(selected) ||
    tokensInclude(selected, target) ||
    tokensInclude(target, selected);
}

function comboboxLooksAnswered(input) {
  if (input.value && input.value.trim()) return true;
  const host = getComboboxHost(input);
  if (!host || isInCopilotUi(host)) return false;
  if (host.querySelector('[class*="single-value" i], [class*="singleValue" i]')) return true;
  return /\bhas-value\b/i.test(typeof host.className === "string" ? host.className : "");
}

function markFieldFilled(filledElements, input) {
  if (!input) return;
  if (isChoiceInput(input)) {
    getChoiceGroup(input).forEach((option) => filledElements.add(option));
    return;
  }
  filledElements.add(input);
}

function wasFieldFilled(filledElements, input) {
  if (filledElements.has(input)) return true;
  return isChoiceInput(input) && getChoiceGroup(input).some((option) => filledElements.has(option));
}

function noteAlreadyAnswered(input, alreadyAnsweredElements) {
  if (!input || wasFieldFilled(alreadyAnsweredElements, input)) return false;
  markFieldFilled(alreadyAnsweredElements, input);
  return true;
}

function getAutofillFieldLabel(input) {
  const text = isChoiceInput(input)
    ? getChoiceQuestionText(input)
    : isButtonChoiceGroup(input)
      ? getButtonChoiceQuestionText(input)
      : getLabelText(input);
  return clean(text || input?.name || input?.id || "Unnamed Field");
}

function makeAuditEntry(inputOrLabel, value, { ai = false, status = "filled", reason = "" } = {}) {
  const label = typeof inputOrLabel === "string"
    ? clean(inputOrLabel)
    : getAutofillFieldLabel(inputOrLabel);
  const rawValue = String(value ?? "");
  const cleanReason = clean(reason || "");
  const displayValue = status === "skipped"
    ? `Not filled${cleanReason ? `: ${cleanReason}` : ""}`
    : rawValue;
  const copyLines = [
    `Field: ${label || "Unnamed Field"}`,
    `Source: ${ai ? "Gemma" : "Profile"}`,
    `Status: ${status === "skipped" ? "Not filled" : "Filled"}`,
  ];
  if (cleanReason) copyLines.push(`Reason: ${cleanReason}`);
  if (rawValue) copyLines.push(`${status === "skipped" ? "Proposed value" : "Value"}: ${rawValue}`);

  return {
    label: (label || "Unnamed Field").slice(0, 120),
    value: displayValue.slice(0, 180),
    copyValue: rawValue,
    reason: cleanReason,
    ai,
    status,
    copyText: copyLines.join("\n"),
  };
}

function makeSkippedAuditEntry(inputOrLabel, proposedValue, reason, { ai = true } = {}) {
  return makeAuditEntry(inputOrLabel, proposedValue, { ai, status: "skipped", reason });
}

// Requiredness, used to keep Gemma off optional fields (user request: optional
// fields don't need prefilling). A field counts as required when the DOM says
// so or its label carries the * convention; a form "marks requiredness" when
// at least one of its fields does — only then is the absence of a marker
// meaningful enough to skip a field.
function fieldLooksRequired(input) {
  if (!input) return false;
  if (input.required || input.getAttribute?.("aria-required") === "true") return true;
  if (isChoiceInput(input) && getChoiceGroup(input).some((option) => option.required || option.getAttribute?.("aria-required") === "true")) return true;
  const label = getAutofillFieldLabel(input);
  if (/\*/.test(label)) return true;
  if (/\brequired\b/i.test(label)) return true;
  // The visible row often renders the asterisk OUTSIDE the aria-linked label
  // ("Location" + a styled "*"), so check the question row — both its text
  // and CSS-rendered marks. For radio/checkbox groups, the prompt sits above
  // the GROUP CONTAINER, not above the individual input.
  const probe = isChoiceInput(input) ? (getChoiceGroupContainer(input) || input) : input;
  // Ashby marks required questions with a CSS-::after "*" on a "_required_"
  // heading label INSIDE the field container — invisible to textContent and a
  // CHILD of the fieldset, so the previous-sibling row scan below misses it.
  const fieldBox = probe?.closest?.('fieldset, [class*="fieldEntry"], [class*="field-entry"]') || probe;
  if (containerMarksRequired(fieldBox)) return true;
  const row = getQuestionRowElement(probe);
  if (!row) return false;
  if (/\*/.test(clean(row.textContent || ""))) return true;
  return elementHasCssRequiredMark(row);
}

function fieldLooksExplicitlyOptional(input) {
  const label = getAutofillFieldLabel(input);
  return /\(\s*optional\s*\)|\boptional\b/i.test(label);
}

function fieldIsSkippableOptional(input, formMarksRequired) {
  if (fieldLooksExplicitlyOptional(input)) return true;
  if (!formMarksRequired) return false;
  return !fieldLooksRequired(input);
}

function fieldSignals(input) {
  const label = getAutofillFieldLabel(input).toLowerCase();
  const choiceContext = isChoiceInput(input) ? getChoiceQuestionText(input).toLowerCase() : "";
  const name = (input.name || "").toLowerCase();
  const id = (input.id || "").toLowerCase();
  const placeholder = (input.placeholder || "").toLowerCase();
  const autocomplete = (input.getAttribute("autocomplete") || "").toLowerCase();
  const inputMode = (input.getAttribute("inputmode") || "").toLowerCase();
  const inputType = (input.type || "").toLowerCase();
  const ariaLabel = (input.getAttribute("aria-label") || "").toLowerCase();
  const combined = `${label} ${choiceContext} ${name} ${id} ${placeholder} ${autocomplete} ${inputMode} ${inputType} ${ariaLabel}`;
  return {
    combined,
    autocomplete,
    inputMode,
    inputType,
    normalizedLabel: normalizeChoiceText(label.replace(/\*/g, "")),
    normalizedId: normalizeChoiceText(id),
    normalizedName: normalizeChoiceText(name),
  };
}

function knownProfileFieldKind(input) {
  const signal = fieldSignals(input);
  const exact = [signal.normalizedLabel, signal.normalizedId, signal.normalizedName].filter(Boolean);
  const hasExact = (...values) => exact.some((item) => values.includes(item));

  // Radio/checkbox groups answer QUESTIONS — they are never free-text identity
  // fields. Crucially, their signal text contains their own OPTION LABELS, so
  // a "How did you hear?" group with a "LinkedIn" option false-matched the
  // linkedin kind (and "…Page/Website" matched portfolio). Free-text kinds are
  // therefore gated to non-choice controls.
  const isChoice = isChoiceInput(input);

  if (!isChoice) {
    if (
      signal.autocomplete === "given-name" ||
      hasExact("first name", "given name", "fname", "preferred first name") ||
      /\b(first|given)[_\-\s]*name\b|^fname$/i.test(signal.combined)
    ) return "firstName";

    if (
      signal.autocomplete === "family-name" ||
      hasExact("last name", "family name", "surname", "lname") ||
      /\b(last|family|sur)[_\-\s]*name\b|^lname$|^surname$/i.test(signal.combined)
    ) return "lastName";

    if (
      hasExact("full name", "whole name", "name", "candidate name", "applicant name") ||
      /\b(full|whole)[_\-\s]*name\b/i.test(signal.combined)
    ) {
      if (!/\b(first|last|given|family|middle|preferred|user)\b/i.test(signal.combined)) return "fullName";
    }

    if (/\bemail\b/i.test(signal.combined)) return "email";
    if (/\blinkedin\b/i.test(signal.combined)) return "linkedin";
    if (
      signal.autocomplete.startsWith("tel") ||
      signal.inputMode === "tel" ||
      signal.inputType === "tel" ||
      /(?:phone|tel|mobile|cell|contact)/i.test(signal.combined)
    ) return "phone";
    if (/\bcountry\b|country[_\-\s]*of[_\-\s]*residence|residence[_\-\s]*country/i.test(signal.combined)) return "country";
    if (/location\s*\(\s*city\s*\)|candidate[_\-\s]*location|\bcity\b|current[_\-\s]*(?:city|location)|\bresid(?:e|ing)\b|where[_\-\s]*do[_\-\s]*you[_\-\s]*(?:currently[_\-\s]*)?live/i.test(signal.combined)) return "city";
    // Bare "Location" labels (Ashby, Workable…) ask where the candidate lives.
    // Exclude native selects (usually office/region lists Gemma should pick
    // from) and preference/eligibility phrasings ("preferred work location",
    // "remote or onsite?") — those are real questions, not identity fields.
    if (
      input.tagName !== "SELECT" &&
      /\blocation\b/i.test(signal.normalizedLabel || "") &&
      !/prefer|remote|hybrid|onsite|on[_\-\s]*site|office|relocat|eligib|authoriz|willing|which/i.test(signal.combined)
    ) return "city";
    if (/\bprovince\b|\bstate\b|\bregion\b/i.test(signal.combined)) return "province";
  }
  if (/(?:authorized[_\-\s]*to[_\-\s]*work|authorization[_\-\s]*to[_\-\s]*work|legal[_\-\s]*right[_\-\s]*to[_\-\s]*work|right[_\-\s]*to[_\-\s]*work|work[_\-\s]*authorization|legally[_\-\s]*authorized)/i.test(signal.combined)) return "legallyAuthorized";
  if (/(?:require[_\-\s]*sponsorship|visa[_\-\s]*sponsorship|sponsorship[_\-\s]*require|work[_\-\s]*visa)/i.test(signal.combined)) return "requiresSponsorship";
  if (/(?:currently|current)[_\-\s]*located[_\-\s]*in[_\-\s]*canada|located[_\-\s]*in[_\-\s]*canada|based[_\-\s]*in[_\-\s]*canada/i.test(signal.combined)) return "currentlyLocatedInCanada";
  if (!isChoice && /(?:desired[_\-\s]*salary|salary[_\-\s]*expectation|compensation[_\-\s]*expectation|salary[_\-\s]*target)/i.test(signal.combined)) return "desiredSalary";
  if (/(?:notice[_\-\s]*period|start[_\-\s]*date|earliest[_\-\s]*start|how[_\-\s]*soon[_\-\s]*can[_\-\s]*you[_\-\s]*start)/i.test(signal.combined)) return "noticePeriod";
  if (!isChoice && /(?:intro[_\-\s]*one[_\-\s]*liner|short[_\-\s]*intro|brief[_\-\s]*intro|elevator[_\-\s]*pitch)/i.test(signal.combined)) return "introOneLiner";
  if (/how[_\-\s]*(?:did|do)[_\-\s]*you[_\-\s]*(?:hear|find[_\-\s]*out|learn)[_\-\s]*about|how[_\-\s]*you[_\-\s]*heard|hear[_\-\s]*about[_\-\s]*(?:us|this)|referral[_\-\s]*source|source[_\-\s]*of[_\-\s]*(?:application|referral)/i.test(signal.combined)) return "howHeard";
  if (/(?:why[_\-\s]*company|why[_\-\s]*this[_\-\s]*role|why[_\-\s]*do[_\-\s]*you[_\-\s]*want[_\-\s]*to[_\-\s]*join|cover[_\-\s]*letter)/i.test(signal.combined) && input.tagName === "TEXTAREA") return "whyCompany";
  if (/(?:gender|sex|pronouns)/i.test(signal.combined)) return "gender";
  if (/(?:race|ethnicity|ethnic[_\-\s]*origin|racial[_\-\s]*identity)/i.test(signal.combined)) return "race";
  if (/(?:veteran|military[_\-\s]*service|protected[_\-\s]*veteran)/i.test(signal.combined)) return "veteranStatus";
  if (/(?:disability|disabilities|differently[_\-\s]*abled)/i.test(signal.combined)) return "disabilityStatus";
  if (!isChoice && /(?:portfolio|website|personal[_\-\s]*site|personal[_\-\s]*url)/i.test(signal.combined)) return "portfolio";
  if (!isChoice && /(?:github|gitlab|bitbucket)/i.test(signal.combined)) return "github";
  return "";
}

function valueLooksLikePhoneNumber(value) {
  const text = clean(value);
  if (!text) return false;
  const digits = text.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  return /^\+?[\d\s().-]+$/.test(text);
}

function fieldAcceptsPhoneValue(input) {
  if (knownProfileFieldKind(input) === "phone") return true;
  const signal = fieldSignals(input);
  return (
    signal.autocomplete.startsWith("tel") ||
    signal.inputMode === "tel" ||
    signal.inputType === "tel" ||
    /(?:phone|tel|mobile|cell|contact)/i.test(signal.combined)
  );
}

function getUnsafeAiValueReason(input, value) {
  if (valueLooksLikePhoneNumber(value) && !fieldAcceptsPhoneValue(input)) {
    return "Gemma returned a phone-looking value for a non-phone field.";
  }
  return "";
}

function profileValueForKnownField(kind, profile) {
  if (!kind || !profile) return "";
  const nameParts = (profile.fullName || "").trim().split(/\s+/);
  const firstName = nameParts.slice(0, -1).join(" ") || nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  if (kind === "firstName") return firstName;
  if (kind === "lastName") return lastName;
  if (kind === "fullName") return profile.fullName || "";
  if (kind === "email") return profile.email || "";
  if (kind === "country") return profileCountryInfo(profile).name;
  if (kind === "city") return profileCityValue(profile);
  if (kind === "province") return profileProvinceValue(profile);
  if (kind === "phone") {
    let phoneVal = profile.phone || "";
    if (phoneVal && !phoneVal.startsWith("+")) phoneVal = "+1" + phoneVal.replace(/[^\d]/g, "");
    return phoneVal;
  }
  if (kind === "currentlyLocatedInCanada") {
    const country = profileCountryInfo(profile).name.toLowerCase();
    return /^(canada|ca)$/i.test(country) ? "Yes" : "No";
  }
  if (kind === "howHeard") return profile.howHeard || "LinkedIn";
  return profile[kind] || "";
}

function findInputs() {
  const inputs = collectFillableElements();
  const mapped = {};

  inputs.forEach((input) => {
    const kind = knownProfileFieldKind(input);
    const key = {
      firstName: "firstName",
      lastName: "lastName",
      fullName: "fullName",
      email: "email",
      country: "country",
      city: "city",
      province: "province",
      phone: "phone",
      linkedin: "linkedin",
      legallyAuthorized: "legallyAuthorized",
      requiresSponsorship: "requiresSponsorship",
      currentlyLocatedInCanada: "currentlyLocatedInCanada",
      desiredSalary: "desiredSalary",
      noticePeriod: "noticePeriod",
      introOneLiner: "introOneLiner",
      howHeard: "howHeard",
      whyCompany: "whyCompany",
      gender: "gender",
      race: "race",
      veteranStatus: "veteranStatus",
      disabilityStatus: "disabilityStatus",
      portfolio: "portfolio",
      github: "github",
    }[kind];

    if (key) {
      mapped[key] = mapped[key] || [];
      mapped[key].push(input);
    }
  });

  return mapped;
}

// Chosen/Select2 search boxes are excluded from fill targets entirely — they
// have a backing native <select> that we fill instead (applySelectIndex even
// nudges the Chosen UI). Typing into their search input would double-fill.
function isLegacySelectWidgetInput(el) {
  if (!el || el.tagName !== "INPUT") return false;
  if (el.closest('.chosen-container, .chosen-search, .select2-container, .select2-search, [class*="select2-"], [class*="chosen-"]')) {
    return true;
  }
  const className = el.className || "";
  return typeof className === "string" && (className.includes("chosen") || className.includes("select2"));
}

function isReactSelectRequiredInput(el) {
  if (!el || el.tagName !== "INPUT") return false;
  const className = typeof el.className === "string" ? el.className : "";
  if (/requiredInput/i.test(className)) return true;
  if (el.id || el.name || el.getAttribute("role") || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
  if (!el.closest?.('[class*="select" i]')) return false;
  try {
    const style = window.getComputedStyle(el);
    return style.opacity === "0";
  } catch {
    return false;
  }
}

// ARIA comboboxes (React-Select, Greenhouse/Workday city pickers…) have NO
// backing <select>, so unlike Chosen/Select2 they must be filled directly —
// by typing the value and clicking the option that appears (fillComboboxField).
function isAriaComboboxInput(el) {
  if (!el || el.tagName !== "INPUT") return false;
  if (isLegacySelectWidgetInput(el)) return false;
  const autocompleteMode = el.getAttribute("aria-autocomplete");
  return (
    el.getAttribute("role") === "combobox" ||
    autocompleteMode === "list" ||
    autocompleteMode === "both" ||
    Boolean(el.closest('[role="combobox"]'))
  );
}

// Write a value to a native <input>/<textarea> via the prototype setter (so
// React/Vue observe it) wrapped in a realistic interaction envelope: pointer →
// focus → key → input → change → blur. The richer event sequence both helps
// frameworks capture the change reliably and makes the fill look like ordinary
// keyboard input rather than a scripted single assignment.
function setNativeValue(input, val) {
  const prototype = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const lastValue = input.value;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (descriptor && descriptor.set) {
    descriptor.set.call(input, val);
  } else {
    input.value = val;
  }
  // React 16+ caches each field's value in an internal `_valueTracker` and only
  // fires onChange when tracker.getValue() differs from the live value. Setting
  // the value via the prototype setter (above) bypasses React's instance setter,
  // so the tracker normally keeps the OLD value — but if React re-synced it (a
  // re-render between fill and submit) the change is missed, the controlled state
  // stays empty, and the form rejects the field as "required/not populated" on
  // submit even though it LOOKS filled. Forcing the tracker back to the previous
  // value guarantees the input/change events below register as a real edit.
  try {
    const tracker = input._valueTracker;
    if (tracker && typeof tracker.setValue === "function" && lastValue !== val) {
      tracker.setValue(lastValue);
    }
  } catch { /* no tracker / non-React field — the plain set above suffices */ }
}

function setInputValueKeepFocus(input, val) {
  if (!input) return;
  try {
    input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    input.focus();
    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    input.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    input.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Process" }));
    try {
      input.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: String(val) }));
    } catch (e) { /* InputEvent may be unsupported */ }

    setNativeValue(input, val);

    try {
      input.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: String(val) }));
    } catch (e) {
      input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }
    input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Process" }));
    input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  } catch (e) {
    try { setNativeValue(input, val); } catch (e2) { input.value = val; }
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  }
}

function blurInputLikeUser(input) {
  try {
    input.blur();
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  } catch (e) {
    input.dispatchEvent(new Event("blur", { bubbles: true }));
  }
}

function setInputValue(input, val) {
  if (!input) return;
  setInputValueKeepFocus(input, val);
  blurInputLikeUser(input);
}

// Per-keystroke typing into a focused control. Several lookups (Rippling's
// Location, verified live) only fire their suggestion fetch on real key
// events — a single bulk input event never triggers them.
async function typeCharsLikeUser(input, text) {
  setNativeValue(input, "");
  try {
    input.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "deleteContentBackward" }));
  } catch {
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  }
  for (const ch of Array.from(String(text))) {
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: ch }));
    try {
      input.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: ch }));
    } catch { /* unsupported */ }
    setNativeValue(input, (input.value || "") + ch);
    try {
      input.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: ch }));
    } catch {
      input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }
    input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: ch }));
    await sleep(24 + Math.random() * 30);
  }
}

// For plain inputs that secretly drive a suggestion lookup (Rippling Location
// has no combobox ARIA at all): focus, type per-keystroke WITHOUT blurring
// (blur kills the panel), give the suggestions a moment, click the best one —
// falling back to the FIRST suggestion, the lookup's own best match for the
// query — then blur.
async function fillLookupTextField(input, val) {
  try {
    input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    input.focus();
    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    input.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    input.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  } catch { /* typing below still works */ }
  await typeCharsLikeUser(input, val);
  input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  await commitTypedSuggestionIfAppears(input, val, { preferFirst: true });
  blurInputLikeUser(input);
  return true;
}

function setNativeChecked(input, checked) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
  if (descriptor && descriptor.set) {
    descriptor.set.call(input, checked);
  } else {
    input.checked = checked;
  }
}

function setCheckedInput(input, checked) {
  if (!input || input.disabled) return false;
  try {
    input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    input.focus();
    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    if (input.checked !== checked || (getInputType(input) === "radio" && checked)) {
      input.click();
    }
    if (input.checked !== checked) {
      setNativeChecked(input, checked);
    }

    input.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    input.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  } catch {
    try {
      setNativeChecked(input, checked);
    } catch {
      input.checked = checked;
    }
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  }

  try {
    input.blur();
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  } catch {
    input.dispatchEvent(new Event("blur", { bubbles: true }));
  }
  return input.checked === checked;
}

function normalizeChoiceText(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isGenericChoiceValue(value) {
  return /^(on|off)$/i.test(clean(value));
}

function choiceValueMeansYes(value) {
  const text = normalizeChoiceText(value);
  return /^(yes|y|true|1|checked|agree|agreed|accept|accepted)$/.test(text) || /\b(i agree|i accept|yes)\b/.test(text);
}

function choiceValueMeansNo(value) {
  const text = normalizeChoiceText(value);
  return /^(no|n|false|0|unchecked|decline|declined|disagree|opt out)$/.test(text) || /\b(no|do not|don t|not agree|decline|opt out)\b/.test(text);
}

function optionLooksYes(option) {
  const text = normalizeChoiceText(`${option.label} ${isGenericChoiceValue(option.value) ? "" : option.value}`);
  return /^(yes|y|true|1|agree|accept)\b/.test(text) || /\b(i agree|i accept)\b/.test(text);
}

function optionLooksNo(option) {
  const text = normalizeChoiceText(`${option.label} ${isGenericChoiceValue(option.value) ? "" : option.value}`);
  return /^(no|n|false|0|decline|disagree)\b/.test(text) || /\b(do not|don t|not agree|opt out)\b/.test(text);
}

function pickChoiceOption(input, val) {
  const options = getChoiceOptions(input).filter((option) => !option.input.disabled);
  const answer = normalizeChoiceText(val);
  if (!answer || !options.length) return null;

  const exact = options.find((option) => (
    normalizeChoiceText(option.label) === answer ||
    (!isGenericChoiceValue(option.value) && normalizeChoiceText(option.value) === answer)
  ));
  if (exact) return exact.input;

  if (choiceValueMeansYes(val)) {
    const yesOption = options.find(optionLooksYes);
    if (yesOption) return yesOption.input;
  }
  if (choiceValueMeansNo(val)) {
    const noOption = options.find(optionLooksNo);
    if (noOption) return noOption.input;
  }

  if ((choiceValueMeansYes(val) || choiceValueMeansNo(val)) && options.length === 2) {
    const groupText = normalizeChoiceText(getChoiceGroupContainer(input)?.textContent || "");
    const yesIndex = groupText.indexOf("yes");
    const noIndex = groupText.indexOf("no");
    if (yesIndex !== -1 && noIndex !== -1) {
      const yesFirst = yesIndex < noIndex;
      const targetIndex = choiceValueMeansYes(val)
        ? (yesFirst ? 0 : 1)
        : (yesFirst ? 1 : 0);
      return options[targetIndex]?.input || null;
    }
  }

  // Whole-token partial match only — substring matching here is how "No" got
  // checked for answers that merely contained those letters.
  const partial = options.find((option) => {
    const label = normalizeChoiceText(option.label);
    const value = isGenericChoiceValue(option.value) ? "" : normalizeChoiceText(option.value);
    return tokensInclude(label, answer) || tokensInclude(answer, label) ||
           tokensInclude(value, answer) || tokensInclude(answer, value);
  });
  return partial?.input || null;
}

function setChoiceValue(input, val) {
  if (!isChoiceInput(input)) return false;
  const type = getInputType(input);
  if (type === "radio") {
    const option = pickChoiceOption(input, val);
    return option ? setCheckedInput(option, true) : false;
  }

  if (choiceValueMeansYes(val)) {
    return setCheckedInput(input, true);
  }
  if (choiceValueMeansNo(val)) {
    return input.checked ? setCheckedInput(input, false) : true;
  }
  return false;
}

/* ==========================================================================
   Button / role-based choice groups (Ashby-style Yes/No segmented controls)
   --------------------------------------------------------------------------
   Some ATS — Ashby especially — render Yes/No and other single-select
   questions as a row of clickable <button>/[role=radio]/[role=button] toggles
   instead of native <input type="radio">. These never satisfy isChoiceInput,
   so the AI pass used to fall through and "type" the answer into them: a silent
   no-op that still reported success (a filled audit row for an empty control).
   The helpers below detect such a group, match the answer to an option by its
   visible text, and actually click it.
   ========================================================================== */

const BUTTON_CHOICE_OPTION_SELECTOR =
  'button, [role="radio"], [role="button"], [role="option"], [role="switch"], [role="tab"]';

// A single clickable option inside a button choice group.
function isButtonChoiceOptionEl(el) {
  if (!el || el.nodeType !== 1) return false;
  if (isInCopilotUi(el)) return false;
  if (el.disabled || el.getAttribute?.("aria-disabled") === "true") return false;
  const role = (el.getAttribute?.("role") || "").toLowerCase();
  if (el.tagName !== "BUTTON" && !["radio", "button", "option", "switch", "tab"].includes(role)) return false;
  const type = (el.getAttribute?.("type") || "").toLowerCase();
  if (type === "submit" || type === "reset") return false;
  if (isSubmitLikeControl(el)) return false; // never Apply/Submit/Next
  // Leaf options only — a wrapper that itself contains form controls is a
  // container, not an option.
  if (el.querySelector?.(FILLABLE_FIELD_SELECTOR)) return false;
  const text = clean(el.textContent || el.innerText || el.getAttribute?.("aria-label") || "");
  if (!text || text.length > 60) return false;
  return true;
}

function buttonOptionSelected(el) {
  if (!el) return false;
  const aria = (name) => el.getAttribute?.(name) === "true";
  if (aria("aria-checked") || aria("aria-pressed") || aria("aria-selected")) return true;
  const dataState = (el.getAttribute?.("data-state") || "").toLowerCase();
  if (["checked", "on", "active", "selected", "current"].includes(dataState)) return true;
  // CSS-module class names look like "_active_1svni_57" (Ashby's selected Yes/No
  // option). Underscores are \w, so /\bactive\b/ never matches — split on every
  // non-alphanumeric and match a state token exactly, so "inactive"/"_option_"
  // never false-positive.
  return getElementClassText(el)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .some((token) => ["active", "selected", "checked", "current", "isactive", "isselected"].includes(token));
}

function getButtonChoiceOptions(container) {
  if (!container) return [];
  const seen = new Set();
  const options = [];
  for (const el of Array.from(container.querySelectorAll?.(BUTTON_CHOICE_OPTION_SELECTOR) || [])) {
    if (!isButtonChoiceOptionEl(el)) continue;
    // Skip an option nested inside (or wrapping) one we already kept.
    if (options.some((o) => o.el.contains(el) || el.contains(o.el))) continue;
    const label = clean(el.textContent || el.innerText || el.getAttribute("aria-label") || "");
    const key = normalizeChoiceText(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    options.push({ el, label });
  }
  return options;
}

// True when `el` is a container holding 2–8 clickable button options whose only
// native control is a HIDDEN backing input (Ashby's pattern: a hidden checkbox
// behind visible <button>Yes/No</button>). A container that owns a VISIBLE field
// (real radios/text/select/textarea) is a normal form section, not a segmented
// toggle — this also stops a distant ancestor of a real radio group from being
// mistaken for a button group just because Yes/No buttons live elsewhere inside.
function isHiddenBackingField(f) {
  const type = (f.type || "").toLowerCase();
  if (["hidden", "submit", "button", "reset", "image"].includes(type)) return true;
  if (f.offsetParent === null) return true; // display:none / detached
  const rect = f.getBoundingClientRect?.();
  return Boolean(rect && rect.width <= 1 && rect.height <= 1);
}

function isButtonChoiceGroup(el) {
  if (!el || el.nodeType !== 1) return false;
  if (isInCopilotUi(el)) return false;
  if (el.matches?.(FILLABLE_FIELD_SELECTOR)) return false; // a native input itself
  const opts = getButtonChoiceOptions(el);
  if (opts.length < 2 || opts.length > 8) return false;
  const ownsVisibleField = Array.from(el.querySelectorAll?.("input, textarea, select") || [])
    .some((field) => !isInCopilotUi(field) && !isHiddenBackingField(field));
  return !ownsVisibleField;
}

// Resolve any element (an option, the group wrapper, or a nearby backing input)
// to the smallest enclosing button choice group.
function getButtonChoiceGroupContainer(el) {
  if (!el || el.nodeType !== 1) return null;
  const strong = el.closest?.('fieldset, [role="radiogroup"], [role="group"]');
  if (strong && isButtonChoiceGroup(strong)) return strong;
  let node = el.matches?.(BUTTON_CHOICE_OPTION_SELECTOR) ? el.parentElement : el;
  for (let depth = 0; node && node !== document.body && depth < 6; depth++, node = node.parentElement) {
    if (isInCopilotUi(node)) return null;
    if (isButtonChoiceGroup(node)) return node;
  }
  return null;
}

function buttonChoiceGroupAnswered(container) {
  return getButtonChoiceOptions(container).some((option) => buttonOptionSelected(option.el));
}

// Reuse the radio question heuristics so Gemma sees a real prompt, not "YesNo".
function getButtonChoiceQuestionText(container) {
  const pieces = [];
  const fieldset = container?.closest?.("fieldset");
  const legend = fieldset?.querySelector?.("legend");
  if (legend) pieces.push(clean(legend.textContent || legend.innerText || ""));
  const previousPrompt = getPreviousPromptText(container);
  if (previousPrompt) pieces.push(previousPrompt);
  const ariaLabel = clean(container?.getAttribute?.("aria-label") || "");
  if (ariaLabel) pieces.push(ariaLabel);
  const unique = [];
  pieces.forEach((piece) => { if (piece && !unique.includes(piece)) unique.push(piece); });
  return clean(unique.join(" ")).slice(0, 200);
}

// A button choice group reads as a real question (vs. a nav/tab strip) — used
// to keep discovery off segmented page chrome.
function buttonChoiceGroupLooksLikeQuestion(container) {
  const opts = getButtonChoiceOptions(container);
  const yesNoShape = (o) => ({ label: o.label, value: "" });
  if (opts.length === 2 && opts.some((o) => optionLooksYes(yesNoShape(o))) && opts.some((o) => optionLooksNo(yesNoShape(o)))) return true;
  const question = getButtonChoiceQuestionText(container);
  if (!question || question.length < 6) return false;
  return /\?/.test(question) || /\*/.test(question) || question.split(/\s+/).length >= 3;
}

function pickButtonChoiceOption(container, val) {
  const options = getButtonChoiceOptions(container);
  const answer = normalizeChoiceText(val);
  if (!answer || !options.length) return null;

  const exact = options.find((option) => normalizeChoiceText(option.label) === answer);
  if (exact) return exact;

  if (choiceValueMeansYes(val)) {
    const yesOption = options.find((option) => optionLooksYes({ label: option.label, value: "" }));
    if (yesOption) return yesOption;
  }
  if (choiceValueMeansNo(val)) {
    const noOption = options.find((option) => optionLooksNo({ label: option.label, value: "" }));
    if (noOption) return noOption;
  }

  if ((choiceValueMeansYes(val) || choiceValueMeansNo(val)) && options.length === 2) {
    const groupText = normalizeChoiceText(container?.textContent || "");
    const yesIndex = groupText.indexOf("yes");
    const noIndex = groupText.indexOf("no");
    if (yesIndex !== -1 && noIndex !== -1) {
      const yesFirst = yesIndex < noIndex;
      const targetIndex = choiceValueMeansYes(val) ? (yesFirst ? 0 : 1) : (yesFirst ? 1 : 0);
      return options[targetIndex] || null;
    }
  }

  // Whole-token partial match only (same guard as native radios).
  const partial = options.find((option) => {
    const label = normalizeChoiceText(option.label);
    return tokensInclude(label, answer) || tokensInclude(answer, label);
  });
  return partial || null;
}

function clickButtonChoiceOption(container, option) {
  if (!option?.el) return false;
  const el = option.el;
  try { el.scrollIntoView?.({ block: "center", inline: "nearest" }); } catch { /* ignore */ }
  try {
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    el.focus?.();
    el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    el.click();
  } catch {
    try { el.click(); } catch { /* ignore */ }
  }
  // Mirror ARIA state for widgets that read it back (only attributes already
  // present — never invent state on the page).
  const role = (el.getAttribute?.("role") || "").toLowerCase();
  getButtonChoiceOptions(container).forEach((other) => {
    const isTarget = other.el === el;
    if (other.el.hasAttribute?.("aria-checked") || role === "radio") other.el.setAttribute("aria-checked", String(isTarget));
    if (other.el.hasAttribute?.("aria-pressed")) other.el.setAttribute("aria-pressed", String(isTarget));
    if (other.el.hasAttribute?.("aria-selected") || role === "tab" || role === "option") other.el.setAttribute("aria-selected", String(isTarget));
  });
  return true;
}

function setButtonChoiceValue(container, val) {
  const option = pickButtonChoiceOption(container, val);
  if (!option) return false;
  return clickButtonChoiceOption(container, option);
}

// Discover button choice groups for the AI pass. Conservative: only fieldset /
// role=group / role=radiogroup wrappers that read like real questions, so we
// never click segmented nav/tab chrome.
function collectButtonChoiceGroups({ visibleOnly = true } = {}) {
  const found = [];
  for (const el of querySelectorAllDeep(document, 'fieldset, [role="radiogroup"], [role="group"]')) {
    if (isInCopilotUi(el)) continue;
    if (!isButtonChoiceGroup(el)) continue;
    if (visibleOnly && !elementLooksVisible(el)) continue;
    if (!buttonChoiceGroupLooksLikeQuestion(el)) continue;
    found.push(el);
  }
  // Keep the innermost group when wrappers nest.
  return found.filter((group) => !found.some((other) => other !== group && group.contains(other)));
}

// Type free-text into a field one character at a time with small randomized
// delays and per-keystroke events. Used for long AI-drafted answers so the
// field receives natural keystroke timing instead of an instant paste. Returns
// a promise that resolves once typing completes.
function typeHumanLike(input, text, { minDelay = 12, maxDelay = 38 } = {}) {
  return new Promise((resolve) => {
    if (!input || !text) {
      resolve();
      return;
    }
    try {
      input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      input.focus();
      input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    } catch (e) { /* ignore */ }
    setNativeValue(input, "");
    const chars = Array.from(String(text));
    let i = 0;
    const typeNext = () => {
      if (i >= chars.length) {
        input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
        try {
          input.blur();
          input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
        } catch (e) { /* ignore */ }
        resolve();
        return;
      }
      const ch = chars[i];
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: ch }));
      try {
        input.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: ch }));
      } catch (e) { /* ignore */ }
      setNativeValue(input, chars.slice(0, i + 1).join(""));
      try {
        input.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: ch }));
      } catch (e) {
        input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      }
      input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: ch }));
      i += 1;
      // Longer pauses after sentence punctuation feel more natural.
      const punctuation = /[.,!?;\n]/.test(ch);
      const base = minDelay + Math.random() * (maxDelay - minDelay);
      setTimeout(typeNext, punctuation ? base + 80 + Math.random() * 120 : base);
    };
    typeNext();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Whole-token containment on normalizeChoiceText output. Plain substring
// matching picked "No" for answers like "I do not know" ("no" inside "know").
function tokensInclude(haystack, needle) {
  if (!haystack || !needle) return false;
  return new RegExp(`(?:^| )${escapeRegExp(needle)}(?: |$)`).test(haystack);
}

// Callers pass raw option text ("Select...", "-- Please choose --") as well as
// pre-normalized text, so normalize here — matching raw text against a
// lowercase-only pattern silently classified every "Select..." default as a
// real answer and made isFieldAlreadyAnswered skip the whole dropdown.
function isPlaceholderOptionText(text) {
  if (/^\s*-+\s*$/.test(String(text || ""))) return true;
  const normalized = normalizeChoiceText(text);
  if (!normalized) return true;
  return (
    /^(please )?(select|choose|pick)( (one|an option|a option|option|options|an answer|a value|value|from( the)? list|below))?( below)?( required)?$/.test(normalized) ||
    /^(none|no selection|not selected|not specified|select a response|choose a response)$/.test(normalized)
  );
}

// Ordered, strict matcher for native <select> options. Returns -1 rather than
// guessing — a wrong dropdown answer is worse than an empty one the user can
// see and fix. Placeholder rows ("Select...", "--") never match.
function findBestSelectOptionIndex(select, val) {
  const target = normalizeChoiceText(val);
  if (!target || !select) return -1;
  const entries = Array.from(select.options)
    .map((opt, index) => ({
      index,
      text: normalizeChoiceText(opt.text),
      value: normalizeChoiceText(opt.value),
    }))
    .filter((entry) => !isPlaceholderOptionText(entry.text));
  if (!entries.length) return -1;

  let found = entries.find((entry) => entry.text === target || entry.value === target);
  if (found) return found.index;

  // Yes/no semantics only when the answer leads with yes/no or is very short —
  // "I do not know" contains a no-phrase but must NOT snap to "No".
  if (/^(yes|no)\b/.test(target) || target.split(" ").length <= 2) {
    if (choiceValueMeansYes(val)) {
      found = entries.find((entry) => /^yes\b/.test(entry.text));
      if (found) return found.index;
    }
    if (choiceValueMeansNo(val)) {
      found = entries.find((entry) => /^no\b/.test(entry.text));
      if (found) return found.index;
    }
  }

  found = entries.find((entry) => entry.text.startsWith(target) || (entry.text.length >= 4 && target.startsWith(entry.text)));
  if (found) return found.index;

  found = entries.find((entry) => tokensInclude(entry.text, target) || tokensInclude(target, entry.text));
  if (found) return found.index;

  // Last resort: token-overlap scoring, because Gemma paraphrases options it
  // was told to copy verbatim ("Master's degree" vs "Master's Degree (M.A.,
  // M.S., M.Eng.)"). Only accept a UNIQUE option sharing at least half its
  // tokens with the answer — ties or weak overlap keep the strict -1.
  const scored = scoreOptionEntries(entries, target);
  return scored ? scored.index : -1;
}

// Shared overlap scorer for select options and combobox option lists. Returns
// the entry only when it is the single clear winner (score >= 0.5, no tie).
function scoreOptionEntries(entries, target) {
  const targetTokens = target.split(" ").filter((token) => token.length > 1);
  if (!targetTokens.length) return null;
  const targetSet = new Set(targetTokens);
  let best = null;
  let bestScore = 0;
  let tied = false;
  for (const entry of entries) {
    const optionTokens = entry.text.split(" ").filter((token) => token.length > 1);
    if (!optionTokens.length) continue;
    const overlap = optionTokens.filter((token) => targetSet.has(token)).length;
    const score = overlap / Math.max(optionTokens.length, targetTokens.length);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
      tied = false;
    } else if (score === bestScore && score > 0) {
      tied = true;
    }
  }
  return best && !tied && bestScore >= 0.5 ? best : null;
}

// ── Dynamic combobox fill (React-Select, Workday/Greenhouse pickers…) ──
// These widgets need the flow a human follows: focus, type to filter, wait for
// the listbox to render (city lookups can be async), then CLICK the matching
// option so the widget commits a real value instead of loose text.

function findComboboxListbox(input) {
  const ids = `${input.getAttribute("aria-controls") || ""} ${input.getAttribute("aria-owns") || ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const root = getFieldRoot(input);
  for (const id of ids) {
    try {
      const el = getRootElementById(root, id) || document.getElementById(id);
      if (el) return el;
    } catch {
      // invalid id — keep looking
    }
  }
  return null;
}

function getComboboxOptions(input) {
  // 1. The listbox the input points at (react-select sets aria-controls only
  //    once the menu is open, so this is re-read on every poll).
  const scope = findComboboxListbox(input);
  let options = scope ? Array.from(scope.querySelectorAll('[role="option"]')) : [];
  if (!options.length && scope && /^(listbox|menu)$/i.test(scope.getAttribute("role") || "")) {
    options = Array.from(scope.querySelectorAll("li, [data-value], [data-option]"));
  }

  // 2. Menu attached inside the widget's own wrapper (climb a few ancestors).
  if (!options.length) {
    let node = input.parentElement;
    for (let depth = 0; node && node !== document.body && depth < 5 && !options.length; depth++, node = node.parentElement) {
      options = Array.from(node.querySelectorAll('[role="option"]')).filter(elementLooksVisible);
    }
  }

  // 3. Global fallback — but NEVER another widget's options: intl-tel-input
  //    keeps 250 country rows with role="option" permanently in the DOM, and
  //    matching against those starves the real menu.
  const inIti = Boolean(input.closest?.(".iti"));
  if (!options.length) {
    options = querySelectorAllDeep(document, '[role="option"]')
      .filter(elementLooksVisible)
      .filter((option) => inIti || !option.closest(".iti"));
  }

  return options.filter(
    (option) => !isInCopilotUi(option) &&
      // Strict equality: Rippling stamps aria-disabled="false" on every
      // option, and the string "false" is truthy — a truthiness check
      // discarded ALL of its options and the fill retyped in a loop.
      option.getAttribute("aria-disabled") !== "true" &&
      (inIti || !option.closest(".iti"))
  );
}

function pickBestOptionElement(options, val) {
  const target = normalizeChoiceText(val);
  if (!target || !options.length) return null;
  const entries = options
    .map((el) => ({ el, text: normalizeChoiceText(el.textContent || "") }))
    .filter((entry) => entry.text && !isPlaceholderOptionText(entry.text));
  let found = entries.find((entry) => entry.text === target);
  if (found) return found.el;
  found = entries.find((entry) => entry.text.startsWith(target) || target.startsWith(entry.text));
  if (found) return found.el;
  found = entries.find((entry) => tokensInclude(entry.text, target) || tokensInclude(target, entry.text));
  if (found) return found.el;
  // Overlap scoring rescues near-misses like "Vancouver, BC, Canada" against a
  // rendered "Vancouver, British Columbia, Canada" row.
  const scored = scoreOptionEntries(entries, target);
  return scored ? scored.el : null;
}

function getComboboxControl(input) {
  const toggleButton = getComboboxToggleButton(input);
  if (toggleButton) return toggleButton;

  let node = getComposedParent(input);
  while (node && node !== document.body) {
    if (node.matches?.('[class*="select__control" i], [role="combobox"], [data-baseweb]')) return node;
    node = getComposedParent(node);
  }
  node = getComposedParent(input);
  while (node && node !== document.body) {
    if (node.matches?.('[class*="select" i]')) return node;
    node = getComposedParent(node);
  }
  return input;
}

function clickElementLikeUser(el) {
  if (!el || isSubmitLikeControl(el)) return false;
  try {
    el.scrollIntoView({ block: "nearest" });
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    el.click();
    return true;
  } catch {
    return false;
  }
}

async function settleComboboxField(input) {
  if (!input) return;
  try {
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape", keyCode: 27 }));
    input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Escape", keyCode: 27 }));
  } catch { /* ignore */ }
  try {
    input.blur();
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  } catch {
    input.dispatchEvent(new Event("blur", { bubbles: true }));
  }
  await sleep(120);
}

async function fillComboboxField(input, val, { preferFirstOnFilter = false } = {}) {
  if (!input || val === undefined || val === null || val === "") return false;
  const value = String(val);
  const control = getComboboxControl(input);

  try {
    if (control && control !== input) clickElementLikeUser(control);
    input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    input.focus();
    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    input.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    input.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    input.click?.();
  } catch {
    // typing below may still open the listbox
  }

  if (input.getAttribute("aria-expanded") !== "true") {
    try {
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown", keyCode: 40 }));
      input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "ArrowDown", keyCode: 40 }));
      await sleep(120);
    } catch {
      // Some custom controls ignore keyboard-open events; typing below can still filter.
    }
  }

  // Type to filter — deliberately NO blur between keys, blur closes the listbox.
  const typeFilter = (text) => typeCharsLikeUser(input, text);

  // Lookup values like "Vancouver, BC, Canada" can return zero rows when fed
  // verbatim to a remote city service — the first comma segment is the retry.
  const firstSegment = clean(String(value).split(/[,(]/)[0] || "");
  const hasRetrySegment = firstSegment && normalizeChoiceText(firstSegment) !== normalizeChoiceText(value);
  const valueCommitted = () =>
    comboboxValueMatches(input, value) || (hasRetrySegment && comboboxValueMatches(input, firstSegment));

  // Poll for the filtered option list. Remote lookups render LATE — Greenhouse's
  // city service was measured taking 3-5s, so the window must be generous.
  const pollForOption = async (matchValues, timeoutMs) => {
    for (let waited = 0; waited < timeoutMs; waited += 250) {
      await sleep(250);
      // Some widgets auto-commit while we wait (e.g. single exact match).
      if (input.getAttribute("aria-expanded") === "false" && valueCommitted()) return { committed: true };
      const rendered = getComboboxOptions(input);
      for (const matchValue of matchValues) {
        const found = pickBestOptionElement(rendered, matchValue);
        if (found) return { option: found };
      }
      // Location lookups: once the filtered rows have had time to settle, the
      // FIRST row is the service's own best match for what we typed.
      if (preferFirstOnFilter && waited >= 1000) {
        const first = rendered.filter(elementLooksVisible).find((el) => !isPlaceholderOptionText(el.textContent || ""));
        if (first) return { option: first };
      }
    }
    return {};
  };

  await typeFilter(value);
  let { option, committed } = await pollForOption([value], hasRetrySegment ? 5000 : 8000);

  if (!option && !committed && hasRetrySegment) {
    await typeFilter(firstSegment);
    // Match rendered rows against the full value first so "Vancouver" typed
    // still picks "Vancouver, British Columbia, Canada" over "Vancouver, WA".
    ({ option, committed } = await pollForOption([value, firstSegment], 5000));
  }

  // Typing filtered everything out (the widget's wording shares no prefix
  // with the answer — "Canadian Permanent Resident" vs "Canadian Citizen or
  // Permanent Resident"). Clear the filter so EVERY option renders and score
  // the answer against the full list.
  if (!option && !committed) {
    await typeFilter("");
    try {
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown", keyCode: 40 }));
      input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "ArrowDown", keyCode: 40 }));
    } catch { /* ignore */ }
    await sleep(700);
    option = pickBestOptionElement(getComboboxOptions(input), value);
  }

  if (committed) {
    await settleComboboxField(input);
    return true;
  }

  if (option) {
    const optionText = clean(option.textContent || "");
    clickElementLikeUser(option);
    await sleep(250);
    // If the click didn't commit (some widgets only listen for keyboard), the
    // option is highlighted from the click — Enter confirms it.
    if (!valueCommitted() && !comboboxValueMatches(input, optionText)) {
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter", keyCode: 13 }));
      input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter", keyCode: 13 }));
      await sleep(150);
    }
    input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    // Success means the widget committed the row we clicked — judge against the
    // option's own text too, not only the (possibly differently spelled) value.
    const ok = valueCommitted() || comboboxValueMatches(input, optionText) || comboboxLooksAnswered(input);
    await settleComboboxField(input);
    return ok;
  }

  // No matching option anywhere. Leave the field CLEAN instead of committing
  // loose text — leftover junk ("Decline to Self-Identify" typed into a picker
  // whose options say "Choose not to disclose") blocks the user's own pick,
  // and a value the widget never offered is suspect anyway. The skip lands in
  // the audit log with the proposed value so nothing is silent.
  await typeFilter("");
  await settleComboboxField(input);
  return false;
}

// ── Split phone widgets (intl-tel-input ".iti", react-phone-number-input) ──
// These pair the phone input with a separate country/dial-code picker, so the
// input must receive the NATIONAL number: a leading +1 in the text makes the
// ATS validation fail (verified on Greenhouse job-boards, which uses iti).

function getPhoneCountryWidget(input) {
  const iti = input.closest?.(".iti");
  if (iti) return { kind: "iti", root: iti };
  const pni = input.closest?.(".PhoneInput");
  if (pni && pni.querySelector("select")) return { kind: "pni", root: pni };
  return null;
}

function nationalPhoneDigits(rawPhone) {
  const digits = String(rawPhone || "").replace(/[^\d]/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

const PROFILE_COUNTRY_ISO = {
  canada: { iso2: "ca", dialCode: "1" },
  "united states": { iso2: "us", dialCode: "1" },
  usa: { iso2: "us", dialCode: "1" },
  "united states of america": { iso2: "us", dialCode: "1" },
};

function profileCountryInfo(profile) {
  const name = clean(profile?.country || "") || "Canada";
  const info = PROFILE_COUNTRY_ISO[name.toLowerCase()] || {};
  return { name, iso2: info.iso2 || "", dialCode: info.dialCode || "" };
}

function profileCityValue(profile) {
  return clean(profile?.city || profile?.location || "") || "Vancouver";
}

function profileProvinceValue(profile) {
  return clean(profile?.province || profile?.region || profile?.state || "") || "BC";
}

const PROVINCE_FULL_NAMES = {
  bc: "British Columbia", ab: "Alberta", sk: "Saskatchewan", mb: "Manitoba",
  on: "Ontario", qc: "Quebec", ns: "Nova Scotia", nb: "New Brunswick",
  nl: "Newfoundland and Labrador", pe: "Prince Edward Island",
  yt: "Yukon", nt: "Northwest Territories", nu: "Nunavut",
};

// Ordered candidate values for location fields. Option lists spell locations
// every which way ("Vancouver", "Vancouver, BC", "Vancouver, British Columbia,
// Canada", "British Columbia", "Canada") — try from most to least specific.
function locationValueCandidates(kind, profile) {
  const city = profileCityValue(profile);
  const prov = profileProvinceValue(profile);
  const provFull = PROVINCE_FULL_NAMES[normalizeChoiceText(prov)] || prov;
  const country = profileCountryInfo(profile).name;
  const cityBase = clean(city.split(",")[0]) || city;
  const list =
    kind === "province" ? [prov, provFull, country]
    : kind === "country" ? [country]
    : [city, `${cityBase}, ${prov}`, `${cityBase}, ${provFull}`, cityBase, provFull, country];
  return [...new Set(list.map((value) => clean(value)).filter(Boolean))];
}

// "Decline" answers are worded differently per ATS ("Decline to Self-Identify",
// "Choose not to disclose", "Prefer not to say"…); offer the synonyms.
function declineAnswerCandidates(primary) {
  return [...new Set([
    clean(primary),
    "Choose not to disclose",
    "Prefer not to say",
    "Decline to answer",
    "I do not wish to answer",
  ].filter(Boolean))];
}

// Some plain text inputs are really lookup pickers with no combobox ARIA at
// all (Rippling's Location): suggestions render after typing and the value
// only commits when a suggestion is CLICKED. After typing, briefly watch for
// suggestion rows and click the best match; harmless when none appear.
async function commitTypedSuggestionIfAppears(input, val, { preferFirst = false } = {}) {
  for (let waited = 0; waited < 2500; waited += 300) {
    await sleep(300);
    const options = getComboboxOptions(input).filter(elementLooksVisible);
    if (!options.length) continue;
    const best = pickBestOptionElement(options, val);
    if (best) {
      clickElementLikeUser(best);
      await sleep(200);
      return true;
    }
    // For lookups filtered by what we just typed (city pickers), the first
    // suggestion is the service's own best interpretation of the query —
    // "Vancouver, BC" → "Vancouver, BC, Canada". Take it.
    if (preferFirst && !isPlaceholderOptionText(options[0].textContent || "")) {
      clickElementLikeUser(options[0]);
      await sleep(200);
      return true;
    }
    return false; // suggestions exist but none match — leave typed text alone
  }
  return false;
}

function findNearbyCountryCombobox(input) {
  const scopes = getNearbyFieldScopes(input);

  for (const scope of scopes) {
    const candidates = querySelectorAllDeep(scope, "input")
      .filter((el) => el !== input && isAriaComboboxInput(el))
      .filter((el) => !el.closest?.(".iti__dropdown-content, .iti__country-list"))
      .filter((el) => /\bcountry\b/i.test(`${getAutofillFieldLabel(el)} ${el.id || ""} ${el.name || ""} ${el.getAttribute("aria-label") || ""}`));
    if (candidates.length) return candidates[0];
  }
  return null;
}

function getNearbyFieldScopes(input) {
  const scopes = [];
  let node = input;
  let depth = 0;
  while (node && node !== document.body && depth < 6) {
    const parent = getComposedParent(node);
    if (!parent) break;
    scopes.push(parent);
    node = parent;
    depth++;
  }
  scopes.push(input?.closest?.("fieldset"), input?.closest?.(".phone-input"), input?.closest?.(".PhoneInput"), input?.form, getFieldRoot(input), document);
  return scopes.filter((scope, index, all) => scope && all.indexOf(scope) === index);
}

// Rippling-style split phones pair the number input with a combobox whose
// VALUE is the dial code ("+1 US") — no .iti/.PhoneInput class, no "country"
// in any label. The dial-code-shaped value is the only reliable signal.
function findNearbyDialCodeCombobox(input) {
  const scopes = getNearbyFieldScopes(input).slice(0, 4);
  for (const scope of scopes) {
    const candidate = querySelectorAllDeep(scope, "input")
      .filter((el) => el !== input && isAriaComboboxInput(el))
      .find((el) => /^\+\d{1,4}\b/.test(clean(el.value || "")));
    if (candidate) return candidate;
  }
  return null;
}

function findNearbyCountrySelect(input) {
  const scopes = getNearbyFieldScopes(input);
  for (const scope of scopes) {
    const candidates = querySelectorAllDeep(scope, "select")
      .filter((el) => el !== input)
      .filter((el) => /\bcountry\b/i.test(`${getAutofillFieldLabel(el)} ${el.id || ""} ${el.name || ""} ${el.getAttribute("aria-label") || ""}`));
    if (candidates.length) return candidates[0];
  }
  return null;
}

function hasNearbyCountryPicker(input) {
  const scopes = getNearbyFieldScopes(input).slice(0, 4);
  return scopes.some((scope) => /\bcountry\b/i.test(clean(scope.textContent || scope.innerText || "")));
}

// Select a country in an intl-tel-input widget: open the flag dropdown, click
// the matching list item. Verified DOM: button.iti__selected-country (or the
// older .iti__selected-flag) opens it; items are li.iti__country[data-country-code].
async function setItiCountry(root, { name, iso2 }) {
  if (!iso2) return false;
  const btn = root.querySelector(".iti__selected-country, .iti__selected-flag");
  if (!btn) return false;
  const currentLabel = `${btn.getAttribute("title") || ""} ${btn.getAttribute("aria-label") || ""}`.toLowerCase();
  if (currentLabel.includes(name.toLowerCase())) return true;
  clickElementLikeUser(btn);
  await sleep(160);
  const item =
    root.querySelector(`.iti__country[data-country-code="${iso2}"]`) ||
    document.querySelector(`.iti__country[data-country-code="${iso2}"]`);
  if (!item) {
    clickElementLikeUser(btn); // close the dropdown again
    return false;
  }
  clickElementLikeUser(item);
  await sleep(120);
  return true;
}

async function fillSplitPhoneField(input, rawPhone, profile) {
  const national = nationalPhoneDigits(rawPhone);
  if (!national) return false;
  const widget = getPhoneCountryWidget(input);
  const country = profileCountryInfo(profile);
  const countryCombobox = findNearbyCountryCombobox(input);
  const countrySelect = findNearbyCountrySelect(input);
  const dialCodeCombobox = findNearbyDialCodeCombobox(input);
  const hasCountryPicker = Boolean(countryCombobox || countrySelect || dialCodeCombobox || hasNearbyCountryPicker(input));
  if (widget) {
    if (countryCombobox && !isFieldAlreadyAnswered(countryCombobox)) {
      await fillComboboxField(countryCombobox, country.name);
    }
    if (widget.kind === "iti") {
      await setItiCountry(widget.root, country);
    } else if (widget.kind === "pni" && country.iso2) {
      setSelectValue(widget.root.querySelector("select"), country.iso2.toUpperCase());
    }
    setInputValue(input, national);
    return true;
  }
  if (countryCombobox && !isFieldAlreadyAnswered(countryCombobox)) {
    await fillComboboxField(countryCombobox, country.name);
  } else if (countrySelect && !isFieldAlreadyAnswered(countrySelect)) {
    setSelectValue(countrySelect, country.name, "country");
  }
  if (hasCountryPicker) {
    setInputValue(input, national);
    return true;
  }
  // Plain phone input with no paired picker — international format is safest.
  setInputValue(input, national.length === 10 ? `+1${national}` : `+${national}`);
  return true;
}

function applySelectIndex(select, index) {
  if (!select || index === -1) return;
  try {
    select.focus();
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "selectedIndex");
    if (descriptor && descriptor.set) {
      descriptor.set.call(select, index);
    } else {
      select.selectedIndex = index;
    }
    
    const options = Array.from(select.options);
    if (options[index]) {
      const valDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
      if (valDescriptor && valDescriptor.set) {
        valDescriptor.set.call(select, options[index].value);
      } else {
        select.value = options[index].value;
      }
    }
  } catch (e) {
    select.selectedIndex = index;
  }
  
  // Dispatch reactive events statefully so modern web frameworks capture the change
  select.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  select.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  
  // Support for Chosen dropdowns
  try {
    const chosenContainer = document.getElementById((select.id || "") + "_chosen") || 
                            (select.nextElementSibling && select.nextElementSibling.classList.contains("chosen-container") ? select.nextElementSibling : null);
    if (chosenContainer) {
      const chosenResult = chosenContainer.querySelector(`li[data-option-array-index="${index}"]`);
      if (chosenResult) {
        // Chosen expects mousedown/mouseup sequence on the result item to select it and update everything
        chosenResult.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        chosenResult.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
        chosenResult.click();
      }
    }
  } catch (e) {
    console.warn("Chosen helper update failed:", e);
  }

  try {
    select.blur();
  } catch (e) {
    select.dispatchEvent(new Event("blur", { bubbles: true }));
  }
}

function setSelectValue(select, val, type) {
  if (!select) return false;
  const options = Array.from(select.options);
  const lowerVal = String(val).toLowerCase().trim();

  // 1. Strict ordered match (exact → yes/no → prefix → whole-token)
  let matchedIndex = findBestSelectOptionIndex(select, val);

  // 2. Fallbacks based on demographic types
  if (matchedIndex === -1) {
    if (type === "legallyAuthorized") {
      matchedIndex = options.findIndex(opt => {
        const text = opt.text.toLowerCase();
        return lowerVal === "yes" ? (text.startsWith("yes") || text.includes("authorized")) : (text.startsWith("no") || text.includes("not authorized"));
      });
    } else if (type === "requiresSponsorship") {
      matchedIndex = options.findIndex(opt => {
        const text = opt.text.toLowerCase();
        return lowerVal === "yes" ? (text.startsWith("yes") || text.includes("require")) : (text.startsWith("no") || text.includes("not require") || text.includes("don't require"));
      });
    } else if (type === "gender") {
      matchedIndex = options.findIndex(opt => {
        const text = opt.text.toLowerCase();
        if (lowerVal.includes("decline") || lowerVal.includes("identify")) {
          return text.includes("decline") || text.includes("disclose") || text.includes("not wish") || text.includes("prefer not");
        }
        return text.includes(lowerVal);
      });
    } else if (type === "race") {
      matchedIndex = options.findIndex(opt => {
        const text = opt.text.toLowerCase();
        if (lowerVal.includes("decline") || lowerVal.includes("identify")) {
          return text.includes("decline") || text.includes("disclose") || text.includes("not wish") || text.includes("prefer not");
        }
        return text.includes(lowerVal);
      });
    } else if (type === "veteranStatus") {
      matchedIndex = options.findIndex(opt => {
        const text = opt.text.toLowerCase();
        if (lowerVal.includes("decline") || lowerVal.includes("identify")) {
          return text.includes("decline") || text.includes("disclose") || text.includes("not wish") || text.includes("prefer not");
        }
        if (lowerVal === "yes") {
          return text.startsWith("yes") || text.includes("protected veteran") || text.includes("identify as a veteran");
        }
        return text.startsWith("no") || text.includes("not a veteran") || !text.includes("active duty");
      });
    } else if (type === "disabilityStatus") {
      matchedIndex = options.findIndex(opt => {
        const text = opt.text.toLowerCase();
        if (lowerVal.includes("decline") || lowerVal.includes("identify")) {
          return text.includes("decline") || text.includes("disclose") || text.includes("not wish") || text.includes("prefer not");
        }
        if (lowerVal.includes("yes")) {
          return text.startsWith("yes") || text.includes("have a disability") || text.includes("individual with a disability");
        }
        return text.startsWith("no") || text.includes("don't have") || text.includes("do not have");
      });
    }
  }

  // 3. Fallback for demographic fields only: choose "decline" / "prefer not".
  // Never apply this to ordinary dropdowns — leaving them empty beats picking
  // an option the answer never named.
  if (matchedIndex === -1 && ["gender", "race", "veteranStatus", "disabilityStatus"].includes(type)) {
    matchedIndex = options.findIndex(opt => opt.text.toLowerCase().includes("decline") || opt.text.toLowerCase().includes("prefer not"));
  }

  if (matchedIndex !== -1) {
    applySelectIndex(select, matchedIndex);
    return true;
  }
  return false;
}

function pickResumeText(profile) {
  const cv2 = profile.resumeText2 || "";
  const cv1 = profile.resumeText || "";
  if (selectedCv === "architect") return { text: cv2 || cv1, label: cv2 ? "Architect CV" : "Backend CV (fallback)" };
  if (selectedCv === "backend") return { text: cv1, label: "Backend CV" };
  // "auto": use architect CV only when resumeText2 exists and the page text signals architect/cloud/principal roles
  if (cv2) {
    const pageText = (document.body?.textContent || "").toLowerCase();
    const architectSignals = /\b(architect|principal|cloud architect|solution architect|platform architect|enterprise architect|staff engineer|distinguished)\b/.test(pageText);
    if (architectSignals) return { text: cv2, label: "Architect CV (auto)" };
  }
  return { text: cv1, label: "Backend CV (auto)" };
}

// Describe one form control for the Gemma autofill prompt. Shared between the
// bulk custom-field pass and the toolbar "Ask Gemma" single-field flow.
function buildAiFieldDescriptor(el) {
  const desc = {
    label: getAutofillFieldLabel(el).slice(0, 200),
    name: (el.name || "").slice(0, 100),
    id: (el.id || "").slice(0, 100),
    // "combobox" tells Gemma this is a dynamic search picker (city etc.)
    // expecting one short canonical value, not a sentence.
    tag: isAriaComboboxInput(el) ? "combobox" : el.tagName.toLowerCase(),
    placeholder: (el.placeholder || "").slice(0, 150),
    inputType: (el.type || "").toLowerCase(),
  };
  // Segmented button group (Ashby Yes/No etc.) — either `el` IS the group
  // (discovery) or `el` is a field BACKED by one (a hidden checkbox/radio, or a
  // plain input behind the buttons). The buttons are the real options, so prefer
  // them over the backing input's own (often useless) value list.
  const buttonGroup = isButtonChoiceGroup(el) ? el : getButtonChoiceGroupContainer(el);
  if (buttonGroup) {
    const options = getButtonChoiceOptions(buttonGroup)
      .map((option) => option.label)
      .filter((text) => text && text.length < 120)
      .slice(0, 20);
    if (options.length) {
      desc.tag = "radio";
      desc.options = options;
      const question = getButtonChoiceQuestionText(buttonGroup);
      if (question && question.length > (desc.label || "").length) desc.label = question.slice(0, 200);
      return desc;
    }
  }
  // For select elements, include the options so AI can pick from them
  if (el.tagName === "SELECT") {
    desc.options = Array.from(el.options)
      .map((opt) => opt.text.trim())
      .filter((t) => t && !isPlaceholderOptionText(t) && t.length < 100)
      .slice(0, 30);
  }
  if (isChoiceInput(el)) {
    desc.options = getChoiceOptions(el)
      .map((option) => {
        const label = option.label || option.value;
        if (!label) return "";
        return option.value &&
          !isGenericChoiceValue(option.value) &&
          normalizeChoiceText(option.value) !== normalizeChoiceText(label)
          ? `${label} (${option.value})`
          : label;
      })
      .filter((text) => text && text.length < 120)
      .slice(0, 20);
  }
  return desc;
}

// Write a Gemma-proposed value into any supported control. Returns the outcome
// for the audit log; never throws. respectProfileGuard pins identity-ish
// fields (city, sponsorship…) to the profile value — the toolbar Ask flow
// turns it off because there the user's instruction is the authority.
async function applyAiValueToField(el, value, { profile = localProfile, respectProfileGuard = true } = {}) {
  const knownKind = respectProfileGuard ? knownProfileFieldKind(el) : "";
  const guardedValue = ["country", "city", "province", "legallyAuthorized", "requiresSponsorship", "currentlyLocatedInCanada", "howHeard"].includes(knownKind)
    ? profileValueForKnownField(knownKind, profile)
    : "";
  const valueToFill = guardedValue || value;
  const isLocationKind = ["country", "city", "province"].includes(knownKind);
  // Location answers come in many spellings — try the profile's candidate
  // forms (city → "city, prov" → province → country) against option widgets.
  const candidateValues = isLocationKind
    ? [...new Set([String(valueToFill), ...locationValueCandidates(knownKind, profile)])]
    : [String(valueToFill)];
  // Defense in depth: never fill a fabricated placeholder URL (the
  // server scrubs these too, but cached/legacy responses may slip by).
  if (/^(?:https?:\/\/)?(?:www\.)?(?:goog?le\.[a-z.]+|example\.(?:com|org|net)|test\.com|yourwebsite\.com|website\.com|url\.com|placeholder\.[a-z]+|sample\.com|mywebsite\.com|my-?portfolio\.[a-z]+|portfolio\.com|yoursite\.com|yourname\.com|johndoe\.[a-z]+|janedoe\.[a-z]+)(?:\/.*)?$/i.test(String(valueToFill).trim())) {
    return { filled: false, skippedSilently: true, displayValue: valueToFill, reason: "Placeholder URL discarded." };
  }
  const unsafeReason = getUnsafeAiValueReason(el, valueToFill);
  if (unsafeReason) {
    return { filled: false, displayValue: valueToFill, reason: unsafeReason };
  }

  if (el.tagName === "SELECT") {
    // Strict match only — if Gemma answered with text that isn't one of
    // the options, leave the select untouched and say so in the audit.
    for (const candidate of candidateValues) {
      const matchIdx = findBestSelectOptionIndex(el, candidate);
      if (matchIdx !== -1) {
        applySelectIndex(el, matchIdx);
        return { filled: true, displayValue: Array.from(el.options)[matchIdx]?.text || candidate };
      }
    }
    return { filled: false, displayValue: valueToFill, reason: "The proposed value did not match any listed option." };
  }
  if (isChoiceInput(el)) {
    // Ashby renders Yes/No as visible <button>s backed by a HIDDEN checkbox.
    // Toggling that hidden box leaves the question "unanswered" (and never moves
    // the visible UI) — when a backing button group exists, click the button.
    const backingGroup = getButtonChoiceGroupContainer(el);
    if (backingGroup) {
      for (const candidate of candidateValues) {
        if (setButtonChoiceValue(backingGroup, candidate)) return { filled: true, displayValue: candidate };
      }
    }
    for (const candidate of candidateValues) {
      if (setChoiceValue(el, candidate)) return { filled: true, displayValue: candidate };
    }
    return { filled: false, displayValue: valueToFill, reason: "The proposed value did not match any radio/checkbox option." };
  }
  if (isButtonChoiceGroup(el)) {
    for (const candidate of candidateValues) {
      if (setButtonChoiceValue(el, candidate)) return { filled: true, displayValue: candidate };
    }
    return { filled: false, displayValue: valueToFill, reason: "The proposed value did not match any Yes/No option." };
  }
  if (isAriaComboboxInput(el)) {
    // Cap retries — every failed candidate is a visible retype of the field.
    for (const candidate of candidateValues.slice(0, 3)) {
      if (await fillComboboxField(el, candidate, { preferFirstOnFilter: isLocationKind })) {
        return { filled: true, displayValue: getComboboxSelectedText(el) || candidate };
      }
    }
    return { filled: false, displayValue: valueToFill, reason: "No matching combobox option appeared after typing." };
  }
  if (isLocationKind && el.tagName === "INPUT") {
    await fillLookupTextField(el, String(valueToFill));
    return { filled: true, displayValue: el.value || valueToFill };
  }
  // A segmented Yes/No / button group associated with this field — Ashby's real
  // control is the button, not the (often hidden) backing input. Click the
  // matching option. We only act when the answer actually matches an option, so
  // genuine text fields that merely sit near buttons fall through to typing.
  const adjacentGroup = getButtonChoiceGroupContainer(el);
  if (adjacentGroup) {
    for (const candidate of candidateValues) {
      if (setButtonChoiceValue(adjacentGroup, candidate)) return { filled: true, displayValue: candidate };
    }
  }
  // Only TYPE into genuine free-text controls. Typing into anything else (a
  // styled toggle's backing element) is a silent no-op — reporting that as
  // filled is exactly what hid the Ashby Yes/No bug.
  const elType = (el.type || "").toLowerCase();
  const isTextLike =
    el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && ["text", "email", "tel", "url", "search", "number", "month", "week", "date", ""].includes(elType));
  if (isTextLike) {
    setInputValue(el, valueToFill);
    return { filled: true, displayValue: valueToFill };
  }
  return {
    filled: false,
    displayValue: valueToFill,
    reason: adjacentGroup
      ? "Could not match the answer to a Yes/No option — set it manually."
      : "Unsupported control type — please set this one manually.",
  };
}

async function autofillWebForm(profile, { useAi = false, runId = "" } = {}) {
  if (!profile) return;
  const now = Date.now();
  if (autofillRunInProgress && now - autofillRunStartedAt < 30000) {
    if (IS_TOP_FRAME) showToast("Autofill is already running on this form.");
    return;
  }
  autofillRunInProgress = true;
  autofillRunStartedAt = now;
  try {
    return await autofillWebFormLocked(profile, { useAi, runId });
  } finally {
    autofillRunInProgress = false;
  }
}

async function autofillWebFormLocked(profile, { useAi = false, runId = "" } = {}) {
  if (!profile) return;
  if (IS_TOP_FRAME) {
    currentAutofillRunId = runId || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    frameAutofillResults = [];
    lastAutofillAuditLog = [];
    lastAutofillSkippedAlreadyFilledCount = 0;
  }
  const activeRunId = IS_TOP_FRAME ? currentAutofillRunId : runId;
  ensureCopilotPanel(profile);
  expandWidget();
  attachFormSubmitTracker("scan/prefill clicked", { silent: true });
  showCopilotPanel("autofill");

  // Ask the background worker to relay this fill into any embedded ATS iframes
  // (all_frames content scripts) — the top document cannot script them directly.
  if (IS_TOP_FRAME && window.frames.length > 0) {
    try {
      chrome.runtime
        .sendMessage({ type: "JH_BROADCAST_AUTOFILL", profile, useAi, cv: selectedCv, runId: activeRunId })
        .catch(() => {});
    } catch {
      // extension context invalidated — top-frame fill still proceeds
    }
  }

  const summaryEl = document.getElementById("jh-autofill-summary");
  const logContainer = document.getElementById("jh-autofill-audit-log");
  const logList = document.getElementById("jh-autofill-audit-list");
  if (summaryEl) summaryEl.textContent = "Scanning visible form fields...";
  if (logContainer) logContainer.hidden = false;
  if (logList) logList.innerHTML = "";

  // Pick CV before scanning
  const { text: resumeText, label: cvLabel } = pickResumeText(profile);

  // Update fill button to show which CV was selected (DOM methods, no innerHTML)
  const fillBtn = document.getElementById("jh-btn-prefill");
  if (fillBtn) {
    fillBtn.replaceChildren();
    const icon = document.createElement("span");
    icon.className = "jh-icon";
    icon.textContent = "⚡";
    const lbl = document.createElement("span");
    lbl.className = "jh-btn-label";
    lbl.textContent = "Fill";
    fillBtn.append(icon, lbl);
    fillBtn.title = `Used: ${cvLabel}`;
  }

  // Show explicit details of what we're feeding to Gemma
  const jobCtxForLog = extractJob();
  const gemmaFeedDetail = `${jobCtxForLog.pageText.length} chars of cleaned page text + your profile prompt + ${cvLabel}`;

  updateWorkflowSteps("autofill", [
    { status: "done", label: "Submit tracker attached", detail: "Final submit will be saved automatically." },
    { status: "done", label: `CV selected: ${cvLabel}`, detail: resumeText ? `${resumeText.length} chars` : "No CV text in profile" },
    { status: "active", label: "Scanning visible form controls" },
    { status: "pending", label: "Filling profile fields" },
    { status: useAi ? "pending" : "done", label: "Gemma custom-field pass", detail: useAi ? `Will feed: ${gemmaFeedDetail}` : "Skipped by request." },
  ]);

  const mapped = findInputs();
  let filledCount = 0;

  // Requiredness context for this form: only meaningful when at least one
  // field is actually marked required (attribute, aria, or * in the label).
  const formMarksRequired = collectFillableElements().some(fieldLooksRequired);

  const nameParts = (profile.fullName || "").trim().split(/\s+/);
  const firstName = nameParts.slice(0, -1).join(" ") || nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  // Format phone with +1 country code
  let phoneVal = profile.phone || "";
  if (phoneVal && !phoneVal.startsWith("+")) {
    phoneVal = "+1" + phoneVal.replace(/[^\d]/g, "");
  }
  const countryInfo = profileCountryInfo(profile);
  const cityVal = profileCityValue(profile);
  const provinceVal = profileProvinceValue(profile);

  // Track which DOM elements were already filled by regex
  const regexFilledElements = new Set();
  const alreadyAnsweredElements = new Set();
  let skippedAlreadyFilledCount = 0;

  // Audit log stores plain objects — rendered via DOM methods to avoid XSS from
  // third-party page label text landing in innerHTML.
  const auditLog = [];

  const skipIfAlreadyAnswered = (input) => {
    if (!isFieldAlreadyAnswered(input)) return false;
    if (noteAlreadyAnswered(input, alreadyAnsweredElements)) skippedAlreadyFilledCount++;
    return true;
  };

  // Combobox and split-phone fills are async (type → wait → click), and only
  // one dropdown can be open at a time — queue them and run sequentially after
  // the synchronous pass.
  const asyncFillQueue = [];

  // `val` may be a single value or an ORDERED list of candidates (location
  // spellings, decline synonyms) — tried until one matches the widget.
  const LOCATION_KINDS = new Set(["city", "province", "country"]);
  const fillList = (inputs, val, type) => {
    const values = (Array.isArray(val) ? val : [val])
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String);
    if (!inputs || !values.length) return;
    const primary = values[0];
    inputs.forEach((input) => {
      if (wasFieldFilled(regexFilledElements, input)) return;
      if (skipIfAlreadyAnswered(input)) return;
      let didFill = true;
      let filledWith = primary;
      if (input.tagName === "SELECT") {
        filledWith = values.find((value) => setSelectValue(input, value, type));
        didFill = filledWith !== undefined;
      } else if (isChoiceInput(input)) {
        filledWith = values.find((value) => setChoiceValue(input, value));
        didFill = filledWith !== undefined;
      } else if (type === "phone" && input.tagName === "INPUT") {
        // fillSplitPhoneField decides national-vs-international from the DOM
        // (paired country picker → national number + set the country itself).
        asyncFillQueue.push({
          input,
          run: () => fillSplitPhoneField(input, profile.phone || primary, profile),
          auditValue: () => input.value || primary,
        });
        return;
      } else if (isAriaComboboxInput(input)) {
        asyncFillQueue.push({
          input,
          run: async () => {
            // Cap retries: each failed candidate is a visible retype of the
            // field. With preferFirstOnFilter the first candidate commits
            // whenever the widget shows ANY suggestions, so more than a few
            // attempts only ever replays the failure.
            for (const value of values.slice(0, 3)) {
              if (await fillComboboxField(input, value, { preferFirstOnFilter: LOCATION_KINDS.has(type) })) return true;
            }
            return false;
          },
          auditValue: () => getComboboxSelectedText(input) || primary,
        });
        return;
      } else if (LOCATION_KINDS.has(type) && input.tagName === "INPUT") {
        // Plain-looking inputs can still be suggestion lookups (Rippling's
        // Location): type, then click the suggestion that appears.
        asyncFillQueue.push({
          input,
          run: () => fillLookupTextField(input, primary),
          auditValue: () => input.value || primary,
        });
        return;
      } else {
        setInputValue(input, primary);
      }
      if (!didFill) return;
      markFieldFilled(regexFilledElements, input);
      filledCount++;
      auditLog.push(makeAuditEntry(input, filledWith ?? primary, { ai: false }));
    });
  };

  // ── Phase 1: Fast regex-based fills (core identity fields only) ──
  if (mapped.firstName) fillList(mapped.firstName, firstName);
  if (mapped.lastName) fillList(mapped.lastName, lastName);
  if (mapped.fullName) fillList(mapped.fullName, profile.fullName);
  if (mapped.email) fillList(mapped.email, profile.email);
  if (mapped.country) fillList(mapped.country, locationValueCandidates("country", profile), "country");
  if (mapped.city) fillList(mapped.city, locationValueCandidates("city", profile), "city");
  if (mapped.province) fillList(mapped.province, locationValueCandidates("province", profile), "province");
  if (mapped.phone) fillList(mapped.phone, phoneVal, "phone");
  if (mapped.linkedin) fillList(mapped.linkedin, profile.linkedin);
  if (mapped.legallyAuthorized) fillList(mapped.legallyAuthorized, profile.legallyAuthorized || "Yes", "legallyAuthorized");
  if (mapped.requiresSponsorship) fillList(mapped.requiresSponsorship, profile.requiresSponsorship || "No", "requiresSponsorship");
  if (mapped.currentlyLocatedInCanada) fillList(mapped.currentlyLocatedInCanada, profileValueForKnownField("currentlyLocatedInCanada", profile), "currentlyLocatedInCanada");
  if (mapped.desiredSalary) fillList(mapped.desiredSalary, profile.desiredSalary);
  if (mapped.noticePeriod) fillList(mapped.noticePeriod, profile.noticePeriod);
  if (mapped.introOneLiner) fillList(mapped.introOneLiner, profile.introOneLiner);
  if (mapped.whyCompany) fillList(mapped.whyCompany, profile.whyCompany);
  // Demographic/self-ID fields: only auto-fill when the form requires them.
  // Optional pronouns/race/veteran pickers stay untouched (user request) —
  // typing "Decline to Self-Identify" into an optional pronouns search box
  // just leaves junk text.
  const requiredOnlyDemographics = (inputs) => (inputs || []).filter((input) => {
    if (!fieldIsSkippableOptional(input, formMarksRequired)) return true;
    auditLog.push(makeSkippedAuditEntry(input, "", "Optional demographic field — left for you.", { ai: false }));
    return false;
  });
  if (mapped.gender) fillList(requiredOnlyDemographics(mapped.gender), declineAnswerCandidates(profile.gender || "Decline to Self-Identify"), "gender");
  if (mapped.race) fillList(requiredOnlyDemographics(mapped.race), declineAnswerCandidates(profile.race || "Decline to Self-Identify"), "race");
  if (mapped.veteranStatus) fillList(requiredOnlyDemographics(mapped.veteranStatus), profile.veteranStatus || "No", "veteranStatus");
  if (mapped.disabilityStatus) fillList(requiredOnlyDemographics(mapped.disabilityStatus), profile.disabilityStatus || "No, I don't have a disability", "disabilityStatus");
  if (mapped.howHeard) fillList(mapped.howHeard, profile.howHeard || "LinkedIn", "howHeard");
  if (mapped.portfolio) fillList(mapped.portfolio, profile.portfolio);
  if (mapped.github) fillList(mapped.github, profile.github);

  // Drain the queued async fills (comboboxes, split phones) one at a time.
  for (const task of asyncFillQueue) {
    let ok = false;
    try {
      if (wasFieldFilled(regexFilledElements, task.input)) continue;
      if (skipIfAlreadyAnswered(task.input)) continue;
      ok = await task.run();
    } catch {
      ok = false;
    }
    if (!ok) continue;
    markFieldFilled(regexFilledElements, task.input);
    filledCount++;
    auditLog.push(makeAuditEntry(task.input, task.auditValue(), { ai: false }));
  }

  // ── CV text injection: paste resume text into visible textareas ──
  if (resumeText) {
    const allInputs = collectFillableElements({ visibleOnly: true });
    allInputs.forEach((el) => {
      if (el.tagName !== "TEXTAREA") return;
      if (wasFieldFilled(regexFilledElements, el)) return;
      if (skipIfAlreadyAnswered(el)) return;
      const label = getAutofillFieldLabel(el).toLowerCase();
      if (/\b(resume|cv|curriculum\s*vitae|paste\s*resume|copy\s*paste\s*(your\s*)?resume)\b/.test(label)) {
        setInputValue(el, resumeText);
        markFieldFilled(regexFilledElements, el);
        filledCount++;
        auditLog.push(makeAuditEntry(el, `[${cvLabel} — ${resumeText.length} chars]`, { ai: false }));
      }
    });
  }

  // ── CV file injection: upload the real CV file (PDF/DOCX) into the form ──
  // Deliberately deferred to run as the LAST autofill step (user request):
  // every text/select/combobox fill lands first, so a slow upload widget or an
  // ATS re-render triggered by the file can't disrupt them. The variant
  // follows the same auto-selection as the CV text above, so the attached
  // file always matches the text Gemma was shown.
  let cvInjectionDone = false;
  const injectCvFileLastStep = async () => {
    if (cvInjectionDone) return;
    cvInjectionDone = true;
    const cvVariantForFile =
      selectedCv === "architect" ? "architect"
      : selectedCv === "backend" ? "backend"
      : cvLabel.toLowerCase().startsWith("architect") ? "architect" : "backend";
    try {
      const cvInjection = await injectCvFileToInputs(cvVariantForFile, auditLog);
      if (cvInjection.injected) filledCount++;
    } catch (err) {
      console.warn("CV file injection failed:", err);
    }
  };

  updateWorkflowSteps("autofill", [
    { status: "done", label: "Submit tracker attached", detail: "Final submit will be saved automatically." },
    { status: "done", label: "Scanned visible form controls" },
    { status: "done", label: "Filled profile fields", detail: `${filledCount} basic field${filledCount === 1 ? "" : "s"} changed.` },
    { status: useAi ? "active" : "done", label: "Gemma custom-field pass", detail: useAi ? "Preparing unmatched fields." : "Skipped by request." },
  ]);

  if (!useAi) {
    await injectCvFileLastStep();
    showToast(`Auto-filled ${filledCount} fields. Gemma was not used. ⚡`);
    renderAutofillAudit(auditLog, { skippedAlreadyFilledCount });
    return { filledCount, auditLog, skippedAlreadyFilledCount };
  }

  showToast(`Filled ${filledCount} basic fields. Asking Gemma for custom questions...`);

  // ── Phase 2: AI-powered fill for remaining unmatched fields ──
  try {
    const allInputs = collectFillableElements();

    // Filter to only unfilled, visible fields
    const unmatchedFields = allInputs.filter((el) => {
      if (wasFieldFilled(regexFilledElements, el)) return false;
      // Skip already-filled fields (user or regex)
      if (skipIfAlreadyAnswered(el)) return false;
      // Keep SELECT elements even if hidden by custom styled elements.
      if (el.tagName !== "SELECT" && !isVisibleFillTarget(el)) return false;
      // Optional fields stay empty (user request) — Gemma only answers what
      // the form actually demands. Surfaced in the audit so it's not silent.
      if (fieldIsSkippableOptional(el, formMarksRequired)) {
        auditLog.push(makeSkippedAuditEntry(el, "", "Optional field — Gemma fills required fields only.", { ai: true }));
        return false;
      }
      return true;
    });

    // Ashby-style Yes/No and segmented single-selects have no native <input>, so
    // collectFillableElements never sees them. Gather them separately and let
    // Gemma answer them like any other choice question.
    const buttonGroups = collectButtonChoiceGroups().filter((group) => {
      // Already represented by a collected native field (the group's backing
      // input) — that field's apply path clicks the button, so don't double-ask.
      if (unmatchedFields.some((field) => group.contains(field))) return false;
      if (wasFieldFilled(regexFilledElements, group)) return false;
      if (buttonChoiceGroupAnswered(group)) {
        if (noteAlreadyAnswered(group, alreadyAnsweredElements)) skippedAlreadyFilledCount++;
        return false;
      }
      if (fieldIsSkippableOptional(group, formMarksRequired)) {
        auditLog.push(makeSkippedAuditEntry(group, "", "Optional question — Gemma fills required fields only.", { ai: true }));
        return false;
      }
      return true;
    });
    unmatchedFields.push(...buttonGroups);

    if (unmatchedFields.length > 0 && unmatchedFields.length <= 40) {
      const jobContext = extractJob();
      updateWorkflowSteps("autofill", [
        { status: "done", label: "Submit tracker attached", detail: "Final submit will be saved automatically." },
        { status: "done", label: "Scanned visible form controls" },
        { status: "done", label: "Filled profile fields", detail: `${filledCount} basic field${filledCount === 1 ? "" : "s"} changed.` },
        { status: "active", label: "Gemma custom-field pass", detail: `${unmatchedFields.length} field${unmatchedFields.length === 1 ? "" : "s"}, ${jobContext.pageText.length} cleaned chars.` },
      ]);
      // Build field descriptors for AI
      const fieldDescriptors = unmatchedFields.map(buildAiFieldDescriptor);

      const aiResult = await apiProxy(
        "http://127.0.0.1:8787/api/autofill-ai",
        "POST",
        { fields: fieldDescriptors, job: jobContext, pageText: jobContext.pageText || jobContext.description || "" }
      );

      if (aiResult && aiResult.mappings) {
        let aiFilledCount = 0;
        for (const [indexStr, value] of Object.entries(aiResult.mappings)) {
          const idx = parseInt(indexStr, 10);
          const el = unmatchedFields[idx];
          if (!el || !value || value === "") continue;
          if (wasFieldFilled(regexFilledElements, el)) continue;
          if (skipIfAlreadyAnswered(el)) continue;
          const outcome = await applyAiValueToField(el, value, { profile });
          if (outcome.skippedSilently) continue;
          if (outcome.filled) {
            aiFilledCount++;
            if (el.tagName !== "SELECT") markFieldFilled(regexFilledElements, el);
            auditLog.push(makeAuditEntry(el, outcome.displayValue, { ai: true }));
          } else {
            auditLog.push(makeSkippedAuditEntry(el, outcome.displayValue, outcome.reason, { ai: true }));
          }
        }
      filledCount += aiFilledCount;
      await injectCvFileLastStep();
      updateWorkflowSteps("autofill", [
        { status: "done", label: "Submit tracker attached", detail: "Final submit will be saved automatically." },
        { status: "done", label: "Scanned visible form controls" },
        { status: "done", label: "Filled profile fields", detail: `${filledCount - aiFilledCount} basic field${filledCount - aiFilledCount === 1 ? "" : "s"} changed.` },
        { status: "done", label: "Gemma custom-field pass", detail: `${aiFilledCount} field${aiFilledCount === 1 ? "" : "s"} filled from cleaned page context.` },
      ]);
      showToast(`Auto-filled ${filledCount} fields total (${aiFilledCount} with Gemma).`);
      renderAutofillAudit(auditLog, { skippedAlreadyFilledCount });
      return { filledCount, auditLog, skippedAlreadyFilledCount };
      } else {
        await injectCvFileLastStep();
        updateWorkflowSteps("autofill", [
          { status: "done", label: "Submit tracker attached", detail: "Final submit will be saved automatically." },
          { status: "done", label: "Scanned visible form controls" },
          { status: "done", label: "Filled profile fields", detail: `${filledCount} basic field${filledCount === 1 ? "" : "s"} changed.` },
          { status: "error", label: "Gemma custom-field pass", detail: "No confident answers returned." },
        ]);
        showToast(`Auto-filled ${filledCount} fields. Gemma did not return confident custom answers.`);
        renderAutofillAudit(auditLog, { skippedAlreadyFilledCount });
        return { filledCount, auditLog, skippedAlreadyFilledCount };
      }
    } else {
      await injectCvFileLastStep();
      updateWorkflowSteps("autofill", [
        { status: "done", label: "Submit tracker attached", detail: "Final submit will be saved automatically." },
        { status: "done", label: "Scanned visible form controls" },
        { status: "done", label: "Filled profile fields", detail: `${filledCount} basic field${filledCount === 1 ? "" : "s"} changed.` },
        unmatchedFields.length > 40
          ? { status: "error", label: "Gemma custom-field pass", detail: "Too many fields for one pass." }
          : { status: "done", label: "Gemma custom-field pass", detail: "No empty custom fields left." },
      ]);
      showToast(`Auto-filled ${filledCount} fields. ${unmatchedFields.length > 40 ? "Too many custom fields for one Gemma pass." : "No custom fields left for Gemma."}`);
      renderAutofillAudit(auditLog, { skippedAlreadyFilledCount });
      return { filledCount, auditLog, skippedAlreadyFilledCount };
    }
  } catch (err) {
    console.warn("AI autofill phase failed:", err);
    updateWorkflowSteps("autofill", [
      { status: "done", label: "Submit tracker attached", detail: "Final submit will be saved automatically." },
      { status: "done", label: "Scanned visible form controls" },
      { status: "done", label: "Filled profile fields", detail: `${filledCount} basic field${filledCount === 1 ? "" : "s"} changed.` },
      { status: "error", label: "Gemma custom-field pass failed", detail: err.message || "Local Gemma/server unavailable." },
    ]);
    showToast(`Auto-filled ${filledCount} fields. Gemma autofill failed or is busy.`);
  }

  await injectCvFileLastStep();
  renderAutofillAudit(auditLog, { skippedAlreadyFilledCount });
  return { filledCount, auditLog, skippedAlreadyFilledCount };
}

function renderAutofillAudit(auditLog, { skippedAlreadyFilledCount = 0 } = {}) {
  const logContainer = document.getElementById("jh-autofill-audit-log");
  const logList = document.getElementById("jh-autofill-audit-list");
  const summaryEl = document.getElementById("jh-autofill-summary");
  if (IS_TOP_FRAME) {
    lastAutofillAuditLog = Array.isArray(auditLog) ? auditLog.slice() : [];
    lastAutofillSkippedAlreadyFilledCount = skippedAlreadyFilledCount;
  }

  const nestedLogs = IS_TOP_FRAME
    ? frameAutofillResults.flatMap((result) => (result.auditLog || []).map((item) => ({
      ...item,
      label: `${result.frameHost || "embedded form"}: ${item.label || "Unnamed field"}`,
    })))
    : [];
  const nestedSkipped = IS_TOP_FRAME
    ? frameAutofillResults.reduce((sum, result) => sum + Number(result.skippedAlreadyFilledCount || 0), 0)
    : 0;
  const combinedAuditLog = [...(auditLog || []), ...nestedLogs];
  const totalSkippedAlreadyFilled = skippedAlreadyFilledCount + nestedSkipped;
  const itemIsSkipped = (item) => item?.status === "skipped" || /^\s*⚠/.test(String(item?.value || ""));
  const changedLog = combinedAuditLog.filter((item) => !itemIsSkipped(item));
  const profileCount = changedLog.filter((item) => !item.ai).length;
  const aiCount = changedLog.filter((item) => item.ai).length;
  const skippedCount = combinedAuditLog.length - changedLog.length;

  if (summaryEl) {
    if (combinedAuditLog.length) {
      summaryEl.textContent = `${changedLog.length} field${changedLog.length === 1 ? "" : "s"} changed: ${profileCount} profile, ${aiCount} Gemma.${skippedCount ? ` ${skippedCount} proposed value${skippedCount === 1 ? "" : "s"} not filled.` : ""}${totalSkippedAlreadyFilled ? ` ${totalSkippedAlreadyFilled} already-filled field${totalSkippedAlreadyFilled === 1 ? "" : "s"} left alone.` : ""}`;
    } else if (totalSkippedAlreadyFilled) {
      summaryEl.textContent = `No empty fields changed. ${totalSkippedAlreadyFilled} supported field${totalSkippedAlreadyFilled === 1 ? "" : "s"} already had values.`;
    } else {
      summaryEl.textContent = "No supported empty form fields were found on this page.";
    }
  }

  if (!logContainer || !logList) return;
  logContainer.hidden = false;
  logList.replaceChildren();

  if (!combinedAuditLog.length) {
    const li = document.createElement("li");
    li.className = "jh-audit-row empty";
    const emptyText = document.createElement("span");
    emptyText.className = "jh-audit-empty";
    emptyText.textContent = totalSkippedAlreadyFilled
      ? "Already-filled fields were left untouched."
      : "No fields changed.";
    li.appendChild(emptyText);
    logList.appendChild(li);
    return;
  }

  combinedAuditLog.forEach((item) => {
    const { label, value, copyValue, reason, ai, status, copyText } = item || {};
    const isSkipped = status === "skipped" || /^\s*⚠/.test(String(value || ""));
    const li = document.createElement("li");
    li.className = `jh-audit-row${isSkipped ? " skipped" : ""}`;

    const fieldWrap = document.createElement("div");
    fieldWrap.className = "jh-audit-field-wrap";

    const field = document.createElement("strong");
    field.className = "jh-audit-field";
    field.textContent = label || "Unnamed field";

    const val = document.createElement("span");
    val.className = "jh-audit-value";
    val.textContent = value || "(empty)";

    fieldWrap.append(field, val);

    if (isSkipped && copyValue) {
      const proposed = document.createElement("span");
      proposed.className = "jh-audit-proposed";
      proposed.textContent = `Proposed: ${copyValue}`;
      fieldWrap.appendChild(proposed);
    }

    if (isSkipped && reason) {
      const reasonEl = document.createElement("span");
      reasonEl.className = "jh-audit-reason";
      reasonEl.textContent = `Why: ${reason}`;
      fieldWrap.appendChild(reasonEl);
    }

    const metaWrap = document.createElement("div");
    metaWrap.className = "jh-audit-meta";

    const source = document.createElement("span");
    source.className = ai ? "jh-audit-source ai" : "jh-audit-source profile";
    source.textContent = ai ? "Gemma" : "Profile";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "jh-audit-copy";
    copyButton.textContent = "Copy";
    copyButton.title = isSkipped ? "Copy proposed value and reason" : "Copy value";
    copyButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const fallbackCopy = [
        `Field: ${label || "Unnamed field"}`,
        `Source: ${ai ? "Gemma" : "Profile"}`,
        `Status: ${isSkipped ? "Not filled" : "Filled"}`,
        reason ? `Reason: ${reason}` : "",
        copyValue ? `${isSkipped ? "Proposed value" : "Value"}: ${copyValue}` : `Value: ${value || ""}`,
      ].filter(Boolean).join("\n");
      try {
        await copyTextToClipboard(copyText || fallbackCopy);
        copyButton.textContent = "Copied";
        setTimeout(() => {
          copyButton.textContent = "Copy";
        }, 1200);
      } catch {
        showToast("Could not copy this field text.");
      }
    });

    metaWrap.append(source, copyButton);
    li.append(fieldWrap, metaWrap);
    logList.appendChild(li);
  });
}


/* ==========================================================================
   ⚡ IN-CONTEXT INLINE ASSISTANT PROMPT ELEMENT
   ========================================================================== */

function showInlineTriggerFor(el) {
  removeInlineTrigger();
  removeInlineDropdown();

  const rect = el.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  inlineTrigger = document.createElement("div");
  inlineTrigger.id = "jh-inline-trigger";
  inlineTrigger.textContent = "⚡";
  
  const triggerWidth = 22;
  const triggerHeight = 22;
  
  const leftPos = rect.right + scrollLeft - triggerWidth - 6;
  const topPos = rect.top + scrollTop + (rect.height - triggerHeight) / 2;

  inlineTrigger.style.cssText = `
    position: absolute;
    left: ${leftPos}px;
    top: ${topPos}px;
    width: ${triggerWidth}px;
    height: ${triggerHeight}px;
    background: linear-gradient(135deg, #FFB300, #F57C00);
    color: #000;
    font-family: 'Outfit', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 800;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(245, 124, 0, 0.4);
    z-index: 1000003;
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    user-select: none;
  `;

  inlineTrigger.addEventListener("mouseenter", () => {
    inlineTrigger.style.transform = "scale(1.15)";
  });
  inlineTrigger.addEventListener("mouseleave", () => {
    inlineTrigger.style.transform = "scale(1)";
  });

  inlineTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleInlineDropdown(el, inlineTrigger);
  });

  document.body.appendChild(inlineTrigger);
}

function removeInlineTrigger() {
  if (inlineTrigger) {
    inlineTrigger.remove();
    inlineTrigger = null;
  }
}

function toggleInlineDropdown(input, trigger) {
  if (inlineDropdown) {
    removeInlineDropdown();
    return;
  }

  const label = getLabelText(input).toLowerCase();
  const name = (input.name || "").toLowerCase();
  const id = (input.id || "").toLowerCase();
  const placeholder = (input.placeholder || "").toLowerCase();

  const matches = (regex) => regex.test(label) || regex.test(name) || regex.test(id) || regex.test(placeholder);

  let fieldType = "question";
  let fieldLabel = "Custom Question";
  let fieldValue = "";

  if (localProfile) {
    if (matches(/(?:first|given)[_\-\s]*name|^fname$/i)) {
      const nameParts = (localProfile.fullName || "").trim().split(/\s+/);
      fieldValue = nameParts.slice(0, -1).join(" ") || nameParts[0] || "";
      fieldLabel = "First Name";
      fieldType = "first_name";
    } else if (matches(/(?:last|family|sur)[_\-\s]*name|^lname$|^surname$/i)) {
      const nameParts = (localProfile.fullName || "").trim().split(/\s+/);
      fieldValue = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
      fieldLabel = "Last Name";
      fieldType = "last_name";
    } else if (matches(/(?:full|whole)?[_\-\s]*name|^name$/i)) {
      fieldValue = localProfile.fullName;
      fieldLabel = "Full Name";
      fieldType = "full_name";
    } else if (matches(/email/i)) {
      fieldValue = localProfile.email;
      fieldLabel = "Email Address";
      fieldType = "email";
    } else if (matches(/(?:phone|tel|mobile|cell|contact)/i)) {
      let phoneVal = localProfile.phone || "";
      if (phoneVal && !phoneVal.startsWith("+")) {
        phoneVal = "+1" + phoneVal.replace(/[^\d]/g, "");
      }
      fieldValue = phoneVal;
      fieldLabel = "Phone Number";
      fieldType = "phone";
    } else if (matches(/linkedin/i)) {
      fieldValue = localProfile.linkedin;
      fieldLabel = "LinkedIn Profile";
      fieldType = "linkedin";
    } else if (matches(/(?:authorized[_\-\s]*to[_\-\s]*work|legal[_\-\s]*right[_\-\s]*to[_\-\s]*work|work[_\-\s]*authorization|legally[_\-\s]*authorized)/i)) {
      fieldValue = localProfile.legallyAuthorized || "Yes";
      fieldLabel = "Work Authorization";
      fieldType = "legallyAuthorized";
    } else if (matches(/(?:require[_\-\s]*sponsorship|visa[_\-\s]*sponsorship|sponsorship[_\-\s]*require|work[_\-\s]*visa)/i)) {
      fieldValue = localProfile.requiresSponsorship || "No";
      fieldLabel = "Sponsorship Requirement";
      fieldType = "requiresSponsorship";
    } else if (matches(/(?:desired[_\-\s]*salary|salary[_\-\s]*expectation|compensation[_\-\s]*expectation|salary[_\-\s]*target)/i)) {
      fieldValue = localProfile.desiredSalary;
      fieldLabel = "Desired Salary";
      fieldType = "desiredSalary";
    } else if (matches(/(?:notice[_\-\s]*period|start[_\-\s]*date|earliest[_\-\s]*start|how[_\-\s]*soon[_\-\s]*can[_\-\s]*you[_\-\s]*start)/i)) {
      fieldValue = localProfile.noticePeriod;
      fieldLabel = "Notice Period";
      fieldType = "noticePeriod";
    } else if (matches(/(?:intro[_\-\s]*one[_\-\s]*liner|short[_\-\s]*intro|brief[_\-\s]*intro|elevator[_\-\s]*pitch)/i)) {
      fieldValue = localProfile.introOneLiner;
      fieldLabel = "Intro Snippet";
      fieldType = "introOneLiner";
    } else if (matches(/(?:why[_\-\s]*company|why[_\-\s]*this[_\-\s]*role|why[_\-\s]*do[_\-\s]*you[_\-\s]*want[_\-\s]*to[_\-\s]*join|cover[_\-\s]*letter)/i) && input.tagName === "TEXTAREA") {
      fieldValue = localProfile.whyCompany;
      fieldLabel = "Why Company Snippet";
      fieldType = "whyCompany";
    } else if (matches(/(?:gender|sex|pronouns)/i)) {
      fieldValue = localProfile.gender || "Decline to Self-Identify";
      fieldLabel = "Gender";
      fieldType = "gender";
    } else if (matches(/(?:race|ethnicity|ethnic[_\-\s]*origin)/i)) {
      fieldValue = localProfile.race || "Decline to Self-Identify";
      fieldLabel = "Ethnicity";
      fieldType = "race";
    } else if (matches(/(?:veteran|military[_\-\s]*service|protected[_\-\s]*veteran)/i)) {
      fieldValue = localProfile.veteranStatus || "No";
      fieldLabel = "Veteran Status";
      fieldType = "veteranStatus";
    } else if (matches(/(?:disability|disabilities)/i)) {
      fieldValue = localProfile.disabilityStatus || "No, I don't have a disability";
      fieldLabel = "Disability Status";
      fieldType = "disabilityStatus";
    } else if (matches(/(?:portfolio|personal[_\-\s]*site|personal[_\-\s]*url)/i)) {
      fieldValue = localProfile.portfolio;
      fieldLabel = "Portfolio URL";
      fieldType = "portfolio";
    } else if (matches(/(?:github|gitlab|bitbucket)/i)) {
      fieldValue = localProfile.github;
      fieldLabel = "GitHub URL";
      fieldType = "github";
    } else if (matches(/(?:resume|cv|curriculum\s*vitae|paste\s*resume)/i) && input.tagName === "TEXTAREA") {
      const { text, label: cvLbl } = pickResumeText(localProfile);
      fieldValue = text;
      fieldLabel = cvLbl;
      fieldType = "resumeText";
    }
  }

  const triggerRect = trigger.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  inlineDropdown = document.createElement("div");
  inlineDropdown.id = "jh-inline-dropdown";
  
  const dropdownWidth = 240;
  const leftPos = triggerRect.right + scrollLeft - dropdownWidth;
  const topPos = triggerRect.bottom + scrollTop + 6;

  inlineDropdown.style.cssText = `
    position: absolute;
    left: ${leftPos}px;
    top: ${topPos}px;
    width: ${dropdownWidth}px;
    background: rgba(20, 21, 24, 0.95);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 1000004;
    font-family: 'Outfit', system-ui, sans-serif;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    animation: jh-dropdown-fade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  // Construct options
  const list = [];
  
  if (fieldType !== "question" && fieldValue) {
    list.push({
      text: `⚡ Fill ${fieldLabel}`,
      action: async () => {
        removeInlineDropdown();
        if (input.tagName === "SELECT") {
          setSelectValue(input, fieldValue, fieldType);
        } else if (fieldType === "phone" && input.tagName === "INPUT") {
          await fillSplitPhoneField(input, localProfile?.phone || fieldValue, localProfile);
        } else if (isAriaComboboxInput(input)) {
          await fillComboboxField(input, fieldValue);
        } else {
          setInputValue(input, fieldValue);
        }
        showToast(`Filled ${fieldLabel}!`);
      }
    });
  } else {
    list.push({
      text: `✨ Gemma: Draft Tailored Answer`,
      action: () => {
        removeInlineDropdown();
        handleAiSolverDraft(input);
      }
    });
  }

  list.push({
    text: `⚡ Auto-Fill Full Application`,
    action: () => {
      autofillWebForm(localProfile, { useAi: true });
      removeInlineDropdown();
    }
  });

  list.forEach((opt, idx) => {
    if (idx > 0 && idx === list.length - 1) {
      const divider = document.createElement("div");
      divider.className = "jh-dropdown-divider";
      inlineDropdown.appendChild(divider);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "jh-dropdown-item";
    btn.textContent = opt.text;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      opt.action();
    });
    inlineDropdown.appendChild(btn);
  });

  document.body.appendChild(inlineDropdown);
}

function removeInlineDropdown() {
  if (inlineDropdown) {
    inlineDropdown.remove();
    inlineDropdown = null;
  }
}
/* ==========================================================================
   🤖 GLASSMORPHIC WEB COPILOT DRAWER & TYPEWRITER ENGINE
   ========================================================================== */

function injectWebCopilot(profile) {
  // Visible UI belongs to the top document only — never inject into iframes.
  if (!IS_TOP_FRAME) return;
  // Guard against duplicate injections
  if (document.getElementById("jh-floating-actions")) return;

  injectStyles();

  // Create floating actions bar container
  const actionsBar = document.createElement("div");
  actionsBar.id = "jh-floating-actions";
  actionsBar.title = "Drag to move Claire buttons";

  // Create Prefill Form button
  const prefillBtn = document.createElement("button");
  prefillBtn.id = "jh-btn-prefill";
  prefillBtn.type = "button";
  prefillBtn.className = "jh-floating-btn jh-prefill-btn";
  prefillBtn.setAttribute("aria-label", "Scan and prefill form");
  prefillBtn.innerHTML = `<span class="jh-icon">⚡</span><span class="jh-btn-label">Fill</span>`;

  // CV toggle button — cycles through auto / backend / architect
  const cvBtn = document.createElement("button");
  cvBtn.id = "jh-btn-cv";
  cvBtn.type = "button";
  cvBtn.className = "jh-floating-btn jh-cv-btn";
  cvBtn.setAttribute("aria-label", "Switch CV");
  const updateCvBtnLabel = () => {
    cvBtn.replaceChildren();
    const icon = document.createElement("span");
    icon.className = "jh-icon";
    icon.textContent = "📄";
    const lbl = document.createElement("span");
    lbl.className = "jh-btn-label";
    lbl.textContent = selectedCv === "architect" ? "Arch CV" : selectedCv === "backend" ? "Backend CV" : "Auto CV";
    cvBtn.append(icon, lbl);
    cvBtn.title = `CV: ${selectedCv} — click to switch`;
  };
  updateCvBtnLabel();
  cvBtn.addEventListener("click", () => {
    selectedCv = selectedCv === "auto" ? "backend" : selectedCv === "backend" ? "architect" : "auto";
    updateCvBtnLabel();
    showToast(`CV switched to: ${selectedCv === "auto" ? "Auto (Gemma picks)" : selectedCv === "architect" ? "Architect CV" : "Backend CV"}`);
  });

  // Create Evaluate Job button
  const evalBtn = document.createElement("button");
  evalBtn.id = "jh-btn-evaluate";
  evalBtn.type = "button";
  evalBtn.className = "jh-floating-btn jh-evaluate-btn";
  evalBtn.title = "Evaluate job with Gemma";
  evalBtn.setAttribute("aria-label", "Evaluate job with Gemma");
  evalBtn.innerHTML = `<span class="jh-icon">🧠</span><span class="jh-btn-label">Evaluate</span>`;

  // Create Company Check button
  const companyBtn = document.createElement("button");
  companyBtn.id = "jh-btn-company";
  companyBtn.type = "button";
  companyBtn.className = "jh-floating-btn jh-company-btn";
  companyBtn.title = "Check if you've applied to this company before";
  companyBtn.setAttribute("aria-label", "Check previous applications at this company");
  companyBtn.innerHTML = `<span class="jh-icon">🏢</span><span class="jh-btn-label">Applied?</span>`;

  // Create Today button — quick view of applications tracked today
  const todayBtn = document.createElement("button");
  todayBtn.id = "jh-btn-today";
  todayBtn.type = "button";
  todayBtn.className = "jh-floating-btn jh-today-btn";
  todayBtn.title = "Show applications you tracked today";
  todayBtn.setAttribute("aria-label", "Show applications tracked today");
  todayBtn.innerHTML = `<span class="jh-icon">📅</span><span class="jh-btn-label">Today</span>`;

  // Ask Gemma button — answer a single field the autofill pass missed
  const askBtn = document.createElement("button");
  askBtn.id = "jh-btn-ask";
  askBtn.type = "button";
  askBtn.className = "jh-floating-btn jh-ask-btn";
  askBtn.title = "Ask Gemma to answer one specific field";
  askBtn.setAttribute("aria-label", "Ask Gemma to answer one specific field");
  askBtn.innerHTML = `<span class="jh-icon">🪄</span><span class="jh-btn-label">Ask</span>`;

  // Create Manual Track button for ATS pages whose submit event cannot be observed
  const trackBtn = document.createElement("button");
  trackBtn.id = "jh-btn-track";
  trackBtn.type = "button";
  trackBtn.className = "jh-floating-btn jh-track-btn";
  trackBtn.title = "Manually add this application now";
  trackBtn.setAttribute("aria-label", "Manually add this application now");
  trackBtn.innerHTML = `<span class="jh-icon">＋</span><span class="jh-btn-label">Track</span>`;

  // Secondary tools stay tucked away until needed.
  const toolbarMenu = document.createElement("div");
  toolbarMenu.id = "jh-toolbar-menu";
  toolbarMenu.className = "jh-toolbar-menu";
  toolbarMenu.hidden = true;
  toolbarMenu.setAttribute("role", "menu");
  toolbarMenu.setAttribute("aria-label", "Claire secondary actions");

  const moreBtn = document.createElement("button");
  moreBtn.id = "jh-btn-more";
  moreBtn.type = "button";
  moreBtn.className = "jh-floating-btn jh-more-btn";
  moreBtn.title = "Show more Claire actions";
  moreBtn.setAttribute("aria-label", "Show more Claire actions");
  moreBtn.setAttribute("aria-expanded", "false");
  moreBtn.innerHTML = `<span class="jh-icon">...</span><span class="jh-btn-label">More</span>`;

  const setToolbarMenuOpen = (open) => {
    toolbarMenu.hidden = !open;
    toolbarMenu.classList.toggle("visible", open);
    moreBtn.setAttribute("aria-expanded", String(open));
  };

  moreBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setToolbarMenuOpen(!toolbarMenu.classList.contains("visible"));
  });

  document.addEventListener("pointerdown", (event) => {
    if (!actionsBar.contains(event.target)) setToolbarMenuOpen(false);
  }, { capture: true });

  [askBtn, cvBtn, evalBtn, todayBtn, trackBtn].forEach((button) => {
    button.addEventListener("click", () => setToolbarMenuOpen(false));
  });

  // Create Close/Hide button
  const hideBtn = document.createElement("button");
  hideBtn.id = "jh-btn-hide";
  hideBtn.type = "button";
  hideBtn.className = "jh-floating-btn jh-hide-btn";
  hideBtn.title = "Hide Copilot toolbar";
  hideBtn.setAttribute("aria-label", "Hide Copilot toolbar");
  hideBtn.innerHTML = `<span class="jh-icon">✕</span>`;
  hideBtn.addEventListener("click", () => {
    setToolbarMenuOpen(false);
    actionsBar.style.display = "none";
    const w = document.getElementById("jh-copilot-widget");
    if (w) w.style.display = "none";
  });

  // Fill (prefillBtn) and Applied? (companyBtn) are intentionally NOT added to
  // the toolbar — they now run automatically when the toolbar opens (see
  // runAutoOpenFlow). The button objects are still created above so their logic
  // can be reused by the auto-open flow and the company search panel.
  toolbarMenu.append(cvBtn);
  actionsBar.appendChild(askBtn);
  actionsBar.appendChild(evalBtn);
  actionsBar.appendChild(todayBtn);
  actionsBar.appendChild(trackBtn);
  actionsBar.appendChild(moreBtn);
  actionsBar.appendChild(hideBtn);
  actionsBar.appendChild(toolbarMenu);
  setToolbarMenuOpen(false);
  document.body.appendChild(actionsBar);
  makeFloatingActionsDraggable(actionsBar);

  updatePrefillButtonState(prefillBtn);
  let prefillObserverTimer = null;
  const prefillObserver = new MutationObserver((mutations) => {
    const onlyWidgetChanges = mutations.every((mutation) =>
      mutation.target?.closest?.("#jh-copilot-widget, #jh-floating-actions")
    );
    if (onlyWidgetChanges) return;
    clearTimeout(prefillObserverTimer);
    prefillObserverTimer = setTimeout(() => {
      updatePrefillButtonState(prefillBtn);
      updateSubmitListenerStatus("page changed");
    }, 250);
  });
  if (document.body) {
    prefillObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Create unified overlay card
  const widget = document.createElement("div");
  widget.id = "jh-copilot-widget";
  widget.className = "minimized"; // Starts hidden/collapsed

  widget.innerHTML = `
    <div class="jh-widget-header" title="Drag to move the menu · double-click to re-dock it to the toolbar">
      <div class="jh-widget-brand">
        <div class="jh-brand-icon">C</div>
        <div>
          <div class="jh-brand-subtitle">Claire</div>
          <div class="jh-brand-title">Web Assistant</div>
        </div>
      </div>
      <button class="jh-close-btn" id="jh-widget-close" type="button" title="Close overlay">&times;</button>
    </div>
    <div class="jh-widget-body">
      <!-- Evaluation View -->
      <div id="jh-eval-panel" class="jh-panel-section" hidden>
        <h3 class="jh-section-title">🧠 Gemma Evaluation</h3>
        <div class="jh-draft-loading" id="jh-eval-loading">
          <div class="jh-spinner"></div>
          <span id="jh-eval-loading-text" style="color: #A5A5AB;">Evaluating job fit with Gemma...</span>
        </div>
        <div class="jh-workflow-card">
          <div class="jh-workflow-summary" id="jh-eval-workflow-summary">Ready</div>
          <ol class="jh-workflow-list" id="jh-eval-workflow-list"></ol>
        </div>
        <div id="jh-eval-result" class="jh-results-container"></div>
      </div>

      <!-- Autofill Audit Log View -->
      <div id="jh-autofill-panel" class="jh-panel-section" hidden>
        <h3 class="jh-section-title">⚡ Autofill Logs</h3>
        <div class="jh-listener-card" id="jh-submit-listener-card">
          <div class="jh-listener-row">
            <span class="jh-listener-dot" id="jh-submit-listener-dot"></span>
            <strong id="jh-submit-listener-status">Submit listener off</strong>
          </div>
          <p id="jh-submit-listener-detail">Click Scan/Prefill to attach the submit tracker.</p>
        </div>
        <div id="jh-autofill-audit-log">
          <div id="jh-autofill-summary" class="jh-audit-summary">Form scanned successfully.</div>
          <ul id="jh-autofill-audit-list" class="jh-audit-list"></ul>
        </div>
        <div id="jh-autofill-payload-card" class="jh-payload-card" hidden>
          <div class="jh-payload-header">
            <div>
              <strong>Last JSON sent</strong>
              <span id="jh-autofill-payload-meta"></span>
            </div>
            <button id="jh-autofill-payload-copy" class="jh-payload-copy" type="button" disabled>Copy JSON</button>
          </div>
          <pre id="jh-autofill-payload-json" class="jh-payload-json"></pre>
        </div>
        <div class="jh-workflow-card">
          <div class="jh-workflow-summary" id="jh-autofill-workflow-summary">Ready</div>
          <ol class="jh-workflow-list" id="jh-autofill-workflow-list"></ol>
        </div>
      </div>

      <!-- Manual Track Form View -->
      <div id="jh-track-panel" class="jh-panel-section" hidden>
        <h3 class="jh-section-title">＋ Edit & Save Job</h3>
        <div class="jh-draft-loading" id="jh-track-loading">
          <div class="jh-spinner"></div>
          <span id="jh-track-loading-text" style="color: #A5A5AB;">Extracting job details via Gemma...</span>
        </div>
        <div class="jh-workflow-card">
          <div class="jh-workflow-summary" id="jh-track-workflow-summary">Ready</div>
          <ol class="jh-workflow-list" id="jh-track-workflow-list"></ol>
        </div>
        <div id="jh-track-payload-card" class="jh-payload-card" hidden>
          <div class="jh-payload-header">
            <div>
              <strong>Last JSON sent</strong>
              <span id="jh-track-payload-meta"></span>
            </div>
            <button id="jh-track-payload-copy" class="jh-payload-copy" type="button" disabled>Copy JSON</button>
          </div>
          <pre id="jh-track-payload-json" class="jh-payload-json"></pre>
        </div>
        <form id="jh-track-form" class="jh-widget-form">
          <div class="jh-form-field">
            <label class="jh-form-label" for="jh-f-company">Company</label>
            <input id="jh-f-company" name="company" class="jh-form-input" required autocomplete="off" />
          </div>
          <div class="jh-form-field">
            <label class="jh-form-label" for="jh-f-role">Role</label>
            <input id="jh-f-role" name="role" class="jh-form-input" required autocomplete="off" />
          </div>
          <div class="jh-form-field">
            <label class="jh-form-label" for="jh-f-status">Status</label>
            <select id="jh-f-status" name="status" class="jh-form-input">
              <option value="Saved">Saved — haven't applied yet</option>
              <option selected>Applied</option>
              <option>Interview</option>
              <option>Offer</option>
              <option>Rejected</option>
            </select>
          </div>
          <div class="jh-form-field">
            <label class="jh-form-label" for="jh-f-location">Location</label>
            <input id="jh-f-location" name="location" class="jh-form-input" autocomplete="off" />
          </div>
          <div class="jh-form-field">
            <label class="jh-form-label" for="jh-f-salary">Salary</label>
            <input id="jh-f-salary" name="salary" class="jh-form-input" autocomplete="off" />
          </div>
          <div class="jh-form-field">
            <label class="jh-form-label" for="jh-f-skills">Skills</label>
            <input id="jh-f-skills" name="skills" class="jh-form-input" placeholder="Python, TypeScript..." autocomplete="off" />
          </div>
          <button class="jh-form-submit-btn" type="submit">Save to Tracker</button>
        </form>
      </div>

      <!-- Applied Today View -->
      <div id="jh-today-panel" class="jh-panel-section" hidden>
        <h3 class="jh-section-title">📅 Applied Today</h3>
        <div class="jh-draft-loading" id="jh-today-loading">
          <div class="jh-spinner"></div>
          <span style="color:#A5A5AB;">Loading today's applications...</span>
        </div>
        <div id="jh-today-result"></div>
      </div>

      <!-- Ask Gemma View -->
      <div id="jh-ask-panel" class="jh-panel-section" hidden>
        <h3 class="jh-section-title">🪄 Ask Gemma</h3>
        <p class="jh-ask-hint">Gemma answers one field the autofill missed. Optionally tell her how to answer, then pick the field on the page.</p>
        <textarea id="jh-ask-instruction" class="jh-form-input jh-ask-instruction" rows="3" placeholder="Optional guidance — e.g. &quot;Answer Yes&quot;, &quot;Mention my AWS experience&quot;, &quot;Pick the closest option&quot;."></textarea>
        <button id="jh-ask-pick" class="jh-form-submit-btn" type="button">🎯 Pick a field to fill</button>
        <div id="jh-ask-status" class="jh-ask-status" hidden></div>
      </div>

      <!-- Company Check View -->
      <div id="jh-company-panel" class="jh-panel-section" hidden>
        <h3 class="jh-section-title">🏢 Applied Here?</h3>
        <form id="jh-company-search-form" class="jh-company-search">
          <input id="jh-company-search-input" class="jh-form-input" type="text" placeholder="Company name…" autocomplete="off" aria-label="Company to search in your tracker" />
          <button type="submit" class="jh-company-search-btn">Search</button>
        </form>
        <div class="jh-company-detected" id="jh-company-detected-name"></div>
        <div class="jh-draft-loading" id="jh-company-loading">
          <div class="jh-spinner"></div>
          <span style="color:#A5A5AB;">Checking your applications...</span>
        </div>
        <div id="jh-company-result"></div>
      </div>
    </div>
  `;
  document.body.appendChild(widget);
  widgetManualPosition = readWidgetPosition();
  makeWidgetDraggable(widget);
  positionWidgetRelativeToToolbar();
  window.addEventListener("resize", positionWidgetRelativeToToolbar, { passive: true });
  updateSubmitListenerStatus("ready");
  bindPayloadCopyButton("jh-autofill-payload-copy");
  bindPayloadCopyButton("jh-track-payload-copy");
  loadLastTrackedPayloadPreview();

  // Bind close button
  document.getElementById("jh-widget-close").addEventListener("click", () => {
    widget.classList.add("minimized");
  });

  // Ask Gemma handlers
  askBtn.addEventListener("click", () => {
    showCopilotPanel("ask");
    document.getElementById("jh-ask-instruction")?.focus();
  });
  document.getElementById("jh-ask-pick").addEventListener("click", (event) => {
    event.preventDefault();
    startAskFieldPick();
  });

  // Evaluate Button Handler
  evalBtn.addEventListener("click", async () => {
    showCopilotPanel("eval");
    const loading = document.getElementById("jh-eval-loading");
    const resultDiv = document.getElementById("jh-eval-result");

    loading.classList.add("visible");
    setEvaluationLoadingText("Cleaning page text...");
    resultDiv.replaceChildren();

    try {
      const jobData = extractJob();
      updateWorkflowSteps("eval", [
        { status: "done", label: "Cleaned job page", detail: `${jobData.pageText.length} chars, raw HTML and form controls removed.` },
        { status: "active", label: "Sending to Gemma", detail: "Local server receives the cleaned text plus profile prompt." },
        { status: "pending", label: "Rendering result" },
      ]);
      setEvaluationLoadingText("Gemma is reading the cleaned posting...");
      const res = await apiProxy("http://127.0.0.1:8787/api/evaluate-job", "POST", jobData);
      loading.classList.remove("visible");
      if (res && res.evaluation) {
        updateWorkflowSteps("eval", [
          { status: "done", label: "Cleaned job page", detail: `${jobData.pageText.length} chars, raw HTML and form controls removed.` },
          { status: "done", label: "Gemma returned evaluation", detail: `${res.evaluation.applyOrSkip || "Decision"} · ${res.evaluation.matchScore || 0}/100` },
          { status: "done", label: "Rendered result" },
        ]);
        renderInlineEvaluation(res.evaluation, resultDiv);
      } else {
        throw new Error("Invalid response received from evaluation server.");
      }
    } catch (err) {
      loading.classList.remove("visible");
      updateWorkflowSteps("eval", [
        { status: "done", label: "Cleaned job page" },
        { status: "error", label: "Evaluation failed", detail: err.message || "Check local Gemma/server." },
        { status: "pending", label: "Rendering result" },
      ]);
      showToast("Evaluation failed: " + err.message);
    }
  });

  // Prefill Button Handler — fills the ATS form only. Tracker cards are created
  // by the actual submit action, or by the explicit Track form.
  prefillBtn.addEventListener("click", () => {
    showCopilotPanel("autofill");
    autofillWebForm(profile, { useAi: true });
  });

  // Manual Track Button Handler (Displays the prefilled form for manual review)
  trackBtn.addEventListener("click", async () => {
    showCopilotPanel("track");
    const loading = document.getElementById("jh-track-loading");
    const form = document.getElementById("jh-track-form");

    // Show pending loading indicator and hide form
    loading.classList.add("visible");
    const loadingText = document.getElementById("jh-track-loading-text");
    if (loadingText) loadingText.textContent = "Cleaning page before Gemma...";
    form.hidden = true;

    const rulesGuess = extractJob();
    updateWorkflowSteps("track", [
      { status: "done", label: "Cleaned job page", detail: `${rulesGuess.pageText.length} chars, no raw HTML/forms.` },
      { status: "active", label: "Asking Gemma to refine details" },
      { status: "pending", label: "Preparing editable tracker form" },
    ]);
    try {
      // Trigger local AI/Gemma extraction
      const res = await apiProxy("http://127.0.0.1:8787/api/extract-ai", "POST", {
        pageText: rulesGuess.pageText || rulesGuess.description || "",
        rulesGuess: rulesGuess,
        sourceUrl: rulesGuess.sourceUrl || window.location.href,
        title: rulesGuess.title || document.title
      });

      let finalData = rulesGuess;
      if (res && res.ok && res.application) {
        finalData = res.application;
        updateWorkflowSteps("track", [
          { status: "done", label: "Cleaned job page", detail: `${rulesGuess.pageText.length} chars, no raw HTML/forms.` },
          { status: "done", label: "Gemma refined details" },
          { status: "active", label: "Preparing editable tracker form" },
        ]);
        showToast("Gemma extracted job details successfully! 🧠");
      } else {
        console.warn("Gemma extraction empty/failed, falling back to rules-based extraction.");
        updateWorkflowSteps("track", [
          { status: "done", label: "Cleaned job page", detail: `${rulesGuess.pageText.length} chars, no raw HTML/forms.` },
          { status: "error", label: "Gemma extraction unavailable", detail: "Using rules-based details instead." },
          { status: "active", label: "Preparing editable tracker form" },
        ]);
        showToast("AI extraction unavailable; using fast rules extraction. ⚡");
      }

      document.getElementById("jh-f-company").value = finalData.company || "";
      document.getElementById("jh-f-role").value = finalData.role || "";
      document.getElementById("jh-f-status").value = finalData.status || "Applied";
      document.getElementById("jh-f-location").value = finalData.location || "";
      document.getElementById("jh-f-salary").value = finalData.salary || "";
      document.getElementById("jh-f-skills").value = Array.isArray(finalData.skills) ? finalData.skills.join(", ") : finalData.skills || "";
    } catch (err) {
      console.warn("AI extraction failed:", err);
      updateWorkflowSteps("track", [
        { status: "done", label: "Cleaned job page", detail: `${rulesGuess.pageText.length} chars, no raw HTML/forms.` },
        { status: "error", label: "Gemma extraction failed", detail: err.message || "Using rules-based details instead." },
        { status: "active", label: "Preparing editable tracker form" },
      ]);
      showToast("AI extraction failed; using fast rules extraction. ⚡");

      document.getElementById("jh-f-company").value = rulesGuess.company || "";
      document.getElementById("jh-f-role").value = rulesGuess.role || "";
      document.getElementById("jh-f-status").value = rulesGuess.status || "Applied";
      document.getElementById("jh-f-location").value = rulesGuess.location || "";
      document.getElementById("jh-f-salary").value = rulesGuess.salary || "";
      document.getElementById("jh-f-skills").value = Array.isArray(rulesGuess.skills) ? rulesGuess.skills.join(", ") : rulesGuess.skills || "";
    } finally {
      loading.classList.remove("visible");
      form.hidden = false;
      const hadError = document.querySelector("#jh-track-workflow-list .error");
      updateWorkflowSteps("track", [
        { status: "done", label: "Cleaned job page", detail: `${rulesGuess.pageText.length} chars, no raw HTML/forms.` },
        hadError
          ? { status: "error", label: "Gemma refinement unavailable", detail: "Using rules-based details." }
          : { status: "done", label: "Gemma refined details" },
        { status: "done", label: "Editable tracker form ready" },
      ]);
    }
  });

  // Bind Manual Track Form Submission
  const trackForm = document.getElementById("jh-track-form");
  trackForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtn = trackForm.querySelector(".jh-form-submit-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const now = new Date();
    const appliedAt = now.toISOString();
    const statusValue = document.getElementById("jh-f-status").value;
    // "Saved" = captured for later, not applied. It must carry NO applied date so
    // the tracker (and the toolbar badge) can tell saved-for-later apart from applied.
    const isSaved = statusValue === "Saved";
    const extractedContext = extractJob();

    const jobData = {
      company: document.getElementById("jh-f-company").value.trim(),
      role: document.getElementById("jh-f-role").value.trim(),
      status: statusValue,
      location: document.getElementById("jh-f-location").value.trim(),
      salary: document.getElementById("jh-f-salary").value.trim(),
      skills: document.getElementById("jh-f-skills").value.split(/[,;]+/).map((s) => s.trim()).filter(Boolean),
      dateApplied: isSaved ? "" : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      appliedAt: isSaved ? "" : appliedAt,
      stageDateTimes: isSaved ? {} : { Applied: appliedAt },
      source: "Extension",
      sourceUrl: window.location.href,
      title: extractedContext.title || document.title,
      pageText: extractedContext.pageText || "",
      description: extractedContext.description || "",
    };
    renderTrackedPayload(jobData, { panel: "track", trigger: "manual save" });

    try {
      updateWorkflowSteps("track", [
        { status: "done", label: "Reviewed tracker form" },
        { status: "active", label: "Saving to dashboard" },
        { status: "pending", label: "Evaluating role with Gemma" },
      ]);
      const result = await trackApplicationViaBackground(jobData, { trigger: "manual save", runEvaluation: true });
      if (!result.ok) throw new Error(result.error || "Tracker save failed.");
      const status = result.status;
      renderTrackedPayload(jobData, { panel: "track", trigger: "manual save", status });
      // 200 = matched & updated an existing record; 201 = brand-new entry. Telling
      // them apart stops the "it said done but nothing appeared" confusion when a
      // job (same URL or company+role) was already in the tracker.
      updateWorkflowSteps("track", [
        { status: "done", label: "Reviewed tracker form" },
        { status: "done", label: status === 200 ? "Updated dashboard card" : "Saved dashboard card" },
        result.evaluationSaved
          ? { status: "done", label: "Stored Gemma evaluation", detail: `${result.evaluation?.decision || "Decision"} · ${result.evaluation?.score ?? 0}/100` }
          : result.evaluationQueued
            ? { status: "done", label: "Queued Gemma evaluation", detail: "The card is saved; Gemma can update it in the background." }
          : { status: result.evaluationError ? "error" : "pending", label: "Gemma evaluation", detail: result.evaluationError || "No evaluation returned." },
      ]);
      showToast(
        isSaved
          ? (status === 200 ? "↻ Updated — saved for later (not marked applied)." : "🔖 Saved for later in Claire.")
          : (status === 200 ? "↻ Updated the existing entry for this job in your tracker." : "✅ New application saved to Claire!")
      );
      // Open or focus the dashboard and show the newly saved application's drawer.
      chrome.runtime.sendMessage({
        type: "OPEN_DASHBOARD",
        appId: result.app?.id || "",
      }).catch(() => {});
      widget.classList.add("minimized");
    } catch (err) {
      updateWorkflowSteps("track", [
        { status: "done", label: "Reviewed tracker form" },
        { status: "error", label: "Tracking failed", detail: err.message || "Check local app server." },
        { status: "pending", label: "Evaluating role with Gemma" },
      ]);
      showToast("Tracking failed. Check local app server.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save to Tracker";
    }
  });

  // Company Check: shared lookup used by the toolbar button (auto-detected
  // name) and the panel's search bar (user-typed name — page detection misses
  // the company often enough that manual search is a first-class path).
  const runCompanyCheck = async (companyName) => {
    const detectedEl = document.getElementById("jh-company-detected-name");
    const loadingEl = document.getElementById("jh-company-loading");
    const resultEl = document.getElementById("jh-company-result");
    const company = clean(companyName || "");

    if (detectedEl) {
      detectedEl.textContent = company
        ? `Checking: ${company}`
        : "No company name detected — type one above and hit Search.";
    }

    if (!company) {
      if (loadingEl) loadingEl.classList.remove("visible");
      renderCompanyPanel(resultEl, "", []);
      return;
    }

    if (loadingEl) loadingEl.classList.add("visible");
    if (resultEl) resultEl.replaceChildren();

    try {
      const apps = await apiProxy("http://127.0.0.1:8787/api/applications");
      const normalize = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
      const nb = normalize(company);
      const matches = (apps || []).filter((app) => {
        if (!app.company) return false;
        const na = normalize(app.company);
        return na === nb || na.includes(nb) || nb.includes(na);
      });
      if (loadingEl) loadingEl.classList.remove("visible");
      renderCompanyPanel(resultEl, company, matches);
    } catch (err) {
      if (loadingEl) loadingEl.classList.remove("visible");
      renderCompanyPanel(resultEl, company, null);
    }
  };

  companyBtn.addEventListener("click", async () => {
    showCopilotPanel("company");
    const detectedCompany = extractJob().company;
    const searchInput = document.getElementById("jh-company-search-input");
    // Default the search box to the detected name; the user can overwrite it
    // when extraction picked the wrong (or no) company.
    if (searchInput) searchInput.value = detectedCompany || "";
    await runCompanyCheck(detectedCompany);
  });

  const companySearchForm = document.getElementById("jh-company-search-form");
  companySearchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();
    runCompanyCheck(document.getElementById("jh-company-search-input")?.value || "");
  });

  // Today Button Handler — latest applications tracked today, newest first
  todayBtn.addEventListener("click", async () => {
    showCopilotPanel("today");
    const loadingEl = document.getElementById("jh-today-loading");
    const resultEl = document.getElementById("jh-today-result");
    if (loadingEl) loadingEl.classList.add("visible");
    if (resultEl) resultEl.replaceChildren();

    try {
      const apps = await apiProxy("http://127.0.0.1:8787/api/applications");
      const now = new Date();
      // Local date string, matching the dashboard's todayString convention.
      const todayStr = getLocalDateKey(now);
      const todays = (apps || []).filter((app) => applicationWasAppliedOnLocalDate(app, todayStr)).sort(
        (a, b) => getAppliedSortTime(b) - getAppliedSortTime(a)
      );
      if (loadingEl) loadingEl.classList.remove("visible");
      renderTodayPanel(resultEl, todays);
    } catch (err) {
      if (loadingEl) loadingEl.classList.remove("visible");
      renderTodayPanel(resultEl, null);
    }
  });

  // Auto-open flow: when the toolbar opens, check "Applied?" first. If this job
  // (by URL) or company is already in the tracker, show it and let the user
  // decide (with an explicit "Fill anyway"). Otherwise, autofill automatically.
  // Replaces the old manual Fill / Applied? buttons.
  const runAutoOpenFlow = async () => {
    const currentUrl = locationHref();
    if (copilotAutoRanForUrl === currentUrl) return; // once per page open
    copilotAutoRanForUrl = currentUrl;

    const detectedCompany = clean(extractJob().company || "");
    showCopilotPanel("company");
    const searchInput = document.getElementById("jh-company-search-input");
    if (searchInput) searchInput.value = detectedCompany;
    const detectedEl = document.getElementById("jh-company-detected-name");
    const loadingEl = document.getElementById("jh-company-loading");
    const resultEl = document.getElementById("jh-company-result");
    if (detectedEl) detectedEl.textContent = detectedCompany ? `Checking: ${detectedCompany}` : "Checking this page…";
    if (loadingEl) loadingEl.classList.add("visible");
    if (resultEl) resultEl.replaceChildren();

    let apps = null;
    try {
      apps = await apiProxy("http://127.0.0.1:8787/api/applications");
    } catch {
      apps = null;
    }
    if (loadingEl) loadingEl.classList.remove("visible");

    if (!apps) {
      // Couldn't reach the tracker — surface the error; don't silently autofill.
      renderCompanyPanel(resultEl, detectedCompany, null);
      return;
    }

    const normalizeName = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
    const normalizeUrl = (u) => {
      try { const x = new URL(u); return (x.origin + x.pathname).replace(/\/+$/, "").toLowerCase(); }
      catch { return String(u || "").split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase(); }
    };
    const nb = normalizeName(detectedCompany);
    const here = normalizeUrl(currentUrl);
    const matches = (apps || []).filter((app) => {
      if (app.sourceUrl && normalizeUrl(app.sourceUrl) === here) return true; // same posting
      if (!nb || !app.company) return false;
      const na = normalizeName(app.company);
      return na === nb || na.includes(nb) || nb.includes(na);
    });

    if (matches.length > 0) {
      // Already tracked — show the record and pause. The user decides.
      renderCompanyPanel(resultEl, detectedCompany || "this role", matches, {
        onFillAnyway: () => {
          showCopilotPanel("autofill");
          autofillWebForm(profile, { useAi: true });
        },
      });
      showToast(`Already in your tracker (${matches.length}). Review before filling.`);
      return;
    }

    // Not tracked yet → autofill automatically.
    showCopilotPanel("autofill");
    autofillWebForm(profile, { useAi: true });
  };
  runCopilotAutoOpen = runAutoOpenFlow;

  // Expose toggle helpers for other parts of extension compatibility
  window.openCopilotDrawer = () => {
    widget.classList.remove("minimized");
    trackBtn.click(); // Default opening manually displays the track panel
  };
  window.expandWidget = () => widget.classList.remove("minimized");
}

// On focus changes, keep the floating Prefill button's state in sync with whether
// the current page looks like an application form. (The older inline "active field"
// drawer this once updated was removed; only the prefill-button sync remains.)
function updateActiveFieldLabel() {
  updatePrefillButtonState(document.getElementById("jh-btn-prefill"));
}

function updatePrefillButtonState(prefillBtn = document.getElementById("jh-btn-prefill")) {
  if (!prefillBtn) return;
  const hasForm = looksLikeApplicationForm();
  prefillBtn.style.display = "flex";
  prefillBtn.classList.toggle("jh-no-form", !hasForm);
  prefillBtn.title = hasForm
    ? submitTrackerAttached
      ? "Inject visible form fields. Submit listener is attached."
      : "Inject visible form fields and attach the submit listener."
    : submitTrackerAttached
      ? "Submit listener is attached. Scan again after the form appears."
      : "Scan for visible form fields. If none are found yet, click Apply on the job page first.";
  const stateLabel = submitTrackerAttached
    ? hasForm ? "Prefill + Listening" : "Listening"
    : hasForm ? "Prefill Form" : "Scan Form";
  prefillBtn.setAttribute("aria-label", stateLabel);
  prefillBtn.dataset.label = stateLabel;
  const icon = prefillBtn.querySelector(".jh-icon");
  if (icon) {
    icon.textContent = submitTrackerAttached ? "✓" : "⚡";
  }
  const label = prefillBtn.querySelector(".jh-btn-label");
  if (label) {
    label.textContent = "Fill";
  }
}

function makeFloatingActionsDraggable(actionsBar) {
  const saved = readFloatingActionsPosition();
  if (saved) {
    actionsBar.style.left = `${saved.x}px`;
    actionsBar.style.top = `${saved.y}px`;
    actionsBar.style.right = "auto";
    actionsBar.style.bottom = "auto";
  }

  actionsBar.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.target?.closest?.(".jh-floating-btn, .jh-toolbar-menu")) return;
    const rect = actionsBar.getBoundingClientRect();
    dragFloatingActionsState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    actionsBar.classList.add("jh-dragging");
    actionsBar.setPointerCapture?.(event.pointerId);
  });

  actionsBar.addEventListener("pointermove", (event) => {
    if (!dragFloatingActionsState || dragFloatingActionsState.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragFloatingActionsState.startX;
    const dy = event.clientY - dragFloatingActionsState.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragFloatingActionsState.moved = true;
    const rect = actionsBar.getBoundingClientRect();
    const x = clamp(dragFloatingActionsState.originX + dx, 8, window.innerWidth - rect.width - 8);
    const y = clamp(dragFloatingActionsState.originY + dy, 8, window.innerHeight - rect.height - 8);
    actionsBar.style.left = `${x}px`;
    actionsBar.style.top = `${y}px`;
    actionsBar.style.right = "auto";
    actionsBar.style.bottom = "auto";
    // The panel follows the toolbar live while dragging.
    positionWidgetRelativeToToolbar();
  });

  const finishDrag = (event) => {
    if (!dragFloatingActionsState || dragFloatingActionsState.pointerId !== event.pointerId) return;
    const moved = dragFloatingActionsState.moved;
    dragFloatingActionsState = null;
    actionsBar.classList.remove("jh-dragging");
    actionsBar.releasePointerCapture?.(event.pointerId);
    const rect = actionsBar.getBoundingClientRect();
    saveFloatingActionsPosition({ x: Math.round(rect.left), y: Math.round(rect.top) });
    positionWidgetRelativeToToolbar();
    if (moved) {
      actionsBar.dataset.justDragged = "true";
      setTimeout(() => delete actionsBar.dataset.justDragged, 250);
    }
  };

  actionsBar.addEventListener("pointerup", finishDrag);
  actionsBar.addEventListener("pointercancel", finishDrag);
  actionsBar.addEventListener("click", (event) => {
    if (actionsBar.dataset.justDragged === "true") {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { capture: true });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyWidgetManualPosition() {
  const widget = document.getElementById("jh-copilot-widget");
  if (!widget || !widgetManualPosition) return;
  const width = widget.getBoundingClientRect().width || 380;
  const x = clamp(widgetManualPosition.x, 8, Math.max(8, window.innerWidth - width - 8));
  const y = clamp(widgetManualPosition.y, 8, Math.max(8, window.innerHeight - 160));
  widget.style.left = `${x}px`;
  widget.style.top = `${y}px`;
  widget.style.right = "auto";
  widget.style.bottom = "auto";
  widget.style.maxHeight = `${Math.max(200, window.innerHeight - y - 16)}px`;
}

function readWidgetPosition() {
  try {
    const raw = localStorage.getItem("jh-widget-position");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveWidgetPosition(position) {
  try {
    if (position) {
      localStorage.setItem("jh-widget-position", JSON.stringify(position));
    } else {
      localStorage.removeItem("jh-widget-position");
    }
  } catch {
    // localStorage blocked — drag still works for the current page
  }
}

// Drag the overlay card by its header. A drag detaches it from the toolbar
// (manual mode, persisted); double-clicking the header re-docks it.
function makeWidgetDraggable(widget) {
  const header = widget.querySelector(".jh-widget-header");
  if (!header) return;
  let dragState = null;

  header.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.target?.closest?.("button")) return;
    const rect = widget.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    header.setPointerCapture?.(event.pointerId);
    header.style.cursor = "grabbing";
  });

  header.addEventListener("pointermove", (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (Math.abs(dx) + Math.abs(dy) <= 4 && !dragState.moved) return;
    dragState.moved = true;
    widgetManualPosition = {
      x: Math.round(dragState.originX + dx),
      y: Math.round(dragState.originY + dy),
    };
    applyWidgetManualPosition();
  });

  const finishDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const moved = dragState.moved;
    dragState = null;
    header.releasePointerCapture?.(event.pointerId);
    header.style.cursor = "grab";
    if (moved && widgetManualPosition) saveWidgetPosition(widgetManualPosition);
  };
  header.addEventListener("pointerup", finishDrag);
  header.addEventListener("pointercancel", finishDrag);

  header.addEventListener("dblclick", (event) => {
    if (event.target?.closest?.("button")) return;
    widgetManualPosition = null;
    saveWidgetPosition(null);
    positionWidgetRelativeToToolbar();
    showToast("Menu re-docked to the toolbar.");
  });
}

function readFloatingActionsPosition() {
  try {
    const raw = localStorage.getItem("jh-floating-actions-position");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
    return {
      x: clamp(parsed.x, 8, Math.max(8, window.innerWidth - 396)),
      y: clamp(parsed.y, 8, Math.max(8, window.innerHeight - 80)),
    };
  } catch {
    return null;
  }
}

function saveFloatingActionsPosition(position) {
  try {
    localStorage.setItem("jh-floating-actions-position", JSON.stringify(position));
  } catch {
    // Some sites block localStorage; drag still works for the current page.
  }
}

function detectQuestion(input) {
  if (!input) return "";
  const labelText = getLabelText(input).trim();
  if (labelText && labelText.length > 10) {
    return labelText;
  }
  if (input.placeholder && input.placeholder.trim().length > 10) {
    return input.placeholder.trim();
  }

  // Crawl parent nodes to look for nearby questions using fast textContent
  let parent = input.parentElement;
  let depth = 0;
  while (parent && depth < 3) {
    const headersAndLabels = parent.querySelectorAll("h1, h2, h3, h4, label, p, span");
    for (const el of headersAndLabels) {
      const text = (el.textContent || el.innerText || "").trim();
      if (
        text.endsWith("?") ||
        /\b(why|describe|how|tell us|explain|share|experience)\b/i.test(text)
      ) {
        if (text.length > 15 && text.length < 400) {
          return text;
        }
      }
    }
    parent = parent.parentElement;
    depth++;
  }
  return "";
}

async function handleAiSolverDraft(inputElement) {
  const input = inputElement || lastFocusedInput;
  if (!input) {
    showToast("Please click on a text input/textarea field first! ⚠️");
    return;
  }

  const questionVal = detectQuestion(input);
  if (!questionVal) {
    showToast("Please select a field with a detectable question. ⚠️");
    return;
  }

  showToast("Gemma drafting answer... 🧠");

  try {
    const jobDetails = extractJob();
    const payload = {
      company: jobDetails.company,
      role: jobDetails.role,
      description: jobDetails.description || jobDetails.pageText,
      question: questionVal,
    };

    const data = await apiProxy(
      "http://127.0.0.1:8787/api/generate-answer",
      "POST",
      payload
    );

    if (data && data.ok && data.answer) {
      showToast("Gemma draft generated! Typing... ⚡");
      await typeIntoField(input, data.answer);
      showToast("Answer drafted and fully typed! ✨");
    } else {
      throw new Error(data.error || "Gemma question solver response was invalid.");
    }
  } catch (err) {
    showToast("Failed to draft answer. Check server logs. ❌");
    console.error("AI question solver error: ", err);
  }
}

// Thin wrapper over typeHumanLike: types the AI-drafted answer keystroke by
// keystroke with realistic per-key events and timing (defined near
// setInputValue), instead of an instant paste.
async function typeIntoField(element, text) {
  if (!element) return;
  await typeHumanLike(element, text);
}

/* ==========================================================================
   🪄 ASK GEMMA — pick one field on the page and have Gemma answer it
   ========================================================================== */
// Runs in every frame: the user clicks "Ask" in the top-frame toolbar, types
// optional guidance, then clicks the field. The frame that owns the clicked
// field calls /api/autofill-ai with just that field (plus the instruction) and
// applies the answer through the same machinery as the bulk autofill pass.

let askPickActive = false;
let askPickInstruction = "";
let askPickHover = null;
let askPickHoverPrevOutline = "";
let askPickPrevCursor = "";

function broadcastAskMode(action, instruction = "") {
  try {
    chrome.runtime
      .sendMessage({ type: "JH_BROADCAST_ASK_MODE", action, instruction })
      .catch(() => {});
  } catch {
    // extension context invalidated — local mode still works in this frame
  }
}

function askPickCandidateFromEvent(event) {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
  for (const node of path) {
    if (!node || node === document || node === window) continue;
    if (isInCopilotUi(node)) return null;
    if (node.matches?.(FILLABLE_FIELD_SELECTOR) && !isLegacySelectWidgetInput(node) && !isReactSelectRequiredInput(node)) return node;
    if (node.tagName === "LABEL" && node.control) return node.control;
  }
  // Clicking a custom widget's chrome (react-select control, combobox shell)
  // should resolve to the typing input inside it.
  for (const node of path) {
    if (!node?.querySelector || node === document.body || node === document.documentElement) continue;
    if (node.matches?.('[role="combobox"], [class*="select__control" i], [class*="select-shell" i], .iti')) {
      const inner = node.querySelector(FILLABLE_FIELD_SELECTOR);
      if (inner && !isInCopilotUi(inner)) return inner;
    }
  }
  // Clicking a segmented Yes/No / button-choice option resolves to its group so
  // Gemma answers the question and we click the matching button.
  for (const node of path) {
    if (!node || node.nodeType !== 1 || node === document.body || node === document.documentElement) continue;
    if (isInCopilotUi(node)) return null;
    const container = getButtonChoiceGroupContainer(node);
    if (container) return container;
  }
  return null;
}

function setAskPickHover(el) {
  if (askPickHover === el) return;
  if (askPickHover) askPickHover.style.outline = askPickHoverPrevOutline;
  askPickHover = el || null;
  askPickHoverPrevOutline = el ? el.style.outline : "";
  if (el) el.style.outline = "2px solid #FFB300";
}

function handleAskPickPointerDown(event) {
  if (!askPickActive || isInCopilotUi(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  const target = askPickCandidateFromEvent(event);
  if (!target) return; // not a fillable control — keep picking
  const instruction = askPickInstruction;
  broadcastAskMode("exit");
  exitAskPickMode();
  runAskGemmaOnField(target, instruction);
}

function swallowAskPickEvent(event) {
  if (!askPickActive || isInCopilotUi(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
}

function handleAskPickHover(event) {
  if (!askPickActive) return;
  setAskPickHover(askPickCandidateFromEvent(event));
}

function handleAskPickKeydown(event) {
  if (!askPickActive || event.key !== "Escape") return;
  event.preventDefault();
  event.stopPropagation();
  broadcastAskMode("exit");
  exitAskPickMode();
  if (IS_TOP_FRAME) {
    renderAskResult({ state: "error", detail: "Field pick cancelled." });
    showToast("Ask Gemma cancelled.");
  }
}

function enterAskPickMode(instruction) {
  askPickInstruction = instruction || "";
  if (askPickActive) return;
  askPickActive = true;
  askPickPrevCursor = document.documentElement.style.cursor;
  document.documentElement.style.cursor = "crosshair";
  document.addEventListener("pointerdown", handleAskPickPointerDown, true);
  document.addEventListener("mouseup", swallowAskPickEvent, true);
  document.addEventListener("click", swallowAskPickEvent, true);
  document.addEventListener("mouseover", handleAskPickHover, true);
  document.addEventListener("keydown", handleAskPickKeydown, true);
}

function exitAskPickMode() {
  if (!askPickActive) return;
  askPickActive = false;
  setAskPickHover(null);
  document.documentElement.style.cursor = askPickPrevCursor;
  document.removeEventListener("pointerdown", handleAskPickPointerDown, true);
  document.removeEventListener("mouseup", swallowAskPickEvent, true);
  document.removeEventListener("click", swallowAskPickEvent, true);
  document.removeEventListener("mouseover", handleAskPickHover, true);
  document.removeEventListener("keydown", handleAskPickKeydown, true);
}

// Surface progress/results in the top-frame Ask panel regardless of which
// frame ran the fill.
function reportAskStatus(result) {
  if (IS_TOP_FRAME) {
    renderAskResult(result);
    return;
  }
  try {
    chrome.runtime
      .sendMessage({ type: "JH_ASK_RESULT", result: { ...result, frameHost: location.hostname } })
      .catch(() => {});
  } catch {
    // extension context gone — nothing to surface
  }
}

async function runAskGemmaOnField(input, instruction) {
  const label = getAutofillFieldLabel(input);
  reportAskStatus({ state: "working", label, detail: instruction ? `Instruction: ${instruction}` : "Asking Gemma..." });
  showToast(`Asking Gemma about “${label.slice(0, 60)}”... 🧠`);
  try {
    const jobContext = extractJob();
    const data = await apiProxy("http://127.0.0.1:8787/api/autofill-ai", "POST", {
      fields: [buildAiFieldDescriptor(input)],
      job: jobContext,
      pageText: jobContext.pageText || jobContext.description || "",
      instruction: (instruction || "").slice(0, 500),
    });
    const value = data?.mappings ? data.mappings["0"] : undefined;
    if (!data?.ok || value === undefined || String(value).trim() === "") {
      reportAskStatus({ state: "error", label, detail: data?.error || "Gemma returned no confident answer for this field." });
      showToast("Gemma had no answer for that field. ❌");
      return;
    }
    // The user's explicit ask overrides the profile pin on identity-ish fields.
    const outcome = await applyAiValueToField(input, value, { respectProfileGuard: false });
    if (outcome.filled) {
      reportAskStatus({ state: "done", label, value: String(outcome.displayValue ?? value), detail: "Filled — review it before submitting." });
      showToast(`Gemma filled “${label.slice(0, 60)}”. ⚡`);
    } else {
      reportAskStatus({ state: "error", label, value: String(outcome.displayValue ?? value), detail: outcome.reason || "Could not apply the proposed value. It is shown above so you can paste it." });
      showToast("Gemma answered but the value could not be applied — see the Ask panel.");
    }
  } catch (err) {
    console.warn("Ask Gemma failed:", err);
    reportAskStatus({ state: "error", label, detail: err?.message || "Local Gemma/server unavailable." });
    showToast("Ask Gemma failed — is the cockpit server running?");
  }
}

// Top-frame only: render state into the Ask panel (and reopen the widget for
// final states so the user sees the outcome).
function renderAskResult(result = {}) {
  if (!IS_TOP_FRAME) return;
  ensureCopilotPanel(localProfile);
  const status = document.getElementById("jh-ask-status");
  if (!status) return;
  status.hidden = false;
  status.className = `jh-ask-status ${result.state || ""}`;
  status.replaceChildren();

  const title = document.createElement("strong");
  title.textContent =
    result.state === "picking" ? "Click the field Gemma should answer (Esc cancels)." :
    result.state === "working" ? `Gemma is answering: ${result.label || "field"}` :
    result.state === "done" ? `Filled: ${result.label || "field"}` :
    `Not filled${result.label ? ` — ${result.label}` : ""}`;
  status.appendChild(title);

  if (result.value) {
    const valueRow = document.createElement("div");
    valueRow.className = "jh-ask-value";
    const valueText = document.createElement("span");
    valueText.textContent = result.value;
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "jh-audit-copy";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async () => {
      try {
        await copyTextToClipboard(result.value);
        copyBtn.textContent = "Copied";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 1200);
      } catch {
        showToast("Could not copy the answer.");
      }
    });
    valueRow.append(valueText, copyBtn);
    status.appendChild(valueRow);
  }

  if (result.detail) {
    const detail = document.createElement("small");
    detail.textContent = result.frameHost ? `${result.detail} (embedded form: ${result.frameHost})` : result.detail;
    status.appendChild(detail);
  }

  if (result.state === "done" || result.state === "error") {
    showCopilotPanel("ask");
  }
}

// Entry point from the toolbar button / panel: minimize the widget so it does
// not cover the form, then arm pick mode in every frame.
function startAskFieldPick() {
  const instruction = (document.getElementById("jh-ask-instruction")?.value || "").trim().slice(0, 500);
  renderAskResult({ state: "picking" });
  const widget = document.getElementById("jh-copilot-widget");
  if (widget) widget.classList.add("minimized");
  broadcastAskMode("enter", instruction);
  enterAskPickMode(instruction); // local fallback if the relay fails
  showToast("Pick mode: click the field Gemma should answer (Esc cancels).");
}

let toastHideTimer = null;
let toastShowTimer = null;

function showToast(message) {
  if (!IS_TOP_FRAME) {
    // Surface the message in the top document instead of inside the iframe,
    // labelled so the user knows it came from an embedded form.
    try {
      chrome.runtime
        .sendMessage({ type: "JH_RELAY_TOAST", text: `Embedded form (${location.hostname}) — ${message}` })
        .catch(() => {});
    } catch {
      // extension context gone — drop the toast
    }
    return;
  }
  let toast = document.querySelector("#jh-copilot-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "jh-copilot-toast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: rgba(20, 21, 24, 0.85);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      border-radius: 12px;
      padding: 12px 24px;
      color: #E2E2E6;
      font-family: 'Outfit', system-ui, -apple-system, sans-serif;
      font-size: 13.5px;
      font-weight: 500;
      z-index: 1000005;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s;
      opacity: 0;
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }

  toast.replaceChildren();
  const icon = document.createElement("span");
  icon.style.cssText = "color: #FFB300; font-size: 16px; font-weight: bold;";
  icon.textContent = "⚡";
  const text = document.createElement("span");
  text.textContent = message;
  toast.appendChild(icon);
  toast.appendChild(text);

  // Clear any pending show/hide timers from a previous call so rapid successive
  // toasts don't cancel each other prematurely.
  clearTimeout(toastShowTimer);
  clearTimeout(toastHideTimer);

  // Trigger Slide In
  toastShowTimer = setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(0)";
    toast.style.opacity = "1";
  }, 10);

  // Auto Hide after 3.2s
  toastHideTimer = setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(100px)";
    toast.style.opacity = "0";
  }, 3200);
}

function injectStyles() {
  const styleId = "jh-copilot-styles";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

    /* Floating action buttons container — one compact horizontal pill bar */
    #jh-floating-actions {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: auto;
      max-width: min(96vw, 760px);
      display: flex;
      gap: 4px;
      z-index: 1000000;
      align-items: center;
      pointer-events: auto;
      font-family: 'Outfit', system-ui, -apple-system, sans-serif;
      padding: 6px;
      border-radius: 999px;
      background: rgba(18, 20, 24, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.04) inset;
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      cursor: grab;
      touch-action: none;
      user-select: none;
      overflow: visible;
      transition: box-shadow 0.3s, border-color 0.3s;
      animation: jh-bar-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes jh-bar-enter {
      from { opacity: 0; transform: translateY(14px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    #jh-floating-actions.jh-dragging {
      cursor: grabbing;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
    }

    .jh-toolbar-menu {
      position: absolute;
      right: 0;
      bottom: calc(100% + 8px);
      width: min(220px, 84vw);
      display: none;
      flex-direction: column;
      gap: 5px;
      padding: 7px;
      border-radius: 12px;
      background: rgba(18, 20, 24, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.58), 0 0 0 1px rgba(255,255,255,0.04) inset;
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      cursor: default;
      animation: jh-dropdown-fade 0.16s ease-out;
    }

    .jh-toolbar-menu[hidden],
    .jh-toolbar-menu:not(.visible) {
      display: none !important;
    }

    .jh-toolbar-menu.visible {
      display: flex;
    }

    .jh-floating-btn {
      flex: 0 0 auto;
      height: 34px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.06);
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: none;
      transition: background 0.18s, border-color 0.18s, transform 0.18s, filter 0.18s, opacity 0.18s;
      color: #E8E8EC;
    }

    .jh-toolbar-menu .jh-floating-btn {
      width: 100%;
      height: 36px;
      justify-content: flex-start;
      border-radius: 8px;
      padding: 0 10px;
      background: rgba(255, 255, 255, 0.045);
    }

    .jh-more-btn {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.075);
    }

    .jh-more-btn[aria-expanded="true"] {
      background: rgba(255, 179, 0, 0.14);
      border-color: rgba(255, 179, 0, 0.38);
    }

    .jh-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      pointer-events: none;
      font-size: 13px;
    }

    .jh-btn-label {
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.2px;
      line-height: 1;
      pointer-events: none;
      white-space: nowrap;
    }

    .jh-floating-btn:hover {
      transform: translateY(-1px);
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.16);
    }

    .jh-floating-btn:active {
      transform: translateY(0) scale(0.97);
      filter: brightness(0.95);
    }

    /* Primary action: Fill — the only filled (amber) pill */
    .jh-prefill-btn {
      background: linear-gradient(135deg, #FFB300, #F57C00);
      border-color: transparent;
      color: #1A0C00;
      font-weight: 700;
    }
    .jh-prefill-btn .jh-btn-label { color: #1A0C00; font-weight: 700; }
    .jh-prefill-btn:hover {
      background: linear-gradient(135deg, #FFC233, #FB8C00);
      border-color: transparent;
    }

    .jh-prefill-btn.jh-no-form { opacity: 0.75; }

    /* Secondary actions: neutral pills with a colored accent */
    .jh-cv-btn .jh-btn-label { color: #BFD9FF; }
    .jh-cv-btn:hover { border-color: rgba(162, 201, 255, 0.45); background: rgba(162, 201, 255, 0.12); }

    .jh-evaluate-btn .jh-btn-label { color: #CBB7FF; }
    .jh-evaluate-btn:hover { border-color: rgba(124, 77, 255, 0.45); background: rgba(124, 77, 255, 0.16); }

    .jh-company-btn .jh-btn-label { color: #9ADFF5; }
    .jh-company-btn:hover { border-color: rgba(0, 180, 219, 0.45); background: rgba(0, 180, 219, 0.14); }

    .jh-track-btn .jh-btn-label { color: #9FE8BD; }
    .jh-track-btn:hover { border-color: rgba(0, 200, 83, 0.45); background: rgba(0, 200, 83, 0.14); }

    .jh-today-btn .jh-btn-label { color: #FFE082; }
    .jh-today-btn:hover { border-color: rgba(255, 213, 79, 0.45); background: rgba(255, 213, 79, 0.12); }

    .jh-ask-btn .jh-btn-label { color: #FFC9A3; }
    .jh-ask-btn:hover { border-color: rgba(255, 145, 64, 0.45); background: rgba(255, 145, 64, 0.14); }

    .jh-ask-hint {
      margin: 0 0 10px;
      color: #A5A5AB;
      font-size: 12px;
      line-height: 1.5;
    }

    .jh-ask-instruction {
      width: 100%;
      box-sizing: border-box;
      resize: vertical;
      min-height: 58px;
      margin-bottom: 10px;
      font-family: inherit;
    }

    .jh-ask-status {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 12.5px;
      color: #E2E2E6;
    }
    .jh-ask-status.done { border-color: rgba(0, 200, 83, 0.4); }
    .jh-ask-status.error { border-color: rgba(255, 109, 109, 0.4); }
    .jh-ask-status small { color: #A5A5AB; line-height: 1.45; }

    .jh-ask-value {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 8px;
      background: rgba(255, 179, 0, 0.08);
      border: 1px solid rgba(255, 179, 0, 0.25);
      color: #FFD9A0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .jh-hide-btn {
      flex: 0 0 34px;
      width: 34px;
      padding: 0;
      background: transparent;
      border-color: transparent;
      color: rgba(255, 255, 255, 0.55);
      font-size: 13px;
    }

    .jh-hide-btn:hover {
      color: #FFF;
      background: rgba(255, 255, 255, 0.1);
      border-color: transparent;
    }

    .jh-floating-btn:disabled {
      opacity: 0.6;
      cursor: wait;
      transform: none !important;
    }

    /* Panel slide-in animation */
    @keyframes jh-panel-slide {
      from { opacity: 0; transform: translateX(6px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .jh-panel-section:not([hidden]) {
      animation: jh-panel-slide 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Glassmorphic card widget */
    #jh-copilot-widget {
      position: fixed;
      bottom: 100px;
      right: 24px;
      width: 380px;
      max-height: calc(100vh - 120px);
      border-radius: 16px;
      background: rgba(18, 19, 22, 0.85);
      backdrop-filter: blur(24px) saturate(190%);
      -webkit-backdrop-filter: blur(24px) saturate(190%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
      z-index: 1000000;
      font-family: 'Outfit', system-ui, -apple-system, sans-serif;
      color: #E2E2E6;
      box-sizing: border-box;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: bottom right;
    }

    #jh-copilot-widget.minimized {
      opacity: 0;
      pointer-events: none;
      transform: translateY(20px) scale(0.95);
    }

    #jh-copilot-widget * {
      box-sizing: border-box;
    }

    /* Header — drag handle for the whole card (dblclick re-docks) */
    .jh-widget-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 68px;
      cursor: grab;
      user-select: none;
      touch-action: none;
    }

    .jh-widget-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .jh-brand-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #FFB300, #F57C00);
      color: #000;
      font-weight: 800;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .jh-brand-subtitle {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #FFB300;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 2px;
    }

    .jh-brand-title {
      font-size: 15px;
      font-weight: 700;
      color: #FFF;
      line-height: 1;
    }

    .jh-close-btn {
      background: transparent;
      border: none;
      color: #A5A5AB;
      cursor: pointer;
      font-size: 24px;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s, background 0.2s;
      border-radius: 6px;
      line-height: 1;
    }

    .jh-close-btn:hover {
      color: #FFF;
      background: rgba(255, 255, 255, 0.05);
    }

    /* Body */
    .jh-widget-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .jh-widget-body::-webkit-scrollbar {
      width: 6px;
    }
    .jh-widget-body::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
    }
    .jh-widget-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
    }
    .jh-widget-body::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 179, 0, 0.4);
    }

    .jh-panel-section {
      width: 100%;
    }

    .jh-section-title {
      font-size: 14px;
      font-weight: 600;
      color: #FFB300;
      margin-top: 0;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }

    .jh-results-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* AI Loading state */
    .jh-draft-loading {
      display: none;
      align-items: center;
      gap: 10px;
      font-size: 12.5px;
      color: #FFB300;
      justify-content: center;
      background: rgba(255, 179, 0, 0.05);
      border: 1px solid rgba(255, 179, 0, 0.15);
      padding: 12px;
      border-radius: 8px;
      margin-top: 8px;
    }

    .jh-draft-loading.visible {
      display: flex;
    }

    .jh-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 179, 0, 0.2);
      border-top-color: #FFB300;
      border-radius: 50%;
      animation: jh-spin 0.8s linear infinite;
    }

    @keyframes jh-spin {
      to { transform: rotate(360deg); }
    }

    .jh-listener-card {
      margin-bottom: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
    }

    .jh-listener-row {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #FFFFFF;
      font-size: 12px;
    }

    .jh-listener-dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: #777;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.05);
      flex: 0 0 auto;
    }

    .jh-listener-dot.active {
      background: #00C853;
      box-shadow: 0 0 0 3px rgba(0, 200, 83, 0.14), 0 0 14px rgba(0, 200, 83, 0.45);
    }

    #jh-submit-listener-detail {
      margin: 6px 0 0;
      color: #A5A5AB;
      font-size: 11px;
      line-height: 1.35;
    }

    .jh-workflow-card {
      margin-bottom: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.22);
    }

    .jh-workflow-summary {
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .jh-workflow-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .jh-workflow-step {
      display: grid;
      grid-template-columns: 18px 1fr;
      gap: 8px;
      align-items: start;
      color: #A5A5AB;
      font-size: 11px;
      line-height: 1.25;
    }

    .jh-workflow-dot {
      width: 16px;
      height: 16px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.45);
      margin-top: 1px;
    }

    .jh-workflow-step.done .jh-workflow-dot {
      background: rgba(0, 200, 83, 0.18);
      border-color: rgba(0, 200, 83, 0.45);
      color: #65D99A;
    }

    .jh-workflow-step.active .jh-workflow-dot {
      background: rgba(255, 179, 0, 0.18);
      border-color: rgba(255, 179, 0, 0.5);
      color: #FFB300;
      animation: jh-pulse 1s ease-in-out infinite;
    }

    .jh-workflow-step.error .jh-workflow-dot {
      background: rgba(255, 61, 0, 0.15);
      border-color: rgba(255, 61, 0, 0.45);
      color: #FF8A65;
    }

    .jh-workflow-text {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .jh-workflow-text strong {
      color: #E2E2E6;
      font-weight: 700;
    }

    .jh-workflow-step.done .jh-workflow-text strong {
      color: #FFFFFF;
    }

    .jh-workflow-step.error .jh-workflow-text strong {
      color: #FFAB91;
    }

    .jh-workflow-text small {
      color: #8E8E96;
      font-size: 10.5px;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }

    @keyframes jh-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(255, 179, 0, 0.18); }
      50% { box-shadow: 0 0 0 4px rgba(255, 179, 0, 0); }
    }

    .jh-payload-card {
      margin-bottom: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(127, 196, 255, 0.22);
      background: rgba(77, 146, 209, 0.085);
    }

    .jh-payload-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
    }

    .jh-payload-header strong {
      display: block;
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.25;
    }

    .jh-payload-header span {
      display: block;
      color: #9FB3C8;
      font-size: 10px;
      line-height: 1.35;
      margin-top: 2px;
    }

    .jh-payload-copy {
      flex: 0 0 auto;
      border: 1px solid rgba(127, 196, 255, 0.32);
      border-radius: 8px;
      background: rgba(127, 196, 255, 0.12);
      color: #D7ECFF;
      font-size: 10.5px;
      font-weight: 800;
      padding: 5px 8px;
      cursor: pointer;
    }

    .jh-payload-copy:hover:not(:disabled) {
      background: rgba(127, 196, 255, 0.2);
      border-color: rgba(127, 196, 255, 0.48);
    }

    .jh-payload-copy:disabled {
      cursor: default;
      opacity: 0.45;
    }

    .jh-payload-json {
      max-height: 170px;
      overflow: auto;
      margin: 0;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.32);
      color: #DDEBFA;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 10.5px;
      line-height: 1.45;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    /* Autofill Logs specific styles */
    #jh-autofill-audit-log {
      font-size: 11.5px;
      background: rgba(255, 179, 0, 0.055);
      border: 1px solid rgba(255, 179, 0, 0.16);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 10px;
    }

    .jh-audit-summary {
      color: #FFB300;
      font-weight: 700;
      margin-bottom: 10px;
      line-height: 1.35;
    }

    .jh-audit-list {
      margin: 0;
      padding: 0;
      list-style: none;
      color: #FFF;
      display: flex;
      flex-direction: column;
      gap: 7px;
      word-break: break-word;
    }

    .jh-audit-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
      gap: 8px;
      padding: 8px 9px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.22);
      border: 1px solid rgba(255, 255, 255, 0.07);
    }

    .jh-audit-row.skipped {
      border-color: rgba(255, 179, 0, 0.2);
      background: rgba(255, 179, 0, 0.065);
    }

    .jh-audit-row.empty {
      display: block;
    }

    .jh-audit-field-wrap {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
      user-select: text;
    }

    .jh-audit-field {
      color: #FFFFFF;
      font-size: 11.5px;
      font-weight: 700;
      line-height: 1.2;
      overflow-wrap: anywhere;
      user-select: text;
    }

    .jh-audit-value {
      color: #C9C9D1;
      font-size: 11px;
      line-height: 1.35;
      overflow-wrap: anywhere;
      user-select: text;
    }

    .jh-audit-proposed,
    .jh-audit-reason {
      color: #B8B8C0;
      font-size: 10.5px;
      line-height: 1.35;
      overflow-wrap: anywhere;
      user-select: text;
    }

    .jh-audit-proposed {
      color: #FFE1A1;
    }

    .jh-audit-meta {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 5px;
    }

    .jh-audit-source {
      flex: 0 0 auto;
      align-self: start;
      border: 1px solid transparent;
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.2px;
      line-height: 1.3;
      white-space: nowrap;
    }

    .jh-audit-copy {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 7px;
      background: rgba(255, 255, 255, 0.06);
      color: #D7D7DD;
      font-size: 9.5px;
      font-weight: 800;
      line-height: 1.2;
      padding: 4px 7px;
      cursor: pointer;
      white-space: nowrap;
      user-select: none;
    }

    .jh-audit-copy:hover {
      background: rgba(255, 179, 0, 0.14);
      border-color: rgba(255, 179, 0, 0.34);
      color: #FFD56F;
    }

    .jh-audit-source.profile {
      color: #FFD56F;
      background: rgba(255, 179, 0, 0.12);
      border-color: rgba(255, 179, 0, 0.28);
    }

    .jh-audit-source.ai {
      color: #7EE6A7;
      background: rgba(0, 200, 83, 0.12);
      border-color: rgba(0, 200, 83, 0.3);
    }

    .jh-audit-empty {
      color: #A5A5AB;
      font-size: 11.5px;
    }

    /* Inline Assistant Dropdown Styles */
    @keyframes jh-dropdown-fade {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .jh-dropdown-item {
      padding: 8px 12px;
      font-size: 12px;
      color: #E2E2E6;
      cursor: pointer;
      border-radius: 5px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s, color 0.2s;
      text-align: left;
      border: none;
      background: transparent;
      width: 100%;
      font-family: 'Outfit', system-ui, sans-serif;
    }
    .jh-dropdown-item:hover {
      background: rgba(255, 179, 0, 0.12);
      color: #FFB300;
    }
    .jh-dropdown-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.06);
      margin: 4px 0;
    }

    /* Form inputs and submission styles */
    .jh-widget-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      margin-top: 8px;
    }

    .jh-form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .jh-form-label {
      font-size: 11px;
      font-weight: 600;
      color: #A5A5AB;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .jh-form-input {
      background: rgba(0, 0, 0, 0.25) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 8px !important;
      padding: 8px 12px !important;
      color: #E2E2E6 !important;
      font-family: 'Outfit', sans-serif !important;
      font-size: 13px !important;
      width: 100% !important;
      outline: none !important;
      transition: border-color 0.2s, box-shadow 0.2s !important;
    }

    .jh-form-input:focus {
      border-color: rgba(255, 179, 0, 0.4) !important;
      box-shadow: 0 0 0 2px rgba(255, 179, 0, 0.1) !important;
    }

    select.jh-form-input {
      cursor: pointer !important;
      appearance: none !important;
    }

    .jh-form-submit-btn {
      background: linear-gradient(135deg, #00C853, #00A86B) !important;
      border: none !important;
      border-radius: 8px !important;
      padding: 10px 16px !important;
      color: #001B0C !important;
      font-weight: 700 !important;
      font-size: 13.5px !important;
      cursor: pointer !important;
      margin-top: 6px !important;
      transition: transform 0.2s, filter 0.2s !important;
      width: 100% !important;
      box-shadow: 0 4px 12px rgba(0, 200, 83, 0.2) !important;
    }

    .jh-form-submit-btn:hover {
      transform: translateY(-1px) !important;
      filter: brightness(1.1) !important;
    }

    .jh-form-submit-btn:active {
      transform: translateY(0) !important;
    }

    /* Company Check Panel */
    .jh-company-search {
      display: flex;
      gap: 6px;
      margin-bottom: 10px;
    }

    .jh-company-search .jh-form-input {
      flex: 1 1 auto !important;
      min-width: 0 !important;
    }

    .jh-company-search-btn {
      flex: 0 0 auto;
      border: none;
      border-radius: 8px;
      padding: 0 14px;
      background: linear-gradient(135deg, #00B4DB, #0083B0);
      color: #00222E;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.3px;
      cursor: pointer;
      transition: filter 0.18s, transform 0.18s;
    }

    .jh-company-search-btn:hover {
      filter: brightness(1.12);
      transform: translateY(-1px);
    }

    .jh-company-search-btn:active {
      transform: translateY(0);
    }

    .jh-company-detected {
      font-size: 11.5px;
      color: #A5A5AB;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: rgba(0, 180, 219, 0.06);
      border: 1px solid rgba(0, 180, 219, 0.18);
      border-radius: 8px;
      font-weight: 500;
    }

    .jh-company-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: 0.4px;
    }

    .jh-company-badge.applied {
      background: rgba(0, 200, 83, 0.12);
      color: #65D99A;
      border: 1px solid rgba(0, 200, 83, 0.3);
    }

    .jh-company-badge.new {
      background: rgba(124, 77, 255, 0.12);
      color: #B39DDB;
      border: 1px solid rgba(124, 77, 255, 0.3);
    }

    .jh-company-badge.error {
      background: rgba(255, 61, 0, 0.1);
      color: #FF8A65;
      border: 1px solid rgba(255, 61, 0, 0.3);
    }

    .jh-company-empty {
      font-size: 12px;
      color: #A5A5AB;
      line-height: 1.55;
      margin: 0;
    }

    .jh-company-apps {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .jh-app-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 11px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 9px;
      gap: 10px;
      transition: background 0.2s;
    }

    .jh-app-row:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    .jh-app-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }

    .jh-app-role {
      display: block !important;
      font-size: 12.5px !important;
      font-weight: 600 !important;
      color: #E2E2E6 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      max-width: 100% !important;
    }

    .jh-app-date {
      display: block !important;
      font-size: 10px !important;
      color: #8E8E96 !important;
    }

    .jh-app-status {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid transparent;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .jh-today-list {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .jh-today-card {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
      padding: 10px 11px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: background 0.18s, border-color 0.18s;
    }

    .jh-today-card:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.13);
    }

    .jh-today-info {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .jh-today-company {
      display: block;
      color: #FFFFFF;
      font-size: 12.5px;
      font-weight: 800;
      line-height: 1.18;
      overflow-wrap: anywhere;
    }

    .jh-today-role {
      display: block;
      color: #CFCFD6;
      font-size: 11.5px;
      font-weight: 600;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }

    .jh-today-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      align-items: center;
      color: #8E8E96;
      font-size: 10px;
      line-height: 1.3;
    }

    .jh-today-time,
    .jh-today-meta-text,
    .jh-today-source {
      display: inline-flex;
      min-width: 0;
      max-width: 100%;
      padding: 2px 6px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.055);
      color: #A5A5AB;
      text-decoration: none;
      overflow-wrap: anywhere;
    }

    .jh-today-source:hover {
      color: #FFB300;
      background: rgba(255, 179, 0, 0.1);
    }

    .jh-today-status {
      align-self: start;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid transparent;
      white-space: nowrap;
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(style);
}

function renderInlineEvaluation(evaluation, parentDiv) {
  const score = Number(evaluation.matchScore) || 0;
  
  let dialColor = "#FF3D00"; // Low (Coral)
  if (score >= 80) dialColor = "#00C853"; // High (Green)
  else if (score >= 60) dialColor = "#FFB300"; // Med (Amber)

  let html = `
    <!-- Dial Verdict card -->
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; background: rgba(0,0,0,0.25); border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 12px;">
      <div>
        <div style="font-size: 11px; color: #A5A5AB; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight:600;">LLM Verdict</div>
        <div style="font-size: 18px; font-weight: 800; color: ${dialColor}; text-transform: uppercase;">${evaluation.applyOrSkip || "Maybe"}</div>
      </div>
      
      <!-- Animated SVG Single Dial -->
      <div style="position: relative; width: 56px; height: 56px;">
        <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; transform: rotate(-90deg);">
          <defs>
            <linearGradient id="dialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${score >= 80 ? '#00F2FE' : score >= 60 ? '#FFD700' : '#FF3D00'}" />
              <stop offset="100%" stop-color="${dialColor}" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" stroke-width="8" fill="none" />
          <circle cx="50" cy="50" r="40" stroke="url(#dialGrad)" stroke-width="8" stroke-linecap="round" fill="none"
                  stroke-dasharray="251.2" stroke-dashoffset="${251.2 - (251.2 * score / 100)}"
                  style="transition: stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1);" />
        </svg>
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #FFF;">${score}%</div>
      </div>
    </div>
  `;

  if (evaluation.finalDecision) {
    html += `
      <div style="padding: 10px 12px; background: rgba(0,0,0,0.25); border-left: 3px solid ${dialColor}; font-size: 12.5px; line-height: 1.45; color: #E2E2E6; border-radius: 4px; margin-bottom: 12px;">
        ${evaluation.finalDecision}
      </div>
    `;
  }

  if (evaluation.strongMatches && evaluation.strongMatches.length > 0) {
    html += `
      <div style="font-size: 11px; color: #A5A5AB; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; margin-bottom: 4px; font-weight: 600;">Strong Matches</div>
      <ul style="margin: 0 0 12px; padding-left: 20px; font-size: 12px; color: #E2E2E6; line-height: 1.45;">
        ${evaluation.strongMatches.map(m => `<li style="margin-bottom: 4px;">${m}</li>`).join('')}
      </ul>
    `;
  }

  if (evaluation.gapsRisks && evaluation.gapsRisks.length > 0) {
    html += `
      <div style="font-size: 11px; color: #A5A5AB; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; margin-bottom: 4px; font-weight: 600;">Gaps / Risks</div>
      <ul style="margin: 0 0 12px; padding-left: 20px; font-size: 12px; color: #E2E2E6; line-height: 1.45;">
        ${evaluation.gapsRisks.map(m => `<li style="margin-bottom: 4px;">${m}</li>`).join('')}
      </ul>
    `;
  }

  parentDiv.innerHTML = html;
}

function getLocalDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseTrackerDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T12:00:00`)
    : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function applicationWasAppliedOnLocalDate(app, dateKey) {
  if (!app || !dateKey) return false;
  if (app.dateApplied === dateKey || app.stageDates?.Applied === dateKey) return true;
  const timestampCandidates = [app.appliedAt, app.stageDateTimes?.Applied];
  return timestampCandidates.some((candidate) => {
    const date = parseTrackerDate(candidate);
    return date && getLocalDateKey(date) === dateKey;
  });
}

function getAppliedSortTime(app) {
  const timestamp = parseTrackerDate(app?.appliedAt || app?.stageDateTimes?.Applied);
  if (timestamp) return timestamp.getTime();
  const dateOnly = parseTrackerDate(app?.dateApplied || app?.stageDates?.Applied);
  return dateOnly ? dateOnly.getTime() : 0;
}

function getAppliedTimeLabel(app) {
  const timestamp = parseTrackerDate(app?.appliedAt || app?.stageDateTimes?.Applied);
  if (!timestamp) return "today";
  return timestamp.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function compactTrackerText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getSourceHostLabel(sourceUrl) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getApplicationTitleParts(app) {
  const company = compactTrackerText(app?.company) ||
    compactTrackerText(app?.companyName) ||
    getSourceHostLabel(app?.sourceUrl) ||
    "Unknown company";
  const role = compactTrackerText(app?.role) ||
    compactTrackerText(app?.title) ||
    "Unknown role";
  return { company, role };
}

// Applied-today list. null = API error. Built with DOM methods only
// because app data can contain user-controlled text.
function renderTodayPanel(container, apps) {
  if (!container) return;

  if (apps === null) {
    const badge = document.createElement("span");
    badge.className = "jh-company-badge error";
    badge.textContent = "⚠ Connection error";
    const msg = document.createElement("p");
    msg.className = "jh-company-empty";
    msg.textContent = "Could not connect to the local dashboard. Make sure the app is running at http://127.0.0.1:8787.";
    container.replaceChildren(badge, msg);
    return;
  }

  if (!apps.length) {
    const badge = document.createElement("span");
    badge.className = "jh-company-badge new";
    badge.textContent = "Nothing yet today";
    const msg = document.createElement("p");
    msg.className = "jh-company-empty";
    msg.textContent = "No applications tracked today. Fill or submit one and it will show up here.";
    container.replaceChildren(badge, msg);
    return;
  }

  const statusColors = {
    Applied: "#FFB300",
    Interview: "#7C4DFF",
    Offer: "#00C853",
    Rejected: "#FF6B6B",
    Saved: "#64B5F6",
    "OA / Assessment": "#FF9800",
    "Recruiter Screen": "#AB47BC",
  };

  const badge = document.createElement("span");
  badge.className = "jh-company-badge applied";
  badge.textContent = `${apps.length} applied today`;

  const appsDiv = document.createElement("div");
  appsDiv.className = "jh-today-list";

  apps.forEach((app) => {
    const color = statusColors[app.status] || "#A5A5AB";
    const { company, role } = getApplicationTitleParts(app);
    const sourceHost = getSourceHostLabel(app.sourceUrl);
    const row = document.createElement("div");
    row.className = "jh-today-card";

    const info = document.createElement("div");
    info.className = "jh-today-info";

    const companyEl = document.createElement("span");
    companyEl.className = "jh-today-company";
    companyEl.textContent = company;

    const roleEl = document.createElement("span");
    roleEl.className = "jh-today-role";
    roleEl.textContent = role;

    const metaEl = document.createElement("div");
    metaEl.className = "jh-today-meta";

    const timeEl = document.createElement("span");
    timeEl.className = "jh-today-time";
    timeEl.textContent = getAppliedTimeLabel(app);
    metaEl.appendChild(timeEl);

    const location = compactTrackerText(app.location);
    if (location) {
      const locationEl = document.createElement("span");
      locationEl.className = "jh-today-meta-text";
      locationEl.textContent = location;
      metaEl.appendChild(locationEl);
    }

    if (sourceHost && app.sourceUrl) {
      const linkEl = document.createElement("a");
      linkEl.className = "jh-today-source";
      linkEl.href = app.sourceUrl;
      linkEl.target = "_blank";
      linkEl.rel = "noopener noreferrer";
      linkEl.textContent = sourceHost;
      metaEl.appendChild(linkEl);
    }

    info.append(companyEl, roleEl, metaEl);

    const statusEl = document.createElement("span");
    statusEl.className = "jh-today-status";
    statusEl.textContent = app.status || "";
    statusEl.style.cssText = `background:${color}1a; color:${color}; border-color:${color}40;`;

    row.append(info, statusEl);
    appsDiv.appendChild(row);
  });

  container.replaceChildren(badge, appsDiv);
}

function renderCompanyPanel(container, company, matches, { onFillAnyway = null } = {}) {
  if (!container) return;

  // null matches = API error
  if (matches === null) {
    const badge = document.createElement("span");
    badge.className = "jh-company-badge error";
    badge.textContent = "⚠ Connection error";
    const msg = document.createElement("p");
    msg.className = "jh-company-empty";
    msg.textContent = "Could not connect to the local dashboard. Make sure the app is running at http://127.0.0.1:8787.";
    container.replaceChildren(badge, msg);
    return;
  }

  // No company detected
  if (!company) {
    const badge = document.createElement("span");
    badge.className = "jh-company-badge new";
    badge.textContent = "No company detected";
    const msg = document.createElement("p");
    msg.className = "jh-company-empty";
    msg.textContent = "Could not detect the company name on this page. Type the company in the search bar above to check your tracker.";
    container.replaceChildren(badge, msg);
    return;
  }

  // No previous applications
  if (matches.length === 0) {
    const badge = document.createElement("span");
    badge.className = "jh-company-badge new";
    badge.textContent = "✨ First application";
    const msg = document.createElement("p");
    msg.className = "jh-company-empty";
    msg.textContent = "No previous applications found for this company. This would be your first time applying!";
    container.replaceChildren(badge, msg);
    return;
  }

  const statusColors = {
    Applied: "#FFB300",
    Interview: "#7C4DFF",
    Offer: "#00C853",
    Rejected: "#FF6B6B",
    Saved: "#64B5F6",
    "OA / Assessment": "#FF9800",
    "Recruiter Screen": "#AB47BC",
  };

  const sorted = [...matches].sort((a, b) =>
    new Date(b.dateApplied || b.appliedAt || 0) - new Date(a.dateApplied || a.appliedAt || 0)
  );

  const badge = document.createElement("span");
  badge.className = "jh-company-badge applied";
  badge.textContent = `Applied ✓  ×${matches.length}`;

  const appsDiv = document.createElement("div");
  appsDiv.className = "jh-company-apps";

  sorted.forEach((app) => {
    const color = statusColors[app.status] || "#A5A5AB";
    const row = document.createElement("div");
    row.className = "jh-app-row";

    const info = document.createElement("div");
    info.className = "jh-app-info";

    const roleEl = document.createElement("span");
    roleEl.className = "jh-app-role";
    roleEl.textContent = (app.role || "").trim() || "Unknown Role";
    // Inline styles override any page CSS that might hide or recolour the text
    roleEl.style.cssText = "display:block;font-size:12.5px;font-weight:600;color:#E2E2E6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;";

    const dateEl = document.createElement("span");
    dateEl.className = "jh-app-date";
    const dateStr = (app.appliedAt || app.dateApplied)
      ? new Date(app.appliedAt || app.dateApplied).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      : "";
    dateEl.textContent = dateStr;
    dateEl.style.cssText = "display:block;font-size:10px;color:#8E8E96;";

    info.appendChild(roleEl);
    if (dateEl.textContent) info.appendChild(dateEl);

    const statusEl = document.createElement("span");
    statusEl.className = "jh-app-status";
    statusEl.textContent = app.status || "";
    statusEl.style.cssText = `background:${color}1a; color:${color}; border-color:${color}40;`;

    row.appendChild(info);
    row.appendChild(statusEl);
    appsDiv.appendChild(row);
  });

  const children = [badge, appsDiv];

  // Auto-open flow paused here because this job/company is already tracked —
  // let the user decide whether to fill the form anyway (the manual Fill button
  // is gone now that filling is automatic).
  if (typeof onFillAnyway === "function") {
    const note = document.createElement("p");
    note.className = "jh-company-empty";
    note.textContent = "Already in your tracker — autofill was paused. Fill the form anyway?";
    const fillBtn = document.createElement("button");
    fillBtn.type = "button";
    fillBtn.className = "jh-company-fill-anyway";
    fillBtn.textContent = "⚡ Fill anyway";
    fillBtn.style.cssText = "margin-top:8px;width:100%;padding:8px 12px;border-radius:8px;border:1px solid #006A6240;background:#006A621a;color:#39d3c6;font-weight:600;cursor:pointer;";
    fillBtn.addEventListener("click", () => {
      fillBtn.disabled = true;
      fillBtn.textContent = "Filling…";
      onFillAnyway();
    });
    children.push(note, fillBtn);
  }

  container.replaceChildren(...children);
}

// ── CV file injection ───────────────────────────────────────────
// Fetches the uploaded CV from the cockpit server and injects it into the file
// input that looks like the resume/CV upload field. ATS providers usually hide
// the real <input type="file"> behind a styled drop-zone, so candidates are NOT
// filtered by visibility; resume-ness is scored from the input's own attributes
// plus nearby drop-zone copy ("Drag & drop your resume…").
// Returns { injected, reason, detail, fileName, targetLabel } and records the
// outcome — success OR failure — in the autofill audit log.
function findResumeFileInputs() {
  const candidates = Array.from(document.querySelectorAll('input[type="file"]')).filter((el) => !isInCopilotUi(el));
  if (!candidates.length) return [];

  const RESUME_RE = /\b(resume|resumes|cv|curriculum\s*vitae|lebenslauf)\b/i;
  const ANTI_RE = /\b(cover\s*letter|transcript|photo|avatar|head\s*shot|certificate|w-?9|identification)\b/i;

  const scored = candidates.map((input) => {
    const ownText = [
      input.name,
      input.id,
      input.getAttribute("aria-label"),
      input.getAttribute("data-automation-id"),
      input.getAttribute("data-testid"),
      input.getAttribute("data-qa"),
      getLabelText(input),
    ]
      .filter(Boolean)
      .join(" ");
    const accept = (input.accept || "").toLowerCase();

    // Climb a few ancestors to catch drop-zone copy around the hidden input.
    let containerText = "";
    let node = input.parentElement;
    for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
      const text = clean(node.textContent || "");
      if (text && text.length <= 400) containerText = text;
    }

    let score = 0;
    if (RESUME_RE.test(ownText)) score += 6;
    if (RESUME_RE.test(containerText)) score += 3;
    if (ANTI_RE.test(`${ownText} ${containerText}`)) score -= 6;
    if (accept.includes("pdf") || accept.includes("doc")) score += 1;
    if (accept && /image|video|\.png|\.jpe?g|\.gif/.test(accept) && !accept.includes("pdf")) score -= 4;
    return { input, score };
  });

  const named = scored.filter((c) => c.score >= 3).sort((a, b) => b.score - a.score);
  if (named.length) return named.map((c) => c.input);

  // Fallback: a single document-friendly file input on a page that looks like
  // an application form is almost always the resume upload.
  const neutral = scored.filter((c) => c.score >= 0);
  if (neutral.length === 1 && looksLikeApplicationForm()) return [neutral[0].input];
  return [];
}

function getResumeInputLabel(input) {
  return clean(
    getLabelText(input) || input.getAttribute("aria-label") || input.name || input.id || "Resume upload"
  );
}

async function injectCvFileToInputs(variant, auditLog = []) {
  const fail = (reason, detail, { toast = false } = {}) => {
    auditLog.push(makeSkippedAuditEntry("CV file upload", detail, reason, { ai: false }));
    if (toast) showToast(detail);
    return { injected: false, reason, detail };
  };

  try {
    const fileInputs = findResumeFileInputs();
    if (fileInputs.length === 0) {
      return { injected: false, reason: "no-file-input", detail: "No resume upload field on this page." };
    }

    // Fetch the CV from the cockpit server (absolute URL — the background proxy
    // cannot resolve relative paths; a relative URL here is why CV injection
    // used to fail silently on every page).
    let cvData = null;
    try {
      cvData = await apiProxy(`http://127.0.0.1:8787/api/profile/cv/${variant}`);
    } catch (err) {
      const raw = err?.message || "";
      const msg = /no cv uploaded|404/i.test(raw)
        ? `No ${variant} CV uploaded yet — add it on the dashboard Profile page.`
        : `Couldn't fetch the ${variant} CV from the cockpit server (${raw || "offline"}).`;
      return fail("cv-unavailable", msg, { toast: true });
    }
    if (!cvData || !cvData.data || !cvData.fileName) {
      return fail("cv-unavailable", `No ${variant} CV uploaded yet — add it on the dashboard Profile page.`, { toast: true });
    }

    // Decode base64 → Uint8Array → File
    const byteChars = atob(cvData.data);
    const byteArr = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
    const file = new File([byteArr], cvData.fileName, { type: cvData.mimeType || "application/pdf" });

    const dt = new DataTransfer();
    dt.items.add(file);

    for (const input of fileInputs) {
      try {
        try {
          input.files = dt.files; // native FileList assignment — frameworks observe it
        } catch {
          Object.defineProperty(input, "files", { value: dt.files, writable: true, configurable: true });
        }
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        const targetLabel = getResumeInputLabel(input);
        auditLog.push(makeAuditEntry(targetLabel || "Resume upload", `[CV file attached: ${cvData.fileName}]`, { ai: false }));
        showToast(`CV attached: ${cvData.fileName}`);
        return { injected: true, fileName: cvData.fileName, targetLabel };
      } catch {
        // this candidate rejected the file — try the next one
      }
    }
    return fail("inject-failed", "Found a resume field but the page rejected the file injection.", { toast: true });
  } catch (err) {
    return fail("error", `CV injection failed: ${err?.message || "unknown error"}`);
  }
}

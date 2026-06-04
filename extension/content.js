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
// URLs tracked this page session — prevents repeat "application saved" toasts when
// a multi-step ATS form fires multiple submit-like events for the same application.
const trackedAppUrls = new Set();
let dragFloatingActionsState = null;

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
    sendResponse(extractJob());
    return false;
  }
  if (message?.type === "AUTOFILL_FORM") {
    ensureCopilotPanel(message.profile);
    expandWidget();
    autofillWebForm(message.profile, { useAi: true });
    return false;
  }
  // Received from background.js when an application was just saved via the
  // extension "+" form. Relay to the dashboard React app via window.postMessage
  // so the drawer opens for the newly-created application.
  if (message?.type === "OPEN_APP_DRAWER") {
    window.postMessage({ type: "JH_OPEN_DRAWER", appId: message.appId }, "*");
    sendResponse({ ok: true });
    return false;
  }
  if (message?.type === "TOGGLE_TOOLBAR") {
    const actionsBar = document.getElementById("jh-floating-actions");
    const widget = document.getElementById("jh-copilot-widget");
    if (actionsBar && widget) {
      const isHidden = actionsBar.style.display === "none";
      if (isHidden) {
        actionsBar.style.display = "flex";
        widget.style.display = "flex";
        widget.classList.remove("minimized");
      } else {
        actionsBar.style.display = "none";
        widget.style.display = "none";
      }
    } else {
      if (!looksLikeJobPosting()) {
        showToast("Not a job page — open a job posting to use the toolbar.");
        sendResponse({ ok: true });
        return false;
      }
      ensureProfileLoaded().then(() => {
        ensureCopilotPanel(localProfile);
        const newActions = document.getElementById("jh-floating-actions");
        const newWidget = document.getElementById("jh-copilot-widget");
        if (newActions && newWidget) {
          newActions.style.display = "flex";
          newWidget.style.display = "flex";
          newWidget.classList.remove("minimized");
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
    if (looksLikeJobPosting()) {
      chrome.runtime
        .sendMessage({ type: "JOB_PAGE_DETECTED", url: locationHref() })
        .catch(() => {});
    }
  } catch {
    // background not ready yet — silent
  }
})();

// Reset job-page caches on SPA navigations so looksLikeJobPosting() re-evaluates
// correctly after the URL changes. Nothing is injected automatically — the toolbar
// only appears when the user clicks the extension icon.
(function initCopilot() {
  let lastObservedUrl = locationHref();
  setInterval(() => {
    const currentUrl = locationHref();
    if (currentUrl !== lastObservedUrl) {
      lastObservedUrl = currentUrl;
      isJobPageCache = null;
      lastCachedUrl = "";
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

function attachFormSubmitTracker(reason = "manual", { silent = false } = {}) {
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
  if (widget) widget.classList.remove("minimized");

  const panels = {
    eval: document.getElementById("jh-eval-panel"),
    autofill: document.getElementById("jh-autofill-panel"),
    track: document.getElementById("jh-track-panel"),
    company: document.getElementById("jh-company-panel"),
  };
  Object.entries(panels).forEach(([name, panel]) => {
    if (panel) panel.hidden = name !== panelName;
  });
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

    updateWorkflowSteps("autofill", [
      { status: "done", label: `Submit detected`, detail: trigger },
      { status: "done", label: "Cleaned page text", detail: `${jobData.pageText.length} chars sent to Gemma, no raw HTML/forms.` },
      { status: "active", label: "Saving to dashboard", detail: "Background worker will finish even if the ATS navigates." },
      { status: "pending", label: "Evaluating role with Gemma" },
    ]);

    const result = await trackApplicationViaBackground(jobData, { trigger, runEvaluation: true });
    const status = result.status;

    if (result.ok) {
      updateWorkflowSteps("autofill", [
        { status: "done", label: `Submit detected`, detail: trigger },
        { status: "done", label: "Cleaned page text", detail: `${jobData.pageText.length} chars sent to Gemma, no raw HTML/forms.` },
        { status: "done", label: status === 200 ? "Updated dashboard card" : "Added dashboard card" },
        result.evaluationSaved
          ? { status: "done", label: "Stored Gemma evaluation", detail: `${result.evaluation?.decision || "Decision"} · ${result.evaluation?.score ?? 0}/100` }
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
  if (!document.getElementById("jh-copilot-widget") && profile) {
    injectWebCopilot(profile);
  }
}

function expandWidget() {
  const widget = document.getElementById("jh-copilot-widget");
  if (widget && widget.classList.contains("minimized")) {
    widget.classList.remove("minimized");
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
  const title = pickText(["h1", "[data-testid*='title' i]", "[class*='job-title' i]", "[class*='posting-title' i]"]) || document.title;
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
    if (/\b(greenhouse\.io|lever\.co|ashbyhq\.com|smartrecruiters\.com|bamboohr\.com|workable\.com|myworkdayjobs\.com)\b/.test(url)) {
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

function cleanRole(title) {
  return clean(
    title
      .replace(/\s+[-|]\s+.*$/, "")
      .replace(/\bat\s+[A-Z].*$/, "")
      .replace(/\bjob\b/i, ""),
  );
}

function findCompany(text) {
  // Strings that are UI labels / nav text, not company names
  const GARBAGE_RE = /^(back(\s+to\s+job(s)?)?|company|about(\s+the\s+company)?|employer|hiring\s+company|job\s+details?|careers?|apply(\s+now)?|application|jobs?|overview|open\s+positions?|view\s+all\s+jobs?|home|about\s+us|our\s+team|culture|see\s+all|all\s+jobs?)$/i;
  // Known ATS platform names — not the hiring company
  const ATS_PLATFORM_RE = /^(greenhouse|lever|ashby(hq)?|workday|smartrecruiters|bamboohr|workable|jobvite|icims|taleo|successfactors|recruitee|teamtailor|dover|pinpoint|rippling|gem)$/i;

  const isGarbage = (val) => !val || val.length < 2 || GARBAGE_RE.test(val.trim());

  // Slug from URL → readable name (e.g. "my-company-inc" → "My Company Inc")
  const slugToName = (slug) =>
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // 1. URL-based extraction for known ATS platforms (most reliable)
  const url = locationHref();
  const urlLower = url.toLowerCase();
  let urlCompany = "";

  const ghMatch = urlLower.match(/greenhouse\.io\/([^/?#]+)/);
  if (ghMatch) urlCompany = slugToName(ghMatch[1]);

  if (!urlCompany) {
    const leverMatch = urlLower.match(/lever\.co\/([^/?#]+)/);
    if (leverMatch) urlCompany = slugToName(leverMatch[1]);
  }
  if (!urlCompany) {
    const ashbyMatch = urlLower.match(/ashbyhq\.com\/([^/?#]+)/);
    if (ashbyMatch) urlCompany = slugToName(ashbyMatch[1]);
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

function getLabelText(input) {
  // 1. aria-labelledby: resolve the referenced element(s). Used heavily by
  //    Workday / Greenhouse / Lever and other modern ATS forms.
  const labelledBy = input.getAttribute && input.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => {
        try {
          const el = document.getElementById(id);
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
      const labelEl = document.querySelector(`label[for="${escapedId}"]`);
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
  if (!input.name) return [input];
  const root = input.form || document;
  return Array.from(root.querySelectorAll('input[type="radio"]'))
    .filter((el) => el.name === input.name && !isInCopilotUi(el));
}

function getChoiceGroup(input) {
  return getInputType(input) === "radio" ? getRadioGroup(input) : (input ? [input] : []);
}

function getRadioGroupKey(input) {
  if (!input || getInputType(input) !== "radio" || !input.name) return "";
  const formIndex = input.form ? Array.from(document.forms).indexOf(input.form) : -1;
  return `${formIndex}:${input.name}`;
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
    current = current.parentElement;
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
  return Array.from(
    document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]):not([type="password"]):not([type="image"]), textarea, select'
    )
  ).filter((input) => {
    if (isInCopilotUi(input) || isCustomSelectInput(input)) return false;
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
  if (input.tagName === "SELECT") return input.selectedIndex > 0;
  if (isChoiceInput(input)) {
    const type = getInputType(input);
    if (type === "radio") return getChoiceGroup(input).some((option) => option.checked);
    return input.checked;
  }
  return Boolean(input.value && input.value.trim());
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

function getAutofillFieldLabel(input) {
  return clean((isChoiceInput(input) ? getChoiceQuestionText(input) : getLabelText(input)) || input?.name || input?.id || "Unnamed Field");
}

function findInputs() {
  const inputs = collectFillableElements();
  const mapped = {};

  inputs.forEach((input) => {
    const label = getAutofillFieldLabel(input).toLowerCase();
    const choiceContext = isChoiceInput(input) ? getChoiceQuestionText(input).toLowerCase() : "";
    const name = (input.name || "").toLowerCase();
    const id = (input.id || "").toLowerCase();
    const placeholder = (input.placeholder || "").toLowerCase();
    const autocomplete = (input.getAttribute("autocomplete") || "").toLowerCase();

    const matches = (regex) => {
      return (
        regex.test(label) ||
        regex.test(choiceContext) ||
        regex.test(name) ||
        regex.test(id) ||
        regex.test(placeholder) ||
        regex.test(autocomplete)
      );
    };

    if (matches(/(?:first|given)[_\-\s]*name|^fname$/i)) {
      mapped.firstName = mapped.firstName || [];
      mapped.firstName.push(input);
    } else if (matches(/(?:last|family|sur)[_\-\s]*name|^lname$|^surname$/i)) {
      mapped.lastName = mapped.lastName || [];
      mapped.lastName.push(input);
    } else if (matches(/(?:full|whole)?[_\-\s]*name|^name$/i)) {
      if (!matches(/(?:first|last|given|family|middle)/i)) {
        mapped.fullName = mapped.fullName || [];
        mapped.fullName.push(input);
      }
    } else if (matches(/email/i)) {
      mapped.email = mapped.email || [];
      mapped.email.push(input);
    } else if (matches(/(?:phone|tel|mobile|cell|contact)/i)) {
      mapped.phone = mapped.phone || [];
      mapped.phone.push(input);
    } else if (matches(/linkedin/i)) {
      mapped.linkedin = mapped.linkedin || [];
      mapped.linkedin.push(input);
    } else if (matches(/(?:authorized[_\-\s]*to[_\-\s]*work|legal[_\-\s]*right[_\-\s]*to[_\-\s]*work|work[_\-\s]*authorization|legally[_\-\s]*authorized)/i)) {
      mapped.legallyAuthorized = mapped.legallyAuthorized || [];
      mapped.legallyAuthorized.push(input);
    } else if (matches(/(?:require[_\-\s]*sponsorship|visa[_\-\s]*sponsorship|sponsorship[_\-\s]*require|work[_\-\s]*visa)/i)) {
      mapped.requiresSponsorship = mapped.requiresSponsorship || [];
      mapped.requiresSponsorship.push(input);
    } else if (matches(/(?:desired[_\-\s]*salary|salary[_\-\s]*expectation|compensation[_\-\s]*expectation|salary[_\-\s]*target)/i)) {
      mapped.desiredSalary = mapped.desiredSalary || [];
      mapped.desiredSalary.push(input);
    } else if (matches(/(?:notice[_\-\s]*period|start[_\-\s]*date|earliest[_\-\s]*start|how[_\-\s]*soon[_\-\s]*can[_\-\s]*you[_\-\s]*start)/i)) {
      mapped.noticePeriod = mapped.noticePeriod || [];
      mapped.noticePeriod.push(input);
    } else if (matches(/(?:intro[_\-\s]*one[_\-\s]*liner|short[_\-\s]*intro|brief[_\-\s]*intro|elevator[_\-\s]*pitch)/i)) {
      mapped.introOneLiner = mapped.introOneLiner || [];
      mapped.introOneLiner.push(input);
    } else if (matches(/(?:why[_\-\s]*company|why[_\-\s]*this[_\-\s]*role|why[_\-\s]*do[_\-\s]*you[_\-\s]*want[_\-\s]*to[_\-\s]*join|cover[_\-\s]*letter)/i) && input.tagName === "TEXTAREA") {
      mapped.whyCompany = mapped.whyCompany || [];
      mapped.whyCompany.push(input);
    } else if (matches(/(?:gender|sex|pronouns)/i)) {
      mapped.gender = mapped.gender || [];
      mapped.gender.push(input);
    } else if (matches(/(?:race|ethnicity|ethnic[_\-\s]*origin|racial[_\-\s]*identity)/i)) {
      mapped.race = mapped.race || [];
      mapped.race.push(input);
    } else if (matches(/(?:veteran|military[_\-\s]*service|protected[_\-\s]*veteran)/i)) {
      mapped.veteranStatus = mapped.veteranStatus || [];
      mapped.veteranStatus.push(input);
    } else if (matches(/(?:disability|disabilities|differently[_\-\s]*abled)/i)) {
      mapped.disabilityStatus = mapped.disabilityStatus || [];
      mapped.disabilityStatus.push(input);
    } else if (matches(/(?:portfolio|website|personal[_\-\s]*site|personal[_\-\s]*url)/i)) {
      mapped.portfolio = mapped.portfolio || [];
      mapped.portfolio.push(input);
    } else if (matches(/(?:github|gitlab|bitbucket)/i)) {
      mapped.github = mapped.github || [];
      mapped.github.push(input);
    }
  });

  return mapped;
}

function isCustomSelectInput(el) {
  if (!el || el.tagName !== "INPUT") return false;
  
  // 1. Check parent classes commonly used by Chosen, Select2, React-Select, etc.
  if (el.closest('.chosen-container, .chosen-search, .select2-container, .select2-search, [class*="select2-"], [class*="chosen-"]')) {
    return true;
  }
  
  // 2. Check React-Select or custom comboboxes
  if (el.getAttribute("role") === "combobox" || el.getAttribute("aria-autocomplete") === "list") {
    return true;
  }
  
  // 3. Inputs with classes containing "search" inside a custom dropdown wrapper
  const className = el.className || "";
  if (typeof className === "string" && (className.includes("chosen") || className.includes("select2"))) {
    return true;
  }
  
  return false;
}

// Write a value to a native <input>/<textarea> via the prototype setter (so
// React/Vue observe it) wrapped in a realistic interaction envelope: pointer →
// focus → key → input → change → blur. The richer event sequence both helps
// frameworks capture the change reliably and makes the fill look like ordinary
// keyboard input rather than a scripted single assignment.
function setNativeValue(input, val) {
  const prototype = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (descriptor && descriptor.set) {
    descriptor.set.call(input, val);
  } else {
    input.value = val;
  }
}

function setInputValue(input, val) {
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
  try {
    input.blur();
    input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  } catch (e) {
    input.dispatchEvent(new Event("blur", { bubbles: true }));
  }
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

function choiceValueMeansYes(value) {
  const text = normalizeChoiceText(value);
  return /^(yes|y|true|1|checked|agree|agreed|accept|accepted)$/.test(text) || /\b(i agree|i accept|yes)\b/.test(text);
}

function choiceValueMeansNo(value) {
  const text = normalizeChoiceText(value);
  return /^(no|n|false|0|unchecked|decline|declined|disagree|opt out)$/.test(text) || /\b(no|do not|don t|not agree|decline|opt out)\b/.test(text);
}

function optionLooksYes(option) {
  const text = normalizeChoiceText(`${option.label} ${option.value}`);
  return /^(yes|y|true|1|agree|accept)\b/.test(text) || /\b(i agree|i accept)\b/.test(text);
}

function optionLooksNo(option) {
  const text = normalizeChoiceText(`${option.label} ${option.value}`);
  return /^(no|n|false|0|decline|disagree)\b/.test(text) || /\b(do not|don t|not agree|opt out)\b/.test(text);
}

function pickChoiceOption(input, val) {
  const options = getChoiceOptions(input).filter((option) => !option.input.disabled);
  const answer = normalizeChoiceText(val);
  if (!answer || !options.length) return null;

  const exact = options.find((option) => (
    normalizeChoiceText(option.label) === answer ||
    normalizeChoiceText(option.value) === answer
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

  const partial = options.find((option) => {
    const label = normalizeChoiceText(option.label);
    const value = normalizeChoiceText(option.value);
    return (label && (label.includes(answer) || answer.includes(label))) ||
           (value && (value.includes(answer) || answer.includes(value)));
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
  if (!select) return;
  const options = Array.from(select.options);
  let matchedIndex = -1;
  const lowerVal = String(val).toLowerCase().trim();

  // 1. Try exact or substring match of option text
  matchedIndex = options.findIndex(opt => {
    const text = opt.text.toLowerCase().trim();
    const value = opt.value.toLowerCase().trim();
    return text === lowerVal || value === lowerVal || text.includes(lowerVal) || lowerVal.includes(text);
  });

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

  // 3. Fallback: if no match, try to choose "decline" / "prefer not"
  if (matchedIndex === -1) {
    matchedIndex = options.findIndex(opt => opt.text.toLowerCase().includes("decline") || opt.text.toLowerCase().includes("prefer not"));
  }

  if (matchedIndex !== -1) {
    applySelectIndex(select, matchedIndex);
  }
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

async function autofillWebForm(profile, { useAi = false } = {}) {
  if (!profile) return;
  ensureCopilotPanel(profile);
  expandWidget();
  attachFormSubmitTracker("scan/prefill clicked", { silent: true });
  showCopilotPanel("autofill");

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
    lbl.textContent = `Filled · ${cvLabel}`;
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

  const nameParts = (profile.fullName || "").trim().split(/\s+/);
  const firstName = nameParts.slice(0, -1).join(" ") || nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  // Format phone with +1 country code
  let phoneVal = profile.phone || "";
  if (phoneVal && !phoneVal.startsWith("+")) {
    phoneVal = "+1" + phoneVal.replace(/[^\d]/g, "");
  }

  // Track which DOM elements were already filled by regex
  const regexFilledElements = new Set();

  // Audit log stores plain objects — rendered via DOM methods to avoid XSS from
  // third-party page label text landing in innerHTML.
  const auditLog = [];

  const fillList = (inputs, val, type) => {
    if (!inputs || val === undefined || val === null || val === "") return;
    inputs.forEach((input) => {
      let didFill = true;
      if (input.tagName === "SELECT") {
        setSelectValue(input, val, type);
      } else if (isChoiceInput(input)) {
        didFill = setChoiceValue(input, val);
      } else {
        setInputValue(input, val);
      }
      if (!didFill) return;
      markFieldFilled(regexFilledElements, input);
      filledCount++;
      auditLog.push({ label: getAutofillFieldLabel(input).slice(0, 60), value: String(val).slice(0, 80), ai: false });
    });
  };

  // ── Phase 1: Fast regex-based fills (core identity fields only) ──
  if (mapped.firstName) fillList(mapped.firstName, firstName);
  if (mapped.lastName) fillList(mapped.lastName, lastName);
  if (mapped.fullName) fillList(mapped.fullName, profile.fullName);
  if (mapped.email) fillList(mapped.email, profile.email);
  if (mapped.phone) fillList(mapped.phone, phoneVal);
  if (mapped.linkedin) fillList(mapped.linkedin, profile.linkedin);
  if (mapped.legallyAuthorized) fillList(mapped.legallyAuthorized, profile.legallyAuthorized || "Yes", "legallyAuthorized");
  if (mapped.requiresSponsorship) fillList(mapped.requiresSponsorship, profile.requiresSponsorship || "No", "requiresSponsorship");
  if (mapped.desiredSalary) fillList(mapped.desiredSalary, profile.desiredSalary);
  if (mapped.noticePeriod) fillList(mapped.noticePeriod, profile.noticePeriod);
  if (mapped.introOneLiner) fillList(mapped.introOneLiner, profile.introOneLiner);
  if (mapped.whyCompany) fillList(mapped.whyCompany, profile.whyCompany);
  if (mapped.gender) fillList(mapped.gender, profile.gender || "Decline to Self-Identify", "gender");
  if (mapped.race) fillList(mapped.race, profile.race || "Decline to Self-Identify", "race");
  if (mapped.veteranStatus) fillList(mapped.veteranStatus, profile.veteranStatus || "No", "veteranStatus");
  if (mapped.disabilityStatus) fillList(mapped.disabilityStatus, profile.disabilityStatus || "No, I don't have a disability", "disabilityStatus");
  if (mapped.portfolio) fillList(mapped.portfolio, profile.portfolio);
  if (mapped.github) fillList(mapped.github, profile.github);

  // ── CV text injection: paste resume text into visible textareas ──
  if (resumeText) {
    const allInputs = collectFillableElements({ visibleOnly: true });
    allInputs.forEach((el) => {
      if (el.tagName !== "TEXTAREA") return;
      if (wasFieldFilled(regexFilledElements, el)) return;
      if (isFieldAlreadyAnswered(el)) return;
      const label = getAutofillFieldLabel(el).toLowerCase();
      if (/\b(resume|cv|curriculum\s*vitae|paste\s*resume|copy\s*paste\s*(your\s*)?resume)\b/.test(label)) {
        setInputValue(el, resumeText);
        markFieldFilled(regexFilledElements, el);
        filledCount++;
        auditLog.push({ label: getAutofillFieldLabel(el).slice(0, 60), value: `[${cvLabel} — ${resumeText.length} chars]`, ai: false });
      }
    });
  }

  // ── CV file injection: inject uploaded PDF/DOCX into file inputs ──
  const cvVariantForFile = selectedCv === "architect" ? "architect" : "backend";
  const fileInjected = await injectCvFileToInputs(cvVariantForFile, auditLog);
  if (fileInjected) filledCount++;

  updateWorkflowSteps("autofill", [
    { status: "done", label: "Submit tracker attached", detail: "Final submit will be saved automatically." },
    { status: "done", label: "Scanned visible form controls" },
    { status: "done", label: "Filled profile fields", detail: `${filledCount} basic field${filledCount === 1 ? "" : "s"} changed.` },
    { status: useAi ? "active" : "done", label: "Gemma custom-field pass", detail: useAi ? "Preparing unmatched fields." : "Skipped by request." },
  ]);

  if (!useAi) {
    showToast(`Auto-filled ${filledCount} fields. Gemma was not used. ⚡`);
    renderAutofillAudit(auditLog);
    return;
  }

  showToast(`Filled ${filledCount} basic fields. Asking Gemma for custom questions...`);

  // ── Phase 2: AI-powered fill for remaining unmatched fields ──
  try {
    const allInputs = collectFillableElements();

    // Filter to only unfilled, visible fields
    const unmatchedFields = allInputs.filter((el) => {
      if (wasFieldFilled(regexFilledElements, el)) return false;
      // Skip already-filled fields (user or regex)
      if (isFieldAlreadyAnswered(el)) return false;
      if (el.tagName === "SELECT") return true; // Keep SELECT elements even if hidden by custom styled elements.
      return isVisibleFillTarget(el);
    });

    if (unmatchedFields.length > 0 && unmatchedFields.length <= 40) {
      const jobContext = extractJob();
      updateWorkflowSteps("autofill", [
        { status: "done", label: "Submit tracker attached", detail: "Final submit will be saved automatically." },
        { status: "done", label: "Scanned visible form controls" },
        { status: "done", label: "Filled profile fields", detail: `${filledCount} basic field${filledCount === 1 ? "" : "s"} changed.` },
        { status: "active", label: "Gemma custom-field pass", detail: `${unmatchedFields.length} field${unmatchedFields.length === 1 ? "" : "s"}, ${jobContext.pageText.length} cleaned chars.` },
      ]);
      // Build field descriptors for AI
      const fieldDescriptors = unmatchedFields.map((el) => {
        const desc = {
          label: getAutofillFieldLabel(el).slice(0, 200),
          name: (el.name || "").slice(0, 100),
          id: (el.id || "").slice(0, 100),
          tag: el.tagName.toLowerCase(),
          placeholder: (el.placeholder || "").slice(0, 150),
          inputType: (el.type || "").toLowerCase(),
        };
        // For select elements, include the options so AI can pick from them
        if (el.tagName === "SELECT") {
          desc.options = Array.from(el.options)
            .map((opt) => opt.text.trim())
            .filter((t) => t && t !== "--" && t !== "Select" && t.length < 100)
            .slice(0, 30);
        }
        if (isChoiceInput(el)) {
          desc.options = getChoiceOptions(el)
            .map((option) => {
              const label = option.label || option.value;
              if (!label) return "";
              return option.value && normalizeChoiceText(option.value) !== normalizeChoiceText(label)
                ? `${label} (${option.value})`
                : label;
            })
            .filter((text) => text && text.length < 120)
            .slice(0, 20);
        }
        return desc;
      });

      const aiResult = await apiProxy(
        "http://127.0.0.1:8787/api/autofill-ai",
        "POST",
        { fields: fieldDescriptors, job: jobContext, pageText: jobContext.pageText || jobContext.description || "" }
      );

      if (aiResult && aiResult.mappings) {
        let aiFilledCount = 0;
        Object.entries(aiResult.mappings).forEach(([indexStr, value]) => {
          const idx = parseInt(indexStr, 10);
          const el = unmatchedFields[idx];
          if (!el || !value || value === "") return;

          if (el.tagName === "SELECT") {
            // Find the best matching option
            const options = Array.from(el.options);
            const lowerVal = value.toLowerCase().trim();
            const matchIdx = options.findIndex((opt) => {
              const text = opt.text.toLowerCase().trim();
              const val = opt.value.toLowerCase().trim();
              return text === lowerVal || val === lowerVal || text.includes(lowerVal) || lowerVal.includes(text);
            });
            if (matchIdx !== -1) {
              applySelectIndex(el, matchIdx);
              aiFilledCount++;
              auditLog.push({ label: getAutofillFieldLabel(el).slice(0, 60), value: String(value).slice(0, 80), ai: true });
            }
          } else if (isChoiceInput(el)) {
            if (setChoiceValue(el, value)) {
              aiFilledCount++;
              markFieldFilled(regexFilledElements, el);
              auditLog.push({ label: getAutofillFieldLabel(el).slice(0, 60), value: String(value).slice(0, 80), ai: true });
            }
          } else {
            setInputValue(el, value);
            aiFilledCount++;
            auditLog.push({ label: getAutofillFieldLabel(el).slice(0, 60), value: String(value).slice(0, 80), ai: true });
          }
        });
      filledCount += aiFilledCount;
      updateWorkflowSteps("autofill", [
        { status: "done", label: "Submit tracker attached", detail: "Final submit will be saved automatically." },
        { status: "done", label: "Scanned visible form controls" },
        { status: "done", label: "Filled profile fields", detail: `${filledCount - aiFilledCount} basic field${filledCount - aiFilledCount === 1 ? "" : "s"} changed.` },
        { status: "done", label: "Gemma custom-field pass", detail: `${aiFilledCount} field${aiFilledCount === 1 ? "" : "s"} filled from cleaned page context.` },
      ]);
      showToast(`Auto-filled ${filledCount} fields total (${aiFilledCount} with Gemma).`);
      } else {
        updateWorkflowSteps("autofill", [
          { status: "done", label: "Submit tracker attached", detail: "Final submit will be saved automatically." },
          { status: "done", label: "Scanned visible form controls" },
          { status: "done", label: "Filled profile fields", detail: `${filledCount} basic field${filledCount === 1 ? "" : "s"} changed.` },
          { status: "error", label: "Gemma custom-field pass", detail: "No confident answers returned." },
        ]);
        showToast(`Auto-filled ${filledCount} fields. Gemma did not return confident custom answers.`);
      }
    } else {
      updateWorkflowSteps("autofill", [
        { status: "done", label: "Submit tracker attached", detail: "Final submit will be saved automatically." },
        { status: "done", label: "Scanned visible form controls" },
        { status: "done", label: "Filled profile fields", detail: `${filledCount} basic field${filledCount === 1 ? "" : "s"} changed.` },
        unmatchedFields.length > 40
          ? { status: "error", label: "Gemma custom-field pass", detail: "Too many fields for one pass." }
          : { status: "done", label: "Gemma custom-field pass", detail: "No empty custom fields left." },
      ]);
      showToast(`Auto-filled ${filledCount} fields. ${unmatchedFields.length > 40 ? "Too many custom fields for one Gemma pass." : "No custom fields left for Gemma."}`);
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

  renderAutofillAudit(auditLog);
}

function renderAutofillAudit(auditLog) {
  const logContainer = document.getElementById("jh-autofill-audit-log");
  const logList = document.getElementById("jh-autofill-audit-list");
  const summaryEl = document.getElementById("jh-autofill-summary");

  if (summaryEl) {
    summaryEl.textContent = auditLog.length
      ? `${auditLog.length} field${auditLog.length === 1 ? "" : "s"} injected into the visible form.`
      : "No supported empty form fields were found on this page.";
  }

  if (!logContainer || !logList) return;
  logContainer.hidden = false;
  logList.replaceChildren();

  if (!auditLog.length) {
    const li = document.createElement("li");
    li.textContent = "No fields changed.";
    logList.appendChild(li);
    return;
  }

  auditLog.forEach(({ label, value, ai }) => {
    const li = document.createElement("li");
    li.style.marginBottom = "2px";

    const strong = document.createElement("strong");
    strong.style.color = ai ? "#00C853" : "#FFB300";
    strong.textContent = ai ? `[AI] ${label}` : label;

    const sep = document.createTextNode(": ");

    const val = document.createElement("span");
    val.style.opacity = "0.8";
    val.textContent = value;

    li.append(strong, sep, val);
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
      action: () => {
        if (input.tagName === "SELECT") {
          setSelectValue(input, fieldValue, fieldType);
        } else {
          setInputValue(input, fieldValue);
        }
        showToast(`Filled ${fieldLabel}!`);
        removeInlineDropdown();
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

  // Create Manual Track button for ATS pages whose submit event cannot be observed
  const trackBtn = document.createElement("button");
  trackBtn.id = "jh-btn-track";
  trackBtn.type = "button";
  trackBtn.className = "jh-floating-btn jh-track-btn";
  trackBtn.title = "Manually add this application now";
  trackBtn.setAttribute("aria-label", "Manually add this application now");
  trackBtn.innerHTML = `<span class="jh-icon">＋</span><span class="jh-btn-label">Track</span>`;

  // Create Close/Hide button
  const hideBtn = document.createElement("button");
  hideBtn.id = "jh-btn-hide";
  hideBtn.type = "button";
  hideBtn.className = "jh-floating-btn jh-hide-btn";
  hideBtn.title = "Hide Copilot toolbar";
  hideBtn.setAttribute("aria-label", "Hide Copilot toolbar");
  hideBtn.innerHTML = `<span class="jh-icon">✕</span>`;
  hideBtn.addEventListener("click", () => {
    actionsBar.style.display = "none";
    const w = document.getElementById("jh-copilot-widget");
    if (w) w.style.display = "none";
  });

  actionsBar.appendChild(prefillBtn);
  actionsBar.appendChild(cvBtn);
  actionsBar.appendChild(evalBtn);
  actionsBar.appendChild(companyBtn);
  actionsBar.appendChild(trackBtn);
  actionsBar.appendChild(hideBtn);
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
    <div class="jh-widget-header">
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
        <div class="jh-workflow-card">
          <div class="jh-workflow-summary" id="jh-autofill-workflow-summary">Ready</div>
          <ol class="jh-workflow-list" id="jh-autofill-workflow-list"></ol>
        </div>
        <div id="jh-autofill-audit-log">
          <div id="jh-autofill-summary" class="jh-audit-summary">Form scanned successfully.</div>
          <ul id="jh-autofill-audit-list" class="jh-audit-list"></ul>
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

      <!-- Company Check View -->
      <div id="jh-company-panel" class="jh-panel-section" hidden>
        <h3 class="jh-section-title">🏢 Applied Here?</h3>
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
  updateSubmitListenerStatus("ready");

  // Bind close button
  document.getElementById("jh-widget-close").addEventListener("click", () => {
    widget.classList.add("minimized");
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

  // Prefill Button Handler — also silently syncs the application to the dashboard
  // so it appears without the user having to submit or manually click "+".
  prefillBtn.addEventListener("click", () => {
    showCopilotPanel("autofill");

    // Auto-save to dashboard in parallel with filling the form. Uses the same
    // dedupe key (sourceUrl) as the submit-tracker path, so if the user later
    // submits the ATS form the update is silent (no duplicate toast).
    const now = new Date();
    const appliedAt = now.toISOString();
    const fillJobData = extractJob();
    fillJobData.dateApplied = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    fillJobData.appliedAt = appliedAt;
    fillJobData.stageDateTimes = { Applied: appliedAt };
    fillJobData.status = "Applied";
    trackApplicationViaBackground(fillJobData, { trigger: "fill form", runEvaluation: false })
      .then((res) => {
        if (res.ok && fillJobData.sourceUrl) trackedAppUrls.add(fillJobData.sourceUrl);
      })
      .catch(() => {});

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

    try {
      updateWorkflowSteps("track", [
        { status: "done", label: "Reviewed tracker form" },
        { status: "active", label: "Saving to dashboard" },
        { status: "pending", label: "Evaluating role with Gemma" },
      ]);
      const result = await trackApplicationViaBackground(jobData, { trigger: "manual save", runEvaluation: true });
      if (!result.ok) throw new Error(result.error || "Tracker save failed.");
      const status = result.status;
      // 200 = matched & updated an existing record; 201 = brand-new entry. Telling
      // them apart stops the "it said done but nothing appeared" confusion when a
      // job (same URL or company+role) was already in the tracker.
      updateWorkflowSteps("track", [
        { status: "done", label: "Reviewed tracker form" },
        { status: "done", label: status === 200 ? "Updated dashboard card" : "Saved dashboard card" },
        result.evaluationSaved
          ? { status: "done", label: "Stored Gemma evaluation", detail: `${result.evaluation?.decision || "Decision"} · ${result.evaluation?.score ?? 0}/100` }
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

  // Company Check Button Handler
  companyBtn.addEventListener("click", async () => {
    showCopilotPanel("company");

    const detectedEl = document.getElementById("jh-company-detected-name");
    const loadingEl = document.getElementById("jh-company-loading");
    const resultEl = document.getElementById("jh-company-result");

    const detectedCompany = extractJob().company;

    if (detectedEl) {
      detectedEl.textContent = detectedCompany
        ? `Checking: ${detectedCompany}`
        : "No company name detected on this page.";
    }

    if (!detectedCompany) {
      if (loadingEl) loadingEl.classList.remove("visible");
      renderCompanyPanel(resultEl, "", []);
      return;
    }

    if (loadingEl) loadingEl.classList.add("visible");
    if (resultEl) resultEl.innerHTML = "";

    try {
      const apps = await apiProxy("http://127.0.0.1:8787/api/applications");
      const normalize = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
      const nb = normalize(detectedCompany);
      const matches = (apps || []).filter((app) => {
        if (!app.company) return false;
        const na = normalize(app.company);
        return na === nb || na.includes(nb) || nb.includes(na);
      });
      if (loadingEl) loadingEl.classList.remove("visible");
      renderCompanyPanel(resultEl, detectedCompany, matches);
    } catch (err) {
      if (loadingEl) loadingEl.classList.remove("visible");
      renderCompanyPanel(resultEl, detectedCompany, null);
    }
  });

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
    if (event.target?.closest?.(".jh-floating-btn")) return;
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
  });

  const finishDrag = (event) => {
    if (!dragFloatingActionsState || dragFloatingActionsState.pointerId !== event.pointerId) return;
    const moved = dragFloatingActionsState.moved;
    dragFloatingActionsState = null;
    actionsBar.classList.remove("jh-dragging");
    actionsBar.releasePointerCapture?.(event.pointerId);
    const rect = actionsBar.getBoundingClientRect();
    saveFloatingActionsPosition({ x: Math.round(rect.left), y: Math.round(rect.top) });
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

let toastHideTimer = null;
let toastShowTimer = null;

function showToast(message) {
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

    /* Floating action buttons container */
    #jh-floating-actions {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 380px;
      display: flex;
      gap: 6px;
      z-index: 1000000;
      align-items: stretch;
      pointer-events: auto;
      font-family: 'Outfit', system-ui, -apple-system, sans-serif;
      padding: 8px;
      border-radius: 16px;
      background: rgba(18, 20, 24, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.04) inset;
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      cursor: grab;
      touch-action: none;
      user-select: none;
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

    .jh-floating-btn {
      flex: 1;
      height: 48px;
      padding: 0 4px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s, filter 0.2s, opacity 0.2s;
      color: #FFFFFF;
    }

    .jh-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      pointer-events: none;
      font-size: 16px;
    }

    .jh-btn-label {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      opacity: 0.82;
      line-height: 1;
      pointer-events: none;
    }

    .jh-floating-btn:hover {
      transform: translateY(-2px) scale(1.04);
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
      filter: brightness(1.12);
    }

    .jh-floating-btn:active {
      transform: translateY(0) scale(0.97);
      filter: brightness(0.95);
    }

    .jh-prefill-btn {
      background: linear-gradient(145deg, #FFB300, #F57C00);
      border-color: rgba(255, 179, 0, 0.25);
      color: #1A0C00;
      font-weight: 700;
    }

    .jh-prefill-btn .jh-btn-label { color: rgba(26,12,0,0.75); }

    .jh-prefill-btn.jh-no-form {
      background: linear-gradient(145deg, #FFE082, #FFB300);
      opacity: 0.88;
    }

    .jh-evaluate-btn {
      background: linear-gradient(145deg, #7C4DFF, #536DFE);
      border-color: rgba(124, 77, 255, 0.25);
    }

    .jh-company-btn {
      background: linear-gradient(145deg, #00B4DB, #0077B6);
      border-color: rgba(0, 180, 219, 0.25);
    }

    .jh-track-btn {
      background: linear-gradient(145deg, #00C853, #00A86B);
      border-color: rgba(0, 200, 83, 0.25);
      color: #001B0C;
      font-weight: 800;
    }

    .jh-track-btn .jh-btn-label { color: rgba(0,27,12,0.7); }

    .jh-hide-btn {
      flex: 0 0 44px;
      background: rgba(40, 42, 48, 0.9);
      border-color: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
    }

    .jh-hide-btn:hover {
      color: #FFF;
      background: rgba(60, 62, 70, 0.95);
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

    /* Header */
    .jh-widget-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 68px;
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

    /* Autofill Logs specific styles */
    #jh-autofill-audit-log {
      font-size: 11px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 12px;
    }

    .jh-audit-summary {
      color: #FFB300;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .jh-audit-list {
      margin: 0;
      padding-left: 16px;
      color: #FFF;
      line-height: 1.4;
      word-break: break-word;
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

function renderCompanyPanel(container, company, matches) {
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
    msg.textContent = "Could not detect the company name on this page. Navigate to the company's job posting page and try again.";
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

  container.replaceChildren(badge, appsDiv);
}

// ── CV file injection ───────────────────────────────────────────
// Fetches the uploaded CV from the cockpit server and injects it into the first
// file input on the page that looks like a resume/CV upload field.
// Returns true if a file was successfully injected, false otherwise.
async function injectCvFileToInputs(variant, auditLog = []) {
  try {
    // Find file inputs that look like resume/CV upload fields
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]')).filter((el) => {
      if (isInCopilotUi(el)) return false;
      const label = getLabelText(el).toLowerCase();
      const name = (el.name || "").toLowerCase();
      const id = (el.id || "").toLowerCase();
      const accept = (el.accept || "").toLowerCase();
      const combined = `${label} ${name} ${id}`;
      const looksLikeResume = /\b(resume|cv|curriculum|upload.*resume|attach.*resume|resume.*upload|upload.*cv)\b/i.test(combined);
      const acceptsPdf = !accept || accept.includes("pdf") || accept.includes("doc") || accept.includes("*");
      return looksLikeResume && acceptsPdf;
    });

    if (fileInputs.length === 0) return false;

    // Fetch the CV data from the cockpit server
    const cvData = await apiProxy(`/api/profile/cv/${variant}`);
    if (!cvData || !cvData.data || !cvData.fileName) return false;

    // Decode base64 → Uint8Array → Blob → File
    const byteChars = atob(cvData.data);
    const byteArr = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteArr], { type: cvData.mimeType || "application/pdf" });
    const file = new File([blob], cvData.fileName, { type: cvData.mimeType || "application/pdf" });

    // Use DataTransfer to set the file on the input element
    const dt = new DataTransfer();
    dt.items.add(file);

    let injected = false;
    for (const input of fileInputs) {
      try {
        Object.defineProperty(input, "files", { value: dt.files, writable: true, configurable: true });
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        auditLog.push({ label: getLabelText(input).slice(0, 60) || "resume file input", value: `[CV file: ${cvData.fileName}]`, ai: false });
        injected = true;
        break; // Inject only into the first matching file input
      } catch {}
    }

    if (injected) {
      showToast(`CV file injected: ${cvData.fileName}`);
    }
    return injected;
  } catch {
    return false;
  }
}

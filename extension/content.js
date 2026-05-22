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
let lastFocusedInput = null;
let currentFocusedElement = null;
let inlineTrigger = null;
let inlineDropdown = null;
let isJobPageCache = null;
let lastCachedUrl = "";
let submitTrackerLastDetectedAt = 0;
let submitTrackerLastTrackedAt = 0;
let dragFloatingActionsState = null;

// ── API Proxy helper ───────────────────────────────────────────
// Content scripts inherit the web page's origin for network requests.
// On HTTPS pages (Greenhouse, Lever, Workday, etc.), direct fetch()
// to http://127.0.0.1 is blocked by mixed-content security policy.
// This helper routes all API calls through the background service worker.
function apiProxy(url, method = "GET", body = null) {
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
        resolve(response.data);
      }
    );
  });
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

// Start Copilot Drawer & Inline Trigger initialization on idle.
// Form filling and Gemma evaluation stay manual to protect laptop resources.
(function initCopilot() {
  window.addEventListener("load", () => {
    setTimeout(async () => {
      if (looksLikeJobPosting()) {
        await ensureProfileLoaded();
        // Submit listener is attached only after the user clicks Scan/Prefill/Inject.
      }
    }, 1500); // 1.5s delay to let page settle and reactive elements finish mounting
  });

  // Also handle SPA navigations (some ATS forms load content dynamically)
  let lastObservedUrl = locationHref();
  const urlObserver = setInterval(() => {
    const currentUrl = locationHref();
    if (currentUrl !== lastObservedUrl) {
      lastObservedUrl = currentUrl;
      // Reset caches for new page
      isJobPageCache = null;
      lastCachedUrl = "";
      setTimeout(async () => {
        if (looksLikeJobPosting()) {
          await ensureProfileLoaded();
          // Submit listener is attached only after the user clicks Scan/Prefill/Inject.
        }
      }, 1500);
    }
  }, 2000);
})();

/**
 * Stricter check: does this page have an actual application FORM
 * (with name/email/phone type fields) vs just a job description page?
 */
function looksLikeApplicationForm() {
  try {
    const inputs = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select'
    );
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
function attachFormSubmitTracker(reason = "manual") {
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
  if (!wasAttached) {
    showToast("Submit listener attached. Job Hunt will track the final submit.");
  }
}

async function handleApplicationSubmit(e) {
  // Don't prevent the actual submit — just piggyback and track
  scheduleTrackJobApplication("native form submit", 300);
}

function handlePossibleSubmitKeydown(e) {
  if (e.key !== "Enter") return;
  const target = e.target;
  if (!target || target.tagName === "TEXTAREA") return;
  const form = target.closest?.("form");
  if (form) {
    scheduleTrackJobApplication("enter key in form", 700);
  }
}

function handlePossibleSubmitClick(e) {
  const target = e.target;
  const control = target?.closest?.(
    'button, input[type="submit"], input[type="button"], a, [role="button"], [data-automation-id], [data-testid]'
  );
  if (!control || !isSubmitLikeControl(control)) return;
  scheduleTrackJobApplication("submit button click", 700);
}

function isSubmitLikeControl(control) {
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
  setTimeout(() => trackJobApplication(trigger), delayMs);
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
  const forms = document.querySelectorAll("form").length;
  const controls = Array.from(
    document.querySelectorAll('button, input[type="submit"], input[type="button"], a, [role="button"], [data-automation-id], [data-testid]')
  );
  const buttons = controls.filter(isSubmitLikeControl).length;
  return { forms, buttons };
}

async function trackJobApplication(trigger = "submit") {
  try {
    const jobData = extractJob();
    // Set today's date as the applied date (local timezone to match dashboard's todayString)
    const now = new Date();
    const appliedAt = now.toISOString();
    jobData.dateApplied = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    jobData.appliedAt = appliedAt;
    jobData.stageDateTimes = { ...(jobData.stageDateTimes || {}), Applied: appliedAt };
    jobData.status = "Applied";

    await apiProxy(
      "http://127.0.0.1:8787/api/applications",
      "POST",
      jobData
    );

    // Notify background to update badge
    chrome.runtime.sendMessage({ type: "TRACKER_UPDATED" }).catch(() => {});

    showToast("✅ Application tracked in Job Hunt Cockpit!");
    updateSubmitListenerStatus(`tracked via ${trigger}`);
  } catch (err) {
    console.warn("Auto-track failed:", err);
    showToast("Submit detected, but tracking failed. Check local app server.");
    updateSubmitListenerStatus(`tracking failed via ${trigger}`);
  }
}

async function manualTrackJobApplication() {
  submitTrackerLastTrackedAt = Date.now();
  await trackJobApplication("manual button");
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

  // Self-healing check: try to fetch profile on input focus in case server was started late
  ensureProfileLoaded().then((loaded) => {
    if (loaded) {
      showInlineTriggerFor(el);
    }
  });
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
    pageText: text.slice(0, 12000),
    notes: "",
    description: text,
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

function visibleText() {
  const candidates = [
    "main",
    "[role='main']",
    "[class*='job' i]",
    "[class*='posting' i]",
    "article",
    "body",
  ];
  let element = null;
  for (const selector of candidates) {
    try {
      element = document.querySelector(selector);
      if (element) break;
    } catch (e) {
      // Ignore syntax exceptions
    }
  }
  element = element || document.body;
  return clean(element.textContent || element.innerText || document.body.textContent || document.body.innerText || "");
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

function findInputs() {
  const inputs = Array.from(
    document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select'
    )
  );
  const mapped = {};

  inputs.forEach((input) => {
    const label = getLabelText(input).toLowerCase();
    const name = (input.name || "").toLowerCase();
    const id = (input.id || "").toLowerCase();
    const placeholder = (input.placeholder || "").toLowerCase();
    const autocomplete = (input.getAttribute("autocomplete") || "").toLowerCase();

    const matches = (regex) => {
      return (
        regex.test(label) ||
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
    }
  });

  return mapped;
}

function setInputValue(input, val) {
  if (!input) return;
  try {
    const prototype = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(input, val);
    } else {
      input.value = val;
    }
  } catch (e) {
    input.value = val;
  }
  // Dispatch reactive events statefully so modern web frameworks capture the change
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("blur", { bubbles: true }));
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
    select.selectedIndex = matchedIndex;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("blur", { bubbles: true }));
  }
}

async function autofillWebForm(profile, { useAi = false } = {}) {
  if (!profile) return;
  ensureCopilotPanel(profile);
  expandWidget();
  attachFormSubmitTracker("scan/prefill clicked");

  const summaryEl = document.getElementById("jh-autofill-summary");
  const logContainer = document.getElementById("jh-autofill-audit-log");
  const logList = document.getElementById("jh-autofill-audit-list");
  if (summaryEl) summaryEl.textContent = "Scanning visible form fields...";
  if (logContainer) logContainer.hidden = false;
  if (logList) logList.innerHTML = "";

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

  const auditLog = [];

  const fillList = (inputs, val, type) => {
    if (!inputs || val === undefined || val === null || val === "") return;
    inputs.forEach((input) => {
      if (input.tagName === "SELECT") {
        setSelectValue(input, val, type);
      } else {
        setInputValue(input, val);
      }
      regexFilledElements.add(input);
      filledCount++;
      const label = (getLabelText(input).trim() || input.name || input.id || "Unnamed Field").slice(0, 40);
      auditLog.push(`<li style="margin-bottom: 2px;"><strong style="color: #FFB300;">${label}</strong>: <span style="opacity: 0.8;">${val}</span></li>`);
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

  if (!useAi) {
    showToast(`Auto-filled ${filledCount} fields. Gemma was not used. ⚡`);
    renderAutofillAudit(auditLog);
    return;
  }

  showToast(`Filled ${filledCount} basic fields. Asking Gemma for custom questions...`);

  // ── Phase 2: AI-powered fill for remaining unmatched fields ──
  try {
    const allInputs = Array.from(
      document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]):not([type="password"]):not([type="image"]), textarea, select'
      )
    );

    // Filter to only unfilled, visible fields
    const unmatchedFields = allInputs.filter((el) => {
      if (regexFilledElements.has(el)) return false;
      // Skip already-filled fields (user or regex)
      if (el.tagName === "SELECT") {
        // Only skip if a non-default/non-placeholder option is selected
        if (el.selectedIndex > 0) return false;
      } else if (el.value && el.value.trim()) {
        return false;
      }
      // Skip invisible elements
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
      return true;
    });

    if (unmatchedFields.length > 0 && unmatchedFields.length <= 40) {
      // Build field descriptors for AI
      const fieldDescriptors = unmatchedFields.map((el) => {
        const desc = {
          label: getLabelText(el).trim().slice(0, 200),
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
        return desc;
      });
      const jobContext = extractJob();

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
              el.selectedIndex = matchIdx;
              el.dispatchEvent(new Event("change", { bubbles: true }));
              el.dispatchEvent(new Event("input", { bubbles: true }));
              aiFilledCount++;
              const label = (getLabelText(el).trim() || el.name || el.id || "Unnamed Field").slice(0, 40);
              auditLog.push(`<li style="margin-bottom: 2px;"><strong style="color: #00C853;">[AI] ${label}</strong>: <span style="opacity: 0.8;">${value}</span></li>`);
            }
          } else {
            setInputValue(el, value);
            aiFilledCount++;
            const label = (getLabelText(el).trim() || el.name || el.id || "Unnamed Field").slice(0, 40);
            auditLog.push(`<li style="margin-bottom: 2px;"><strong style="color: #00C853;">[AI] ${label}</strong>: <span style="opacity: 0.8;">${value}</span></li>`);
          }
        });
      filledCount += aiFilledCount;
      showToast(`Auto-filled ${filledCount} fields total (${aiFilledCount} with Gemma).`);
      } else {
        showToast(`Auto-filled ${filledCount} fields. Gemma did not return confident custom answers.`);
      }
    } else {
      showToast(`Auto-filled ${filledCount} fields. ${unmatchedFields.length > 40 ? "Too many custom fields for one Gemma pass." : "No custom fields left for Gemma."}`);
    }
  } catch (err) {
    console.warn("AI autofill phase failed:", err);
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

  if (logContainer && logList) {
    logContainer.hidden = false;
    logList.innerHTML = auditLog.length
      ? auditLog.join("")
      : `<li style="margin-bottom: 2px;">No fields changed.</li>`;
  }
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
  actionsBar.title = "Drag to move Job Hunt buttons";

  // Create Prefill Form button
  const prefillBtn = document.createElement("button");
  prefillBtn.id = "jh-btn-prefill";
  prefillBtn.type = "button";
  prefillBtn.className = "jh-floating-btn jh-prefill-btn";
  prefillBtn.setAttribute("aria-label", "Scan and prefill form");
  prefillBtn.innerHTML = `<span class="jh-icon">⚡</span>`;

  // Create Evaluate Job button
  const evalBtn = document.createElement("button");
  evalBtn.id = "jh-btn-evaluate";
  evalBtn.type = "button";
  evalBtn.className = "jh-floating-btn jh-evaluate-btn";
  evalBtn.title = "Evaluate job with Gemma";
  evalBtn.setAttribute("aria-label", "Evaluate job with Gemma");
  evalBtn.innerHTML = `<span class="jh-icon">🧠</span>`;

  // Create Manual Track button for ATS pages whose submit event cannot be observed
  const trackBtn = document.createElement("button");
  trackBtn.id = "jh-btn-track";
  trackBtn.type = "button";
  trackBtn.className = "jh-floating-btn jh-track-btn";
  trackBtn.title = "Manually add this application now";
  trackBtn.setAttribute("aria-label", "Manually add this application now");
  trackBtn.innerHTML = `<span class="jh-icon">＋</span>`;

  actionsBar.appendChild(prefillBtn);
  actionsBar.appendChild(evalBtn);
  actionsBar.appendChild(trackBtn);
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
        <div class="jh-brand-icon">JH</div>
        <div>
          <div class="jh-brand-subtitle">Job Hunt Copilot</div>
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
          <span style="color: #A5A5AB;">Evaluating job fit with Gemma...</span>
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
    widget.classList.remove("minimized");
    const evalPanel = document.getElementById("jh-eval-panel");
    const autofillPanel = document.getElementById("jh-autofill-panel");
    const loading = document.getElementById("jh-eval-loading");
    const resultDiv = document.getElementById("jh-eval-result");

    evalPanel.hidden = false;
    autofillPanel.hidden = true;
    loading.classList.add("visible");
    resultDiv.replaceChildren();

    try {
      const jobData = extractJob();
      const res = await apiProxy("http://127.0.0.1:8787/api/evaluate-job", "POST", jobData);
      loading.classList.remove("visible");
      if (res && res.evaluation) {
        renderInlineEvaluation(res.evaluation, resultDiv);
      } else {
        throw new Error("Invalid response received from evaluation server.");
      }
    } catch (err) {
      loading.classList.remove("visible");
      showToast("Evaluation failed: " + err.message);
    }
  });

  // Prefill Button Handler
  prefillBtn.addEventListener("click", () => {
    widget.classList.remove("minimized");
    const evalPanel = document.getElementById("jh-eval-panel");
    const autofillPanel = document.getElementById("jh-autofill-panel");

    evalPanel.hidden = true;
    autofillPanel.hidden = false;

    // Run autofill. This also attaches the submit listener for every entry point.
    autofillWebForm(profile, { useAi: true });
  });

  // Manual Track Button Handler
  trackBtn.addEventListener("click", async () => {
    trackBtn.disabled = true;
    const icon = trackBtn.querySelector(".jh-icon");
    if (icon) icon.textContent = "…";
    try {
      await manualTrackJobApplication();
      if (icon) icon.textContent = "✓";
      setTimeout(() => {
        if (icon) icon.textContent = "＋";
        trackBtn.disabled = false;
      }, 1200);
    } catch {
      if (icon) icon.textContent = "!";
      trackBtn.disabled = false;
    }
  });

  // Expose toggle helpers for other parts of extension compatibility
  window.openCopilotDrawer = () => widget.classList.remove("minimized");
  window.expandWidget = () => widget.classList.remove("minimized");
}

async function copyToClipboard(text, element) {
  try {
    await navigator.clipboard.writeText(text || "");
    element.classList.add("copied");
    const labelVal = element.querySelector(".jh-badge-val");
    const originalText = labelVal.textContent;
    labelVal.textContent = "✓ Copied!";
    setTimeout(() => {
      element.classList.remove("copied");
      labelVal.textContent = originalText;
    }, 1500);
  } catch (err) {
    showToast("Copy failed.");
  }
}

function updateActiveFieldLabel() {
  // Dynamically adjust prefill button display based on form presence
  const prefillBtn = document.getElementById("jh-btn-prefill");
  updatePrefillButtonState(prefillBtn);

  const textField = document.getElementById("jh-active-field-text");
  if (!textField) return;

  if (lastFocusedInput) {
    const labelText = getLabelText(lastFocusedInput).trim();
    const typeName = lastFocusedInput.tagName.toLowerCase();
    const displayName = labelText
      ? `"${labelText.length > 35 ? labelText.slice(0, 35) + "..." : labelText}"`
      : lastFocusedInput.placeholder || lastFocusedInput.name || lastFocusedInput.id || "unnamed field";
    textField.textContent = `${typeName === "textarea" ? "Text Area" : "Text Field"}: ${displayName}`;

    // Auto-detect question if solver textarea is empty
    const questionTextarea = document.getElementById("jh-ai-question");
    if (questionTextarea && !questionTextarea.value.trim()) {
      const question = detectQuestion(lastFocusedInput);
      if (question) {
        questionTextarea.value = question;
      }
    }
  } else {
    textField.textContent = "Click any input/textarea on the page";
  }
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
      x: clamp(parsed.x, 8, Math.max(8, window.innerWidth - 96)),
      y: clamp(parsed.y, 8, Math.max(8, window.innerHeight - 96)),
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

async function typeIntoField(element, text) {
  if (!element) return;
  element.focus();

  const prototype = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  
  const setVal = (val) => {
    try {
      if (descriptor && descriptor.set) {
        descriptor.set.call(element, val);
      } else {
        element.value = val;
      }
    } catch (e) {
      element.value = val;
    }
  };

  setVal(""); // Clear initial state
  
  let idx = 0;
  return new Promise((resolve) => {
    function tick() {
      if (idx < text.length) {
        const currentVal = element.value + text[idx];
        setVal(currentVal);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        idx++;
        // Natural human typewriter timing: 15-30ms random delay
        setTimeout(tick, Math.random() * 15 + 12);
      } else {
        element.dispatchEvent(new Event("blur", { bubbles: true }));
        resolve();
      }
    }
    tick();
  });
}

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

  toast.innerHTML = `
    <span style="color: #FFB300; font-size: 16px; font-weight: bold;">⚡</span>
    <span>${message}</span>
  `;

  // Trigger Slide In
  setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(0)";
    toast.style.opacity = "1";
  }, 10);

  // Auto Hide after 3.2s
  setTimeout(() => {
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
      display: flex;
      gap: 8px;
      z-index: 1000000;
      align-items: center;
      pointer-events: auto;
      font-family: 'Outfit', system-ui, -apple-system, sans-serif;
      padding: 6px;
      border-radius: 999px;
      background: rgba(18, 19, 22, 0.62);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.34);
      backdrop-filter: blur(18px) saturate(170%);
      -webkit-backdrop-filter: blur(18px) saturate(170%);
      cursor: grab;
      touch-action: none;
      user-select: none;
    }

    #jh-floating-actions.jh-dragging {
      cursor: grabbing;
    }

    .jh-floating-btn {
      width: 36px;
      height: 36px;
      padding: 0;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s, filter 0.2s;
      color: #FFFFFF;
    }

    .jh-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1em;
      height: 1em;
      line-height: 1;
      pointer-events: none;
    }

    .jh-floating-btn:hover {
      transform: scale(1.08) translateY(-1px);
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5);
      filter: brightness(1.1);
    }

    .jh-floating-btn:active {
      transform: scale(0.98) translateY(0);
    }

    .jh-prefill-btn {
      background: linear-gradient(135deg, #FFB300, #F57C00);
      border-color: rgba(255, 179, 0, 0.3);
      color: #000000;
      font-weight: 700;
    }

    .jh-prefill-btn.jh-no-form {
      background: linear-gradient(135deg, #FFE082, #FFB300);
      opacity: 0.92;
    }

    .jh-evaluate-btn {
      background: linear-gradient(135deg, #7C4DFF, #536DFE);
      border-color: rgba(124, 77, 255, 0.3);
    }

    .jh-track-btn {
      background: linear-gradient(135deg, #00C853, #00A86B);
      border-color: rgba(0, 200, 83, 0.3);
      color: #001B0C;
      font-weight: 800;
    }

    .jh-floating-btn:disabled {
      opacity: 0.7;
      cursor: wait;
      transform: none;
    }

    /* Glassmorphic card widget */
    #jh-copilot-widget {
      position: fixed;
      bottom: 84px;
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
  `;
  document.head.appendChild(style);
}

function renderInlineEvaluation(evaluation, parentDiv) {
  const score = Number(evaluation.matchScore) || 0;
  let color = "#F44336"; // Low
  if (score >= 80) color = "#4CAF50"; // High
  else if (score >= 60) color = "#FFB300"; // Med

  let html = `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
      <div>
        <div style="font-size: 11px; color: #A5A5AB; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Verdict</div>
        <div style="font-size: 16px; font-weight: 700; color: ${color};">${evaluation.applyOrSkip || "Maybe"}</div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="position: relative; width: 44px; height: 44px;">
          <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
            <path stroke="rgba(255,255,255,0.1)" stroke-width="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path stroke="${color}" stroke-width="3" stroke-dasharray="${score}, 100" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #FFF;">${score}%</div>
        </div>
      </div>
    </div>
  `;

  if (evaluation.finalDecision) {
    html += `
      <div style="padding: 10px; background: rgba(0,0,0,0.2); border-left: 3px solid ${color}; font-size: 12.5px; line-height: 1.4; color: #E2E2E6; border-radius: 4px;">
        ${evaluation.finalDecision}
      </div>
    `;
  }

  if (evaluation.strongMatches && evaluation.strongMatches.length > 0) {
    html += `
      <div style="font-size: 11px; color: #A5A5AB; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Strong Matches</div>
      <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #E2E2E6; line-height: 1.4;">
        ${evaluation.strongMatches.map(m => `<li style="margin-bottom: 4px;">${m}</li>`).join('')}
      </ul>
    `;
  }

  if (evaluation.gapsRisks && evaluation.gapsRisks.length > 0) {
    html += `
      <div style="font-size: 11px; color: #A5A5AB; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Gaps / Risks</div>
      <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #E2E2E6; line-height: 1.4;">
        ${evaluation.gapsRisks.map(m => `<li style="margin-bottom: 4px;">${m}</li>`).join('')}
      </ul>
    `;
  }

  parentDiv.innerHTML = html;
}

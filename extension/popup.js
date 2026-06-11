const API_BASE = "http://127.0.0.1:8787";
const applicationsEndpoint = `${API_BASE}/api/applications`;
const extractEndpoint = `${API_BASE}/api/extract-ai`;
const evaluateEndpoint = `${API_BASE}/api/evaluate-job`;
const profileEndpoint = `${API_BASE}/api/profile`;

// ── DOM refs ───────────────────────────────────────────────────
const form = document.querySelector("#captureForm");
const stateText = document.querySelector("#stateText");
const evaluateBtn = document.querySelector("#evaluateBtn");
const saveBtn = document.querySelector("#saveBtn");
const viewEval = document.querySelector("#viewEval");
const viewTrack = document.querySelector("#viewTrack");
const evaluationResult = document.querySelector("#evaluationResult");
const scoreDonut = document.querySelector("#scoreDonut");
const scoreNumber = document.querySelector("#scoreNumber");
const verdictText = document.querySelector("#verdictText");
const verdictHint = document.querySelector("#verdictHint");
const successBanner = document.querySelector("#successBanner");
const successTitle = document.querySelector("#successTitle");
const existingBadge = document.querySelector("#existingBadge");
const jobCompany = document.querySelector("#jobCompany");
const jobRole = document.querySelector("#jobRole");
const jobMeta = document.querySelector("#jobMeta");
const trackerLabel = document.querySelector("#trackerLabel");
const autofillWebFormBtn = document.querySelector("#autofillWebFormBtn");
const connPill = document.querySelector("#connPill");
const connLabel = document.querySelector("#connLabel");
const connRetry = document.querySelector("#connRetry");
const offlineNote = document.querySelector("#offlineNote");
const autofillResult = document.querySelector("#autofillResult");
const cvChipBackend = document.querySelector("#cvChipBackend");
const cvChipArchitect = document.querySelector("#cvChipArchitect");
const toolbarToggleBtn = document.querySelector("#toolbarToggleBtn");

// ── State ──────────────────────────────────────────────────────
let latestCapture = null;
let existingApp = null;
let gemmaRefinementDone = false;
let evalSectionOpen = false;
let trackSectionOpen = false;
let analysisInFlight = false;
let userProfile = null;

// ── Boot ───────────────────────────────────────────────────────
init();

async function init() {
  // Always start with a clean state (guards against cached popup DOM)
  successBanner.hidden = true;
  form.hidden = false;

  // Initialize theme (strictly forced dark theme)
  setTheme("dark");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [pageData, allApps] = await Promise.all([
      chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_JOB" }),
      fetchAllApplications(),
    ]);

    latestCapture = normalizeCapture(pageData);
    updateJobCard(latestCapture);

    // Match by exact URL first, then fall back to company name
    if (latestCapture.sourceUrl) {
      existingApp = allApps.find(
        (app) => app.sourceUrl && app.sourceUrl === latestCapture.sourceUrl,
      ) || null;
    }

    // Company-level match: show roles you've already applied to at this company
    const capturedCompany = (latestCapture.company || "").trim().toLowerCase();
    const companyApps = capturedCompany
      ? allApps.filter((app) => (app.company || "").trim().toLowerCase() === capturedCompany)
      : [];

    const companyAppliedBadge = document.querySelector("#companyAppliedBadge");
    const companyRolesList = document.querySelector("#companyRolesList");

    if (companyApps.length > 0) {
      // Show summary badge
      if (companyAppliedBadge && !existingApp) {
        const label = companyApps.length === 1
          ? `${companyApps.length} role tracked here`
          : `${companyApps.length} roles tracked here`;
        companyAppliedBadge.textContent = `⚡ ${label}`;
        companyAppliedBadge.hidden = false;
        document.querySelector(".job-card")?.classList.add("is-tracked");
      }

      // Show each tracked role with its status — using DOM methods to avoid XSS
      if (companyRolesList) {
        companyRolesList.hidden = false;
        companyRolesList.replaceChildren(
          ...companyApps.map((app) => {
            const row = document.createElement("div");
            row.className = "company-role-row";

            const title = document.createElement("span");
            title.className = "company-role-title";
            title.textContent = app.role || "Role";

            const status = document.createElement("span");
            const statusKey = (app.status || "applied").toLowerCase().replace(/\s+/g, "-");
            status.className = `company-role-status status-${statusKey}`;
            status.textContent = app.status || "Applied";

            row.append(title, status);
            return row;
          })
        );
      }
    }

    if (existingApp) {
      existingBadge.hidden = false;
      document.querySelector(".job-card")?.classList.add("is-tracked");
      setStateText("Already tracking this job.");
      openTrackerView(existingApp, true);
    } else {
      const alreadyAtCompany = companyApps.length > 0;
      setStateText(
        alreadyAtCompany
          ? `${companyApps.length} role${companyApps.length > 1 ? "s" : ""} tracked at this company.`
          : "Ready — Gemma only runs when you click Evaluate."
      );
      openTrackerView(latestCapture, false, { skipRefinement: true });
    }
  } catch {
    setStateText("Fill manually or open a job page.");
    latestCapture = {
      status: "Applied",
      priority: "Medium",
      dateApplied: "",
      sourceUrl: "",
    };
    // "Fill manually" must actually show the form — without this the capture
    // form stays hidden and the message is a dead end.
    openTrackerView(latestCapture, false, { skipRefinement: true });
  }

  // Server status pill, CV chips, and profile preload share one health check.
  refreshServerStatus();

  if (connRetry) connRetry.addEventListener("click", () => refreshServerStatus());

  if (toolbarToggleBtn) {
    toolbarToggleBtn.addEventListener("click", async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_TOOLBAR" });
        setStateText("Toggled the on-page toolbar.");
      } catch {
        setStateText("Can't reach this page — refresh the job page first.");
      }
    });
  }

  if (autofillWebFormBtn) {
    autofillWebFormBtn.addEventListener("click", async () => {
      if (!userProfile) {
        try {
          userProfile = await fetchUserProfile();
        } catch {
          showAutofillResult("Cockpit server offline — start it at 127.0.0.1:8787, then hit Retry above.", true);
          return;
        }
      }
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, {
          type: "AUTOFILL_FORM",
          profile: userProfile,
        });
        showAutofillResult("Sent to page — the on-page panel shows the per-field report, including the CV file attach.");
        setStateText("Autofill running on the job page.");
      } catch {
        showAutofillResult("The page hasn't loaded Claire yet — refresh the job page, then try again.", true);
      }
    });
  }
}

// ── Server status + CV chips ───────────────────────────────────
function showAutofillResult(text, isError = false) {
  if (!autofillResult) return;
  autofillResult.hidden = false;
  autofillResult.textContent = text;
  autofillResult.classList.toggle("is-error", isError);
}

function setServerState(online) {
  if (connPill) connPill.dataset.state = online ? "online" : "offline";
  if (connLabel) connLabel.textContent = online ? "Cockpit online" : "Cockpit offline";
  if (connRetry) connRetry.hidden = Boolean(online);
  if (offlineNote) offlineNote.hidden = Boolean(online);
  if (evaluateBtn) evaluateBtn.disabled = !online;
  if (autofillWebFormBtn) autofillWebFormBtn.disabled = !online;
  if (!online && saveBtn) saveBtn.disabled = true;
}

async function refreshServerStatus() {
  if (connPill) connPill.dataset.state = "checking";
  if (connLabel) connLabel.textContent = "Checking…";
  try {
    userProfile = await fetchUserProfile();
    setServerState(true);
    if (existingApp || latestCapture) saveBtn.disabled = false;
    refreshCvChips();
  } catch {
    setServerState(false);
    renderCvChip(cvChipBackend, null, true);
    renderCvChip(cvChipArchitect, null, true);
  }
}

function renderCvChip(chip, meta, serverUnknown = false) {
  if (!chip) return;
  const fileEl = chip.querySelector(".cv-chip-file");
  const markEl = chip.querySelector(".cv-chip-mark");
  if (serverUnknown) {
    chip.dataset.state = "unknown";
    if (markEl) markEl.textContent = "•";
    if (fileEl) fileEl.textContent = "server offline";
    chip.title = "Cockpit server offline — CV status unknown";
    return;
  }
  if (meta && meta.fileName) {
    chip.dataset.state = "ok";
    if (markEl) markEl.textContent = "✓";
    if (fileEl) fileEl.textContent = meta.fileName;
    chip.title = meta.uploadedAt
      ? `${meta.fileName} — uploaded ${new Date(meta.uploadedAt).toLocaleString()}`
      : meta.fileName;
  } else {
    chip.dataset.state = "missing";
    if (markEl) markEl.textContent = "—";
    if (fileEl) fileEl.textContent = "not uploaded";
    chip.title = "Upload this CV on the dashboard Profile page to enable file injection";
  }
}

async function refreshCvChips() {
  try {
    const res = await fetch(`${API_BASE}/api/profile/cv`);
    if (!res.ok) throw new Error("offline");
    const meta = await res.json();
    renderCvChip(cvChipBackend, meta?.backend || null);
    renderCvChip(cvChipArchitect, meta?.architect || null);
  } catch {
    renderCvChip(cvChipBackend, null, true);
    renderCvChip(cvChipArchitect, null, true);
  }
}

async function fetchUserProfile() {
  const res = await fetch(profileEndpoint);
  if (!res.ok) throw new Error("Offline");
  return await res.json();
}

function setTheme(theme) {
  document.documentElement.dataset.theme = "dark";
  localStorage.setItem("theme", "dark");
}

async function fetchAllApplications() {
  try {
    const res = await fetch(applicationsEndpoint);
    return await res.json();
  } catch {
    return [];
  }
}

// ── Job card ───────────────────────────────────────────────────
function updateJobCard(data) {
  jobCompany.textContent = data.company || "—";
  jobRole.textContent = data.role || "";
  const metaParts = [data.location, data.salary].filter(Boolean);
  jobMeta.textContent = metaParts.join(" · ");
}

// ── Evaluate button ────────────────────────────────────────────
// Keep Gemma explicit: this button only evaluates the listing. It no longer starts
// a second refinement request in parallel, which is hard on local laptops.
evaluateBtn.addEventListener("click", () => {
  if (analysisInFlight) return;
  startAnalysis();
});

function startAnalysis() {
  openEvalSection();
  if (!trackSectionOpen) openTrackerView(latestCapture, false, { skipRefinement: true });

  analysisInFlight = true;
  evaluateBtn.disabled = true;
  const originalLabel = evaluateBtn.textContent;
  evaluateBtn.textContent = "Evaluating…";

  setStateText("Evaluating with Gemma…");
  showEvalProgress(true);

  runEvaluation().finally(() => {
    analysisInFlight = false;
    evaluateBtn.disabled = false;
    evaluateBtn.textContent = originalLabel;
  });
}

function openEvalSection() {
  evalSectionOpen = true;
  viewEval.hidden = false;
}

async function runEvaluation() {
  if (!latestCapture?.pageText && !latestCapture?.description) {
    showEvaluationError("No page text available to evaluate.");
    showEvalProgress(false);
    return;
  }

  const heroCard = document.querySelector(".eval-hero");
  if (heroCard) heroCard.style.display = "none";

  scoreNumber.textContent = "…";
  verdictText.textContent = "Scanning…";
  verdictHint.textContent = "";
  evaluationResult.replaceChildren();

  const scanMsg = document.createElement("p");
  scanMsg.className = "eval-scanning";
  scanMsg.textContent = "Gemma is reading the posting against your profile…";
  evaluationResult.appendChild(scanMsg);

  try {
    const res = await fetch(evaluateEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rulesGuess: latestCapture,
        title: latestCapture.title,
        sourceUrl: latestCapture.sourceUrl,
        pageText: latestCapture.pageText || latestCapture.description,
      }),
    });
    const result = await res.json().catch(() => null);
    if (!res.ok) throw new Error(result?.error || `HTTP ${res.status}`);
    renderEvaluation(result.evaluation, result.provider, result.model);
  } catch (error) {
    showEvaluationError(error.message || "Could not reach local Gemma through the tracker server.");
  } finally {
    showEvalProgress(false);
  }
}

function renderEvaluation(evaluation, provider, model) {
  const score = Number(evaluation.matchScore) || 0;
  const badgeClass =
    evaluation.applyOrSkip === "Skip" ? "skip" : evaluation.applyOrSkip === "Maybe" ? "maybe" : "";

  const heroCard = document.querySelector(".eval-hero");
  if (heroCard) heroCard.style.display = "none";

  const frag = document.createDocumentFragment();

  const verdictRow = makeEl("div", "eval-verdict-row");

  // Left: Verdict badge
  const verdictHeader = makeEl("div", "eval-verdict-header");

  const verdictTitle = makeEl("span", "eval-verdict-title");
  verdictTitle.textContent = "Gemma Recommendation";

  const verdictBadge = makeEl("span", `eval-verdict-badge ${badgeClass}`);
  verdictBadge.textContent = evaluation.applyOrSkip || "Maybe";

  verdictHeader.append(verdictTitle, verdictBadge);

  // Right: Dynamic SVG Circular Progress Ring
  const ringWrap = makeEl("div", "ai-score-ring-wrap");
  if (score >= 80) ringWrap.classList.add("fit-high");
  else if (score >= 60) ringWrap.classList.add("fit-medium");
  else ringWrap.classList.add("fit-low");

  ringWrap.innerHTML = `
    <svg class="ai-score-ring" viewBox="0 0 36 36">
      <path class="circle-bg"
        d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831"
      />
      <path class="circle-progress"
        stroke-dasharray="${score}, 100"
        d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831"
      />
    </svg>
    <div class="ai-score-ring-text">${score}%</div>
  `;

  verdictRow.append(verdictHeader, ringWrap);
  frag.append(verdictRow);

  const grid = makeEl("div", "eval-grid");
  grid.append(
    makeTile("Remote from CA", [evaluation.remoteFromCanada, evaluation.remoteFromCanadaReason].filter(Boolean).join(" — ")),
    makeTile("$180k+ TC", [evaluation.compensation180k, evaluation.compensationReason].filter(Boolean).join(" — ")),
    makeTile("Category", evaluation.roleCategory),
    makeTile("Model", [provider, model].filter(Boolean).join(" / ")),
  );
  frag.append(grid);

  appendList(frag, "Strong matches", evaluation.strongMatches);
  appendList(frag, "Gaps / risks", evaluation.gapsRisks);
  appendList(frag, "Emphasize from CV", evaluation.cvEmphasis);
  appendParagraph(frag, "Recruiter message", evaluation.recruiterMessage, true);
  appendParagraph(frag, "Final decision", evaluation.finalDecision);

  evaluationResult.replaceChildren(frag);
}

function showEvaluationError(message) {
  const heroCard = document.querySelector(".eval-hero");
  if (heroCard) heroCard.style.display = "none";
  scoreNumber.textContent = "—";
  verdictText.textContent = "Error";
  verdictHint.textContent = "";
  const div = makeEl("div", "eval-error");
  div.textContent = message;
  evaluationResult.replaceChildren(div);
}


function openTrackerView(data, isExisting, { skipRefinement = true } = {}) {
  trackSectionOpen = true;
  viewTrack.hidden = false;
  setForm(data);

  if (isExisting) {
    trackerLabel.textContent = "Update this job";
    saveBtn.textContent = "Update Tracker";
    saveBtn.disabled = false;
    gemmaRefinementDone = true;
  } else {
    trackerLabel.textContent = "Job details";
    saveBtn.textContent = "Add to Tracker";
    saveBtn.disabled = false;
    if (!skipRefinement) {
      saveBtn.disabled = true;
      runGemmaRefinement();
    }
  }

  // Smooth scroll to tracker section
  setTimeout(() => viewTrack.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
}

async function runGemmaRefinement() {
  if (gemmaRefinementDone || !latestCapture) return;
  // Set the guard before the await — prevents a parallel caller from kicking a second refinement.
  gemmaRefinementDone = true;
  setStateText("Gemma is refining the details…");
  showFormProgress(true);
  saveBtn.disabled = true;
  saveBtn.textContent = "Prefilling…";

  try {
    const res = await fetch(extractEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rulesGuess: latestCapture,
        title: latestCapture.title,
        sourceUrl: latestCapture.sourceUrl,
        pageText: latestCapture.pageText || latestCapture.description,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    latestCapture = normalizeCapture(mergeAiCapture(latestCapture, result.application));
    setForm(latestCapture);
    updateJobCard(latestCapture);
    setStateText(`Refined via ${result.provider}. Ready to save.`);
  } catch {
    setStateText("Gemma unreachable — review form manually.");
  } finally {
    showFormProgress(false);
    saveBtn.disabled = false;
    saveBtn.textContent = "Add to Tracker";
  }
}

function showEvalProgress(visible) {
  const bar = document.querySelector("#evalProgress");
  if (bar) bar.hidden = !visible;
}

function showFormProgress(visible) {
  const bar = document.querySelector("#formProgress");
  if (bar) bar.hidden = !visible;
}

// ── Save ───────────────────────────────────────────────────────
form.addEventListener("submit", handleSave);

async function handleSave(event) {
  event.preventDefault();
  const payload = buildCurrentPayload();
  const isUpdate = !!payload.id;

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  setStateText("Saving…");

  try {
    const url = isUpdate
      ? `${applicationsEndpoint}/${encodeURIComponent(payload.id)}`
      : applicationsEndpoint;
    const res = await fetch(url, {
      method: isUpdate ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Show success banner briefly, then switch to update mode
    const saved = await res.json();
    successTitle.textContent = isUpdate ? "Updated!" : "Added to tracker!";
    successBanner.hidden = false;
    setStateText(isUpdate ? "Tracker updated." : "Job saved.");
    // Invalidate background badge cache so icon updates on the current tab
    chrome.runtime.sendMessage({ type: "TRACKER_UPDATED" }).catch(() => {});
    setTimeout(() => {
      successBanner.hidden = true;
      existingApp = saved;
      openTrackerView(saved, true);
    }, 1800);
  } catch {
    setStateText("Tracker not running at 127.0.0.1:8787.");
    saveBtn.disabled = false;
    saveBtn.textContent = isUpdate ? "Update Tracker" : "Add to Tracker";
  }
}

// ── Form helpers ───────────────────────────────────────────────
function buildCurrentPayload() {
  const data = Object.fromEntries(new FormData(form).entries());
  data.status = simplifyStatus(data.status);
  // "Saved" = captured for later, not applied: it must carry no applied date or
  // the tracker (and the toolbar badge) would count it as submitted.
  if (data.status === "Saved") data.dateApplied = "";
  data.skills = data.skills.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  data.pageText = latestCapture?.pageText || "";
  return data;
}

function setForm(data = {}) {
  const f = form.elements;
  f.id.value = data.id || "";
  f.company.value = data.company || "";
  f.role.value = data.role || "";
  f.status.value = simplifyStatus(data.status);
  if (f.priority) f.priority.value = data.priority || "Medium";
  f.location.value = data.location || "";
  f.salary.value = data.salary || "";
  f.skills.value = Array.isArray(data.skills) ? data.skills.join(", ") : data.skills || "";
  f.group.value = data.group || "";
  f.notes.value = data.notes || "";
  f.dateApplied.value = data.dateApplied || "";
  f.source.value = data.source || "Extension";
  f.sourceUrl.value = data.sourceUrl || "";
  f.description.value = data.description || "";
}

// ── DOM helpers ────────────────────────────────────────────────
function makeEl(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function makeTile(label, value) {
  const tile = makeEl("div", "eval-tile");
  const labelEl = makeEl("span", "eval-tile-label");
  labelEl.textContent = label;
  const valueEl = makeEl("span", "eval-tile-value");
  valueEl.textContent = value || "unclear";
  tile.append(labelEl, valueEl);
  return tile;
}

function appendList(parent, label, items) {
  if (!items?.length) return;
  const section = makeEl("div", "eval-section");
  const labelEl = makeEl("span", "eval-section-label");
  labelEl.textContent = label;
  const ul = document.createElement("ul");
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    ul.append(li);
  });
  section.append(labelEl, ul);
  parent.append(section);
}

function appendParagraph(parent, label, text, showCopyButton = false) {
  if (!text) return;
  const section = makeEl("div", "eval-section");

  const header = makeEl("div", "eval-section-header");
  const labelEl = makeEl("span", "eval-section-label");
  labelEl.textContent = label;
  header.appendChild(labelEl);

  if (showCopyButton) {
    const copyBtn = makeEl("button", "copy-pitch-btn");
    copyBtn.type = "button";
    copyBtn.textContent = "📋 Copy Pitch";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = "✓ Copied!";
        copyBtn.style.color = "var(--status-offer)";
        setTimeout(() => {
          copyBtn.textContent = "📋 Copy Pitch";
          copyBtn.style.color = "";
        }, 2000);
      } catch {
        copyBtn.textContent = "❌ Failed";
      }
    });
    header.appendChild(copyBtn);
  }

  const p = document.createElement("p");
  p.textContent = text;

  section.append(header, p);
  parent.append(section);
}

// ── Data utils ─────────────────────────────────────────────────
function mergeAiCapture(rulesGuess, aiGuess) {
  return {
    ...rulesGuess,
    ...aiGuess,
    dateApplied: rulesGuess.dateApplied,
    status: simplifyStatus(aiGuess.status || rulesGuess.status),
    group: rulesGuess.group || aiGuess.group || "",
    salary: preferExact(rulesGuess.salary, aiGuess.salary),
    location: preferExact(rulesGuess.location, aiGuess.location),
    equity: preferExact(rulesGuess.equity, aiGuess.equity),
    skills: unique([...(rulesGuess.skills || []), ...(aiGuess.skills || [])]),
    sourceUrl: aiGuess.sourceUrl || rulesGuess.sourceUrl,
    // Keep the full page text captured by content.js as the description.
    // Gemma's shorter summary lands in `notes` via the AI guess.
    description: rulesGuess.description || aiGuess.description,
    pageText: rulesGuess.pageText,
    title: rulesGuess.title,
  };
}

function normalizeCapture(data = {}) {
  return {
    ...data,
    status: simplifyStatus(data.status),
    priority: data.priority || "Medium",
    dateApplied: data.dateApplied || "",
    group: data.group || "",
    skills: Array.isArray(data.skills)
      ? data.skills
      : String(data.skills || "").split(/[,;]+/).map((s) => s.trim()).filter(Boolean),
  };
}

// Map arbitrary status text onto the cockpit's canonical pipeline statuses
// (mirrors server.mjs simplifyStatus — do NOT collapse OA/Recruiter Screen).
function simplifyStatus(status) {
  const value = String(status || "").toLowerCase().trim();
  if (!value) return "Applied";
  if (["saved", "wishlist", "interested", "to apply", "not applied"].includes(value)) return "Saved";
  if (value.includes("assessment") || value === "oa" || value.includes("take home") || value.includes("take-home")) return "Online Assessment";
  if (value.includes("recruiter") || value.includes("screen") || value.includes("phone")) return "Recruiter Screen";
  if (value.includes("interview") || value.includes("onsite") || value.includes("panel") || value.includes("loop")) return "Interview";
  if (value.includes("offer")) return "Offer";
  if (value.includes("reject") || value.includes("withdraw")) return "Rejected";
  return "Applied";
}

function preferExact(rulesValue = "", aiValue = "") {
  if (!rulesValue) return aiValue || "";
  if (!aiValue) return rulesValue;
  if (/[$€£]|\d+\s*[-–]\s*\d+|remote/i.test(rulesValue) && rulesValue.length >= aiValue.length) return rulesValue;
  return aiValue;
}

function unique(values) {
  return [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))];
}

function setStateText(text) {
  stateText.textContent = text;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

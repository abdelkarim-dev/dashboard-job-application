const API = "http://127.0.0.1:8787/api/applications";
const EVALUATE_API = "http://127.0.0.1:8787/api/evaluate-job";

// sourceUrl -> { applied: boolean, status: string }. A job is "applied" once it
// has an appliedAt/dateApplied (or has moved past the Applied stage); otherwise
// it's merely "saved" (captured for later but not yet submitted).
let trackedByUrl = new Map();
let lastFetch = 0;
// Tabs where content.js flagged a likely job posting. Cleared on tab close.
const jobPageTabs = new Set();

// "Applied" mirrors the dashboard's own definition (metrics.mjs):
// a record counts as applied once it has an applied timestamp. A tracked record
// without one is merely saved/captured for later.
function isApplied(app) {
  return Boolean(app.appliedAt || (app.stageDateTimes && app.stageDateTimes.Applied) || app.dateApplied);
}

async function refreshTrackedUrls() {
  const now = Date.now();
  if (now - lastFetch < 20000) return; // re-fetch at most every 20 s
  try {
    const res = await fetch(API);
    if (!res.ok) return;
    const apps = await res.json();
    const map = new Map();
    for (const a of apps) {
      if (!a.sourceUrl) continue;
      map.set(a.sourceUrl, { applied: isApplied(a), status: a.status || "" });
    }
    trackedByUrl = map;
    lastFetch = now;
  } catch {
    // tracker server offline — keep last known state
  }
}

function setBadge(tabId, text, bg, title) {
  chrome.action.setBadgeText({ text, tabId });
  if (bg) chrome.action.setBadgeBackgroundColor({ color: bg, tabId });
  if (bg && chrome.action.setBadgeTextColor) {
    chrome.action.setBadgeTextColor({ color: "#FFFFFF", tabId });
  }
  chrome.action.setTitle({ title, tabId });
}

async function applyBadge(tabId, url) {
  await refreshTrackedUrls();

  if (!url || !url.startsWith("http")) {
    setBadge(tabId, "", null, "Capture job");
    return;
  }

  const tracked = trackedByUrl.get(url);
  if (tracked) {
    if (tracked.applied) {
      // Application submitted — green "DONE" so you know not to re-apply.
      setBadge(tabId, "✓", "#006A62", `Applied — ${tracked.status || "in tracker"}. Click to update.`);
    } else {
      // Captured for later but not yet applied — blue "SAVED" to nudge you back.
      setBadge(tabId, "SAVED", "#1565C0", "Saved, not yet applied — click to apply & track.");
    }
    return;
  }

  if (jobPageTabs.has(tabId)) {
    // Looks like a job posting we haven't captured — amber to invite a click.
    setBadge(tabId, "JOB", "#E65100", "Job posting detected — click to evaluate & save.");
    return;
  }

  setBadge(tabId, "", null, "Capture job");
}

async function postJson(url, body, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // keep data null for non-JSON responses
  }
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return { status: res.status, data };
}

function normalizeStoredEvaluation(result) {
  const evaluation = result?.evaluation || {};
  const score = Number(evaluation.matchScore ?? result?.score ?? 0);
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  const decision = evaluation.applyOrSkip || result?.decision || "Maybe";
  return {
    ok: true,
    score: safeScore,
    decision,
    analysis: evaluation.finalDecision || "",
    explanation: evaluation.finalDecision || "",
    provider: result?.provider || "",
    model: result?.model || "",
    evaluatedAt: new Date().toISOString(),
    rawEvaluation: evaluation,
  };
}

async function trackApplicationFromBackground(msg, sender) {
  const jobData = msg.jobData || {};
  const saved = await postJson(API, jobData, "POST");
  let app = saved.data;
  let storedEvaluation = null;
  let evaluationError = "";

  if (msg.runEvaluation !== false) {
    try {
      const evaluationPayload = {
        ...app,
        pageText: jobData.pageText || app.pageText || app.description || jobData.description || "",
        description: jobData.description || app.description || "",
        rulesGuess: jobData,
      };
      const evalResult = await postJson(EVALUATE_API, evaluationPayload, "POST");
      if (evalResult.data?.ok && evalResult.data?.evaluation) {
        storedEvaluation = normalizeStoredEvaluation(evalResult.data);
        const update = await postJson(`${API}/${encodeURIComponent(app.id)}`, { ...app, evaluation: storedEvaluation }, "PUT");
        app = update.data;
      } else {
        evaluationError = evalResult.data?.error || "Gemma did not return an evaluation.";
      }
    } catch (err) {
      evaluationError = err.message || "Gemma evaluation failed.";
    }
  }

  lastFetch = 0;
  if (sender?.tab?.id && sender.tab.url) applyBadge(sender.tab.id, sender.tab.url);

  return {
    ok: true,
    status: saved.status,
    app,
    evaluationSaved: Boolean(storedEvaluation),
    evaluation: storedEvaluation,
    evaluationError,
  };
}

// Badge when tab finishes loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading") {
    // New URL in this tab — drop the job-page flag until content.js re-flags it.
    jobPageTabs.delete(tabId);
  }
  if (changeInfo.status === "complete" && tab.url) {
    applyBadge(tabId, tab.url);
  }
});

// Badge when user switches tabs
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url) applyBadge(tabId, tab.url);
  } catch {
    // tab may have been closed
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  jobPageTabs.delete(tabId);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "TRACKER_UPDATED") {
    lastFetch = 0; // invalidate cache so next badge check re-fetches
    // Refresh the sending tab's badge so the SAVED indicator appears immediately.
    if (sender?.tab?.id && sender.tab.url) applyBadge(sender.tab.id, sender.tab.url);
  }
  if (msg?.type === "JOB_PAGE_DETECTED" && sender?.tab?.id) {
    jobPageTabs.add(sender.tab.id);
    applyBadge(sender.tab.id, sender.tab.url || msg.url);
  }

  // Sent by the extension "+" form after saving an application. Opens or focuses
  // the dashboard and tells it to open the panel for the saved application.
  if (msg?.type === "OPEN_DASHBOARD") {
    const appId = msg.appId || "";
    chrome.tabs.query({ url: "http://127.0.0.1:8787/*" }, (tabs) => {
      if (tabs.length > 0) {
        const tab = tabs[0];
        chrome.tabs.update(tab.id, { active: true });
        chrome.windows.update(tab.windowId, { focused: true });
        if (appId) {
          // Relay to the page via content.js so the React panel opens without
          // a full reload (avoids disrupting an in-progress edit session).
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { type: "OPEN_APP_DRAWER", appId }).catch(() => {});
          }, 250);
        }
      } else {
        const url = appId
          ? `http://127.0.0.1:8787/?openApp=${encodeURIComponent(appId)}#/dashboard`
          : "http://127.0.0.1:8787/#/dashboard";
        chrome.tabs.create({ url });
      }
    });
    return;
  }

  if (msg?.type === "TRACK_APPLICATION") {
    trackApplicationFromBackground(msg, sender)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err.message || "Tracker request failed." }));
    return true;
  }

  // ── API Proxy for content scripts ────────────────────────────
  // Content scripts run in the page's origin context. On HTTPS pages,
  // direct fetch() to http://127.0.0.1 is blocked by mixed-content policy.
  // This handler proxies API requests through the background service worker,
  // which has full host_permissions and is not subject to mixed-content rules.
  if (msg?.type === "API_PROXY") {
    const { url, method, body } = msg;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

    const opts = { method: method || "GET", signal: controller.signal };
    if (body) {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
    fetch(url, opts)
      .then(async (res) => {
        clearTimeout(timeoutId);
        let data = null;
        try {
          data = await res.json();
        } catch {
          // Non-JSON response; fall through to status handling.
        }
        if (!res.ok) {
          sendResponse({ ok: false, status: res.status, error: data?.error || `HTTP ${res.status}` });
          return;
        }
        sendResponse({ ok: true, status: res.status, data });
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          sendResponse({ ok: false, error: "Request timed out after 120 seconds" });
        } else {
          sendResponse({ ok: false, error: err.message || "Network error" });
        }
      });
    return true; // keep sendResponse channel open for async reply
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || !tab.url.startsWith("http")) return;
  
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_TOOLBAR" });
  } catch (err) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_TOOLBAR" }).catch(() => {});
      }, 150);
    } catch (injectErr) {
      console.error("Failed to inject content script on action click:", injectErr);
    }
  }
});

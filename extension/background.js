const API = "http://127.0.0.1:8787/api/applications";

let trackedUrls = new Set();
let lastFetch = 0;
// Tabs where content.js flagged a likely job posting. Cleared on tab close.
const jobPageTabs = new Set();

async function refreshTrackedUrls() {
  const now = Date.now();
  if (now - lastFetch < 20000) return; // re-fetch at most every 20 s
  try {
    const res = await fetch(API);
    if (!res.ok) return;
    const apps = await res.json();
    trackedUrls = new Set(apps.map((a) => a.sourceUrl).filter(Boolean));
    lastFetch = now;
  } catch {
    // tracker server offline — keep last known state
  }
}

async function applyBadge(tabId, url) {
  await refreshTrackedUrls();

  if (!url || !url.startsWith("http")) {
    chrome.action.setBadgeText({ text: "", tabId });
    chrome.action.setTitle({ title: "Capture job", tabId });
    return;
  }

  if (trackedUrls.has(url)) {
    // Already tracked — bold green badge, can be seen at a glance.
    chrome.action.setBadgeText({ text: "SAVED", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#006A62", tabId });
    if (chrome.action.setBadgeTextColor) {
      chrome.action.setBadgeTextColor({ color: "#FFFFFF", tabId });
    }
    chrome.action.setTitle({ title: "✓ Already in tracker — click to update", tabId });
    return;
  }

  if (jobPageTabs.has(tabId)) {
    // Looks like a job posting we haven't saved — amber dot to invite a click.
    chrome.action.setBadgeText({ text: "JOB", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#E65100", tabId });
    if (chrome.action.setBadgeTextColor) {
      chrome.action.setBadgeTextColor({ color: "#FFFFFF", tabId });
    }
    chrome.action.setTitle({ title: "Job posting detected — click to evaluate & save", tabId });
    return;
  }

  chrome.action.setBadgeText({ text: "", tabId });
  chrome.action.setTitle({ title: "Capture job", tabId });
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
        sendResponse({ ok: true, data });
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          sendResponse({ ok: false, error: "Request timed out after 30 seconds" });
        } else {
          sendResponse({ ok: false, error: err.message || "Network error" });
        }
      });
    return true; // keep sendResponse channel open for async reply
  }
});

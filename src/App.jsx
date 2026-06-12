import React, { lazy, Suspense, useState, useEffect } from "react";
import Analytics from "./components/Analytics.jsx";
import Practice from "./components/Practice.jsx";
import Profile from "./components/Profile.jsx";
import SystemDesign from "./components/SystemDesign.jsx";
import Dashboard from "./components/Dashboard.jsx";
import InterviewBoard from "./components/InterviewBoard.jsx";

const SolidPractice = lazy(() => import("./components/SolidPractice.jsx"));
const CleanArchitecture = lazy(() => import("./components/CleanArchitecture.jsx"));

const REMINDERS_KEY = "jobHuntReminders";

function loadReminders() {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistReminders(list) {
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(list));
  } catch {}
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash;
    if (hash === "#/analytics") return "analytics";
    if (hash === "#/leetcode" || hash === "#/practice") return "leetcode";
    if (hash === "#/solid-java" || hash === "#/solid") return "solidjava";
    if (hash === "#/clean-architecture") return "cleanarchitecture";
    if (hash === "#/system-design") return "systemdesign";
    if (hash === "#/profile") return "profile";
    if (hash === "#/board" || hash === "#/interview-board") return "interviewboard";
    if (hash === "#/dashboard") return "newdashboard";
    return "newdashboard";
  });
  const [applications, setApplications] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState("");
  // App ID to auto-open in the dashboard panel — set from ?openApp= URL param or postMessage
  const [pendingOpenAppId, setPendingOpenAppId] = useState(null);

  // LeetCode focus timer — lifted here so it survives tab switches.
  const [timerState, setTimerState] = useState(() => {
    try {
      const raw = localStorage.getItem("leetcodeTimer");
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.running && saved.endsAt) {
          const remaining = Math.max(0, Math.round((saved.endsAt - Date.now()) / 1000));
          return { focusMinutes: saved.focusMinutes ?? 25, seconds: remaining, running: remaining > 0 };
        }
        return { focusMinutes: saved.focusMinutes ?? 25, seconds: saved.seconds ?? (saved.focusMinutes ?? 25) * 60, running: false };
      }
    } catch {}
    return { focusMinutes: 25, seconds: 25 * 60, running: false };
  });

  useEffect(() => {
    try {
      const payload = timerState.running
        ? { ...timerState, endsAt: Date.now() + timerState.seconds * 1000 }
        : timerState;
      localStorage.setItem("leetcodeTimer", JSON.stringify(payload));
    } catch {}
  }, [timerState]);

  useEffect(() => {
    if (!timerState.running) return undefined;
    const id = setInterval(() => {
      setTimerState((prev) => {
        if (!prev.running) return prev;
        if (prev.seconds <= 1) return { ...prev, seconds: 0, running: false };
        return { ...prev, seconds: prev.seconds - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerState.running]);

  // Reminders: persisted in localStorage, fired via the browser Notification API
  // while the tab is open. Asking for permission on demand keeps the first-load
  // experience quiet.
  const [reminders, setReminders] = useState(loadReminders);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  useEffect(() => {
    persistReminders(reminders);
  }, [reminders]);

  // Theme: apply + persist whenever it changes. Defaults to dark.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const addReminder = ({ applicationId = null, message, fireAt }) => {
    if (!message || !fireAt) return;
    const reminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      applicationId,
      message,
      fireAt: new Date(fireAt).toISOString(),
      fired: false,
      createdAt: new Date().toISOString(),
    };
    setReminders((prev) => [...prev, reminder]);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().then(setNotificationPermission);
    }
    return reminder;
  };

  const deleteReminder = (id) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const requestNotificationPermission = () => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setNotificationPermission);
  };

  // Poller: every 30s, fire any due reminders that haven't fired yet.
  useEffect(() => {
    const fire = () => {
      const now = Date.now();
      let mutated = false;
      const next = reminders.map((r) => {
        if (!r.fired && Date.parse(r.fireAt) <= now) {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              const app = applications.find((a) => a.id === r.applicationId);
              const title = app ? `${app.company} — ${app.role}` : "Claire reminder";
              new Notification(title, { body: r.message, tag: r.id });
            } catch {}
          }
          mutated = true;
          return { ...r, fired: true, firedAt: new Date().toISOString() };
        }
        return r;
      });
      if (mutated) setReminders(next);
    };
    fire(); // run immediately on load too
    const id = setInterval(fire, 30000);
    return () => clearInterval(id);
  }, [reminders, applications]);

  // Open the dashboard panel for a specific app when directed from the extension.
  // Two entry points: ?openApp=<id> query param (new tab) or JH_OPEN_DRAWER
  // postMessage (existing tab focused by background.js).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openAppId = params.get("openApp");
    if (openAppId) {
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
      setPendingOpenAppId(openAppId);
    }

    const handleMsg = (event) => {
      if (event.data?.type === "JH_OPEN_DRAWER" && event.data?.appId) {
        setPendingOpenAppId(event.data.appId);
        setActiveTab("newdashboard");
        window.location.hash = "#/dashboard";
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, []);

  useEffect(() => {
    if (!pendingOpenAppId) return;
    setActiveTab("newdashboard");
    if (window.location.hash !== "#/dashboard") {
      window.location.hash = "#/dashboard";
    }
  }, [pendingOpenAppId]);

  useEffect(() => {
    fetchApplications();

    // Set up quiet periodic syncing
    const interval = setInterval(fetchApplicationsQuietly, 10000);

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#/analytics") setActiveTab("analytics");
      else if (hash === "#/leetcode" || hash === "#/practice") setActiveTab("leetcode");
      else if (hash === "#/solid-java" || hash === "#/solid") setActiveTab("solidjava");
      else if (hash === "#/clean-architecture") setActiveTab("cleanarchitecture");
      else if (hash === "#/system-design") setActiveTab("systemdesign");
      else if (hash === "#/profile") setActiveTab("profile");
      else if (hash === "#/board" || hash === "#/interview-board") setActiveTab("interviewboard");
      else if (hash === "#/dashboard") setActiveTab("newdashboard");
      else setActiveTab("newdashboard");
    };

    window.addEventListener("hashchange", handleHashChange);
    
    // Ensure initial hash is set if it's empty
    if (!window.location.hash) {
      window.location.hash = "#/dashboard";
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const TAB_HASHES = {
    analytics: "analytics",
    leetcode: "leetcode",
    solidjava: "solid-java",
    cleanarchitecture: "clean-architecture",
    systemdesign: "system-design",
    profile: "profile",
    interviewboard: "board",
    newdashboard: "dashboard",
  };

  const handleTabChange = (tabName) => {
    window.location.hash = `#/${TAB_HASHES[tabName] || tabName}`;
    setActiveTab(tabName);
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (err) {
      console.error("Server offline, retaining existing application cache.", err);
    }
  };

  const fetchApplicationsQuietly = async () => {
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        
        // Simple comparison function using updatedAt timestamps
        const fingerprint = (apps) => apps.map((a) => `${a.id}:${a.updatedAt}`).join("|");
        setApplications((prev) => {
          if (fingerprint(data) !== fingerprint(prev)) {
            return data;
          }
          return prev;
        });
      }
    } catch {
      // Ignore quiet sync errors
    }
  };

  const handleOpenApplicationInDashboard = (appId = null) => {
    if (appId) setPendingOpenAppId(appId);
    handleTabChange("newdashboard");
  };

  return (
    <div className="app-shell">
      {/* Sleek Desktop Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">C</div>
          <div>
            <h2>Claire</h2>
            <p className="sidebar-app-count">
              {applications.length} {applications.length === 1 ? "role" : "roles"} tracked
            </p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          <button
            className={`sidebar-nav-btn ${activeTab === "newdashboard" ? "active" : ""}`}
            onClick={() => handleTabChange("newdashboard")}
            type="button"
          >
            <span className="sidebar-nav-icon">✦</span>
            <span>Dashboard</span>
          </button>
          <button
            className={`sidebar-nav-btn ${activeTab === "interviewboard" ? "active" : ""}`}
            onClick={() => handleTabChange("interviewboard")}
            type="button"
          >
            <span className="sidebar-nav-icon">▦</span>
            <span>Board</span>
          </button>
          <button
            className={`sidebar-nav-btn ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => handleTabChange("analytics")}
            type="button"
          >
            <span className="sidebar-nav-icon">📊</span>
            <span>Analytics</span>
          </button>
          <button
            className={`sidebar-nav-btn ${activeTab === "leetcode" ? "active" : ""}`}
            onClick={() => handleTabChange("leetcode")}
            type="button"
          >
            <span className="sidebar-nav-icon">⌨</span>
            <span>LeetCode</span>
          </button>
          <button
            className={`sidebar-nav-btn ${activeTab === "solidjava" ? "active" : ""}`}
            onClick={() => handleTabChange("solidjava")}
            type="button"
          >
            <span className="sidebar-nav-icon">◆</span>
            <span>SOLID Lab</span>
          </button>
          <button
            className={`sidebar-nav-btn ${activeTab === "cleanarchitecture" ? "active" : ""}`}
            onClick={() => handleTabChange("cleanarchitecture")}
            type="button"
          >
            <span className="sidebar-nav-icon">🧱</span>
            <span>Clean Arch</span>
          </button>
          <button
            className={`sidebar-nav-btn ${activeTab === "systemdesign" ? "active" : ""}`}
            onClick={() => handleTabChange("systemdesign")}
            type="button"
          >
            <span className="sidebar-nav-icon">🏗</span>
            <span>System Design</span>
          </button>
          <button
            className={`sidebar-nav-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => handleTabChange("profile")}
            type="button"
          >
            <span className="sidebar-nav-icon">👤</span>
            <span>Profile</span>
          </button>
        </nav>
      </aside>

      <main className="workspace">
        {/* Mobile Topbar Brand & Nav */}
        <header className="topbar">
          <div className="topbar-brand">
            <div className="brand-mark" aria-hidden="true">C</div>
            <div>
              <h2>Claire</h2>
              <p className="sidebar-app-count">
                {applications.length} {applications.length === 1 ? "role" : "roles"} tracked
              </p>
            </div>
          </div>
          <nav className="topbar-tabs" aria-label="View switching">
            <button
              className={`tab-btn ${activeTab === "newdashboard" ? "active" : ""}`}
              onClick={() => handleTabChange("newdashboard")}
              type="button"
            >
              ✦ Dashboard
            </button>
            <button
              className={`tab-btn ${activeTab === "interviewboard" ? "active" : ""}`}
              onClick={() => handleTabChange("interviewboard")}
              type="button"
            >
              ▦ Board
            </button>
            <button
              className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
              onClick={() => handleTabChange("analytics")}
              type="button"
            >
              📊 Analytics
            </button>
            <button
              className={`tab-btn ${activeTab === "leetcode" ? "active" : ""}`}
              onClick={() => handleTabChange("leetcode")}
              type="button"
            >
              ⌨ LeetCode
            </button>
            <button
              className={`tab-btn ${activeTab === "solidjava" ? "active" : ""}`}
              onClick={() => handleTabChange("solidjava")}
              type="button"
            >
              ◆ SOLID Lab
            </button>
            <button
              className={`tab-btn ${activeTab === "cleanarchitecture" ? "active" : ""}`}
              onClick={() => handleTabChange("cleanarchitecture")}
              type="button"
            >
              🧱 Clean Arch
            </button>
            <button
              className={`tab-btn ${activeTab === "systemdesign" ? "active" : ""}`}
              onClick={() => handleTabChange("systemdesign")}
              type="button"
            >
              🏗 System Design
            </button>
            <button
              className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => handleTabChange("profile")}
              type="button"
            >
              👤 Profile
            </button>
          </nav>
        </header>

        {/* Content View Switching */}
        {activeTab === "analytics" && (
          <Analytics
            applications={applications}
            fetchApplications={fetchApplications}
            onOpenApplication={handleOpenApplicationInDashboard}
            setDashboardStatusFilter={setDashboardStatusFilter}
            setActiveTab={handleTabChange}
          />
        )}

        {activeTab === "leetcode" && (
          <Practice
            timerState={timerState}
            setTimerState={setTimerState}
          />
        )}

        {activeTab === "solidjava" && (
          <Suspense fallback={<div className="learning-empty"><strong>Loading Java lab...</strong></div>}>
            <SolidPractice />
          </Suspense>
        )}

        {activeTab === "cleanarchitecture" && (
          <Suspense fallback={<div className="learning-empty"><strong>Loading Clean Architecture lab...</strong></div>}>
            <CleanArchitecture />
          </Suspense>
        )}

        {activeTab === "systemdesign" && <SystemDesign />}

        {activeTab === "profile" && <Profile />}

        {activeTab === "interviewboard" && (
          <InterviewBoard
            applications={applications}
            fetchApplications={fetchApplications}
          />
        )}

        {activeTab === "newdashboard" && (
          <Dashboard
            applications={applications}
            fetchApplications={fetchApplications}
            openAppId={pendingOpenAppId}
            onOpenAppHandled={() => setPendingOpenAppId(null)}
            statusFilterOverride={dashboardStatusFilter}
            onStatusFilterOverrideHandled={() => setDashboardStatusFilter("")}
          />
        )}
      </main>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import Board from "./components/Board.jsx";
import Analytics from "./components/Analytics.jsx";
import Practice from "./components/Practice.jsx";
import Profile from "./components/Profile.jsx";
import SystemDesign from "./components/SystemDesign.jsx";



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
    if (hash === "#/system-design") return "systemdesign";
    if (hash === "#/profile") return "profile";
    return "board";
  });
  const [applications, setApplications] = useState([]);
  const [boardGrouping, setBoardGrouping] = useState("company");
  const [funnelFilter, setFunnelFilter] = useState("");
  // Detail Drawer state shared between Board and Analytics
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerAppId, setDrawerAppId] = useState(null);

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
              const title = app ? `${app.company} — ${app.role}` : "Job Hunt Reminder";
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

  useEffect(() => {
    // Explicitly enforce premium pitch-black dark theme on load
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");

    fetchApplications();
    
    // Set up quiet periodic syncing
    const interval = setInterval(fetchApplicationsQuietly, 10000);

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#/analytics") setActiveTab("analytics");
      else if (hash === "#/leetcode" || hash === "#/practice") setActiveTab("leetcode");
      else if (hash === "#/system-design") setActiveTab("systemdesign");
      else if (hash === "#/profile") setActiveTab("profile");
      else setActiveTab("board");
    };

    window.addEventListener("hashchange", handleHashChange);
    
    // Ensure initial hash is set if it's empty
    if (!window.location.hash) {
      window.location.hash = "#/board";
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const TAB_HASHES = {
    board: "board",
    analytics: "analytics",
    leetcode: "leetcode",
    systemdesign: "system-design",
    profile: "profile",
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

  const handleOpenDrawer = (appId = null) => {
    setDrawerAppId(appId);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setDrawerAppId(null);
  };

  return (
    <div className="app-shell">
      {/* Sleek Desktop Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">JH</div>
          <div>
            <p className="eyebrow">Big hunt mode</p>
            <h2>Job Hunt Cockpit</h2>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          <button
            className={`sidebar-nav-btn ${activeTab === "board" ? "active" : ""}`}
            onClick={() => handleTabChange("board")}
            type="button"
          >
            <span className="sidebar-nav-icon">📋</span>
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
            <div className="brand-mark">JH</div>
            <div>
              <p className="eyebrow">Big hunt mode</p>
              <h2>Job Hunt Cockpit</h2>
            </div>
          </div>
          <nav className="topbar-tabs" aria-label="View switching">
            <button
              className={`tab-btn ${activeTab === "board" ? "active" : ""}`}
              onClick={() => handleTabChange("board")}
              type="button"
            >
              📋 Board
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
        {activeTab === "board" && (
          <Board
            applications={applications}
            fetchApplications={fetchApplications}
            onOpenDrawer={handleOpenDrawer}
            drawerOpen={drawerOpen}
            drawerAppId={drawerAppId}
            onCloseDrawer={handleCloseDrawer}
            reminders={reminders}
            addReminder={addReminder}
            deleteReminder={deleteReminder}
            notificationPermission={notificationPermission}
            requestNotificationPermission={requestNotificationPermission}
            boardGrouping={boardGrouping}
            setBoardGrouping={setBoardGrouping}
            funnelFilter={funnelFilter}
            setFunnelFilter={setFunnelFilter}
          />
        )}

        {activeTab === "analytics" && (
          <Analytics
            applications={applications}
            fetchApplications={fetchApplications}
            onOpenDrawer={handleOpenDrawer}
            setFunnelFilter={setFunnelFilter}
            setActiveTab={handleTabChange}
          />
        )}

        {activeTab === "leetcode" && (
          <Practice
            timerState={timerState}
            setTimerState={setTimerState}
          />
        )}

        {activeTab === "systemdesign" && <SystemDesign />}

        {activeTab === "profile" && <Profile />}
      </main>
    </div>
  );
}

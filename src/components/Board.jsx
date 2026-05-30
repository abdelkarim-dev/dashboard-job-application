import React, { useState, useEffect, useRef } from "react";

function normalizeEvaluationResult(result) {
  if (!result) return null;
  const raw = result.rawEvaluation || result.evaluation || result;
  const score = Number(result.score ?? raw.matchScore ?? 0);
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  return {
    ...result,
    ok: result.ok !== false,
    score: safeScore,
    decision: result.decision || raw.applyOrSkip || "Maybe",
    analysis: result.analysis || result.explanation || raw.finalDecision || "",
    explanation: result.explanation || result.analysis || raw.finalDecision || "",
    rawEvaluation: raw,
    evaluatedAt: result.evaluatedAt || new Date().toISOString(),
  };
}

export default function Board({
  applications,
  fetchApplications,
  onOpenDrawer,
  drawerOpen,
  drawerAppId,
  onCloseDrawer,
  reminders = [],
  addReminder,
  deleteReminder,
  notificationPermission,
  requestNotificationPermission,
  boardGrouping = "company",
  setBoardGrouping,
  funnelFilter = "",
  setFunnelFilter,
}) {
  const [searchText, setSearchText] = useState("");
  const sortOption = "dateApplied-desc";
  const [showRejected, setShowRejected] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const [showRemindersTray, setShowRemindersTray] = useState(false);

  const STATUSES = ["Applied", "Online Assessment", "Recruiter Screen", "Interview", "Offer", "Rejected"];
  const ACTIVE_STATUSES = ["Applied", "Online Assessment", "Recruiter Screen", "Interview", "Offer"];
  const EXTENSION_PATH = "/Users/adnane/Documents/Codex/2026-05-17/files-mentioned-by-the-user-cleanshot/job-hunt-cockpit/extension";

  const [formData, setFormData] = useState({
    id: "",
    company: "",
    role: "",
    status: "Applied",
    dateApplied: "",
    appliedAt: "",
    rejectedAt: "",
    location: "",
    salary: "",
    equity: "",
    oaDeadline: "",
    oaCompletedAt: "",
    priority: "Medium",
    skills: "",
    group: "",
    sourceUrl: "",
    notes: "",
    description: "",
    attachments: [],
  });

  const [evaluation, setEvaluation] = useState(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [drawerFeedback, setDrawerFeedback] = useState("");
  const [extensionSetupOpen, setExtensionSetupOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderWhen, setReminderWhen] = useState("");
  const [snackbar, setSnackbar] = useState(null); // { message, onUndo, key }

  // Setup Form Data when Drawer opens
  useEffect(() => {
    if (drawerOpen && drawerAppId) {
      const app = applications.find((a) => a.id === drawerAppId);
      if (app) {
        setFormData({
          id: app.id || "",
          company: app.company || "",
          role: app.role || "",
          status: app.status || "Applied",
          dateApplied: app.dateApplied || "",
          appliedAt: app.appliedAt ? app.appliedAt.slice(0, 16) : "",
          rejectedAt: app.rejectedAt ? app.rejectedAt.slice(0, 16) : "",
          location: app.location || "",
          salary: app.salary || "",
          equity: app.equity || "",
          oaDeadline: app.oaDeadline ? app.oaDeadline.slice(0, 16) : "",
          oaCompletedAt: app.oaCompletedAt || "",
          priority: app.priority || "Medium",
          skills: app.skills || "",
          group: app.group || "",
          sourceUrl: app.sourceUrl || "",
          notes: app.notes || "",
          description: app.description || "",
          attachments: app.attachments || [],
        });
        setEvaluation(normalizeEvaluationResult(app.evaluation));
      }
    } else {
      setFormData({
        id: "",
        company: "",
        role: "",
        status: "Applied",
        dateApplied: new Date().toISOString().split("T")[0],
        appliedAt: new Date().toISOString().slice(0, 16),
        rejectedAt: "",
        location: "",
        salary: "",
        equity: "",
        oaDeadline: "",
        oaCompletedAt: "",
        priority: "Medium",
        skills: "",
        group: "",
        sourceUrl: "",
        notes: "",
        description: "",
        attachments: [],
      });
      setEvaluation(null);
    }
    setDrawerFeedback("");
  }, [drawerOpen, drawerAppId, applications]);

  // Auto-dismiss Undo Snackbar after 5 seconds
  useEffect(() => {
    if (!snackbar) return;
    const timer = setTimeout(() => {
      setSnackbar(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [snackbar]);

  // Auto-save plumbing: any change marks the drawer dirty; a debounce flushes
  // to the server, and closing/switching cards flushes synchronously so typed
  // data never dies silently.
  const dirtyRef = useRef(false);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  const saveTimerRef = useRef(null);
  const prevAppIdRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    dirtyRef.current = true;
    scheduleAutoSave();
  };

  const handleAttachmentsChange = (updatedAttachments) => {
    setFormData((prev) => ({ ...prev, attachments: updatedAttachments }));
    dirtyRef.current = true;
    scheduleAutoSave();
  };

  const scheduleAutoSave = () => {
    if (!formDataRef.current.id) return; // new applications still need explicit Save
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      flushSave({ silent: true });
    }, 800);
  };

  const flushSave = async ({ silent = false, close = false } = {}) => {
    clearTimeout(saveTimerRef.current);
    const data = formDataRef.current;
    if (!data.company || !data.role) {
      if (close) onCloseDrawer();
      return;
    }
    if (!dirtyRef.current && data.id) {
      if (close) onCloseDrawer();
      return;
    }

    if (!silent) setDrawerFeedback("Saving...");
    const formatted = {
      ...data,
      appliedAt: data.appliedAt ? new Date(data.appliedAt).toISOString() : "",
      rejectedAt: data.rejectedAt ? new Date(data.rejectedAt).toISOString() : "",
      oaDeadline: data.oaDeadline ? new Date(data.oaDeadline).toISOString() : "",
    };

    try {
      const url = data.id ? `/api/applications/${encodeURIComponent(data.id)}` : "/api/applications";
      const method = data.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formatted),
      });
      if (res.ok) {
        const saved = await res.json().catch(() => null);
        dirtyRef.current = false;
        if (!silent) setDrawerFeedback("Saved ✨");
        await fetchApplications();
        syncOaReminders(saved || formatted);
        if (close) onCloseDrawer();
      } else if (!silent) {
        setDrawerFeedback("Failed to save application.");
      }
    } catch (err) {
      console.error(err);
      if (!silent) setDrawerFeedback("Error saving application.");
    }
  };

  // After save, if there's an OA deadline at least 90 minutes out and we don't
  // already have a reminder pointing at the same deadline, schedule one for
  // 24h before. User can delete it like any other reminder.
  const ensureOaReminder = (app) => {
    if (!addReminder || !app?.id || !app.oaDeadline) return;
    // Never (re)create an OA reminder once the assessment is submitted or the
    // card has moved past the OA stage — that is the "pending but already done"
    // nag the dashboard used to show.
    if (app.status && app.status !== "Online Assessment") return;
    if (isOaSubmitted(app)) return;
    const deadlineMs = Date.parse(app.oaDeadline);
    if (!Number.isFinite(deadlineMs)) return;
    const reminderMs = deadlineMs - 24 * 60 * 60 * 1000;
    if (reminderMs <= Date.now() + 90 * 60 * 1000) return;
    const tag = `OA ${new Date(app.oaDeadline).toISOString()}`;
    const exists = (reminders || []).some(
      (r) => r.applicationId === app.id && (r.message || "").startsWith(tag)
    );
    if (exists) return;
    addReminder({
      applicationId: app.id,
      message: `${tag} — Online assessment due tomorrow`,
      fireAt: new Date(reminderMs).toISOString(),
    });
  };

  // Remove any auto-scheduled OA reminders for an application (used-added
  // reminders are left untouched — they don't match isOaReminder).
  const clearOaRemindersFor = (appId) => {
    if (!appId || !deleteReminder) return;
    (reminders || [])
      .filter((r) => r.applicationId === appId && isOaReminder(r))
      .forEach((r) => deleteReminder(r.id));
  };

  // Single source of truth for OA reminders: keep one only while the OA is
  // genuinely pending; otherwise clear it. Call after any save/status change.
  const syncOaReminders = (app) => {
    if (!app?.id) return;
    if (isOaPending(app)) {
      ensureOaReminder(app);
    } else {
      clearOaRemindersFor(app.id);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    flushSave({ close: true });
  };

  const handleCloseWithSave = () => {
    flushSave({ silent: true, close: true });
  };

  // When a different application is opened (or the drawer closes), flush any
  // pending edits for the *previous* application before resetting state. This
  // covers the case where the user clicks card B without first closing card A.
  useEffect(() => {
    const previousId = prevAppIdRef.current;
    if (dirtyRef.current && previousId) {
      const data = formDataRef.current;
      if (data.company && data.role) {
        const formatted = {
          ...data,
          id: previousId,
          appliedAt: data.appliedAt ? new Date(data.appliedAt).toISOString() : "",
          rejectedAt: data.rejectedAt ? new Date(data.rejectedAt).toISOString() : "",
          oaDeadline: data.oaDeadline ? new Date(data.oaDeadline).toISOString() : "",
        };
        fetch(`/api/applications/${encodeURIComponent(previousId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formatted),
        })
          .then((res) => { if (res.ok) { fetchApplications(); syncOaReminders(formatted); } })
          .catch((err) => console.error("Auto-save on switch failed:", err));
      }
    }
    prevAppIdRef.current = drawerOpen ? drawerAppId : null;
    dirtyRef.current = false;
    clearTimeout(saveTimerRef.current);
  }, [drawerAppId, drawerOpen]);

  // ESC closes (and saves) the drawer.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const handler = (e) => {
      if (e.key === "Escape") handleCloseWithSave();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  // Board-level keyboard shortcuts. Skipped while typing in inputs/textareas
  // (so "/" in a search field is still literal), and while the drawer is open.
  useEffect(() => {
    if (drawerOpen) return undefined;
    const handler = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target;
      const tag = (target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("searchInput")?.focus();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        onOpenDrawer(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerOpen, onOpenDrawer]);

  const handleDelete = async () => {
    if (!formData.id) return;
    if (!window.confirm(`Delete ${formData.company} application?`)) return;

    // Reset dirty flag and clear auto-save timers BEFORE making the DELETE call.
    // Otherwise, the drawer-close auto-save hook will intercept the close event
    // and recreate the deleted application in SQLite!
    dirtyRef.current = false;
    clearTimeout(saveTimerRef.current);

    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(formData.id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchApplications();
        onCloseDrawer();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEvaluate = async () => {
    if (!formData.id) return;
    setEvalLoading(true);
    setEvaluation(null);

    const app = applications.find((a) => a.id === formData.id);
    if (!app) return;

    try {
      const res = await fetch("/api/evaluate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app),
      });
      const result = await res.json();
      if (result && result.ok && result.evaluation) {
        const storedEvaluation = normalizeEvaluationResult(result);
        setEvaluation(storedEvaluation);
        await fetch(`/api/applications/${encodeURIComponent(app.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...app, evaluation: storedEvaluation }),
        });
        await fetchApplications();
      } else {
        setEvaluation({ ok: false, error: result?.error || "Gemma evaluation failed." });
      }
    } catch (error) {
      setEvaluation({ ok: false, error: "Network error calling Gemma evaluator." });
    } finally {
      setEvalLoading(false);
    }
  };

  // Date & Badge Helpers
  const parseDateValue = (value) => {
    if (!value) return null;
    const raw = String(value);
    const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = dateOnlyMatch
      ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
      : new Date(raw);
    return Number.isFinite(date.getTime()) ? date : null;
  };

  const parseDateTime = (value) => {
    const d = parseDateValue(value);
    return d ? d.getTime() : 0;
  };

  const getLocalDayBounds = (date = new Date()) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  };

  const isInLocalDay = (value, bounds) => {
    const date = parseDateValue(value);
    if (!date) return false;
    return date >= bounds.start && date < bounds.end;
  };

  const datePart = (str) => {
    if (!str) return "";
    if (str.includes("T")) return str.split("T")[0];
    return str.trim();
  };

  const getAppliedTimestamp = (app) => app.appliedAt || app.stageDateTimes?.Applied || app.dateApplied || "";
  const getRejectedTimestamp = (app) => app.rejectedAt || app.stageDateTimes?.Rejected || "";

  const getCurrentStageTimestamp = (app) => {
    const status = app.status || "Applied";
    return app.stageDateTimes?.[status]
      || (status === "Applied" ? getAppliedTimestamp(app) : "")
      || (status === "Rejected" ? getRejectedTimestamp(app) : "")
      || "";
  };

  const getCurrentStageDate = (app) => {
    const status = app.status || "Applied";
    const timestamp = getCurrentStageTimestamp(app);
    return datePart(timestamp) || app.stageDates?.[status] || (status === "Applied" ? app.dateApplied : "") || "";
  };

  const formatDateTimeShort = (value) => {
    const date = parseDateValue(value);
    if (!date) return "";
    const hasTime = !/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
    });
  };

  const formatDateTimeLong = (value) => {
    const date = parseDateValue(value);
    if (!date) return "";
    return date.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return "";
    try {
      const [year, month, day] = String(dateString).split("-").map(Number);
      const date = year && month && day ? new Date(year, month - 1, day) : new Date(dateString);
      if (Number.isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  const getStageDateBadge = (app) => {
    const status = app.status || "Applied";
    const stageTimestamp = getCurrentStageTimestamp(app);
    if (stageTimestamp) {
      return {
        label: `${status} ${formatDateTimeShort(stageTimestamp)}`,
        title: `Moved to ${status} on ${formatDateTimeLong(stageTimestamp)}`,
      };
    }

    const stageDate = getCurrentStageDate(app);
    if (stageDate) {
      return {
        label: `${status} ${formatShortDate(stageDate)}`,
        title: `Moved to ${status} on ${stageDate}`,
      };
    }

    const fallbackDate = app.updatedAt || app.createdAt || "";
    return fallbackDate
      ? { label: `Updated ${formatDateTimeShort(fallbackDate)}`, title: `Last updated ${formatDateTimeLong(fallbackDate)}` }
      : null;
  };

  const getLocalDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // How many days ago this application's current stage was reached. Returns
  // null if there is no usable timestamp on the application.
  const STALE_THRESHOLD_DAYS = 10;
  const NON_STALE_STATUSES = new Set(["Rejected", "Offer"]);
  const getDaysSinceStage = (app) => {
    const stamp = getCurrentStageTimestamp(app) || getAppliedTimestamp(app) || app.updatedAt || app.createdAt;
    if (!stamp) return null;
    const date = parseDateValue(stamp);
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const since = new Date(date);
    since.setHours(0, 0, 0, 0);
    return Math.floor((today - since) / 86400000);
  };
  const isStale = (app) => {
    if (NON_STALE_STATUSES.has(app.status)) return false;
    const days = getDaysSinceStage(app);
    return days !== null && days >= STALE_THRESHOLD_DAYS;
  };

  // Next status in the Applied → ... → Offer pipeline. Returns null at the end.
  const getNextStatus = (current) => {
    const idx = ACTIVE_STATUSES.indexOf(current);
    if (idx < 0 || idx >= ACTIVE_STATUSES.length - 1) return null;
    return ACTIVE_STATUSES[idx + 1];
  };

  // OA submitted = the candidate finished the assessment, regardless of whether
  // the card has advanced past the OA stage yet.
  const isOaSubmitted = (app) => Boolean(app?.oaCompletedAt);

  const isOaDeadlinePassed = (app) => {
    if (!app || app.status !== "Online Assessment" || !app.oaDeadline) return false;
    if (isOaSubmitted(app)) return false;
    const deadline = parseDateValue(app.oaDeadline);
    return Boolean(deadline && deadline.getTime() <= Date.now());
  };

  // An OA still needs the candidate's attention only while the card is in the
  // OA stage and the assessment has not been submitted.
  const isOaPending = (app) =>
    Boolean(app && app.status === "Online Assessment" && app.oaDeadline && !isOaSubmitted(app));

  const isOaReminder = (reminder) => {
    const message = String(reminder?.message || "").toLowerCase();
    return message.startsWith("oa ") || message.includes("online assessment");
  };

  const getDaysUntil = (timestamp) => {
    const date = parseDateValue(timestamp);
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(date);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / 86400000);
  };

  const getTimelineEvents = () => {
    const app = applications.find((a) => a.id === formData.id);
    if (!app || !app.stageDateTimes) return [];
    
    return Object.entries(app.stageDateTimes)
      .map(([stage, timestamp]) => {
        const ms = Date.parse(timestamp);
        return { stage, timestamp, ms };
      })
      .filter((e) => !isNaN(e.ms))
      .sort((a, b) => a.ms - b.ms);
  };

  const formatDeadline = (timestamp) => {
    const days = getDaysUntil(timestamp);
    if (days === null) return "";
    if (days < 0) return `deadline passed ${Math.abs(days)}d ago`;
    if (days === 0) return "due today";
    if (days === 1) return "due tomorrow";
    return `due in ${days}d`;
  };

  const getCompanyColor = (name) => {
    if (!name) return "#73777F";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 42%)`;
  };

  const groupBy = boardGrouping;

  // Drag and Drop States
  const [draggedAppId, setDraggedAppId] = useState(null);
  const [draggedAppIds, setDraggedAppIds] = useState([]);
  const [draggedType, setDraggedType] = useState(null); // "application" or "group"

  const getGroupKey = (status, groupName) => `${status}::${groupName}`;

  const toggleGroupExpanded = (status, groupName) => {
    const key = getGroupKey(status, groupName);
    setExpandedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDragStart = (e, appId) => {
    setDraggedAppId(appId);
    setDraggedAppIds([appId]);
    setDraggedType("application");
    e.dataTransfer.setData("text/plain", appId);
  };

  const handleDrop = async (e, columnStatus) => {
    e.preventDefault();
    const rawIds = e.dataTransfer.getData("text/plain");
    if (!rawIds) return;
    const ids = rawIds.split(",").filter(Boolean);
    if (ids.length) {
      await updateStatuses(ids, columnStatus);
    }
    setDraggedAppId(null);
    setDraggedAppIds([]);
    setDraggedType(null);
  };

  const updateStatuses = async (ids, newStatus) => {
    const appsToMove = ids
      .map((id) => applications.find((app) => app.id === id))
      .filter((app) => app && app.status !== newStatus);
    if (appsToMove.length === 0) return false;

    // Capture the original statuses before moving to enable precise individual undo
    const previousStatuses = appsToMove.map(app => ({ id: app.id, status: app.status }));

    try {
      await Promise.all(
        appsToMove.map(async (app) => {
          const res = await fetch(`/api/applications/${encodeURIComponent(app.id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...app, status: newStatus }),
          });
          if (!res.ok) throw new Error("Status update failed");
        })
      );
      await fetchApplications();

      // Leaving the OA stage means the assessment is no longer pending — drop
      // any auto-scheduled OA reminder so it can't fire "due tomorrow" later.
      if (newStatus !== "Online Assessment") {
        appsToMove
          .filter((app) => app.status === "Online Assessment")
          .forEach((app) => clearOaRemindersFor(app.id));
      }

      // Formulate and trigger Undo Snackbar
      const firstApp = appsToMove[0];
      const message = appsToMove.length === 1 
        ? `Moved ${firstApp.company} to ${newStatus}`
        : `Moved ${appsToMove.length} applications to ${newStatus}`;
      
      setSnackbar({
        key: `sb-${Date.now()}`,
        message,
        onUndo: async () => {
          try {
            await Promise.all(
              previousStatuses.map(async (item) => {
                const originalApp = applications.find(a => a.id === item.id);
                if (originalApp) {
                  await fetch(`/api/applications/${encodeURIComponent(item.id)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...originalApp, status: item.status }),
                  });
                }
              })
            );
            await fetchApplications();
          } catch (err) {
            console.error("Failed to undo move:", err);
          }
        }
      });
      return true;
    } catch (err) {
      console.error("Failed to move cards:", err);
      return false;
    }
  };

  // Mark the assessment submitted (or un-submit) WITHOUT advancing the pipeline
  // stage. The card stays in "Online Assessment" — appropriate while awaiting
  // results — but the deadline nag, urgent counter, and reminders all clear.
  const markOaSubmitted = async (app, submitted = true) => {
    if (!app?.id) return;
    const current = applications.find((a) => a.id === app.id) || app;
    const oaCompletedAt = submitted ? new Date().toISOString() : "";
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(app.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, oaCompletedAt }),
      });
      if (!res.ok) return;
      await fetchApplications();
      if (submitted) {
        clearOaRemindersFor(app.id);
      } else {
        ensureOaReminder({ ...current, oaCompletedAt: "" });
      }
    } catch (err) {
      console.error("Failed to update OA completion:", err);
    }
  };

  // Omni-search parser: tokens like `company:foo "two words"`, prefix-keyed
  // (company/title/role/status/group/skill/location/notes/url), bare tokens
  // match any of those fields.
  const SEARCH_FIELDS = {
    company: (app) => app.company,
    co: (app) => app.company,
    title: (app) => app.role,
    role: (app) => app.role,
    status: (app) => app.status,
    group: (app) => app.group,
    category: (app) => app.group,
    skill: (app) => app.skills,
    skills: (app) => app.skills,
    location: (app) => app.location,
    loc: (app) => app.location,
    notes: (app) => app.notes,
    url: (app) => app.sourceUrl,
    salary: (app) => app.salary,
  };

  const parseSearchTokens = (raw) => {
    const matches = String(raw || "").matchAll(/(-)?(?:([a-zA-Z]+):)?(?:"([^"]*)"|(\S+))/g);
    const tokens = [];
    for (const m of matches) {
      const negate = Boolean(m[1]);
      const key = (m[2] || "").toLowerCase();
      const value = (m[3] ?? m[4] ?? "").toLowerCase();
      if (!value) continue;
      tokens.push({ negate, key, value });
    }
    return tokens;
  };

  const matchesSearchTokens = (app, tokens) => {
    if (!tokens.length) return true;
    return tokens.every(({ negate, key, value }) => {
      let found;
      if (key && SEARCH_FIELDS[key]) {
        found = String(SEARCH_FIELDS[key](app) || "").toLowerCase().includes(value);
      } else {
        found = Object.values(SEARCH_FIELDS).some((getter) =>
          String(getter(app) || "").toLowerCase().includes(value)
        );
      }
      return negate ? !found : found;
    });
  };

  const searchTokens = parseSearchTokens(searchText);

  // Card Rendering and Filtering
  const getFilteredApps = (status) => {
    return applications
      .filter((app) => app.status === status)
      .filter((app) => !funnelFilter || app.status === funnelFilter)
      .filter((app) => matchesSearchTokens(app, searchTokens))
      .sort((a, b) => {
        const compA = a.company || "";
        const compB = b.company || "";
        if (sortOption === "company-asc") return compA.localeCompare(compB);
        if (sortOption === "company-desc") return compB.localeCompare(compA);
        
        const timeA = parseDateTime(getCurrentStageTimestamp(a) || getAppliedTimestamp(a));
        const timeB = parseDateTime(getCurrentStageTimestamp(b) || getAppliedTimestamp(b));
        
        if (sortOption === "dateApplied-desc") return timeB - timeA;
        if (sortOption === "dateApplied-asc") return timeA - timeB;
        
        return 0;
      });
  };

  const getColumnBadgeText = (statusApps) => {
    if (statusApps.length === 0) return "0";
    if (groupBy === "company") {
      const keys = new Set(statusApps.map((a) => (a.company || "Unknown Company").trim()));
      return `${keys.size} co · ${statusApps.length} apps`;
    }
    return `${statusApps.length}`;
  };

  // Card Renderer Components
  const renderStandardCard = (app) => {
    const dateBadge = getStageDateBadge(app);
    const stale = isStale(app);
    const daysStale = stale ? getDaysSinceStage(app) : null;
    const nextStatus = getNextStatus(app.status);
    const oaPassed = isOaDeadlinePassed(app);
    const skills = (Array.isArray(app.skills) ? app.skills : String(app.skills || "").split(","))
      .map((skill) => skill.trim())
      .filter(Boolean)
      .slice(0, 3);
    const hasAlert = stale || oaPassed;
    return (
      <article
        className={`board-card board-card-standard ${stale ? "is-stale" : ""}`}
        key={app.id}
        draggable
        onDragStart={(e) => handleDragStart(e, app.id)}
        onClick={() => onOpenDrawer(app.id)}
      >
        <div className="board-card-header">
          <div
            className="board-card-avatar"
            style={{ backgroundColor: getCompanyColor(app.company) }}
          >
            {(app.company || "?").charAt(0).toUpperCase()}
          </div>
          <div className="board-card-title">
            <strong title={app.company}>{app.company}</strong>
            <span title={app.role}>{app.role}</span>
          </div>
          {nextStatus && (
            <button
              type="button"
              className="board-card-advance"
              title={`Move to ${nextStatus}`}
              onClick={(e) => {
                e.stopPropagation();
                updateStatuses([app.id], nextStatus);
              }}
            >
              →
            </button>
          )}
          {app.sourceUrl && (
            <a
              className="board-card-link"
              href={app.sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              ↗
            </a>
          )}
        </div>

        <div className={`board-card-alerts ${hasAlert ? "" : "is-empty"}`} aria-hidden={!hasAlert}>
          {stale && (
            <div className="board-card-stale" title={`No movement for ${daysStale} days — consider a follow-up`}>
              💤 {daysStale}d stale · follow up
            </div>
          )}

          {oaPassed && (
            <button
              type="button"
              className="oa-passed-action"
              title="Record the assessment as submitted (keeps this card in OA) and clear reminders"
              onClick={(e) => {
                e.stopPropagation();
                markOaSubmitted(app);
              }}
            >
              ✓ Mark OA submitted
            </button>
          )}
        </div>

        <div className={`board-card-skills ${skills.length ? "" : "is-empty"}`} aria-hidden={!skills.length}>
          {skills.map((skill, i) => (
            <span className="board-skill-tag" key={`${skill}-${i}`}>{skill}</span>
          ))}
        </div>

        <div className="board-card-meta">
          {app.priority === "High" && (
            <span className="board-card-meta-item priority-high" title="High priority">🔴 High</span>
          )}
          {app.location && (
            <span className="board-card-meta-item">📍 {app.location}</span>
          )}
          {app.salary && (
            <span className="board-card-meta-item">💰 {app.salary}</span>
          )}
          {dateBadge && (
            <span className="board-card-meta-item" title={dateBadge.title}>
              📅 {dateBadge.label}
            </span>
          )}
          {isOaPending(app) && (
            <span className="board-card-meta-item deadline" title={formatDateTimeLong(app.oaDeadline)}>
              ⏱ OA {formatDeadline(app.oaDeadline)}
            </span>
          )}
          {app.status === "Online Assessment" && isOaSubmitted(app) && (
            <span className="board-card-meta-item oa-submitted" title={`Assessment submitted ${formatDateTimeLong(app.oaCompletedAt)}`}>
              ✓ OA submitted
            </span>
          )}
        </div>
      </article>
    );
  };

  const renderCompanyGroupCard = (companyName, companyApps, status) => {
    const groupKey = getGroupKey(status, companyName);
    const isExpanded = expandedGroups.has(groupKey);
    const newestApp = [...companyApps].sort((a, b) => parseDateTime(getCurrentStageTimestamp(b) || getAppliedTimestamp(b)) - parseDateTime(getCurrentStageTimestamp(a) || getAppliedTimestamp(a)))[0] || companyApps[0];
    const latestBadge = newestApp ? getStageDateBadge(newestApp) : null;
    const staleCount = companyApps.filter(isStale).length;
    return (
      <div
        className={`board-card board-card-company-group ${isExpanded ? "expanded" : "collapsed"}`}
        key={companyName}
        draggable
        onDragStart={(e) => {
          if (e.target.closest(".company-group-role-row, a, button")) return;
          const ids = companyApps.map((a) => a.id);
          setDraggedAppId(null);
          setDraggedAppIds(ids);
          setDraggedType("group");
          e.dataTransfer.setData("text/plain", ids.join(","));
        }}
        onClick={() => toggleGroupExpanded(status, companyName)}
        aria-expanded={isExpanded}
      >
        <div className="board-card-header">
          <div
            className="board-card-avatar"
            style={{ backgroundColor: getCompanyColor(companyName) }}
          >
            {(companyName || "?").charAt(0).toUpperCase()}
          </div>
          <div className="board-card-title">
            <strong>
              {companyName}
              {staleCount > 0 && (
                <span
                  className="status-attention-icon"
                  title={`${staleCount} ${staleCount === 1 ? "role has" : "roles have"} been stalled for ${STALE_THRESHOLD_DAYS}+ days`}
                  aria-label="Stale"
                >
                  💤
                </span>
              )}
            </strong>
            <span className="company-group-badge">
              {companyApps.length} {companyApps.length === 1 ? "role" : "roles"}
            </span>
          </div>
          <button
            className="group-expand-btn"
            type="button"
            aria-label={isExpanded ? `Collapse ${companyName}` : `Expand ${companyName}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleGroupExpanded(status, companyName);
            }}
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        </div>

        {!isExpanded && newestApp && (
          <div className="company-group-preview">
            <span className="company-group-preview-role">{newestApp.role || "Latest role"}</span>
            {latestBadge && <span title={latestBadge.title}>{latestBadge.label}</span>}
          </div>
        )}

        {isExpanded && (
          <div className="company-group-roles">
            {companyApps.map((app) => {
              const dateBadge = getStageDateBadge(app);
              const rowStale = isStale(app);
              const rowDaysStale = rowStale ? getDaysSinceStage(app) : null;
              const rowNext = getNextStatus(app.status);
              const rowOaPassed = isOaDeadlinePassed(app);
              return (
                <div
                  className={`company-group-role-row ${rowStale ? "is-stale" : ""}`}
                  key={app.id}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDraggedAppId(app.id);
                    setDraggedAppIds([app.id]);
                    setDraggedType("application");
                    e.dataTransfer.setData("text/plain", app.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDrawer(app.id);
                  }}
                >
                  <div className="company-group-role-header">
                    <span className="company-group-role-title">
                      {app.role}
                      {rowStale && (
                        <span
                          className="row-stale-pill"
                          title={`No movement for ${rowDaysStale} days`}
                        >
                          💤 {rowDaysStale}d
                        </span>
                      )}
                    </span>
                    {rowNext && (
                      <button
                        type="button"
                        className="board-card-advance"
                        title={`Move to ${rowNext}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatuses([app.id], rowNext);
                        }}
                      >
                        →
                      </button>
                    )}
                    {app.sourceUrl && (
                      <a
                        className="board-card-link"
                        href={app.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: "20px", height: "20px", fontSize: "10px" }}
                      >
                        ↗
                      </a>
                    )}
                  </div>

                  {rowOaPassed && (
                    <button
                      type="button"
                      className="oa-passed-action compact"
                      title="Record the assessment as submitted (keeps this card in OA) and clear reminders"
                      onClick={(e) => {
                        e.stopPropagation();
                        markOaSubmitted(app);
                      }}
                    >
                      ✓ Mark OA submitted
                    </button>
                  )}

                  <div className="company-group-role-meta">
                    {app.priority === "High" && (
                      <span className="board-card-meta-item priority-high" title="High priority">🔴 High</span>
                    )}
                    {app.location && (
                      <span className="board-card-meta-item">📍 {app.location}</span>
                    )}
                    {app.salary && (
                      <span className="board-card-meta-item">💰 {app.salary}</span>
                    )}
                  {dateBadge && (
                    <span className="board-card-meta-item" title={dateBadge.title}>
                      📅 {dateBadge.label}
                    </span>
                  )}
                  {isOaPending(app) && (
                    <span className="board-card-meta-item deadline" title={formatDateTimeLong(app.oaDeadline)}>
                      ⏱ OA {formatDeadline(app.oaDeadline)}
                    </span>
                  )}
                  {app.status === "Online Assessment" && isOaSubmitted(app) && (
                    <span className="board-card-meta-item oa-submitted" title={`Assessment submitted ${formatDateTimeLong(app.oaCompletedAt)}`}>
                      ✓ OA submitted
                    </span>
                  )}
                </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderStandardGroupHeaderAndCards = (title, apps) => {
    return (
      <div key={title} style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
        <div className="board-group-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", background: "var(--md-surface-2)", borderRadius: "8px" }}>
          <span className="board-group-title" style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--md-on-surface-variant)" }}>
            {title}
          </span>
          <span className="board-group-count" style={{ fontSize: "10px", fontWeight: "700", background: "var(--md-primary-container)", color: "var(--md-on-primary-container)", padding: "1px 6px", borderRadius: "999px" }}>
            {apps.length}
          </span>
        </div>
        {apps.map((app) => renderStandardCard(app))}
      </div>
    );
  };

  const renderColumnContent = (statusApps, status) => {
    if (statusApps.length === 0) {
      return <p className="board-empty">No roles yet</p>;
    }

    if (groupBy === "none") {
      return statusApps.map((app) => renderStandardCard(app));
    }

    if (groupBy === "company") {
      const companyGroups = {};
      statusApps.forEach((app) => {
        const co = (app.company || "Unknown Company").trim();
        if (!companyGroups[co]) companyGroups[co] = [];
        companyGroups[co].push(app);
      });

      const companyNames = Object.keys(companyGroups);
      companyNames.sort((a, b) => {
        if (sortOption === "company-asc") return a.localeCompare(b);
        if (sortOption === "company-desc") return b.localeCompare(a);
        
        const newestFirst = sortOption !== "dateApplied-asc";
        const timeA = Math.max(...companyGroups[a].map((app) => parseDateTime(getCurrentStageTimestamp(app) || getAppliedTimestamp(app))));
        const timeB = Math.max(...companyGroups[b].map((app) => parseDateTime(getCurrentStageTimestamp(app) || getAppliedTimestamp(app))));
        
        return newestFirst ? timeB - timeA : timeA - timeB;
      });

      return companyNames.map((companyName) => 
        renderCompanyGroupCard(companyName, companyGroups[companyName], status)
      );
    }

    if (groupBy === "priority") {
      const priorityGroups = { High: [], Medium: [], Low: [], Other: [] };
      statusApps.forEach((app) => {
        const prio = app.priority || "Medium";
        const grp = priorityGroups[prio] ? prio : "Other";
        priorityGroups[grp].push(app);
      });

      return Object.entries(priorityGroups)
        .filter(([_, apps]) => apps.length > 0)
        .map(([priority, apps]) => renderStandardGroupHeaderAndCards(priority, apps));
    }

    if (groupBy === "group") {
      const categoryGroups = {};
      statusApps.forEach((app) => {
        const cat = (app.group || "No Category").trim();
        if (!categoryGroups[cat]) categoryGroups[cat] = [];
        categoryGroups[cat].push(app);
      });

      const categoryNames = Object.keys(categoryGroups).sort();
      return categoryNames.map((category) => 
        renderStandardGroupHeaderAndCards(category, categoryGroups[category])
      );
    }

    return null;
  };

  // Surface a "Saved" lane (jobs captured but not yet applied to) only when such
  // jobs exist, so the board stays uncluttered for users who don't use it.
  const hasSavedLane = applications.some((app) => app.status === "Saved");
  const visibleStatuses = [
    ...(hasSavedLane ? ["Saved"] : []),
    ...(showRejected ? STATUSES : ACTIVE_STATUSES),
  ];
  const rejectedApps = getFilteredApps("Rejected");
  const rejectedCompanyCount = new Set(rejectedApps.map((app) => (app.company || "Unknown Company").trim())).size;
  const todayBounds = getLocalDayBounds();
  const appliedToday = applications.filter((app) => isInLocalDay(getAppliedTimestamp(app), todayBounds));
  const firstApplicationByCompany = applications.reduce((groups, app) => {
    const company = (app.company || "Unknown Company").trim();
    const appliedAt = parseDateValue(getAppliedTimestamp(app));
    if (!appliedAt) return groups;
    const existing = groups.get(company);
    if (!existing || appliedAt < existing) groups.set(company, appliedAt);
    return groups;
  }, new Map());
  const newCompaniesToday = [...firstApplicationByCompany.values()]
    .filter((appliedAt) => appliedAt >= todayBounds.start && appliedAt < todayBounds.end)
    .length;
  const dailyCompanyTarget = 10;
  const urgentOas = applications
    .filter((app) => isOaPending(app))
    .map((app) => ({ ...app, daysUntil: getDaysUntil(app.oaDeadline) }))
    .filter((app) => app.daysUntil !== null && app.daysUntil <= 3)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  const passedDeadlineOas = urgentOas.filter(isOaDeadlinePassed);
  const primaryOaAction = passedDeadlineOas[0] || null;
  const oaDeadlineSummary = passedDeadlineOas.length
    ? `${passedDeadlineOas.length} ${passedDeadlineOas.length === 1 ? "deadline" : "deadlines"} passed`
    : urgentOas.length
      ? `${urgentOas.length} urgent`
      : "Clear";

  // Active applications with no movement for a while — the follow-up queue.
  const staleActiveCount = applications.filter((app) => isStale(app)).length;
  const followUpSummary = staleActiveCount
    ? `${staleActiveCount} stale`
    : "Clear";

  const upcomingReminders = (reminders || [])
    .map((r) => ({ ...r, app: applications.find((a) => a.id === r.applicationId) }))
    // An OA reminder whose assessment is submitted or whose card has left the OA
    // stage is stale — never surface it even if it slipped through clearing.
    .filter((r) => !(isOaReminder(r) && r.app && !isOaPending(r.app)))
    .filter((r) => !r.fired || (isOaReminder(r) && r.app && isOaDeadlinePassed(r.app)))
    .sort((a, b) => Date.parse(a.fireAt) - Date.parse(b.fireAt));

  return (
    <div className="tab-content-container active" id="boardView">
      {/* Filter Toolbar */}
      <div className="filter-bar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            id="searchInput"
            className="search-input"
            type="search"
            placeholder='Omni search: company:google title:"staff eng" status:offer -group:remote'
            title="Use prefixes: company:, title:, status:, group:, skill:, location:, notes:, url:, salary:. Prefix with - to exclude. Wrap multi-word values in quotes."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>


        <label className="board-groupby" title="Group the board columns by">
          <span className="board-groupby-label">Group</span>
          <select
            className="board-groupby-select"
            value={boardGrouping}
            onChange={(e) => setBoardGrouping?.(e.target.value)}
          >
            <option value="company">By company</option>
            <option value="priority">By priority</option>
            <option value="group">By tag</option>
            <option value="none">Flat list</option>
          </select>
        </label>

        <button className="btn-ghost filter-bar-ext" onClick={() => setExtensionSetupOpen(true)}>
          Extension setup
        </button>

        <div className="board-toolbar-actions">
          <a className="btn-ghost link-button" href="/api/export.csv">Export CSV</a>
          <button className="btn-primary" onClick={() => onOpenDrawer(null)}>+ New</button>
        </div>
      </div>

      {/* Active Funnel Stage Filter Alert Banner */}
      {funnelFilter && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--md-primary-container)",
          color: "var(--md-on-primary-container)",
          padding: "8px 16px",
          borderRadius: "12px",
          fontSize: "13px",
          fontWeight: "bold",
          boxShadow: "var(--shadow-1)",
          animation: "slideDrawerDown 0.2s ease-out"
        }}>
          <span>🔍 Stage Filter Active: Showing <strong>{funnelFilter}</strong> roles only</span>
          <button
            type="button"
            onClick={() => setFunnelFilter("")}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "var(--md-on-primary-container)",
              padding: "4px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "bold"
            }}
          >
            Clear Filter ✕
          </button>
        </div>
      )}

      {/* Unified Tactical Operations Bar */}
      <div className="tactical-ops-bar" aria-label="Daily operations metrics and alerts">
        <div style={{ display: "flex", gap: "24px" }}>
          <div className="tactical-ops-stat">
            <article className={newCompaniesToday >= dailyCompanyTarget ? "on-track" : ""}>
              <span>Today target</span>
              <strong>{newCompaniesToday}/{dailyCompanyTarget} new companies</strong>
            </article>
          </div>

          <div className="tactical-ops-stat">
            <article className={urgentOas.length ? "warning" : ""}>
              <span>OA Deadlines</span>
              <strong>{oaDeadlineSummary}</strong>
            </article>
          </div>

          <div className="tactical-ops-stat">
            <article className={staleActiveCount ? "warning" : ""}>
              <span>Needs follow-up</span>
              <strong>{followUpSummary}</strong>
            </article>
          </div>
        </div>

        <div>
          <button
            type="button"
            className={`reminders-trigger-btn ${upcomingReminders.length > 0 ? "active-reminders" : ""}`}
            onClick={() => setShowRemindersTray(!showRemindersTray)}
          >
            🔔 Alerts ({upcomingReminders.length})
          </button>
        </div>
      </div>

      {/* Floating Collapsible Reminders Tray */}
      {showRemindersTray && (
        <div className="reminders-floating-tray" style={{ position: "relative", top: 0, right: 0, width: "100%", marginTop: "8px", marginBottom: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <strong>🔔 Upcoming alerts</strong>
            {notificationPermission && notificationPermission !== "granted" && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={requestNotificationPermission}
                style={{ fontSize: "10px", padding: "2px 8px" }}
              >
                Enable Notifications
              </button>
            )}
          </div>
          {upcomingReminders.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--md-on-surface-variant)", padding: "4px" }}>
              No reminders scheduled. Open any application to add one.
            </div>
          ) : (
            <ul className="reminders-strip-list" style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
              {upcomingReminders.map((r) => (
                <li key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "var(--md-surface-2)", borderRadius: "6px", fontSize: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                    <span className="reminders-when" style={{ color: "var(--md-primary)", fontWeight: "bold", whiteSpace: "nowrap" }}>
                      {new Date(r.fireAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="reminders-target" style={{ fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                      {r.app ? `${r.app.company} · ${r.app.role}` : "General"}
                    </span>
                    <span className="reminders-msg" style={{ color: "var(--md-on-surface-variant)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>— {r.message}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {r.fired && <span className="reminders-fired-badge" style={{ background: "rgba(248,113,113,0.15)", color: "var(--md-error)", padding: "2px 6px", borderRadius: "4px", fontSize: "9px" }}>fired</span>}
                    {r.app && isOaDeadlinePassed(r.app) && (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => markOaSubmitted(r.app)}
                        title="Mark the assessment submitted and clear this reminder"
                        style={{ fontSize: "10px", padding: "2px 8px", height: "24px" }}
                      >
                        ✓ Submitted
                      </button>
                    )}
                    <button
                      type="button"
                      className="reminders-dismiss"
                      onClick={() => deleteReminder?.(r.id)}
                      style={{ background: "none", border: "none", color: "var(--md-error)", cursor: "pointer", fontSize: "12px" }}
                      aria-label="Dismiss reminder"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        className={`rejected-shelf ${showRejected ? "expanded" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, "Rejected")}
      >
        <div>
          <span className="rejected-shelf-label">Rejected</span>
          <strong>
            {rejectedCompanyCount} {rejectedCompanyCount === 1 ? "company" : "companies"} · {rejectedApps.length} {rejectedApps.length === 1 ? "application" : "applications"}
          </strong>
        </div>
        <span className="rejected-shelf-hint">Drop cards here to close them</span>
        <button className="btn-ghost" type="button" onClick={() => setShowRejected((value) => !value)}>
          {showRejected ? "Hide rejected" : "Review rejected"}
        </button>
      </div>

      {/* Kanban Board */}
      <div className="board-wrap">
        {visibleStatuses.map((status) => {
          const statusApps = getFilteredApps(status);
          return (
            <div
              className={`board-column ${status.toLowerCase()} ${statusApps.length === 0 ? "is-empty" : ""}`}
              data-status={status}
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="board-column-header">
                <span className="board-column-label">{status}</span>
                <span className="board-column-count">
                  {getColumnBadgeText(statusApps)}
                </span>
              </div>
              <div className="board-cards">
                {renderColumnContent(statusApps, status)}
              </div>
            </div>
          );
        })}
      </div>


      {/* Details Drawer — wide 2-pane modal with autosave */}
      {drawerOpen && (
        <>
          <div className="drawer-backdrop" onClick={handleCloseWithSave}></div>
          <aside className="detail-drawer detail-drawer-wide" style={{ display: "block" }}>
            <div className="drawer-header">
              <div className="drawer-header-meta">
                <p className="eyebrow">{formData.id ? "Edit application" : "New application"}</p>
                <h2 className="drawer-title">{formData.company || "—"}</h2>
              </div>
              <div className="drawer-header-actions">
                {drawerFeedback && (
                  <span className="drawer-feedback inline" style={{ color: "var(--md-primary)" }}>
                    {drawerFeedback}
                  </span>
                )}
                <button className="drawer-save-btn" type="button" onClick={() => flushSave({ close: true })}>
                  Save
                </button>
                {formData.id && (
                  <button className="drawer-delete-btn" type="button" onClick={handleDelete}>Delete</button>
                )}
                <button className="drawer-close-btn" onClick={handleCloseWithSave}>✕</button>
              </div>
            </div>
            <div className="drawer-body two-pane">
              <form className="drawer-form-grid" onSubmit={handleFormSubmit}>
                {/* Left pane: identity + status + dates + comp */}
                <div className="drawer-pane">
                  <div className="drawer-field">
                    <label className="drawer-label" htmlFor="d-company">Company</label>
                    <input
                      id="d-company"
                      name="company"
                      className="drawer-input"
                      value={formData.company}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="drawer-field">
                    <label className="drawer-label" htmlFor="d-role">Role</label>
                    <input
                      id="d-role"
                      name="role"
                      className="drawer-input"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="drawer-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                    <div className="drawer-field">
                      <label className="drawer-label" htmlFor="d-status">Status</label>
                      <select
                        id="d-status"
                        name="status"
                        className="drawer-input"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option>Applied</option>
                        <option>Online Assessment</option>
                        <option>Recruiter Screen</option>
                        <option>Interview</option>
                        <option>Offer</option>
                        <option>Rejected</option>
                      </select>
                    </div>
                    <div className="drawer-field">
                      <label className="drawer-label" htmlFor="d-priority">Priority</label>
                      <select
                        id="d-priority"
                        name="priority"
                        className="drawer-input"
                        value={formData.priority}
                        onChange={handleInputChange}
                      >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="drawer-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="drawer-field">
                      <label className="drawer-label" htmlFor="d-date">Date applied</label>
                      <input
                        id="d-date"
                        name="dateApplied"
                        type="date"
                        className="drawer-input"
                        value={formData.dateApplied}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="drawer-field">
                      <label className="drawer-label" htmlFor="d-appliedAt">Applied timestamp</label>
                      <input
                        id="d-appliedAt"
                        name="appliedAt"
                        type="datetime-local"
                        className="drawer-input"
                        value={formData.appliedAt}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="drawer-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="drawer-field">
                      <label className="drawer-label" htmlFor="d-rejectedAt">Rejection timestamp</label>
                      <input
                        id="d-rejectedAt"
                        name="rejectedAt"
                        type="datetime-local"
                        className="drawer-input"
                        value={formData.rejectedAt}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="drawer-field">
                      <label className="drawer-label" htmlFor="d-oaDeadline">OA deadline</label>
                      <input
                        id="d-oaDeadline"
                        name="oaDeadline"
                        type="datetime-local"
                        className="drawer-input"
                        value={formData.oaDeadline}
                        onChange={handleInputChange}
                      />
                      {(formData.oaDeadline || formData.oaCompletedAt) && (
                        <label className="drawer-oa-submitted" style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", fontSize: "12px", color: "var(--md-on-surface-variant)", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={Boolean(formData.oaCompletedAt)}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                oaCompletedAt: e.target.checked ? new Date().toISOString() : "",
                              }));
                              dirtyRef.current = true;
                              scheduleAutoSave();
                            }}
                          />
                          OA submitted{formData.oaCompletedAt ? ` · ${formatDateTimeShort(formData.oaCompletedAt)}` : " (stops the deadline nag while you await results)"}
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="drawer-field">
                    <label className="drawer-label" htmlFor="d-location">Location</label>
                    <input
                      id="d-location"
                      name="location"
                      className="drawer-input"
                      value={formData.location}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="drawer-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="drawer-field">
                      <label className="drawer-label" htmlFor="d-salary">Salary</label>
                      <input
                        id="d-salary"
                        name="salary"
                        className="drawer-input"
                        value={formData.salary}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="drawer-field">
                      <label className="drawer-label" htmlFor="d-equity">Equity</label>
                      <input
                        id="d-equity"
                        name="equity"
                        className="drawer-input"
                        value={formData.equity}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="drawer-field">
                    <label className="drawer-label" htmlFor="d-skills">Skills</label>
                    <input
                      id="d-skills"
                      name="skills"
                      className="drawer-input"
                      placeholder="Python, TypeScript, Go"
                      value={formData.skills}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="drawer-field">
                    <label className="drawer-label" htmlFor="d-group">Group / Category</label>
                    <input
                      id="d-group"
                      name="group"
                      className="drawer-input"
                      placeholder="e.g., Tier 1, Warm Leads, Remote-Only"
                      value={formData.group}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="drawer-field">
                    <label className="drawer-label" htmlFor="d-url">Source URL</label>
                    <input
                      id="d-url"
                      name="sourceUrl"
                      type="url"
                      className="drawer-input"
                      value={formData.sourceUrl}
                      onChange={handleInputChange}
                    />
                  </div>

                  {formData.sourceUrl && (
                    <a className="drawer-open-link" href={formData.sourceUrl} target="_blank" rel="noreferrer">
                      Open job posting ↗
                    </a>
                  )}

                  {/* Attachments Section */}
                  {formData.id && (
                    <div className="drawer-field attachments-field" style={{ marginTop: "24px" }}>
                      <span className="drawer-label">📂 Attachments & Documents</span>
                      
                      <div className="attachments-list" style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {(formData.attachments || []).length === 0 ? (
                          <p className="empty-placeholder-text" style={{ fontSize: "12px", color: "var(--md-on-surface-variant)", margin: "4px 0" }}>No documents attached yet.</p>
                        ) : (
                          (formData.attachments || []).map((att) => (
                            <div key={att.id} className="attachment-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--md-surface-2)", borderRadius: "6px", border: "1px solid var(--md-outline-variant)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "16px" }}>
                                  {att.type === "Resume" ? "📄" : att.type === "Cover Letter" ? "✉️" : att.type === "Portfolio" ? "🌐" : "🔗"}
                                </span>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <a href={att.url} target="_blank" rel="noreferrer" className="attachment-link" style={{ fontSize: "13px", fontWeight: "bold", color: "var(--md-primary)", textDecoration: "none" }}>
                                    {att.name}
                                  </a>
                                  <span style={{ fontSize: "10px", color: "var(--md-on-surface-variant)" }}>{att.type}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="reminders-dismiss"
                                onClick={() => {
                                  const updatedAttachments = (formData.attachments || []).filter(a => a.id !== att.id);
                                  handleAttachmentsChange(updatedAttachments);
                                }}
                                style={{ background: "none", border: "none", color: "var(--md-error)", cursor: "pointer", fontSize: "14px" }}
                                aria-label="Remove attachment"
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Attachment Panel */}
                      <div className="attachment-add-row" style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px", padding: "12px", background: "var(--md-surface-1)", borderRadius: "6px", border: "1px dashed var(--md-outline-variant)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "8px" }}>
                          <input
                            type="text"
                            className="drawer-input"
                            id="new-att-name"
                            placeholder="Document name (e.g. Senior Resume v2)"
                            style={{ margin: 0, height: "36px", fontSize: "12px" }}
                          />
                          <select className="drawer-input" id="new-att-type" style={{ margin: 0, height: "36px", fontSize: "12px", background: "var(--md-surface-2)" }}>
                            <option>Resume</option>
                            <option>Cover Letter</option>
                            <option>Portfolio</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input
                            type="url"
                            className="drawer-input"
                            id="new-att-url"
                            placeholder="Paste link (Google Drive, Notion, Portfolio)"
                            style={{ flex: 1, margin: 0, height: "36px", fontSize: "12px" }}
                          />
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() => {
                              const nameInput = document.getElementById("new-att-name");
                              const typeInput = document.getElementById("new-att-type");
                              const urlInput = document.getElementById("new-att-url");
                              if (!urlInput.value.trim() || !nameInput.value.trim()) return;

                              const newAttachment = {
                                id: `att-${Date.now()}`,
                                name: nameInput.value.trim(),
                                type: typeInput.value,
                                url: urlInput.value.trim(),
                                addedAt: new Date().toISOString()
                              };

                              const updatedAttachments = [...(formData.attachments || []), newAttachment];
                              handleAttachmentsChange(updatedAttachments);

                              nameInput.value = "";
                              urlInput.value = "";
                            }}
                            style={{ height: "36px", padding: "0 16px", alignSelf: "center" }}
                          >
                            + Attach
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right pane: notes + description + AI eval */}
                <div className="drawer-pane">
                  <div className="drawer-field">
                    <label className="drawer-label" htmlFor="d-notes">Notes</label>
                    <textarea
                      id="d-notes"
                      name="notes"
                      className="drawer-input"
                      rows={6}
                      value={formData.notes}
                      onChange={handleInputChange}
                    />
                  </div>

                  {formData.id && formData.description && (
                    <div className="drawer-field gemma-eval-field" style={{ display: "block" }}>
                      <div className="gemma-eval-header">
                        <span className="drawer-label">✨ Gemma AI Evaluation</span>
                        <button className="btn-ghost btn-sm" type="button" onClick={handleEvaluate} disabled={evalLoading}>
                          {evalLoading ? "Evaluating..." : evaluation ? "Re-evaluate" : "Evaluate Role"}
                        </button>
                      </div>
                      {evalLoading && (
                        <div className="gemma-eval-progress" style={{ display: "block" }}>
                          <div className="progress-bar-ind"></div>
                        </div>
                      )}
                      {evaluation && (
                        <div className="gemma-eval-content" style={{ display: "block" }}>
                          {evaluation.ok ? (
                            <>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <strong style={{ fontSize: "16px", color: "var(--md-primary)" }}>{`Match Score: ${evaluation.score || 0}/100`}</strong>
                                <span className={`status-tag ${evaluation.decision === "Apply" ? "offer" : "rejected"}`}>
                                  {evaluation.decision || "Skip"}
                                </span>
                              </div>
                              <p style={{ fontSize: "12px", whiteSpace: "pre-wrap", color: "var(--md-on-surface)" }}>
                                {evaluation.analysis || evaluation.explanation}
                              </p>
                            </>
                          ) : (
                            <p style={{ color: "var(--status-rejected)", fontSize: "12px" }}>{evaluation.error || "Gemma evaluation failed."}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {formData.id && (
                    <div className="drawer-field reminders-field">
                      <div className="reminders-header">
                        <span className="drawer-label">🔔 Reminders</span>
                        {notificationPermission && notificationPermission !== "granted" && (
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={requestNotificationPermission}
                          >
                            Enable notifications
                          </button>
                        )}
                      </div>
                      <div className="reminders-add-row">
                        <input
                          type="datetime-local"
                          className="drawer-input"
                          value={reminderWhen}
                          onChange={(e) => setReminderWhen(e.target.value)}
                        />
                        <input
                          type="text"
                          className="drawer-input"
                          placeholder="e.g. follow up with recruiter"
                          value={reminderMessage}
                          onChange={(e) => setReminderMessage(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            if (!reminderWhen || !reminderMessage.trim()) return;
                            addReminder?.({
                              applicationId: formData.id,
                              message: reminderMessage.trim(),
                              fireAt: reminderWhen,
                            });
                            setReminderMessage("");
                            setReminderWhen("");
                          }}
                        >
                          + Add
                        </button>
                      </div>
                      <ul className="reminders-list">
                        {(reminders || [])
                          .filter((r) => r.applicationId === formData.id)
                          .sort((a, b) => Date.parse(a.fireAt) - Date.parse(b.fireAt))
                          .map((r) => (
                            <li key={r.id} className={r.fired ? "fired" : ""}>
                              <span className="reminders-when">
                                {new Date(r.fireAt).toLocaleString(undefined, {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                              <span className="reminders-msg">{r.message}</span>
                              {r.fired && <span className="reminders-fired-badge">fired</span>}
                              <button
                                type="button"
                                className="reminders-dismiss"
                                onClick={() => deleteReminder?.(r.id)}
                                aria-label="Delete reminder"
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        {(reminders || []).filter((r) => r.applicationId === formData.id).length === 0 && (
                          <li className="reminders-empty">No reminders yet for this application.</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Activity Timeline Section */}
                  {formData.id && (
                    <div className="drawer-field activity-timeline-field" style={{ marginTop: "24px", marginBottom: "16px" }}>
                      <span className="drawer-label">⏳ Application Journey Timeline</span>
                      <div className="vertical-timeline" style={{ marginTop: "12px", paddingLeft: "16px", borderLeft: "2px solid var(--md-outline-variant)", display: "flex", flexDirection: "column", gap: "16px", position: "relative" }}>
                        {getTimelineEvents().length === 0 ? (
                          <p className="empty-placeholder-text" style={{ fontSize: "12px", color: "var(--md-on-surface-variant)", marginLeft: "-16px" }}>No journey logs recorded.</p>
                        ) : (
                          getTimelineEvents().map((event, idx) => {
                            const isLast = idx === getTimelineEvents().length - 1;
                            const colors = {
                              Applied: "var(--status-applied)",
                              "Online Assessment": "#a855f7",
                              "Recruiter Screen": "#2dd4bf",
                              Interview: "var(--status-interview)",
                              Offer: "var(--status-offer)",
                              Rejected: "var(--status-rejected)"
                            };
                            const dotColor = colors[event.stage] || "var(--md-primary)";
                            return (
                              <div key={event.stage} className="timeline-node" style={{ position: "relative" }}>
                                {/* Dotted Marker */}
                                <div style={{
                                  position: "absolute",
                                  left: "-23px",
                                  top: "4px",
                                  width: "12px",
                                  height: "12px",
                                  borderRadius: "50%",
                                  background: dotColor,
                                  border: "2px solid var(--md-surface)",
                                  boxShadow: `0 0 8px ${dotColor}`
                                }}></div>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <strong style={{ fontSize: "13px", color: "var(--md-on-surface)" }}>{event.stage}</strong>
                                    {isLast && <span style={{ fontSize: "9px", background: "rgba(162, 201, 255, 0.15)", color: "var(--md-primary)", padding: "2px 6px", borderRadius: "10px", fontWeight: "bold" }}>Current Stage</span>}
                                  </div>
                                  <span style={{ fontSize: "11px", color: "var(--md-on-surface-variant)" }}>
                                    {new Date(event.timestamp).toLocaleString(undefined, {
                                      dateStyle: "medium",
                                      timeStyle: "short"
                                    })}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  <div className="drawer-field drawer-field-grow">
                    <label className="drawer-label" htmlFor="d-description">Full description</label>
                    <textarea
                      id="d-description"
                      name="description"
                      className="drawer-input drawer-description"
                      rows={20}
                      placeholder="Captured automatically when saving from the extension."
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Hidden submit so Enter inside the form still saves */}
                <button type="submit" style={{ display: "none" }} aria-hidden="true" tabIndex={-1}>Save</button>
              </form>
            </div>
          </aside>
        </>
      )}

      {/* Extension Setup Dialog */}
      {extensionSetupOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setExtensionSetupOpen(false)}></div>
          <dialog className="setup-dialog" style={{ display: "block" }}>
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Chrome extension</p>
                <h3>Capture jobs from any posting</h3>
              </div>
              <button className="icon-button" onClick={() => setExtensionSetupOpen(false)}>✕</button>
            </div>
            <ol className="setup-steps">
              <li>Open Chrome and go to <code>chrome://extensions</code>.</li>
              <li>Enable Developer mode (toggle top-right).</li>
              <li>Click <strong>Load unpacked</strong> and select this folder:</li>
            </ol>
            <code className="path-block">{EXTENSION_PATH}</code>
            <p className="dialog-note">Once loaded, visit any job posting and click the extension icon to capture and track it.</p>
          </dialog>
        </>
      )}
      {/* Undo Snackbar Toast */}
      {snackbar && (
        <div key={snackbar.key} className="undo-snackbar">
          <div className="undo-snackbar-content">
            <span>{snackbar.message}</span>
            <button
              type="button"
              className="undo-snackbar-btn"
              onClick={async () => {
                await snackbar.onUndo();
                setSnackbar(null);
              }}
            >
              Undo
            </button>
          </div>
          <div className="undo-snackbar-progress"></div>
        </div>
      )}
    </div>
  );
}

import React, { useCallback, useMemo, useState } from "react";

const INTERVIEW_COLUMNS = [
  {
    status: "Applied",
    label: "Applied",
    detail: "Waiting",
    color: "var(--s-applied-dot)",
    bg: "var(--s-applied-bg)",
  },
  {
    status: "Online Assessment",
    label: "OA",
    detail: "Online assessment",
    color: "var(--s-oa-dot)",
    bg: "var(--s-oa-bg)",
  },
  {
    status: "Recruiter Screen",
    label: "Phone",
    detail: "Recruiter screen",
    color: "var(--s-screen-dot)",
    bg: "var(--s-screen-bg)",
  },
  {
    status: "Interview",
    label: "Loop",
    detail: "Technical interview",
    color: "var(--s-interview-dot)",
    bg: "var(--s-interview-bg)",
  },
  {
    status: "Offer",
    label: "Offer",
    detail: "Decision",
    color: "var(--s-offer-dot)",
    bg: "var(--s-offer-bg)",
  },
  {
    status: "Rejected",
    label: "Rejected",
    detail: "Closed",
    color: "var(--s-rejected-dot)",
    bg: "var(--s-rejected-bg)",
  },
  {
    status: "Saved",
    label: "Saved",
    detail: "To apply",
    color: "#6ea8ff",
    bg: "rgba(110, 168, 255, 0.14)",
  },
];

const COLUMN_STATUSES = new Set(INTERVIEW_COLUMNS.map((column) => column.status));

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function getInitials(company) {
  return (company || "?")
    .split(/[\s&,]+/)
    .slice(0, 2)
    .map((word) => word[0] || "")
    .join("")
    .toUpperCase() || "?";
}

function parseDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDate(value) {
  const date = parseDateValue(value);
  if (!date) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getStageDate(app, status) {
  if (status === "Saved") return app.createdAt || "";
  if (status === "Applied") return app.appliedAt || app.stageDateTimes?.Applied || app.dateApplied || app.createdAt || "";
  if (status === "Online Assessment") return app.oaDeadline || app.stageDateTimes?.["Online Assessment"] || "";
  if (status === "Recruiter Screen") return app.stageDateTimes?.["Recruiter Screen"] || app.interviewDate || "";
  if (status === "Interview") return app.interviewDate || app.stageDateTimes?.Interview || "";
  if (status === "Rejected") return app.rejectedAt || app.stageDateTimes?.Rejected || "";
  return app.stageDateTimes?.[status] || app.updatedAt || "";
}

function getCardDateLabel(app) {
  if (app.status === "Online Assessment") {
    if (app.oaDeadline) return `OA due ${formatDate(app.oaDeadline)}`;
    const date = formatDate(getStageDate(app, "Online Assessment"));
    return date ? `OA ${date}` : "";
  }
  if (app.status === "Recruiter Screen") {
    const date = formatDate(getStageDate(app, "Recruiter Screen"));
    return date ? `Phone ${date}` : "";
  }
  if (app.status === "Interview") {
    const date = formatDate(getStageDate(app, "Interview"));
    return date ? `Loop ${date}` : "";
  }
  if (app.status === "Offer") {
    const date = formatDate(getStageDate(app, "Offer"));
    return date ? `Offer ${date}` : "";
  }
  if (app.status === "Rejected") {
    const date = formatDate(getStageDate(app, "Rejected"));
    return date ? `Rejected ${date}` : "";
  }
  const applied = formatDate(getStageDate(app, "Applied"));
  return applied ? `Applied ${applied}` : "";
}

function getSkills(app) {
  return Array.isArray(app.skills)
    ? app.skills
    : String(app.skills || "")
        .split(/[,;]+/)
        .map((skill) => skill.trim())
        .filter(Boolean);
}

function buildMovePayload(app, status) {
  const next = { ...app, status };
  if (status === "Rejected") {
    next.rejectedAt = app.rejectedAt || new Date().toISOString();
  } else {
    next.rejectedAt = "";
  }
  if (status === "Saved") {
    next.dateApplied = "";
    next.appliedAt = "";
  }
  return next;
}

function InterviewTicket({ app, isDragging, isUpdating, onDragStart, onDragEnd, onMove }) {
  const skills = getSkills(app).slice(0, 3);
  const dateLabel = getCardDateLabel(app);
  const nextActionDate = app.nextActionAt ? formatDate(app.nextActionAt) : "";
  const priorityClass = app.priority === "High" ? "high" : app.priority === "Low" ? "low" : "";

  return (
    <article
      className={`interview-ticket ${isDragging ? "is-dragging" : ""} ${isUpdating ? "is-updating" : ""}`}
      draggable={!isUpdating}
      onDragStart={(event) => onDragStart(event, app)}
      onDragEnd={onDragEnd}
    >
      <div className="interview-ticket-head">
        <div className="interview-ticket-avatar" aria-hidden="true">{getInitials(app.company)}</div>
        <div className="interview-ticket-title">
          <strong title={app.company || "Unknown company"}>{app.company || "Unknown company"}</strong>
          <span title={app.role || "Untitled role"}>{app.role || "Untitled role"}</span>
        </div>
        {app.sourceUrl && (
          <a
            className="interview-ticket-link"
            href={app.sourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${app.company || "application"} posting`}
            title="Open posting"
            onClick={(event) => event.stopPropagation()}
          >
            ↗
          </a>
        )}
      </div>

      <div className="interview-ticket-meta">
        {dateLabel && <span>{dateLabel}</span>}
        {app.location && <span>{app.location}</span>}
        {app.salary && <span>{app.salary}</span>}
      </div>

      {app.nextAction && (
        <div className="interview-ticket-action">
          <span>{app.nextAction}</span>
          {nextActionDate && <time>{nextActionDate}</time>}
        </div>
      )}

      <div className="interview-ticket-foot">
        <div className="interview-ticket-tags">
          {app.priority && app.priority !== "Medium" && (
            <span className={`interview-ticket-priority ${priorityClass}`}>{app.priority}</span>
          )}
          {skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
        <select
          className="interview-ticket-move"
          value={COLUMN_STATUSES.has(app.status) ? app.status : "Applied"}
          onChange={(event) => onMove(app, event.target.value)}
          onClick={(event) => event.stopPropagation()}
          disabled={isUpdating}
          aria-label={`Move ${app.company || "application"}`}
        >
          {INTERVIEW_COLUMNS.map((column) => (
            <option key={column.status} value={column.status}>{column.label}</option>
          ))}
        </select>
      </div>
    </article>
  );
}

export default function InterviewBoard({ applications, fetchApplications }) {
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");

  const filteredApplications = useMemo(() => {
    const query = normalizeText(search).trim();
    if (!query) return applications;
    return applications.filter((app) => {
      const haystack = [
        app.company,
        app.role,
        app.location,
        app.salary,
        app.group,
        app.status,
        app.nextAction,
        ...getSkills(app),
      ].join(" ");
      return normalizeText(haystack).includes(query);
    });
  }, [applications, search]);

  const columns = useMemo(() => {
    const byStatus = new Map(INTERVIEW_COLUMNS.map((column) => [column.status, []]));
    for (const app of filteredApplications) {
      const status = COLUMN_STATUSES.has(app.status) ? app.status : "Applied";
      byStatus.get(status).push(app);
    }
    return INTERVIEW_COLUMNS.map((column) => ({
      ...column,
      apps: [...byStatus.get(column.status)].sort((a, b) => {
        const aTime = parseDateValue(getStageDate(a, column.status) || a.updatedAt)?.getTime() || 0;
        const bTime = parseDateValue(getStageDate(b, column.status) || b.updatedAt)?.getTime() || 0;
        return bTime - aTime || String(a.company || "").localeCompare(String(b.company || ""));
      }),
    }));
  }, [filteredApplications]);

  const moveApplication = useCallback(async (app, status) => {
    if (!app || app.status === status || updatingId) return;
    setUpdatingId(app.id);
    setError("");
    try {
      const response = await fetch(`/api/applications/${encodeURIComponent(app.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildMovePayload(app, status)),
      });
      if (!response.ok) throw new Error("Move failed");
      if (fetchApplications) await fetchApplications();
    } catch {
      setError("Could not move that ticket.");
    } finally {
      setUpdatingId("");
    }
  }, [fetchApplications, updatingId]);

  const handleDragStart = useCallback((event, app) => {
    setDraggingId(app.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", app.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId("");
    setDragOverStatus("");
  }, []);

  const handleDrop = useCallback((event, status) => {
    event.preventDefault();
    const appId = event.dataTransfer.getData("text/plain") || draggingId;
    const app = applications.find((item) => item.id === appId);
    setDraggingId("");
    setDragOverStatus("");
    if (app) moveApplication(app, status);
  }, [applications, draggingId, moveApplication]);

  const activeCount = applications.filter((app) => app.status !== "Rejected").length;
  const visibleCount = filteredApplications.length;

  return (
    <div className="interview-board">
      <div className="interview-board-topbar">
        <div className="interview-board-title-wrap">
          <h2 className="interview-board-title">Interview Board</h2>
          <span className="interview-board-count">
            {visibleCount} {visibleCount === 1 ? "ticket" : "tickets"} · {activeCount} active
          </span>
        </div>
        <div className="interview-board-search-wrap">
          <span className="interview-board-search-icon">⌕</span>
          <input
            className="interview-board-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tickets"
            aria-label="Search interview board tickets"
          />
          {search && (
            <button
              className="interview-board-search-clear"
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {error && <span className="interview-board-error">{error}</span>}
      </div>

      <div className="interview-board-columns" aria-label="Interview pipeline board">
        {columns.map((column) => {
          const isDragOver = dragOverStatus === column.status;
          return (
            <section
              key={column.status}
              className={`interview-column ${isDragOver ? "is-drag-over" : ""} ${column.apps.length === 0 ? "is-empty" : ""}`}
              style={{ "--column-color": column.color, "--column-bg": column.bg }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverStatus(column.status);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDragOverStatus("");
              }}
              onDrop={(event) => handleDrop(event, column.status)}
            >
              <header className="interview-column-header">
                <div>
                  <h3>{column.label}</h3>
                  <span>{column.detail}</span>
                </div>
                <strong>{column.apps.length}</strong>
              </header>
              <div className="interview-column-list">
                {column.apps.length === 0 ? (
                  <p className="interview-column-empty">No tickets</p>
                ) : (
                  column.apps.map((app) => (
                    <InterviewTicket
                      key={app.id}
                      app={app}
                      isDragging={draggingId === app.id}
                      isUpdating={updatingId === app.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onMove={moveApplication}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

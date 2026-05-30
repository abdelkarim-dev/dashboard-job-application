import React, { useState } from "react";

export default function Analytics({
  applications,
  fetchApplications,
  onOpenDrawer,
  setFunnelFilter,
  setActiveTab,
}) {
  const [classifying, setClassifying] = useState(false);

  const handleFunnelStageClick = (statusName) => {
    if (setFunnelFilter && setActiveTab) {
      setFunnelFilter(statusName);
      setActiveTab("board");
    }
  };

  const STATUSES = ["Applied", "Online Assessment", "Recruiter Screen", "Interview", "Offer", "Rejected"];

  const getAppliedTimestamp = (app) => app.appliedAt || app.stageDateTimes?.Applied || app.dateApplied;
  const getRejectedTimestamp = (app) => app.rejectedAt || app.stageDateTimes?.Rejected;

  const parseDateTime = (str) => {
    if (!str) return 0;
    const parsed = Date.parse(str);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseDateValue = (value) => {
    if (!value) return null;
    const raw = String(value);
    const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = dateOnlyMatch
      ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
      : new Date(raw);
    return Number.isFinite(date.getTime()) ? date : null;
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

  const formatAge = (timestampStr) => {
    const ms = parseDateTime(timestampStr);
    if (!ms) return "unknown age";
    const diffDays = Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000));
    if (diffDays <= 0) return "today";
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  };

  const formatDateTimeLong = (str) => {
    if (!str) return "—";
    const ms = parseDateTime(str);
    if (!ms) return str;
    return new Date(ms).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatDateTimeShort = (str) => {
    if (!str) return "";
    const ms = parseDateTime(str);
    if (!ms) return "";
    return new Date(ms).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const displayRoleCategory = (app) => {
    if (app.group && isClassifiedCategory(app.group)) return app.group;
    return "Other / Poor Fit";
  };

  const isClassifiedCategory = (cat) => {
    if (!cat) return false;
    const clean = cat.trim();
    return clean && clean !== "Other / Poor Fit" && clean !== "Unclassified";
  };

  // Calculations
  const todayBounds = getLocalDayBounds();
  const totalCount = applications.length;

  // Group by Company
  const companyGroups = {};
  applications.forEach((a) => {
    const company = (a.company || "Unknown Company").trim();
    if (!companyGroups[company]) {
      companyGroups[company] = [];
    }
    companyGroups[company].push(a);
  });
  const totalCompaniesCount = Object.keys(companyGroups).length;

  // Group by Gemma Category (specifically for Category Mix distribution chart below)
  const categoryGroups = {};
  applications.forEach((a) => {
    const category = displayRoleCategory(a);
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(a);
  });
  const totalCategoriesCount = Object.keys(categoryGroups).length;

  const categoryEntries = Object.entries(categoryGroups)
    .map(([category, apps]) => ({ category, count: apps.length }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  const classifiedCount = applications.filter((app) => isClassifiedCategory(app.group)).length;

  const latestApplied = [...applications]
    .filter((app) => getAppliedTimestamp(app))
    .sort((a, b) => parseDateTime(getAppliedTimestamp(b)) - parseDateTime(getAppliedTimestamp(a)))[0];

  const latestRejected = [...applications]
    .filter((app) => getRejectedTimestamp(app))
    .sort((a, b) => parseDateTime(getRejectedTimestamp(b)) - parseDateTime(getRejectedTimestamp(a)))[0];

  const roleGroups = {};
  applications.forEach((a) => {
    const role = (a.role || "Unknown Role").trim() || "Unknown Role";
    if (!roleGroups[role]) roleGroups[role] = [];
    roleGroups[role].push(a);
  });
  const roleEntries = Object.entries(roleGroups)
    .map(([role, apps]) => ({ role, count: apps.length }))
    .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role));

  const getCompanyHighestStatus = (apps) => {
    const statuses = apps.map((a) => a.status);
    if (statuses.includes("Offer")) return "Offer";
    if (statuses.includes("Interview")) return "Interview";
    if (statuses.includes("Recruiter Screen")) return "Recruiter Screen";
    if (statuses.includes("Online Assessment")) return "Online Assessment";
    if (statuses.includes("Applied")) return "Applied";
    return "Rejected";
  };

  // Average applications per company
  const avgRolesVal = totalCompaniesCount > 0 ? (totalCount / totalCompaniesCount).toFixed(1) : "0.0";
  const topRole = roleEntries[0];

  const todayApps = applications
    .filter((a) => isInLocalDay(getAppliedTimestamp(a) || a.dateApplied, todayBounds))
    .sort((a, b) => parseDateTime(getAppliedTimestamp(b)) - parseDateTime(getAppliedTimestamp(a)));

  // Intermediate pipeline stages: Online Assessment and Recruiter Screen counts per company targeted
  const companyOaCount = Object.values(companyGroups).filter((apps) => {
    const highest = getCompanyHighestStatus(apps);
    return ["Online Assessment", "Recruiter Screen", "Interview", "Offer"].includes(highest);
  }).length;

  const companyScreenCount = Object.values(companyGroups).filter((apps) => {
    const highest = getCompanyHighestStatus(apps);
    return ["Recruiter Screen", "Interview", "Offer"].includes(highest);
  }).length;

  // Interview and Offer conversion rates calculated per Company targeted
  const companyInterviewCount = Object.values(companyGroups).filter((apps) => {
    const highest = getCompanyHighestStatus(apps);
    return highest === "Interview" || highest === "Offer";
  }).length;
  const companyInterviewRateVal = totalCompaniesCount > 0 ? Math.round((companyInterviewCount / totalCompaniesCount) * 100) : 0;

  const companyOfferCount = Object.values(companyGroups).filter((apps) => {
    const highest = getCompanyHighestStatus(apps);
    return highest === "Offer";
  }).length;
  const companyOfferRateVal = totalCompaniesCount > 0 ? Math.round((companyOfferCount / totalCompaniesCount) * 100) : 0;

  // Stale Roles
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const staleRoles = applications.filter((a) => {
    if (a.status !== "Applied") return false;
    const appliedTime = parseDateTime(getAppliedTimestamp(a) || a.dateApplied);
    return appliedTime > 0 && appliedTime < fourteenDaysAgo.getTime();
  });

  const activeCount = Object.values(companyGroups).filter((apps) => getCompanyHighestStatus(apps) !== "Rejected").length;
  const closedCount = totalCompaniesCount - activeCount;
  const activePct = totalCompaniesCount > 0 ? Math.round((activeCount / totalCompaniesCount) * 100) : 0;
  const closedPct = totalCompaniesCount > 0 ? Math.round((closedCount / totalCompaniesCount) * 100) : 0;

  const handleCategorize = async () => {
    setClassifying(true);
    try {
      const res = await fetch("/api/categorize-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (res.ok) {
        await fetchApplications();
      }
    } catch (err) {
      console.error("Categorization failed", err);
    } finally {
      setClassifying(false);
    }
  };

  return (
    <div className="tab-content-container active" id="analyticsView">
      <div className="analytics-header">
        <div>
          <p className="eyebrow">Job hunt intelligence</p>
          <h2>Analytics & Insights</h2>
        </div>
        <button
          className="btn-primary analytics-gemma-btn"
          id="categorizeRolesBtn"
          onClick={handleCategorize}
          disabled={classifying}
        >
          {classifying ? "🧠 Gemma is reclassifying..." : "🧠 Reclassify Roles with Gemma"}
        </button>
      </div>

      <div className="analytics-insight-strip" aria-label="Timestamp and role classification insights">
        <article className="analytics-insight-card">
          <span>Latest application</span>
          <strong>{latestApplied ? `${latestApplied.company} · ${latestApplied.role}` : "No applications yet"}</strong>
          <small>{latestApplied ? formatDateTimeLong(getAppliedTimestamp(latestApplied)) : "Precise applied timestamps will show here"}</small>
        </article>
        <article className="analytics-insight-card">
          <span>Latest rejection</span>
          <strong>{latestRejected ? `${latestRejected.company} · ${latestRejected.role}` : "No rejections logged"}</strong>
          <small>{latestRejected ? formatDateTimeLong(getRejectedTimestamp(latestRejected)) : "Rejection timestamps are saved separately"}</small>
        </article>
        <article className="analytics-insight-card">
          <span>Gemma role categories</span>
          <strong>{totalCount > 0 ? `${Math.round((classifiedCount / totalCount) * 100)}% classified` : "0% classified"}</strong>
          <small>{`${classifiedCount}/${totalCount} applications have a Gemma role category`}</small>
        </article>
      </div>

      <div className="analytics-layout">
        {/* Left column: Metrics grid and Conversion funnel */}
        <div className="analytics-left">
          <div className="analytics-grid">
            <article className="metric-card" id="cardInterviewRate">
              <div className="metric-card-header">
                <span className="metric-card-label">Interview Rate</span>
                <span className="metric-card-icon">⚡</span>
              </div>
              <strong className="metric-card-value" id="analyticInterviewRate">{companyInterviewRateVal}%</strong>
              <p className="metric-card-desc">Applied → Interview conversion</p>
            </article>

            <article className="metric-card" id="cardOfferRate">
              <div className="metric-card-header">
                <span className="metric-card-label">Offer Conversion</span>
                <span className="metric-card-icon">🎉</span>
              </div>
              <strong className="metric-card-value" id="analyticOfferRate">{companyOfferRateVal}%</strong>
              <p className="metric-card-desc">Applied → Offer conversion</p>
            </article>

            <article className={`metric-card ${staleRoles.length > 0 ? "warning" : ""}`} id="cardStaleRoles">
              <div className="metric-card-header">
                <span className="metric-card-label">Stale Roles</span>
                <span className="metric-card-icon">⏳</span>
              </div>
              <strong className="metric-card-value" id="analyticStaleCount">{staleRoles.length}</strong>
              <p className="metric-card-desc">No updates in 14+ days</p>
            </article>

            <article className="metric-card" id="cardAppliedToday">
              <div className="metric-card-header">
                <span className="metric-card-label">Applied Today</span>
                <span className="metric-card-icon">★</span>
              </div>
              <strong className="metric-card-value" id="analyticAppliedToday">{todayApps.length}</strong>
              <p className="metric-card-desc">Submitted today</p>
            </article>

            <article className="metric-card" id="cardUniqueRoles">
              <div className="metric-card-header">
                <span className="metric-card-label">Unique Roles</span>
                <span className="metric-card-icon">◎</span>
              </div>
              <strong className="metric-card-value" id="analyticUniqueRoles">{roleEntries.length}</strong>
              <p className="metric-card-desc">Different role titles</p>
            </article>

            <article className="metric-card" id="cardTopRole">
              <div className="metric-card-header">
                <span className="metric-card-label">Top Role Target</span>
                <span className="metric-card-icon">◆</span>
              </div>
              <strong
                className="metric-card-value metric-card-value-text"
                id="analyticTopRole"
                title={topRole ? `${topRole.role} (${topRole.count} applications)` : ""}
              >
                {topRole ? topRole.role : "—"}
              </strong>
              <p className="metric-card-desc">Most frequent title</p>
            </article>

            <article className="metric-card" id="cardAvgRolesPerCompany">
              <div className="metric-card-header">
                <span className="metric-card-label">Avg Apps / Company</span>
                <span className="metric-card-icon">📊</span>
              </div>
              <strong className="metric-card-value" id="analyticAvgRolesPerCompany">{avgRolesVal}</strong>
              <p className="metric-card-desc">Average applications per company</p>
            </article>

            <article className="metric-card" id="cardTotalApplications">
              <div className="metric-card-header">
                <span className="metric-card-label">Targeted Companies</span>
                <span className="metric-card-icon">📦</span>
              </div>
              <strong className="metric-card-value" id="analyticTotalApplications">{totalCompaniesCount}</strong>
              <p className="metric-card-desc">Unique companies targeted</p>
            </article>
          </div>

          <div className="analytics-panel-card funnel-card">
            <h3>Conversion Funnel (by Company)</h3>
            <p style={{ fontSize: "11px", color: "var(--md-on-surface-variant)", marginTop: "-6px", marginBottom: "12px" }}>
              💡 Click on any funnel stage below to view those specific roles on your Board.
            </p>
            <div className="funnel-container">
              <div
                className="funnel-stage stage-applied"
                onClick={() => handleFunnelStageClick("Applied")}
                title="Click to view all Applied roles on Board"
              >
                <div className="funnel-label">Applied</div>
                <div className="funnel-bar">
                  <div className="funnel-bar-fill" id="funnelFillApplied" style={{ width: "100%" }}></div>
                </div>
                <div className="funnel-value" id="funnelValApplied">{totalCompaniesCount}</div>
              </div>
              <div
                className="funnel-stage stage-oa"
                onClick={() => handleFunnelStageClick("Online Assessment")}
                title="Click to view all Online Assessment roles on Board"
              >
                <div className="funnel-label">OA Invited</div>
                <div className="funnel-bar">
                  <div
                    className="funnel-bar-fill"
                    id="funnelFillOa"
                    style={{ width: `${totalCompaniesCount > 0 ? Math.round((companyOaCount / totalCompaniesCount) * 100) : 0}%`, background: "#a855f7" }}
                  ></div>
                </div>
                <div className="funnel-value" id="funnelValOa">
                  {companyOaCount} ({totalCompaniesCount > 0 ? Math.round((companyOaCount / totalCompaniesCount) * 100) : 0}%)
                </div>
              </div>
              <div
                className="funnel-stage stage-screen"
                onClick={() => handleFunnelStageClick("Recruiter Screen")}
                title="Click to view all Recruiter Screen roles on Board"
              >
                <div className="funnel-label">Recruiter Screen</div>
                <div className="funnel-bar">
                  <div
                    className="funnel-bar-fill"
                    id="funnelFillScreen"
                    style={{ width: `${totalCompaniesCount > 0 ? Math.round((companyScreenCount / totalCompaniesCount) * 100) : 0}%`, background: "#2dd4bf" }}
                  ></div>
                </div>
                <div className="funnel-value" id="funnelValScreen">
                  {companyScreenCount} ({totalCompaniesCount > 0 ? Math.round((companyScreenCount / totalCompaniesCount) * 100) : 0}%)
                </div>
              </div>
              <div
                className="funnel-stage stage-interview"
                onClick={() => handleFunnelStageClick("Interview")}
                title="Click to view all Interviewing roles on Board"
              >
                <div className="funnel-label">Interviewing</div>
                <div className="funnel-bar">
                  <div
                    className="funnel-bar-fill"
                    id="funnelFillInterview"
                    style={{ width: `${totalCompaniesCount > 0 ? Math.round((companyInterviewCount / totalCompaniesCount) * 100) : 0}%` }}
                  ></div>
                </div>
                <div className="funnel-value" id="funnelValInterview">
                  {companyInterviewCount} ({totalCompaniesCount > 0 ? Math.round((companyInterviewCount / totalCompaniesCount) * 100) : 0}%)
                </div>
              </div>
              <div
                className="funnel-stage stage-offer"
                onClick={() => handleFunnelStageClick("Offer")}
                title="Click to view all Offer roles on Board"
              >
                <div className="funnel-label">Offers</div>
                <div className="funnel-bar">
                  <div
                    className="funnel-bar-fill"
                    id="funnelFillOffer"
                    style={{ width: `${totalCompaniesCount > 0 ? Math.round((companyOfferCount / totalCompaniesCount) * 100) : 0}%` }}
                  ></div>
                </div>
                <div className="funnel-value" id="funnelValOffer">
                  {companyOfferCount} ({totalCompaniesCount > 0 ? Math.round((companyOfferCount / totalCompaniesCount) * 100) : 0}%)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Tables and Distributions */}
        <div className="analytics-right">
          <div className="analytics-panel-card stale-table-card">
            <h3>Stale Roles Action Board</h3>
            <div className="stale-table-container">
              {staleRoles.length === 0 ? (
                <p className="empty-placeholder" id="staleEmptyPlaceholder" style={{ display: "block" }}>
                  No stale roles! You're fully up-to-date! 🎉
                </p>
              ) : (
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Role</th>
                      <th>Applied</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody id="staleRolesList">
                    {staleRoles
                      .sort((a, b) => parseDateTime(getAppliedTimestamp(a) || a.dateApplied) - parseDateTime(getAppliedTimestamp(b) || b.dateApplied))
                      .map((app) => (
                        <tr key={app.id}>
                          <td style={{ fontWeight: "bold" }}>{app.company}</td>
                          <td>{app.role}</td>
                          <td title={formatDateTimeLong(getAppliedTimestamp(app) || app.dateApplied)}>
                            {formatAge(getAppliedTimestamp(app) || app.dateApplied)}
                          </td>
                          <td>
                            <button className="stale-action-btn" type="button" onClick={() => onOpenDrawer(app.id)}>
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="analytics-panel-card activity-card">
            <h3>Applied Today activity feed</h3>
            <div className="activity-timeline" id="todayActivityFeed">
              {todayApps.length === 0 ? (
                <p className="empty-placeholder" id="todayActivityPlaceholder" style={{ display: "block" }}>
                  No roles applied for today yet.
                </p>
              ) : (
                todayApps.map((app) => (
                  <div className={`activity-item ${app.status === "Offer" ? "offer" : ""}`} key={app.id}>
                    <div className="activity-marker"></div>
                    <div className="activity-details">
                      <span className="activity-title-text">{`Applied to ${app.company} as ${app.role}`}</span>
                      <span className="activity-time">
                        {app.location ? `📍 ${app.location} | ` : ""}
                        {formatDateTimeShort(getAppliedTimestamp(app) || app.dateApplied) || "Today"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="analytics-panel-card distributions-card">
            <h3>Pipeline Distributions</h3>
            <div className="distribution-section">
              <h4>Status Proportions (by Company)</h4>
              <div className="distribution-container" id="statusDistributionBars">
                {STATUSES.map((status) => {
                  const count = Object.values(companyGroups).filter((apps) => getCompanyHighestStatus(apps) === status).length;
                  const pct = totalCompaniesCount > 0 ? Math.round((count / totalCompaniesCount) * 100) : 0;
                  const colors = {
                    Applied: "var(--status-applied)",
                    "Online Assessment": "#a855f7",
                    "Recruiter Screen": "#2dd4bf",
                    Interview: "var(--status-interview)",
                    Offer: "var(--status-offer)",
                    Rejected: "var(--status-rejected)",
                  };
                  return (
                    <div className="dist-row" key={status}>
                      <div className="dist-meta">
                        <span>{status}</span>
                        <span>{count} ({pct}%)</span>
                      </div>
                      <div className="dist-bar-wrap">
                        <div className="dist-bar-fill" style={{ width: `${pct}%`, background: colors[status] }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="distribution-section" id="activeVsClosedDistributionSection" style={{ marginTop: "16px" }}>
              <h4>Company Group Outcomes</h4>
              <div className="distribution-container" id="activeVsClosedBars">
                <div className="dist-row">
                  <div className="dist-meta">
                    <span>Active Pipelines</span>
                    <span>{activeCount} ({activePct}%)</span>
                  </div>
                  <div className="dist-bar-wrap">
                    <div className="dist-bar-fill" id="activeBarFill" style={{ width: `${activePct}%`, background: "var(--md-primary)" }}></div>
                  </div>
                </div>
                <div className="dist-row">
                  <div className="dist-meta">
                    <span>Closed (All Rejected)</span>
                    <span>{closedCount} ({closedPct}%)</span>
                  </div>
                  <div className="dist-bar-wrap">
                    <div className="dist-bar-fill" id="closedBarFill" style={{ width: `${closedPct}%`, background: "var(--status-rejected)" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="analytics-panel-card role-mix-card">
            <h3>Gemma Category Mix</h3>
            <div className="distribution-container" id="roleDistributionBars">
              {categoryEntries.length === 0 ? (
                <p className="empty-placeholder" id="roleDistributionPlaceholder" style={{ display: "block" }}>
                  No role statistics yet.
                </p>
              ) : (
                categoryEntries.slice(0, 10).map(({ category, count }) => {
                  const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                  return (
                    <div className="dist-row role-dist-row" key={category}>
                      <div className="dist-meta">
                        <span className="dist-role-name">{category}</span>
                        <span>{count} {count === 1 ? "application" : "applications"} ({pct}%)</span>
                      </div>
                      <div className="dist-bar-wrap">
                        <div className="dist-bar-fill" style={{ width: `${pct}%`, background: "var(--md-primary)" }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

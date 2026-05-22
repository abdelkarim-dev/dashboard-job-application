const STATUSES = ["Applied", "Interview", "Offer", "Rejected"];
const EXTENSION_PATH = "/Users/adnane/Documents/Codex/2026-05-17/files-mentioned-by-the-user-cleanshot/job-hunt-cockpit/extension";

const state = {
  applications: [],
  evaluations: {},
  filters: { search: "", status: "", today: false },
  dragId: null,
};

// ── DOM refs ───────────────────────────────────────────────────
const boardWrap       = document.getElementById("boardWrap");
const searchInput     = document.getElementById("searchInput");

const refreshBtn      = document.getElementById("refreshBtn");
const newBtn          = document.getElementById("newBtn");
const detailDrawer    = document.getElementById("detailDrawer");
const drawerMode      = document.getElementById("drawerMode");
const drawerTitle     = document.getElementById("drawerTitle");
const drawerDeleteBtn = document.getElementById("drawerDeleteBtn");
const drawerCloseBtn  = document.getElementById("drawerCloseBtn");
const drawerForm      = document.getElementById("drawerForm");
const drawerFeedback  = document.getElementById("drawerFeedback");
const drawerOpenLink  = document.getElementById("drawerOpenLink");
const drawerBackdrop  = document.getElementById("drawerBackdrop");
const extensionSetupBtn    = document.getElementById("extensionSetupBtn");
const extensionDialog      = document.getElementById("extensionDialog");
const closeExtensionDialog = document.getElementById("closeExtensionDialog");
const extensionPathEl      = document.getElementById("extensionPath");

// New MD3 and Insights refs

const sortSelector        = document.getElementById("sortSelector");
const gemmaEvalSection    = document.getElementById("gemmaEvalSection");
const dEvaluateBtn        = document.getElementById("d-evaluateBtn");
const dEvalProgress       = document.getElementById("d-evalProgress");
const dEvaluationResult   = document.getElementById("d-evaluationResult");

// Navigation View Tabs and Grouping
const tabBoardBtn         = document.getElementById("tabBoardBtn");
const tabAnalyticsBtn     = document.getElementById("tabAnalyticsBtn");
const tabProfileBtn       = document.getElementById("tabProfileBtn");
const categorizeRolesBtn  = document.getElementById("categorizeRolesBtn");
const boardView           = document.getElementById("boardView");
const analyticsView       = document.getElementById("analyticsView");
const profileView         = document.getElementById("profileView");
const profileForm         = document.getElementById("profileForm");
const profileFeedback     = document.getElementById("profileFeedback");
const groupBySelector     = document.getElementById("groupBySelector");

// Analytics Page elements
const analyticInterviewRate      = document.getElementById("analyticInterviewRate");
const analyticOfferRate          = document.getElementById("analyticOfferRate");
const analyticStaleCount         = document.getElementById("analyticStaleCount");
const analyticAppliedToday       = document.getElementById("analyticAppliedToday");
const analyticUniqueRoles        = document.getElementById("analyticUniqueRoles");
const analyticTopRole            = document.getElementById("analyticTopRole");
const analyticAvgRolesPerCompany = document.getElementById("analyticAvgRolesPerCompany");
const analyticTotalApplications  = document.getElementById("analyticTotalApplications");
const insightLatestApplied       = document.getElementById("insightLatestApplied");
const insightLatestAppliedMeta   = document.getElementById("insightLatestAppliedMeta");
const insightLatestRejected      = document.getElementById("insightLatestRejected");
const insightLatestRejectedMeta  = document.getElementById("insightLatestRejectedMeta");
const insightCategoryCoverage    = document.getElementById("insightCategoryCoverage");
const insightCategoryCoverageMeta = document.getElementById("insightCategoryCoverageMeta");

// Conversion Funnel elements
const funnelFillApplied   = document.getElementById("funnelFillApplied");
const funnelValApplied     = document.getElementById("funnelValApplied");
const funnelFillInterview = document.getElementById("funnelFillInterview");
const funnelValInterview   = document.getElementById("funnelValInterview");
const funnelFillOffer     = document.getElementById("funnelFillOffer");
const funnelValOffer       = document.getElementById("funnelValOffer");

// Table, Feeds and Distributions
const staleRolesList         = document.getElementById("staleRolesList");
const staleEmptyPlaceholder   = document.getElementById("staleEmptyPlaceholder");
const todayActivityFeed      = document.getElementById("todayActivityFeed");
const todayActivityPlaceholder = document.getElementById("todayActivityPlaceholder");
const statusDistributionBars   = document.getElementById("statusDistributionBars");
const roleDistributionBars     = document.getElementById("roleDistributionBars");
const roleDistributionPlaceholder = document.getElementById("roleDistributionPlaceholder");


// ── Boot ───────────────────────────────────────────────────────
init();

async function init() {
  extensionPathEl.textContent = EXTENSION_PATH;

  // Initialize theme (strictly forced dark theme)
  setTheme("dark");

  // View Tabs Action
  tabBoardBtn.addEventListener("click", () => {
    tabBoardBtn.classList.add("active");
    tabAnalyticsBtn.classList.remove("active");
    tabProfileBtn.classList.remove("active");
    boardView.classList.add("active");
    boardView.hidden = false;
    analyticsView.classList.remove("active");
    analyticsView.hidden = true;
    profileView.classList.remove("active");
    profileView.hidden = true;
  });

  tabAnalyticsBtn.addEventListener("click", () => {
    tabAnalyticsBtn.classList.add("active");
    tabBoardBtn.classList.remove("active");
    tabProfileBtn.classList.remove("active");
    analyticsView.classList.add("active");
    analyticsView.hidden = false;
    boardView.classList.remove("active");
    boardView.hidden = true;
    profileView.classList.remove("active");
    profileView.hidden = true;
    render();
  });

  tabProfileBtn.addEventListener("click", () => {
    tabProfileBtn.classList.add("active");
    tabBoardBtn.classList.remove("active");
    tabAnalyticsBtn.classList.remove("active");
    profileView.classList.add("active");
    profileView.hidden = false;
    boardView.classList.remove("active");
    boardView.hidden = true;
    analyticsView.classList.remove("active");
    analyticsView.hidden = true;
    loadProfileIntoForm();
  });

  profileForm.addEventListener("submit", handleProfileSave);

  if (groupBySelector) {
    groupBySelector.addEventListener("change", () => {
      render();
    });
  }

  searchInput.addEventListener("input", () => {
    state.filters.search = searchInput.value.trim().toLowerCase();
    render();
  });



  sortSelector.addEventListener("change", () => {
    render();
  });

  if (categorizeRolesBtn) {
    categorizeRolesBtn.addEventListener("click", async () => {
      categorizeRolesBtn.disabled = true;
      const originalText = categorizeRolesBtn.innerHTML;
      categorizeRolesBtn.innerHTML = "🧠 Gemma is reclassifying...";
      try {
        const res = await fetch("/api/categorize-titles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        });
        if (res.ok) {
          state.applications = await res.json();
          render();
        }
      } catch (err) {
        console.error("Categorization failed", err);
      } finally {
        categorizeRolesBtn.innerHTML = originalText;
        categorizeRolesBtn.disabled = false;
      }
    });
  }

  // Wire Gemma evaluation click
  dEvaluateBtn.addEventListener("click", async () => {
    const f = drawerForm.elements;
    const id = f["id"].value;
    if (!id) return;

    const app = state.applications.find((a) => a.id === id);
    if (!app || !app.description) return;

    dEvalProgress.hidden = false;
    dEvaluateBtn.disabled = true;
    dEvaluationResult.replaceChildren();

    try {
      const res = await fetch("/api/evaluate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app),
      });

      const result = await res.json();
      if (result && result.ok) {
        state.evaluations[id] = result;
        renderEvaluationResult(result);
        dEvaluateBtn.textContent = "Re-evaluate";
      } else {
        renderEvaluationResult({ ok: false, error: result?.error || "Gemma evaluation failed." });
      }
    } catch (error) {
      renderEvaluationResult({ ok: false, error: "Network error calling local Gemma evaluator." });
    } finally {
      dEvalProgress.hidden = true;
      dEvaluateBtn.disabled = false;
    }
  });

  refreshBtn.addEventListener("click", loadApplications);
  newBtn.addEventListener("click", openNewDrawer);

  drawerCloseBtn.addEventListener("click", closeDrawer);
  drawerBackdrop.addEventListener("click", closeDrawer);
  drawerDeleteBtn.addEventListener("click", handleDelete);
  drawerForm.addEventListener("submit", handleSave);

  extensionSetupBtn.addEventListener("click", () => extensionDialog.showModal());
  closeExtensionDialog.addEventListener("click", () => extensionDialog.close());
  extensionDialog.addEventListener("click", (e) => {
    if (e.target === extensionDialog) extensionDialog.close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !detailDrawer.hidden) closeDrawer();
  });

  await loadApplications();
  setInterval(loadQuietly, 10000);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = "dark";
  localStorage.setItem("theme", "dark");
}

// ── Data loading ───────────────────────────────────────────────
async function loadApplications() {
  try {
    const res = await fetch("/api/applications");
    state.applications = await res.json();
    render();
  } catch {
    // server offline — keep existing state
  }
}

async function loadQuietly() {
  try {
    const res = await fetch("/api/applications");
    const next = await res.json();
    const fp = (apps) => apps.map((a) => `${a.id}:${a.updatedAt}`).join("|");
    if (fp(next) !== fp(state.applications)) {
      state.applications = next;
      render();
    }
  } catch {
    // ignore
  }
}

// ── Render ─────────────────────────────────────────────────────
function render() {
  renderBoard();
  renderMetrics();
}

function renderMetrics() {
  const today = todayString();
  const totalCount = state.applications.length;

  // Group all applications by Gemma Category (group)
  const categoryGroups = {};
  state.applications.forEach((a) => {
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
  const classifiedCount = state.applications.filter((app) => isClassifiedCategory(app.group)).length;
  const latestApplied = [...state.applications]
    .filter((app) => getAppliedTimestamp(app))
    .sort((a, b) => parseDateTime(getAppliedTimestamp(b)) - parseDateTime(getAppliedTimestamp(a)))[0];
  const latestRejected = [...state.applications]
    .filter((app) => getRejectedTimestamp(app))
    .sort((a, b) => parseDateTime(getRejectedTimestamp(b)) - parseDateTime(getRejectedTimestamp(a)))[0];

  const roleGroups = {};
  state.applications.forEach((a) => {
    const role = (a.role || "Unknown Role").trim() || "Unknown Role";
    if (!roleGroups[role]) roleGroups[role] = [];
    roleGroups[role].push(a);
  });
  const roleEntries = Object.entries(roleGroups)
    .map(([role, apps]) => ({ role, count: apps.length }))
    .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role));

  // Determine each category's highest pipeline status
  // Status Priority: Offer > Interview > Applied > Rejected
  const getCompanyHighestStatus = (apps) => {
    const statuses = apps.map((a) => a.status);
    if (statuses.includes("Offer")) return "Offer";
    if (statuses.includes("Interview")) return "Interview";
    if (statuses.includes("Applied")) return "Applied";
    return "Rejected";
  };

  // 1. Total Pipeline Count (shows unique categories)
  if (analyticTotalApplications) {
    analyticTotalApplications.textContent = totalCategoriesCount;
  }

  // 2. Avg Roles / Category
  const avgRolesVal = totalCategoriesCount > 0 ? (totalCount / totalCategoriesCount).toFixed(1) : "0.0";
  if (analyticAvgRolesPerCompany) {
    analyticAvgRolesPerCompany.textContent = avgRolesVal;
  }

  if (analyticUniqueRoles) {
    analyticUniqueRoles.textContent = roleEntries.length;
  }

  if (analyticTopRole) {
    const topRole = roleEntries[0];
    analyticTopRole.textContent = topRole ? topRole.role : "—";
    analyticTopRole.title = topRole ? `${topRole.role} (${topRole.count} ${topRole.count === 1 ? "application" : "applications"})` : "";
  }

  if (insightLatestApplied) {
    insightLatestApplied.textContent = latestApplied ? `${latestApplied.company} · ${latestApplied.role}` : "No applications yet";
  }
  if (insightLatestAppliedMeta) {
    insightLatestAppliedMeta.textContent = latestApplied
      ? formatDateTimeLong(getAppliedTimestamp(latestApplied))
      : "Precise applied timestamps will show here";
  }
  if (insightLatestRejected) {
    insightLatestRejected.textContent = latestRejected ? `${latestRejected.company} · ${latestRejected.role}` : "No rejections logged";
  }
  if (insightLatestRejectedMeta) {
    insightLatestRejectedMeta.textContent = latestRejected
      ? formatDateTimeLong(getRejectedTimestamp(latestRejected))
      : "Rejection timestamps are saved separately";
  }
  if (insightCategoryCoverage) {
    const pct = totalCount > 0 ? Math.round((classifiedCount / totalCount) * 100) : 0;
    insightCategoryCoverage.textContent = `${pct}% classified`;
  }
  if (insightCategoryCoverageMeta) {
    insightCategoryCoverageMeta.textContent = `${classifiedCount}/${totalCount} applications have a Gemma role category`;
  }

  // 3. Today's applications (categories applied to today)
  const todayCategories = Object.entries(categoryGroups).filter(([categoryName, apps]) => {
    return apps.some((a) => datePart(getAppliedTimestamp(a) || a.dateApplied) === today);
  });
  const todayApps = state.applications
    .filter((a) => datePart(getAppliedTimestamp(a) || a.dateApplied) === today)
    .sort((a, b) => parseDateTime(getAppliedTimestamp(b)) - parseDateTime(getAppliedTimestamp(a)));
  if (analyticAppliedToday) {
    analyticAppliedToday.textContent = todayApps.length; // Count actual roles applied today, not categories
  }

  // 4. Conversion Rates & Funnel (based on category groups)
  const categoryInterviewCount = Object.values(categoryGroups).filter((apps) => {
    const highest = getCompanyHighestStatus(apps);
    return highest === "Interview" || highest === "Offer";
  }).length;
  const categoryInterviewRateVal = totalCategoriesCount > 0 ? Math.round((categoryInterviewCount / totalCategoriesCount) * 100) : 0;
  if (analyticInterviewRate) {
    analyticInterviewRate.textContent = `${categoryInterviewRateVal}%`;
  }

  const categoryOfferCount = Object.values(categoryGroups).filter((apps) => {
    const highest = getCompanyHighestStatus(apps);
    return highest === "Offer";
  }).length;
  const categoryOfferRateVal = totalCategoriesCount > 0 ? Math.round((categoryOfferCount / totalCategoriesCount) * 100) : 0;
  if (analyticOfferRate) {
    analyticOfferRate.textContent = `${categoryOfferRateVal}%`;
  }

  // Funnel displays
  if (funnelValApplied) {
    funnelValApplied.textContent = totalCategoriesCount;
    
    const interviewPct = totalCategoriesCount > 0 ? Math.round((categoryInterviewCount / totalCategoriesCount) * 100) : 0;
    funnelFillInterview.style.width = `${interviewPct}%`;
    funnelValInterview.textContent = `${categoryInterviewCount} (${interviewPct}%)`;

    const offerPct = totalCategoriesCount > 0 ? Math.round((categoryOfferCount / totalCategoriesCount) * 100) : 0;
    funnelFillOffer.style.width = `${offerPct}%`;
    funnelValOffer.textContent = `${categoryOfferCount} (${offerPct}%)`;
  }

  // 5. Stale Roles (roles in Applied status for >14 days with no active progress)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const staleRoles = state.applications.filter((a) => {
    if (a.status !== "Applied") return false;
    const appliedTime = parseDateTime(getAppliedTimestamp(a) || a.dateApplied);
    return appliedTime > 0 && appliedTime < fourteenDaysAgo.getTime();
  });

  const staleRolesCount = staleRoles.length;
  if (analyticStaleCount) {
    analyticStaleCount.textContent = staleRolesCount;
    const cardStaleRoles = document.getElementById("cardStaleRoles");
    if (cardStaleRoles) {
      if (staleRolesCount > 0) {
        cardStaleRoles.classList.add("warning");
      } else {
        cardStaleRoles.classList.remove("warning");
      }
    }
  }

  // Populate Stale Roles Action Table
  if (staleRolesList) {
    staleRolesList.replaceChildren();

    if (staleRoles.length === 0) {
      staleEmptyPlaceholder.hidden = false;
    } else {
      staleEmptyPlaceholder.hidden = true;
      const sortedStale = [...staleRoles].sort((a, b) => {
        return parseDateTime(getAppliedTimestamp(a) || a.dateApplied) - parseDateTime(getAppliedTimestamp(b) || b.dateApplied);
      });
      sortedStale.forEach((app) => {
        const tr = document.createElement("tr");

        const tdComp = document.createElement("td");
        tdComp.style.fontWeight = "bold";
        tdComp.textContent = app.company;

        const tdRole = document.createElement("td");
        tdRole.textContent = app.role;

        const tdApplied = document.createElement("td");
        tdApplied.textContent = formatAge(getAppliedTimestamp(app) || app.dateApplied);
        tdApplied.title = formatDateTimeLong(getAppliedTimestamp(app) || app.dateApplied);

        const tdAction = document.createElement("td");
        const actBtn = document.createElement("button");
        actBtn.className = "stale-action-btn";
        actBtn.textContent = "Open";
        actBtn.type = "button";
        actBtn.addEventListener("click", () => openDrawer(app.id));
        tdAction.appendChild(actBtn);

        tr.append(tdComp, tdRole, tdApplied, tdAction);
        staleRolesList.appendChild(tr);
      });
    }
  }

  // 6. Applied Today Activity Feed
  if (todayActivityFeed) {
    todayActivityFeed.replaceChildren();
    if (todayApps.length === 0) {
      todayActivityPlaceholder.hidden = false;
    } else {
      todayActivityPlaceholder.hidden = true;
      todayApps.forEach((app) => {
        const item = document.createElement("div");
        item.className = "activity-item";
        if (app.status === "Offer") item.classList.add("offer");

        const marker = document.createElement("div");
        marker.className = "activity-marker";

        const details = document.createElement("div");
        details.className = "activity-details";

        const title = document.createElement("span");
        title.className = "activity-title-text";
        title.textContent = `Applied to ${app.company} as ${app.role}`;

        const time = document.createElement("span");
        time.className = "activity-time";
        const appliedLabel = formatDateTimeShort(getAppliedTimestamp(app) || app.dateApplied) || "Today";
        time.textContent = app.location ? `📍 ${app.location} | ${appliedLabel}` : appliedLabel;

        details.append(title, time);
        item.append(marker, details);
        todayActivityFeed.appendChild(item);
      });
    }
  }

  // 7. Pipeline Distributions (based on category groups)
  if (statusDistributionBars) {
    // Status Proportions
    statusDistributionBars.replaceChildren();
    STATUSES.forEach((status) => {
      const count = Object.values(categoryGroups).filter((apps) => {
        return getCompanyHighestStatus(apps) === status;
      }).length;
      const pct = totalCategoriesCount > 0 ? Math.round((count / totalCategoriesCount) * 100) : 0;

      const row = document.createElement("div");
      row.className = "dist-row";

      const meta = document.createElement("div");
      meta.className = "dist-meta";
      meta.innerHTML = `<span>${status}</span> <span>${count} (${pct}%)</span>`;

      const barWrap = document.createElement("div");
      barWrap.className = "dist-bar-wrap";

      const barFill = document.createElement("div");
      barFill.className = "dist-bar-fill";
      barFill.style.width = `${pct}%`;
      
      if (status === "Applied") barFill.style.background = "var(--status-applied)";
      if (status === "Interview") barFill.style.background = "var(--status-interview)";
      if (status === "Offer") barFill.style.background = "var(--status-offer)";
      if (status === "Rejected") barFill.style.background = "var(--status-rejected)";

      barWrap.appendChild(barFill);
      row.append(meta, barWrap);
      statusDistributionBars.appendChild(row);
    });

    // Outcomes Proportions (Active vs Closed)
    let activeVsClosedSection = document.getElementById("activeVsClosedDistributionSection");
    if (!activeVsClosedSection) {
      activeVsClosedSection = document.createElement("div");
      activeVsClosedSection.id = "activeVsClosedDistributionSection";
      activeVsClosedSection.className = "distribution-section";
      activeVsClosedSection.style.marginTop = "16px";
      activeVsClosedSection.innerHTML = `<h4>Company Group Outcomes</h4><div class="distribution-container" id="activeVsClosedBars"></div>`;
      statusDistributionBars.parentElement.parentElement.appendChild(activeVsClosedSection);
    }
    
    const activeVsClosedBars = document.getElementById("activeVsClosedBars");
    if (activeVsClosedBars) {
      activeVsClosedBars.replaceChildren();
      
      const activeCount = Object.values(categoryGroups).filter((apps) => getCompanyHighestStatus(apps) !== "Rejected").length;
      const closedCount = totalCategoriesCount - activeCount;
      
      const activePct = totalCategoriesCount > 0 ? Math.round((activeCount / totalCategoriesCount) * 100) : 0;
      const closedPct = totalCategoriesCount > 0 ? Math.round((closedCount / totalCategoriesCount) * 100) : 0;
      
      const activeRow = document.createElement("div");
      activeRow.className = "dist-row";
      activeRow.innerHTML = `
        <div class="dist-meta"><span>Active Pipelines</span> <span>${activeCount} (${activePct}%)</span></div>
        <div class="dist-bar-wrap"><div class="dist-bar-fill" id="activeBarFill" style="width: ${activePct}%; background: var(--md-primary);"></div></div>
      `;
      
      const closedRow = document.createElement("div");
      closedRow.className = "dist-row";
      closedRow.innerHTML = `
        <div class="dist-meta"><span>Closed (All Rejected)</span> <span>${closedCount} (${closedPct}%)</span></div>
        <div class="dist-bar-wrap"><div class="dist-bar-fill" id="closedBarFill" style="width: ${closedPct}%; background: var(--status-rejected);"></div></div>
      `;
      
      activeVsClosedBars.append(activeRow, closedRow);
    }
  }

  if (roleDistributionBars) {
    roleDistributionBars.replaceChildren();
    if (categoryEntries.length === 0) {
      if (roleDistributionPlaceholder) roleDistributionPlaceholder.hidden = false;
    } else {
      if (roleDistributionPlaceholder) roleDistributionPlaceholder.hidden = true;
      categoryEntries.slice(0, 10).forEach(({ category, count }) => {
        const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
        const row = document.createElement("div");
        row.className = "dist-row role-dist-row";

        const meta = document.createElement("div");
        meta.className = "dist-meta";

        const name = document.createElement("span");
        name.className = "dist-role-name";
        name.textContent = category;

        const value = document.createElement("span");
        value.textContent = `${count} ${count === 1 ? "application" : "applications"} (${pct}%)`;

        const barWrap = document.createElement("div");
        barWrap.className = "dist-bar-wrap";

        const barFill = document.createElement("div");
        barFill.className = "dist-bar-fill role-dist-fill";
        barFill.style.width = `${pct}%`;

        meta.append(name, value);
        barWrap.appendChild(barFill);
        row.append(meta, barWrap);
        roleDistributionBars.appendChild(row);
      });
    }
  }
}

function getFilteredApplications() {
  const { search, priority, status, today } = state.filters;
  const todayStr = todayString();

  let filtered = state.applications.filter((app) => {
    if (status && app.status !== status) return false;
    if (today && datePart(getAppliedTimestamp(app) || app.dateApplied) !== todayStr) return false;
    if (search) {
      const hay = [app.company, app.role, app.location, app.notes, ...(app.skills || [])]
        .join(" ").toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  // Client-side advanced sorting
  const sortBy = sortSelector.value;

  filtered.sort((a, b) => {
    if (sortBy === "dateApplied-desc") {
      return compareAppsByStageDate(a, b, true);
    }
    if (sortBy === "dateApplied-asc") {
      return compareAppsByStageDate(a, b, false);
    }
    if (sortBy === "company-asc") {
      return (a.company || "").localeCompare(b.company || "");
    }
    if (sortBy === "company-desc") {
      return (b.company || "").localeCompare(a.company || "");
    }
    if (sortBy === "salary-desc") {
      return parseSalary(b.salary) - parseSalary(a.salary);
    }
    return compareAppsByStageDate(a, b, true);
  });

  return filtered;
}

function renderBoard() {
  const filtered = getFilteredApplications();
  boardWrap.replaceChildren();
  STATUSES.forEach((status) => {
    const apps = filtered.filter((a) => a.status === status);
    boardWrap.appendChild(makeColumn(status, apps));
  });
}

function appSortTimestamp(app) {
  const stageTime = parseDateTime(getCurrentStageTimestamp(app));
  if (stageTime) return stageTime;

  const appliedTime = parseDateTime(getAppliedTimestamp(app) || app.dateApplied);
  if ((app.status || "Applied") === "Applied" && appliedTime) return appliedTime;

  const updateTime = Date.parse(app.updatedAt || app.createdAt || "") || 0;
  return updateTime || appliedTime;
}

function latestGroupTimestamp(apps) {
  return Math.max(0, ...apps.map(appSortTimestamp));
}

function appSecondarySortTimestamp(app) {
  const status = app.status || "Applied";
  const raw = status === "Applied"
    ? app.createdAt || app.updatedAt || ""
    : app.updatedAt || app.createdAt || "";
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : 0;
}

function latestGroupSecondaryTimestamp(apps) {
  return Math.max(0, ...apps.map(appSecondarySortTimestamp));
}

function compareAppsByStageDate(a, b, newestFirst = true) {
  const primary = appSortTimestamp(a) - appSortTimestamp(b);
  if (primary !== 0) return newestFirst ? -primary : primary;

  const secondary = appSecondarySortTimestamp(a) - appSecondarySortTimestamp(b);
  if (secondary !== 0) return newestFirst ? -secondary : secondary;

  return (a.role || "").localeCompare(b.role || "");
}

function formatShortDate(dateString) {
  if (!dateString) return "";
  try {
    const [year, month, day] = String(dateString).split("-").map(Number);
    const date = year && month && day ? new Date(year, month - 1, day) : new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateString;
  }
}

function getAppliedTimestamp(app) {
  return app.stageDateTimes?.Applied || app.appliedAt || app.dateApplied || "";
}

function getRejectedTimestamp(app) {
  return app.rejectedAt || app.stageDateTimes?.Rejected || "";
}

function getCurrentStageTimestamp(app) {
  const status = app.status || "Applied";
  return app.stageDateTimes?.[status]
    || (status === "Applied" ? getAppliedTimestamp(app) : "")
    || (status === "Rejected" ? getRejectedTimestamp(app) : "")
    || "";
}

function getCurrentStageDate(app) {
  const status = app.status || "Applied";
  const timestamp = getCurrentStageTimestamp(app);
  return datePart(timestamp) || app.stageDates?.[status] || (status === "Applied" ? app.dateApplied : "") || "";
}

function getStageDateBadge(app) {
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
}

function renderStageDatesSummary(app) {
  const target = document.getElementById("d-stageDates");
  const wrap = document.getElementById("d-stageDatesWrap");
  if (!target || !wrap) return;

  target.replaceChildren();
  const dates = STATUSES
    .map((status) => ({
      status,
      timestamp: app.stageDateTimes?.[status]
        || (status === "Applied" ? getAppliedTimestamp(app) : "")
        || (status === "Rejected" ? getRejectedTimestamp(app) : ""),
      date: app.stageDates?.[status] || (status === "Applied" ? app.dateApplied : ""),
    }))
    .filter((item) => item.timestamp || item.date);

  wrap.hidden = dates.length === 0;
  dates.forEach(({ status, timestamp, date }) => {
    const item = document.createElement("span");
    item.className = `stage-date-pill ${status.toLowerCase()}`;
    item.textContent = `${status}: ${timestamp ? formatDateTimeShort(timestamp) : formatShortDate(date)}`;
    item.title = timestamp ? formatDateTimeLong(timestamp) : date;
    target.appendChild(item);
  });
}

// ── Board column ───────────────────────────────────────────────
function makeColumn(status, apps) {
  const col = document.createElement("div");
  col.className = "board-column";
  col.dataset.status = status;

  const header = document.createElement("div");
  header.className = "board-column-header";

  const label = document.createElement("span");
  label.className = "board-column-label";
  label.textContent = status;

  const groupBy = "company";

  const badge = document.createElement("strong");
  badge.className = "board-column-count";
  
  let badgeText = apps.length;
  let badgeTitle = `${apps.length} ${apps.length === 1 ? "role" : "roles"}`;
  if (apps.length > 0 && groupBy && groupBy !== "none") {
    const keys = new Set();
    apps.forEach((app) => {
      let key = "Other";
      if (groupBy === "priority") {
        key = app.priority || "Medium";
      } else if (groupBy === "company") {
        key = (app.company || "Unknown Company").trim();
      } else if (groupBy === "group") {
        key = (app.group || "No Group").trim();
      }
      keys.add(key);
    });
    const labelSingular = groupBy === "company" ? "company" : "group";
    const labelPlural = groupBy === "company" ? "companies" : "groups";
    const groupWord = keys.size === 1 ? labelSingular : labelPlural;
    
    const applicationWord = apps.length === 1 ? "application" : "applications";
    const compactGroupWord = groupBy === "company" ? "co" : "grp";
    badgeText = `${keys.size} ${compactGroupWord} · ${apps.length} apps`;
    badgeTitle = `${keys.size} ${groupWord} and ${apps.length} ${applicationWord}`;
  }
  badge.textContent = badgeText;
  badge.title = badgeTitle;
  badge.setAttribute("aria-label", badgeTitle);

  header.append(label, badge);

  const list = document.createElement("div");
  list.className = "board-cards";

  if (apps.length === 0) {
    const empty = document.createElement("p");
    empty.className = "board-empty";
    empty.textContent = "No roles yet";
    list.appendChild(empty);
  } else if (!groupBy || groupBy === "none") {
    apps.forEach((app) => list.appendChild(makeCard(app)));
  } else {
    // Grouping is active!
    const groups = {};
    apps.forEach((app) => {
      let key = "Other";
      if (groupBy === "priority") {
        key = app.priority || "Medium";
      } else if (groupBy === "company") {
        key = (app.company || "Unknown Company").trim();
      } else if (groupBy === "group") {
        key = (app.group || "No Group").trim();
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(app);
    });

    let groupKeys = Object.keys(groups);
    if (groupBy === "priority") {
      const order = { High: 0, Medium: 1, Low: 2 };
      groupKeys.sort((a, b) => (order[a] ?? 9) - (order[b] ?? 9));
    } else if (groupBy === "company") {
      groupKeys.sort((a, b) => {
        const sortBy = sortSelector.value;
        if (sortBy === "company-asc") return a.localeCompare(b);
        if (sortBy === "company-desc") return b.localeCompare(a);
        const newestFirst = sortBy !== "dateApplied-asc";
        const diff = newestFirst
          ? latestGroupTimestamp(groups[b]) - latestGroupTimestamp(groups[a])
          : latestGroupTimestamp(groups[a]) - latestGroupTimestamp(groups[b]);
        if (diff !== 0) {
          return diff;
        }
        const secondaryDiff = newestFirst
          ? latestGroupSecondaryTimestamp(groups[b]) - latestGroupSecondaryTimestamp(groups[a])
          : latestGroupSecondaryTimestamp(groups[a]) - latestGroupSecondaryTimestamp(groups[b]);
        if (secondaryDiff !== 0) {
          return secondaryDiff;
        }
        return a.localeCompare(b);
      });
    } else if (groupBy === "group") {
      groupKeys.sort((a, b) => a.localeCompare(b));
    }

    if (groupBy === "company") {
      groupKeys.forEach((companyName) => {
        const companyApps = [...groups[companyName]].sort((a, b) => {
          return compareAppsByStageDate(a, b, sortSelector.value !== "dateApplied-asc");
        });

        const companyCard = document.createElement("div");
        companyCard.className = "board-card board-card-company-group";

        const cardHeader = document.createElement("div");
        cardHeader.className = "board-card-header";
        cardHeader.style.marginBottom = "4px";

        const avatar = document.createElement("div");
        avatar.className = "board-card-avatar";
        avatar.style.backgroundColor = getCompanyColor(companyName);
        avatar.textContent = (companyName || "?").charAt(0);

        const titleWrap = document.createElement("div");
        titleWrap.className = "board-card-title";

        const companyTitle = document.createElement("strong");
        companyTitle.textContent = companyName;

        const roleCount = document.createElement("span");
        roleCount.className = "company-group-badge";
        roleCount.textContent = `${companyApps.length} ${companyApps.length === 1 ? "role" : "roles"}`;

        titleWrap.append(companyTitle, roleCount);
        cardHeader.append(avatar, titleWrap);
        companyCard.appendChild(cardHeader);

        const rolesContainer = document.createElement("div");
        rolesContainer.className = "company-group-roles";

        companyApps.forEach((app) => {
          const roleRow = document.createElement("div");
          roleRow.className = "company-group-role-row";
          roleRow.dataset.id = app.id;
          roleRow.draggable = true;

          const roleHeader = document.createElement("div");
          roleHeader.className = "company-group-role-header";

          const roleTitle = document.createElement("span");
          roleTitle.className = "company-group-role-title";
          roleTitle.textContent = app.role;
          roleHeader.appendChild(roleTitle);

          if (app.sourceUrl) {
            const link = document.createElement("a");
            link.className = "board-card-link";
            link.href = app.sourceUrl;
            link.target = "_blank";
            link.rel = "noreferrer";
            link.title = "Open job posting";
            link.textContent = "↗";
            link.style.width = "20px";
            link.style.height = "20px";
            link.style.fontSize = "10px";
            link.addEventListener("click", (e) => e.stopPropagation());
            roleHeader.appendChild(link);
          }

          roleRow.appendChild(roleHeader);

          const metaRow = document.createElement("div");
          metaRow.className = "company-group-role-meta";

          if (app.location) {
            const loc = document.createElement("span");
            loc.className = "board-card-meta-item";
            loc.style.padding = "1px 5px";
            loc.style.fontSize = "9px";
            loc.innerHTML = `📍 ${app.location}`;
            metaRow.appendChild(loc);
          }
          if (app.salary) {
            const sal = document.createElement("span");
            sal.className = "board-card-meta-item";
            sal.style.padding = "1px 5px";
            sal.style.fontSize = "9px";
            sal.innerHTML = `💰 ${app.salary}`;
            metaRow.appendChild(sal);
          }

          const stageDateBadge = getStageDateBadge(app);
          if (stageDateBadge) {
            const dateBadge = document.createElement("span");
            dateBadge.className = "board-card-meta-item";
            dateBadge.style.padding = "1px 5px";
            dateBadge.style.fontSize = "9px";
            dateBadge.textContent = stageDateBadge.label;
            dateBadge.title = stageDateBadge.title;
            metaRow.appendChild(dateBadge);
          }



          if (metaRow.children.length > 0) {
            roleRow.appendChild(metaRow);
          }

          roleRow.addEventListener("click", (e) => {
            e.stopPropagation();
            openDrawer(app.id);
          });

          roleRow.addEventListener("dragstart", (e) => {
            e.stopPropagation();
            state.dragId = app.id;
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", app.id);
            setTimeout(() => roleRow.classList.add("dragging"), 0);
          });

          roleRow.addEventListener("dragend", () => {
            roleRow.classList.remove("dragging");
          });

          rolesContainer.appendChild(roleRow);
        });

        companyCard.appendChild(rolesContainer);

        list.appendChild(companyCard);
      });
    } else {
      groupKeys.forEach((key) => {
        const groupHeader = document.createElement("div");
        groupHeader.className = "board-group-header";

        const title = document.createElement("span");
        title.className = "board-group-title";
        title.textContent = key.toUpperCase();

        const count = document.createElement("span");
        count.className = "board-group-count";
        count.textContent = groups[key].length;

        groupHeader.append(title, count);
        list.appendChild(groupHeader);

        groups[key].forEach((app) => {
          list.appendChild(makeCard(app));
        });
      });
    }
  }

  col.append(header, list);

  col.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    col.classList.add("drag-over");
  });

  col.addEventListener("dragleave", (e) => {
    if (!col.contains(e.relatedTarget)) col.classList.remove("drag-over");
  });

  col.addEventListener("drop", async (e) => {
    e.preventDefault();
    col.classList.remove("drag-over");
    if (state.dragId) {
      const app = state.applications.find((a) => a.id === state.dragId);
      if (app && app.status !== status) {
        await updateStatus(state.dragId, status);
      }
    }
    state.dragId = null;
  });

  return col;
}

// ── Board card ─────────────────────────────────────────────────
function makeCard(app) {
  const btn = document.createElement("button");
  btn.className = "board-card";
  btn.type = "button";
  btn.draggable = true;
  btn.dataset.id = app.id;

  // Header with dynamic company initials avatar
  const header = document.createElement("div");
  header.className = "board-card-header";

  const avatar = document.createElement("div");
  avatar.className = "board-card-avatar";
  avatar.style.backgroundColor = getCompanyColor(app.company);
  avatar.textContent = (app.company || "?").charAt(0);

  const titleWrap = document.createElement("div");
  titleWrap.className = "board-card-title";

  const company = document.createElement("strong");
  company.textContent = app.company;

  const role = document.createElement("span");
  role.textContent = app.role;

  titleWrap.append(company, role);
  header.append(avatar, titleWrap);

  // Top row: header + optional link icon
  const top = document.createElement("div");
  top.className = "board-card-top";
  top.appendChild(header);

  if (app.sourceUrl) {
    const link = document.createElement("a");
    link.className = "board-card-link";
    link.href = app.sourceUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.title = "Open job posting";
    link.textContent = "↗";
    link.addEventListener("click", (e) => e.stopPropagation());
    top.appendChild(link);
  }

  btn.appendChild(top);

  // Metadata row (Location, Salary, Date Applied)
  const metaRow = document.createElement("div");
  metaRow.className = "board-card-meta";

  if (app.location) {
    const locBadge = document.createElement("span");
    locBadge.className = "board-card-meta-item";
    locBadge.innerHTML = `📍 ${app.location}`;
    metaRow.appendChild(locBadge);
  }

  if (app.salary) {
    const salBadge = document.createElement("span");
    salBadge.className = "board-card-meta-item";
    salBadge.innerHTML = `💰 ${app.salary}`;
    metaRow.appendChild(salBadge);
  }

  const stageDateBadge = getStageDateBadge(app);
  if (stageDateBadge) {
    const dateBadge = document.createElement("span");
    dateBadge.className = "board-card-meta-item";
    dateBadge.textContent = stageDateBadge.label;
    dateBadge.title = stageDateBadge.title;
    metaRow.appendChild(dateBadge);
  }

  if (metaRow.children.length > 0) {
    btn.appendChild(metaRow);
  }



  // Skills tags (up to 4)
  const skills = Array.isArray(app.skills) ? app.skills : [];
  if (skills.length > 0) {
    const tagsRow = document.createElement("div");
    tagsRow.className = "board-card-skills";
    skills.slice(0, 4).forEach((skill) => {
      const tag = document.createElement("span");
      tag.className = "board-skill-tag";
      tag.textContent = skill;
      tagsRow.appendChild(tag);
    });
    btn.appendChild(tagsRow);
  }

  btn.addEventListener("click", () => openDrawer(app.id));

  btn.addEventListener("dragstart", (e) => {
    state.dragId = app.id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", app.id);
    setTimeout(() => btn.classList.add("dragging"), 0);
  });

  btn.addEventListener("dragend", () => {
    btn.classList.remove("dragging");
  });

  return btn;
}

// ── Status update via drag ─────────────────────────────────────
async function updateStatus(id, newStatus) {
  const app = state.applications.find((a) => a.id === id);
  if (!app) return;
  try {
    const res = await fetch(`/api/applications/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...app, status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      state.applications = state.applications.map((a) => (a.id === id ? updated : a));
      render();
    }
  } catch {
    // ignore — board stays as-is
  }
}

// ── Drawer ─────────────────────────────────────────────────────
function openDrawer(id) {
  const app = state.applications.find((a) => a.id === id);
  if (!app) return;

  drawerMode.textContent = "Edit application";
  drawerTitle.textContent = `${app.company} — ${app.role}`;
  drawerDeleteBtn.hidden = false;

  const f = drawerForm.elements;
  f["id"].value         = app.id;
  f["company"].value    = app.company || "";
  f["role"].value       = app.role || "";
  f["status"].value     = app.status || "Applied";

  f["dateApplied"].value = app.dateApplied || datePart(getAppliedTimestamp(app)) || "";
  if (f["appliedAt"]) f["appliedAt"].value = isoToLocalDateTimeInput(getAppliedTimestamp(app));
  if (f["rejectedAt"]) f["rejectedAt"].value = isoToLocalDateTimeInput(getRejectedTimestamp(app));
  f["location"].value   = app.location || "";
  f["salary"].value     = app.salary || "";
  f["equity"].value     = app.equity || "";
  f["skills"].value     = Array.isArray(app.skills) ? app.skills.join(", ") : (app.skills || "");
  f["group"].value      = app.group || "";
  f["sourceUrl"].value  = app.sourceUrl || "";
  f["notes"].value      = app.notes || "";
  f["description"].value = app.description || "";
  renderStageDatesSummary(app);

  if (app.sourceUrl) {
    drawerOpenLink.href    = app.sourceUrl;
    drawerOpenLink.hidden  = false;
  } else {
    drawerOpenLink.hidden = true;
  }

  // Dynamic Gemma AI Evaluation toggle
  if (app.description && app.description.trim()) {
    gemmaEvalSection.hidden = false;
    dEvalProgress.hidden = true;
    if (state.evaluations[app.id]) {
      renderEvaluationResult(state.evaluations[app.id]);
      dEvaluateBtn.textContent = "Re-evaluate";
    } else {
      dEvaluationResult.replaceChildren();
      dEvaluateBtn.textContent = "Evaluate Role";
    }
  } else {
    gemmaEvalSection.hidden = true;
  }

  drawerFeedback.hidden = true;
  showDrawer();
}

function openNewDrawer() {
  drawerMode.textContent  = "New application";
  drawerTitle.textContent = "—";
  drawerDeleteBtn.hidden  = true;

  drawerForm.reset();
  const f = drawerForm.elements;
  f["id"].value          = "";
  f["status"].value      = "Applied";

  const now = new Date();
  const nowIso = now.toISOString();
  f["dateApplied"].value = todayString();
  if (f["appliedAt"]) f["appliedAt"].value = isoToLocalDateTimeInput(nowIso);
  if (f["rejectedAt"]) f["rejectedAt"].value = "";
  f["description"].value = "";
  renderStageDatesSummary({
    status: "Applied",
    dateApplied: todayString(),
    appliedAt: nowIso,
    stageDates: { Applied: todayString() },
    stageDateTimes: { Applied: nowIso },
  });

  gemmaEvalSection.hidden = true;
  drawerOpenLink.hidden  = true;
  drawerFeedback.hidden  = true;
  showDrawer();
}

function showDrawer() {
  detailDrawer.hidden  = false;
  drawerBackdrop.hidden = false;
}

function closeDrawer() {
  detailDrawer.hidden  = true;
  drawerBackdrop.hidden = true;
}

// ── Save ───────────────────────────────────────────────────────
async function handleSave(e) {
  e.preventDefault();
  const f   = drawerForm.elements;
  const id  = f["id"].value;

  const payload = {
    company:     f["company"].value.trim(),
    role:        f["role"].value.trim(),
    status:      f["status"].value,
    priority:    state.applications.find(a => a.id === id)?.priority || "Medium",
    dateApplied: f["dateApplied"].value,
    appliedAt:   localDateTimeInputToIso(f["appliedAt"]?.value),
    rejectedAt:  localDateTimeInputToIso(f["rejectedAt"]?.value),
    location:    f["location"].value.trim(),
    salary:      f["salary"].value.trim(),
    equity:      f["equity"].value.trim(),
    skills:      f["skills"].value.split(/[,;]+/).map((s) => s.trim()).filter(Boolean),
    group:       f["group"].value.trim(),
    sourceUrl:   f["sourceUrl"].value.trim(),
    notes:       f["notes"].value.trim(),
    description: f["description"].value,
    source:      f["sourceUrl"].value.trim() ? "Job page" : "Manual",
  };
  if (payload.appliedAt) payload.dateApplied = datePart(payload.appliedAt);

  if (id) payload.id = id;

  try {
    const url = id
      ? `/api/applications/${encodeURIComponent(id)}`
      : "/api/applications";
    const res = await fetch(url, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Save failed");

    const saved = await res.json();
    if (id) {
      state.applications = state.applications.map((a) => (a.id === id ? saved : a));
    } else {
      state.applications = [saved, ...state.applications];
    }
    render();
    closeDrawer();
  } catch {
    drawerFeedback.textContent = "Save failed. Is the server running?";
    drawerFeedback.hidden = false;
  }
}

// ── Delete ─────────────────────────────────────────────────────
async function handleDelete() {
  const id  = drawerForm.elements["id"].value;
  if (!id) return;
  const app = state.applications.find((a) => a.id === id);
  const label = app ? `${app.company} — ${app.role}` : "this application";
  if (!window.confirm(`Delete ${label}?`)) return;

  try {
    const res = await fetch(`/api/applications/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Delete failed");
    state.applications = state.applications.filter((a) => a.id !== id);
    render();
    closeDrawer();
  } catch {
    drawerFeedback.textContent = "Delete failed. Is the server running?";
    drawerFeedback.hidden = false;
  }
}

// ── Profile Settings ───────────────────────────────────────────
async function loadProfileIntoForm() {
  try {
    const res = await fetch("/api/profile");
    const profile = await res.json();
    const f = profileForm.elements;
    f["fullName"].value = profile.fullName || "";
    f["email"].value = profile.email || "";
    f["phone"].value = profile.phone || "";
    f["portfolio"].value = profile.portfolio || "";
    f["github"].value = profile.github || "";
    f["linkedin"].value = profile.linkedin || "";
    f["resumeText"].value = profile.resumeText || "";
    if (f["gemmaPrompt"]) {
      f["gemmaPrompt"].value = profile.gemmaPrompt || buildLegacyGemmaPrompt(profile);
    }

    // Demographic dropdowns
    if (f["legallyAuthorized"]) f["legallyAuthorized"].value = profile.legallyAuthorized || "Yes";
    if (f["requiresSponsorship"]) f["requiresSponsorship"].value = profile.requiresSponsorship || "No";
    if (f["gender"]) f["gender"].value = profile.gender || "Decline to Self-Identify";
    if (f["race"]) f["race"].value = profile.race || "Decline to Self-Identify";
    if (f["veteranStatus"]) f["veteranStatus"].value = profile.veteranStatus || "No";
    if (f["disabilityStatus"]) f["disabilityStatus"].value = profile.disabilityStatus || "No, I don't have a disability";
  } catch (error) {
    showProfileFeedback("Failed to load profile from server.", true);
  }
}

function buildLegacyGemmaPrompt(profile) {
  return `My profile:
${profile.about || ""}

My strongest fit:
${profile.strongFit || ""}

Selective fit:
${profile.selectiveFit || ""}

Weak fit:
${profile.weakFit || ""}

My background:
${profile.background || ""}`.trim();
}

async function handleProfileSave(e) {
  e.preventDefault();
  const f = profileForm.elements;
  const payload = {
    fullName: f["fullName"].value,
    email: f["email"].value,
    phone: f["phone"].value,
    portfolio: f["portfolio"].value,
    github: f["github"].value,
    linkedin: f["linkedin"].value,
    resumeText: f["resumeText"].value,
    gemmaPrompt: f["gemmaPrompt"] ? f["gemmaPrompt"].value : "",

    // Demographics
    legallyAuthorized: f["legallyAuthorized"] ? f["legallyAuthorized"].value : "Yes",
    requiresSponsorship: f["requiresSponsorship"] ? f["requiresSponsorship"].value : "No",
    gender: f["gender"] ? f["gender"].value : "Decline to Self-Identify",
    race: f["race"] ? f["race"].value : "Decline to Self-Identify",
    veteranStatus: f["veteranStatus"] ? f["veteranStatus"].value : "No",
    disabilityStatus: f["disabilityStatus"] ? f["disabilityStatus"].value : "No, I don't have a disability",
  };

  const saveBtn = document.getElementById("saveProfileBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Save failed");
    showProfileFeedback("Profile saved successfully!", false);
  } catch (error) {
    showProfileFeedback("Failed to save profile.", true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Profile";
  }
}

function showProfileFeedback(text, isError) {
  profileFeedback.textContent = text;
  profileFeedback.className = isError ? "profile-feedback error" : "profile-feedback";
  profileFeedback.hidden = false;
  setTimeout(() => {
    profileFeedback.hidden = true;
  }, 3000);
}

// ── Utils ──────────────────────────────────────────────────────
function todayString() {
  const d = new Date();
  return localDateString(d);
}

function localDateString(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateValue(value) {
  if (!value) return null;
  const raw = String(value);
  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

function parseDateTime(value) {
  const date = parseDateValue(value);
  return date ? date.getTime() : 0;
}

function datePart(value) {
  const date = parseDateValue(value);
  return date ? localDateString(date) : "";
}

function formatDateTimeShort(value) {
  const date = parseDateValue(value);
  if (!date) return "";
  const hasTime = !/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

function formatDateTimeLong(value) {
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
}

function formatAge(value) {
  const time = parseDateTime(value);
  if (!time) return "?";
  const days = Math.max(0, Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24)));
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function isoToLocalDateTimeInput(value) {
  const date = parseDateValue(value);
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function localDateTimeInputToIso(value) {
  const date = parseDateValue(value);
  return date ? date.toISOString() : "";
}

function isClassifiedCategory(value) {
  const category = String(value || "").trim();
  return Boolean(category && category.toLowerCase() !== "uncategorized" && category.toLowerCase() !== "no group");
}

function displayRoleCategory(app) {
  return canonicalRoleCategory(app.group) || "Uncategorized";
}

function canonicalRoleCategory(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const exact = [
    "Backend Engineering",
    "Platform Engineering",
    "Developer Productivity",
    "Infrastructure / SRE",
    "Staff / Principal IC",
    "Cloud / Architecture",
    "Solutions / Customer Engineering",
    "Product Management",
    "Data / AI / ML",
    "Frontend / Fullstack",
    "Security",
    "Leadership / Management",
    "Mobile",
    "Other / Poor Fit",
  ].find((category) => category.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;

  const legacy = raw.toLowerCase();
  if (legacy === "platform/devops" || legacy === "platform / devops") return "Platform Engineering";
  if (legacy === "frontend/fullstack" || legacy === "frontend / fullstack") return "Frontend / Fullstack";
  if (legacy === "data/analytics" || legacy === "data / analytics") return "Data / AI / ML";
  if (legacy === "leadership") return "Leadership / Management";
  if (legacy === "other") return "Other / Poor Fit";
  return raw;
}

// ── Helper functions for dynamic UI features ─────────────────
function parseSalary(salaryStr) {
  if (!salaryStr) return 0;
  let cleanStr = salaryStr.replace(/[\s,]/g, "").toLowerCase();
  const regex = /(\d+(?:\.\d+)?)(k)?/g;
  let matches = [];
  let match;
  while ((match = regex.exec(cleanStr)) !== null) {
    let num = parseFloat(match[1]);
    if (match[2] === "k") {
      num *= 1000;
    } else if (num < 1000 && (cleanStr.includes("k") || salaryStr.toLowerCase().includes("k"))) {
      num *= 1000;
    }
    matches.push(num);
  }
  if (matches.length === 0) return 0;
  if (matches.length === 1) return matches[0];
  return (matches[0] + matches[1]) / 2;
}

function getCompanyColor(name) {
  if (!name) return "#73777F";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 45%)`;
}

function renderEvaluationResult(evalData) {
  dEvaluationResult.replaceChildren();
  
  if (!evalData || !evalData.ok) {
    const err = document.createElement("div");
    err.className = "eval-error";
    err.textContent = evalData?.error || "Gemma AI evaluation failed. Is Ollama running?";
    dEvaluationResult.appendChild(err);
    return;
  }

  const data = evalData.evaluation;
  if (!data) return;

  const verdictRow = document.createElement("div");
  verdictRow.className = "eval-verdict-row";

  // Left: Verdict badge
  const verdictHeader = document.createElement("div");
  verdictHeader.className = "eval-verdict-header";

  const verdictTitle = document.createElement("span");
  verdictTitle.className = "eval-verdict-title";
  verdictTitle.textContent = "Gemma Recommendation";

  const verdictBadge = document.createElement("span");
  verdictBadge.className = "eval-verdict-badge";
  verdictBadge.textContent = data.applyOrSkip || "Maybe";

  verdictHeader.append(verdictTitle, verdictBadge);

  // Right: Dynamic SVG Circular Progress Ring
  const score = data.matchScore || 0;
  const ringWrap = document.createElement("div");
  ringWrap.className = "ai-score-ring-wrap";
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
  dEvaluationResult.appendChild(verdictRow);

  const grid = document.createElement("div");
  grid.className = "eval-grid";

  const tileRemote = createEvalTile("Remote from Canada", `${data.remoteFromCanada || "unclear"} (${data.remoteFromCanadaReason || ""})`);
  const tileComp = createEvalTile("Comp ($180k+)", `${data.compensation180k || "unclear"} (${data.compensationReason || ""})`);
  const tileCat = createEvalTile("Role Category", data.roleCategory || "unknown");

  grid.append(tileRemote, tileComp, tileCat);
  dEvaluationResult.appendChild(grid);

  if (Array.isArray(data.strongMatches) && data.strongMatches.length > 0) {
    dEvaluationResult.appendChild(createEvalSection("Strong Matches", data.strongMatches));
  }

  if (Array.isArray(data.gapsRisks) && data.gapsRisks.length > 0) {
    dEvaluationResult.appendChild(createEvalSection("Gaps & Risks", data.gapsRisks));
  }

  if (Array.isArray(data.cvEmphasis) && data.cvEmphasis.length > 0) {
    dEvaluationResult.appendChild(createEvalSection("CV Emphasis", data.cvEmphasis));
  }

  if (data.recruiterMessage) {
    dEvaluationResult.appendChild(createEvalParagraphSection("Recruiter Message Pitch", data.recruiterMessage, true));
  }

  if (data.finalDecision) {
    dEvaluationResult.appendChild(createEvalParagraphSection("Final Decision", data.finalDecision));
  }
}

function createEvalTile(label, value) {
  const tile = document.createElement("div");
  tile.className = "eval-tile";
  const lbl = document.createElement("span");
  lbl.className = "eval-tile-label";
  lbl.textContent = label;
  const val = document.createElement("span");
  val.className = "eval-tile-value";
  val.textContent = value;
  tile.append(lbl, val);
  return tile;
}

function createEvalSection(title, listItems) {
  const sec = document.createElement("div");
  sec.className = "eval-section";
  const lbl = document.createElement("span");
  lbl.className = "eval-section-label";
  lbl.textContent = title;

  const ul = document.createElement("ul");
  listItems.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  });

  sec.append(lbl, ul);
  return sec;
}

function createEvalParagraphSection(title, text, showCopyButton = false) {
  const sec = document.createElement("div");
  sec.className = "eval-section";

  const header = document.createElement("div");
  header.className = "eval-section-header";

  const lbl = document.createElement("span");
  lbl.className = "eval-section-label";
  lbl.textContent = title;
  header.appendChild(lbl);

  if (showCopyButton && text) {
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-pitch-btn";
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
      } catch (e) {
        copyBtn.textContent = "❌ Failed";
      }
    });
    header.appendChild(copyBtn);
  }

  const p = document.createElement("p");
  p.textContent = text;

  sec.append(header, p);
  return sec;
}

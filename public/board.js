const STATUSES = ["Applied", "Interview", "Offer", "Rejected"];
const API = "/api/applications";

const state = {
  applications: [],
  selectedId: null,
  search: "",
  priority: "",
};

const els = {
  columns: document.querySelector("#boardColumns"),
  search: document.querySelector("#boardSearch"),
  priority: document.querySelector("#priorityFilter"),
  refresh: document.querySelector("#refreshBtn"),
  drawer: document.querySelector("#detailDrawer"),
  backdrop: document.querySelector("#drawerBackdrop"),
  drawerClose: document.querySelector("#drawerClose"),
  drawerCompany: document.querySelector("#drawerCompany"),
  drawerRole: document.querySelector("#drawerRole"),
  drawerStatus: document.querySelector("#drawerStatus"),
  drawerPriority: document.querySelector("#drawerPriority"),
  drawerLocation: document.querySelector("#drawerLocation"),
  drawerSalary: document.querySelector("#drawerSalary"),
  drawerDate: document.querySelector("#drawerDate"),
  drawerSkills: document.querySelector("#drawerSkills"),
  drawerNotes: document.querySelector("#drawerNotes"),
  drawerSave: document.querySelector("#drawerSave"),
  drawerLink: document.querySelector("#drawerLink"),
  drawerFeedback: document.querySelector("#drawerFeedback"),
};

// ── Boot ───────────────────────────────────────────────────────
init();

async function init() {
  els.search.addEventListener("input", () => { state.search = els.search.value.trim().toLowerCase(); render(); });
  els.priority.addEventListener("change", () => { state.priority = els.priority.value; render(); });
  els.refresh.addEventListener("click", loadApplications);
  els.drawerClose.addEventListener("click", closeDrawer);
  els.backdrop.addEventListener("click", closeDrawer);
  els.drawerSave.addEventListener("click", saveDrawer);

  await loadApplications();
  setInterval(loadApplicationsQuietly, 10000);
}

// ── Data ───────────────────────────────────────────────────────
async function loadApplications() {
  els.refresh.textContent = "Loading…";
  els.refresh.disabled = true;
  try {
    const res = await fetch(API);
    state.applications = await res.json();
    render();
  } catch {
    // silently fail
  } finally {
    els.refresh.textContent = "Refresh";
    els.refresh.disabled = false;
  }
}

async function loadApplicationsQuietly() {
  try {
    const res = await fetch(API);
    const next = await res.json();
    const currentFp = state.applications.map((a) => `${a.id}:${a.updatedAt}`).join("|");
    const nextFp = next.map((a) => `${a.id}:${a.updatedAt}`).join("|");
    if (currentFp !== nextFp) { state.applications = next; render(); }
  } catch { /* noop */ }
}

// ── Render ─────────────────────────────────────────────────────
function render() {
  const filtered = state.applications.filter((app) => {
    if (state.priority && app.priority !== state.priority) return false;
    if (state.search) {
      const hay = [app.company, app.role, app.location, app.notes, ...(app.skills || [])].join(" ").toLowerCase();
      if (!hay.includes(state.search)) return false;
    }
    return true;
  });

  const grouped = Object.fromEntries(STATUSES.map((s) => [s, []]));
  filtered.forEach((app) => { (grouped[app.status] || (grouped["Applied"] ??= [])).push(app); });

  els.columns.replaceChildren();

  STATUSES.forEach((status) => {
    const apps = grouped[status] || [];
    const col = makeColumn(status, apps);
    els.columns.appendChild(col);
  });
}

function makeColumn(status, apps) {
  const col = el("article", "col");
  col.dataset.status = status;

  const header = el("div", "col-header");
  const label = el("span", "col-label");
  label.textContent = status;
  const count = el("span", "col-count");
  count.textContent = String(apps.length);
  header.append(label, count);

  const cards = el("div", "col-cards");

  if (apps.length === 0) {
    const empty = el("div", "col-empty");
    empty.textContent = "No applications";
    cards.appendChild(empty);
  } else {
    apps.forEach((app) => cards.appendChild(makeCard(app)));
  }

  col.append(header, cards);
  return col;
}

function makeCard(app) {
  const card = el("div", "card");
  card.addEventListener("click", () => openDrawer(app.id));

  // Top row: company + priority badge
  const top = el("div", "card-top");
  const info = el("div", "");
  const company = el("div", "card-company");
  company.textContent = app.company || "—";
  const role = el("div", "card-role");
  role.textContent = app.role || "";
  info.append(company, role);

  const badge = el("span", `priority-badge ${(app.priority || "medium").toLowerCase()}`);
  badge.textContent = app.priority || "Medium";
  top.append(info, badge);

  // Meta: location · salary · date
  const meta = el("div", "card-meta");
  if (app.location) { const loc = el("span", ""); loc.textContent = app.location; meta.appendChild(loc); }
  if (app.salary) { const sal = el("span", ""); sal.textContent = app.salary; meta.appendChild(sal); }
  let formattedDate = "";
  let isAppliedDate = false;
  if (app.dateApplied) {
    formattedDate = formatDate(app.dateApplied);
    isAppliedDate = true;
  } else {
    const fallbackDateStr = app.createdAt || app.updatedAt;
    if (fallbackDateStr) {
      try {
        const dateObj = new Date(fallbackDateStr);
        formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } catch (e) {
        formattedDate = fallbackDateStr;
      }
    }
  }

  if (formattedDate) {
    const d = el("span", "");
    d.textContent = `${isAppliedDate ? "" : "Saved: "}${formattedDate}`;
    meta.appendChild(d);
  }

  // Skills
  const skillList = el("div", "card-skills");
  (app.skills || []).slice(0, 5).forEach((s) => {
    const chip = el("span", "skill-chip");
    chip.textContent = s;
    skillList.appendChild(chip);
  });

  card.append(top);
  if (meta.childElementCount > 0) card.appendChild(meta);
  if (skillList.childElementCount > 0) card.appendChild(skillList);

  return card;
}

// ── Drawer ─────────────────────────────────────────────────────
function openDrawer(id) {
  const app = state.applications.find((a) => a.id === id);
  if (!app) return;
  state.selectedId = id;

  els.drawerCompany.textContent = app.company || "";
  els.drawerRole.textContent = app.role || "";
  els.drawerStatus.value = app.status || "Applied";
  els.drawerPriority.value = app.priority || "Medium";
  els.drawerLocation.textContent = app.location || "—";
  els.drawerSalary.textContent = app.salary || "—";
  els.drawerDate.textContent = app.dateApplied ? formatDate(app.dateApplied) : "—";
  els.drawerNotes.value = app.notes || "";

  els.drawerSkills.replaceChildren();
  (app.skills || []).forEach((s) => {
    const chip = el("span", "skill-chip");
    chip.textContent = s;
    els.drawerSkills.appendChild(chip);
  });

  if (app.sourceUrl) {
    els.drawerLink.href = app.sourceUrl;
    els.drawerLink.hidden = false;
  } else {
    els.drawerLink.hidden = true;
  }

  els.drawerFeedback.hidden = true;
  els.drawer.hidden = false;
  els.backdrop.hidden = false;
}

function closeDrawer() {
  els.drawer.hidden = true;
  els.backdrop.hidden = true;
  state.selectedId = null;
}

async function saveDrawer() {
  const id = state.selectedId;
  if (!id) return;

  const app = state.applications.find((a) => a.id === id);
  if (!app) return;

  els.drawerSave.disabled = true;
  els.drawerSave.textContent = "Saving…";

  const payload = {
    ...app,
    status: els.drawerStatus.value,
    priority: els.drawerPriority.value,
    notes: els.drawerNotes.value,
  };

  try {
    const res = await fetch(`${API}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await loadApplications();
    openDrawer(id);
    showFeedback("Saved.", false);
  } catch {
    showFeedback("Save failed — tracker not running?", true);
  } finally {
    els.drawerSave.disabled = false;
    els.drawerSave.textContent = "Save changes";
  }
}

function showFeedback(text, isError) {
  els.drawerFeedback.textContent = text;
  els.drawerFeedback.className = isError ? "drawer-feedback error" : "drawer-feedback";
  els.drawerFeedback.hidden = false;
  setTimeout(() => { els.drawerFeedback.hidden = true; }, 3000);
}

// ── Utils ──────────────────────────────────────────────────────
function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function formatDate(iso) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

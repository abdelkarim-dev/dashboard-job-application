# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Claire" — a **local** job-hunt tracker. Three independently-loaded parts that all talk over `http://127.0.0.1:8787`:

1. **Dashboard SPA** (`src/`) — Vite + React 19, hash-routed single page.
2. **Server** (`server.mjs` + `lib/`) — a thin Express transport layer (~650 lines) over focused domain modules under `lib/`, SQLite-backed, also a local-Gemma proxy and a Python/Java code runner.
3. **Chrome extension** (`extension/`) — MV3, captures job postings, autofills application forms, scores listings via Gemma.

Everything runs on the user's machine against their own data (`data/cockpit.db`). There is no cloud backend and no auth.

## Commands

```bash
npm install
npm start          # node server.mjs — serves dist/ on http://127.0.0.1:8787 (build first)
npm run build      # vite build -> dist/
npm run dev        # server (8787) + vite dev (5173, proxies /api & /vendor to 8787, hot reload)
npm test           # node --test — discovers test/*.test.mjs (incl. http-smoke, which boots the app)
npm run check      # syntax-only: node --check on server.mjs, database.mjs, lib/**, + extension/content.js
```

Run one test file or one test:

```bash
node --test test/server.test.mjs
node --test --test-name-pattern="CSV export includes full timestamp columns"
```

**Node 22+ is required.** `database.mjs` uses the built-in `node:sqlite` (`DatabaseSync`) — there is intentionally **no** `better-sqlite3`/`sql.js` dependency. Don't add one.

## Server architecture (`server.mjs` + `lib/`)

`server.mjs` (~650 lines) is a thin transport layer: it wires Express, runs the dispatch ladder (`handleApi`), defines `startServer`, and re-exports the test contract. All logic lives in `lib/`:

```
lib/core/        util.mjs (pure primitives), dates.mjs, http.mjs (send/sendJson/readBody),
                 java-types.mjs (Java type-inference leaf shared by scaffolding + runner)
lib/data/        storage.mjs — JSON-store-over-SQLite dispatch + typed load/save accessors
lib/domain/      applications.mjs, profile.mjs, practice.mjs, problems.mjs (seed bank +
                 starter-code scaffolding), calendar.mjs
lib/code-runner/ process.mjs, python.mjs, java.mjs, solid.mjs
lib/gemma.mjs    the local-AI proxy (controller + providers + prompts + features)
```

The dependency graph is acyclic and strictly downward: `core` ← `domain`/`data` ← `code-runner` ← `gemma` ← `server.mjs`. Nothing in `lib/` imports `server.mjs`.

- **Routing is a manual dispatch chain, not `app.get`/`app.post`.** `handleApi` in `server.mjs` runs a long `if (url.pathname === "/api/..." && req.method === "...")` ladder. To add an endpoint, add a branch in that ladder and import any helper it needs from the relevant `lib/` module — don't register a new route.
- **Static + SPA fallback:** `/vendor/ace` → ace-builds; `express.static(dist)`; everything else falls back to `dist/index.html`. So the dashboard must be built before `npm start` serves it.
- **Pure helpers are unit-tested directly via `server.mjs`'s re-export block** (e.g. `normalizeApplication`, `migrateApplications`, `simplifyStatus`, `runPythonProblem`, `buildPracticeStats`). `test/server.test.mjs` imports them from `../server.mjs`, which re-exports them from their `lib/` module — so **keep the re-export block in sync** when moving a tested symbol. The server only boots as the main module (`startServer()` at the bottom). `test/http-smoke.test.mjs` boots the app against a temp DB and hits every route — the safety net for the dispatch ladder.
- **Local Gemma proxy (`lib/gemma.mjs`):** `runGemmaControlled` enforces **single-flight** (one Gemma task at a time; concurrent calls get `{ busy: true }`) plus a short TTL cache (`GEMMA_CACHE_TTL_MS`, default 30 min). The `activeGemmaTask`/`gemmaCache` state are module-level singletons — keep them so. Targets Ollama (`:11434`) or an OpenAI-compatible server (`:1234`). Overrides: `GEMMA_MODEL`, `OLLAMA_URL`, `LOCAL_AI_URL`. Gemma is opt-in per request; rules-based extraction is the default path.
- **Code runner (`lib/code-runner/`):** practice/SOLID submissions are compiled and run via `spawn` (`python3`, `javac`+`java`) in a `mkdtemp` sandbox with a timeout and `SIGKILL` (`process.mjs`). The Java test harness is generated from the problem definition (`java.mjs` + `core/java-types.mjs`).

## Data & persistence

- **SQLite is the source of truth** (`database.mjs`, tables: applications, profile, practice_problems, courses, system_design, app_settings, profile_cvs). `initDatabase()` creates tables, runs additive `ensureColumn` migrations, and a one-time `performLegacyMigration()` from old JSON files. Generic `app_settings` key/value access goes through `sqlLoadSetting`/`sqlSaveSetting` — keep raw `db.prepare` out of the HTTP layer. The `*File` path constants now live in `lib/data/storage.mjs` and are just dispatch keys for `readJsonFile`/`writeJsonFile`, which route to SQLite — actual storage is SQLite. (The Google Calendar token is still a real JSON file; `storage.mjs` computes its own `__dirname` so `dataDir` resolves to the repo `data/` dir from `lib/data/`.)
- **`COCKPIT_DB_PATH`** overrides the DB location and **must be set before importing `database.mjs`** (the path resolves lazily in `initDatabase`). Tests point it at a temp file.
- **`src/lib/metrics.mjs` is shared by the React app AND the Node test runner.** Keep it pure and free of any React/DOM references. Time-based helpers take an injectable `now` so tests stay deterministic — preserve that.
- **Status vocabulary is deliberately small.** Full pipeline (`PIPELINE_STATUSES`: Applied → Online Assessment → Recruiter Screen → Interview → Offer / Rejected) is collapsed to the dashboard's display set by `simplifyStatus`. Per-stage timestamps live in `stageDateTimes`; `appliedAt`/`rejectedAt` are tracked separately. When touching status logic, update `normalizeApplication` and its tests together.

## Chrome extension (`extension/`, MV3)

- **`content.js` is injected into every frame** (`all_frames: true`). The `IS_TOP_FRAME` constant gates behavior: only the top frame owns visible UI (toolbar, side panel, toasts); **subframes exist to detect and autofill application forms**, because ATS forms (Greenhouse, etc.) commonly render inside iframes.
- **Always call the server with absolute URLs** (`http://127.0.0.1:8787/...`). Content scripts run in the page's origin, so relative URLs hit the wrong host — this has regressed before (CV injection bug). Some requests are proxied through `background.js` to dodge page CSP.
- **The action button toggles a floating in-page toolbar**, not a popup — clicking the icon sends `TOGGLE_TOOLBAR` (injecting `content.js` first if needed). `popup.html` exists but is not the default surface.
- **`background.js`** (service worker) handles the toolbar toggle, the per-tab badge, message routing, and opening/focusing the dashboard tab (`?openApp=<id>#/dashboard`, or a `JH_OPEN_DRAWER` postMessage to an already-open tab).
- **Bump `manifest.json` `version` per shipped change** (currently 1.4.x), and reload at `chrome://extensions` after editing `extension/*.js` — Chrome does not hot-reload it.

## Committing — do this proactively, without being asked

**After finishing any discrete change, commit it.** The user should not have to ask every time — treat "the work is done and verified" as the trigger to commit. Use a clear message describing what changed.

A parallel Claude session sometimes shares this checkout (it owns the server/dashboard: `server.mjs`, `src/`, `database.mjs`, `test/`), so commit defensively:

- **Never `git add -A`, `git commit -am`, or `git checkout`/branch-switch.** Branch-switching moves the shared working tree and disrupts the other session. Commit on the **current branch**.
- **Stage only the files you changed, by explicit path**, and commit with a pathspec so nothing the other session has staged gets swept in:
  ```bash
  git commit -m "Extension: <what changed>" -- extension/content.js extension/manifest.json extension/background.js
  ```
- Leave the parallel session's files (`server.mjs`, `src/components/*`, `database.mjs`, `test/*`) and untracked `.claude/` alone unless they are genuinely your change.
- Bump `extension/manifest.json` `version` for each shipped extension change before committing.

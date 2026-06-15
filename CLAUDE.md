# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Claire" — a **local** job-hunt tracker. Three independently-loaded parts that all talk over `http://127.0.0.1:8787`:

1. **Dashboard SPA** (`src/`) — Vite + React 19, hash-routed single page.
2. **Server** (`server.mjs` facade → `server/` routes + `lib/` domain) — a thin Express transport layer (TypeScript, run via **tsx**) over focused domain modules under `lib/`, SQLite-backed, also a local-Gemma proxy and a Python/Java code runner.
3. **Chrome extension** (`extension/`) — MV3, captures job postings, autofills application forms, scores listings via Gemma.

Everything runs on the user's machine against their own data (`data/cockpit.db`). There is no cloud backend and no auth.

## Commands

```bash
npm install
npm start          # tsx server.mjs — serves dist/ on http://127.0.0.1:8787 (build first)
npm run build      # vite build -> dist/
npm run dev        # server (tsx watch, 8787) + vite dev (5173, proxies /api & /vendor to 8787, hot reload)
npm test           # node --import tsx --test — discovers test/*.test.mjs (incl. http-smoke, which boots the app)
npm run check      # syntax-only: node --check on the .mjs facades + lib/** + extension/content.js (the .ts tree is covered by typecheck)
npm run typecheck  # tsc --noEmit — type-checks the .ts/.tsx files incl. server/** and db/** (see TypeScript below)
```

The server-side code is TypeScript run **directly via `tsx`** (no build step) — the `.mjs` facades (`server.mjs`, `database.mjs`) import the `.ts` tree, so the test runner must also load tsx. Run one test file or one test:

```bash
node --import tsx --test test/server.test.mjs
node --import tsx --test --test-name-pattern="CSV export includes full timestamp columns"
```

**Node 22+ is required.** `db/connection.ts` uses the built-in `node:sqlite` (`DatabaseSync`) — there is intentionally **no** `better-sqlite3`/`sql.js` dependency. Don't add one.

## TypeScript + tsx runtime

TypeScript is adopted **file-by-file**, not all at once. The existing `.mjs`/`.jsx` files keep working untouched; new code is written in `.ts`/`.tsx`. The server-side split (`server/**`, `db/**`) is fully TypeScript; the `lib/**` domain modules and the two root facades stay `.mjs` for now.

- **The server runs via `tsx`, not plain `node`.** `npm start`/`dev:server` use `tsx server.mjs` and `npm test` uses `node --import tsx --test`. This is required because the `.mjs` facades (`server.mjs`, `database.mjs`) re-export from the `.ts` tree — plain `node` can't load `.ts`, but tsx transpiles on the fly. There is still **no build/emit step** for the server.
- **Client TS** is transpiled by Vite/esbuild as part of `npm run build`/`dev` — also no `tsc` emit.
- **Type-checking is separate from running:** `npm run typecheck` = `tsc --noEmit`. `tsconfig.json` (repo root): `strict` (+ `noUncheckedIndexedAccess`, `noUnusedParameters`, `verbatimModuleSyntax`, `isolatedModules`), `jsx: react-jsx`, `moduleResolution: bundler`, `allowImportingTsExtensions` (so the `.mjs` facades may `export * from "./db/index.ts"`), `allowJs: true` + `checkJs: false` (so `.js`/`.jsx`/`.mjs` are resolved for imports but **not** type-checked). `include` covers `src/**`, `server/**`, and `db/**`. New `.ts` files under those roots are type-checked automatically.
- **Strict-mode gotchas in the server/db TS:** SQLite rows come back as `Record<string, SQLOutputValue>`, so repositories cast `.all()/.get()` to small `*Row` interfaces in `db/types.ts`. Data crossing the untyped `lib/**` (`.mjs`) boundary is `any`, so route-handler array callbacks annotate params (`(app: any) => ...`). Regex capture groups are `string | undefined` → use `match[1]!`. Unused params get a leading `_`. Express is treated as untyped via `server/express.d.ts` (`declare module "express"`).
- **Tooling in `devDependencies`:** `typescript`, `tsx`, `@types/react`, `@types/react-dom`, `@types/node`. If `tsx`/`tsc` is missing, run `npm install`.

## Server architecture (`server.mjs` facade → `server/` + `lib/`)

`server.mjs` is now a thin **facade** (`.mjs`): it re-exports `startServer` plus the pure domain helpers the tests import, and boots only when run directly. The Express transport layer lives in `server/` (TypeScript); the domain logic lives in `lib/` (`.mjs`):

```
server/app.ts        createApp() + startServer() + Express wiring (middleware, static, error handler)
server/router.ts     handleApi — ordered RouteHandler chain + 404 fallthrough
server/routes/*.ts   one handler per domain: health, profile, applications, practice,
                     solid, study-plans, learning, calendar, ai
server/config.ts     port / role-category batch size (+ .env loading via process.loadEnvFile)
server/types.ts      RouteHandler + minimal ApiRequest/ApiResponse (express is untyped)

lib/core/        util.mjs (pure primitives), dates.mjs, http.mjs (send/sendJson/readBody),
                 security.mjs (API CORS/origin guard + code-runner flag),
                 java-types.mjs (Java type-inference leaf shared by scaffolding + runner)
lib/data/        storage.mjs — JSON-store-over-SQLite dispatch + typed load/save accessors
lib/domain/      applications.mjs, profile.mjs, practice.mjs, problems.mjs (seed bank +
                 starter-code scaffolding), calendar.mjs, studyPlans.mjs
lib/code-runner/ process.mjs, python.mjs, java.mjs, solid.mjs
lib/gemma.mjs    the local-AI proxy (controller + providers + prompts + features)
```

The dependency graph is acyclic and strictly downward: `lib/core` ← `lib/domain`/`lib/data` ← `lib/code-runner` ← `lib/gemma` ← `server/` ← `server.mjs`. Nothing in `lib/` imports `server/` or the facades.

- **Routing is a manual dispatch chain, not `app.get`/`app.post`.** `server/router.ts` holds an ordered array of `RouteHandler`s and calls each until one returns `true` (handled), else 404. Each `server/routes/<domain>.ts` is one handler that runs an `if (url.pathname === "/api/..." && req.method === "...")` ladder and `sendJson(...); return true;` when it owns the request — domains address disjoint path prefixes, so order isn't load-bearing. **To add an endpoint:** add a branch to the relevant route module (or add a new module and register it in `router.ts`'s array), importing helpers from `lib/`.
- **Static + SPA fallback:** `/vendor/ace` → ace-builds; `express.static(dist)`; everything else falls back to `dist/index.html`. So the dashboard must be built before `npm start` serves it.
- **Pure helpers are unit-tested directly via `server.mjs`'s re-export block** (e.g. `normalizeApplication`, `migrateApplications`, `simplifyStatus`, `runPythonProblem`, `buildPracticeStats`). `test/server.test.mjs` imports them from `../server.mjs`, which re-exports them from their `lib/` module — so **keep the re-export block in sync** when moving a tested symbol. The server only boots as the main module (`startServer()` at the bottom of the facade). `test/http-smoke.test.mjs` boots the app against a temp DB and hits every route — the safety net for the route modules.
- **Local Gemma proxy (`lib/gemma.mjs`):** `runGemmaControlled` enforces **single-flight** (one Gemma task at a time; concurrent calls get `{ busy: true }`) plus a short TTL cache (`GEMMA_CACHE_TTL_MS`, default 30 min). The `activeGemmaTask`/`gemmaCache` state are module-level singletons — keep them so. Targets Ollama (`:11434`) or an OpenAI-compatible server (`:1234`). Overrides: `GEMMA_MODEL`, `OLLAMA_URL`, `LOCAL_AI_URL`. Gemma is opt-in per request; rules-based extraction is the default path.
- **Code runner (`lib/code-runner/`):** practice/SOLID submissions are compiled and run via `spawn` (`python3`, `javac`+`java`) in a `mkdtemp` sandbox with a timeout and `SIGKILL` (`process.mjs`). The Java test harness is generated from the problem definition (`java.mjs` + `core/java-types.mjs`).

## Data & persistence

- **SQLite is the source of truth.** `database.mjs` is now a thin **facade** (`.mjs`) re-exporting from the `db/` TypeScript tree (tables: applications, profile, practice_problems, courses, system_design, app_settings, profile_cvs):
  ```
  db/connection.ts        lazy SQLite handle — resolveDbPath / openDatabase / getDb (shared singleton)
  db/schema.ts            createSchema() — table creation + additive ensureColumn migrations
  db/legacy-migration.ts  one-time performLegacyMigration() from old JSON files
  db/seed.ts              seedLearningData() — default courses + system-design topics
  db/repositories/*.ts    typed sql* load/save accessors per table (cast rows to db/types.ts shapes)
  db/index.ts             composes initDatabase() + re-exports the accessors
  ```
  `initDatabase()` = `openDatabase()` → `createSchema()` → `performLegacyMigration()` → `seedLearningData()`. Repositories reach the handle via `getDb()` — keep raw `db.prepare` out of the HTTP layer; generic `app_settings` key/value access goes through `sqlLoadSetting`/`sqlSaveSetting`. The `*File` path constants live in `lib/data/storage.mjs` and are just dispatch keys for `readJsonFile`/`writeJsonFile`, which route to SQLite. (The Google Calendar token is still a real JSON file; `storage.mjs` computes its own `__dirname` so `dataDir` resolves to the repo `data/` dir from `lib/data/`.)
- **`COCKPIT_DB_PATH`** overrides the DB location and **must be set before `initDatabase()` runs** (the path resolves lazily in `db/connection.ts`'s `openDatabase`). Tests point it at a temp file.
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

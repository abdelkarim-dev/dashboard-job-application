# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Claire" — a **local** job-hunt tracker. The tree is grouped by concern into three top-level folders, all talking over `http://127.0.0.1:8787`:

1. **`front/`** — the dashboard SPA (`front/index.html` + `front/src/`), Vite + React 19, hash-routed single page.
2. **`back/`** — the server (`back/server.mjs` facade → `back/server/` routes + `back/lib/` domain + `back/db/` persistence). A thin Express transport layer (TypeScript, run via **tsx**) over focused domain modules, SQLite-backed; also a local-Gemma proxy and a Python/Java code runner. The database is part of the server, so it lives under `back/`.
3. **`extension/`** — Chrome MV3 extension: captures job postings, autofills application forms, scores listings via Gemma.

`data/` (the live `cockpit.db` + Google Calendar token), `dist/` (build output), and `node_modules/` stay at the repo root. There is no cloud backend and no auth — everything runs on the user's machine against their own data.

## Commands

```bash
npm install
npm start          # tsx back/server.mjs — serves dist/ on http://127.0.0.1:8787 (build first)
npm run build      # vite build (root: front/) -> repo-root dist/
npm run dev        # server (tsx watch back/server.mjs, 8787) + vite dev (5173, proxies /api & /vendor to 8787)
npm test           # node --import tsx --test over back/test/*.test.mjs front/test/*.test.mjs extension/test/*.test.mjs
npm run check      # syntax-only: node --check on the .mjs facades + back/lib/** + extension/{lib/extract,content}.js
npm run typecheck  # tsc --noEmit — type-checks the .ts/.tsx files incl. back/server/** and back/db/** (see TypeScript below)
```

The server-side code is TypeScript run **directly via `tsx`** (no build step) — the `.mjs` facades (`back/server.mjs`, `back/database.mjs`) import the `.ts` tree, so the test runner must also load tsx. Run one test file or one test:

```bash
node --import tsx --test back/test/server.test.mjs
node --import tsx --test back/test/server.test.mjs --test-name-pattern="CSV export includes full timestamp columns"
```

**Node 22+ is required.** `back/db/connection.ts` uses the built-in `node:sqlite` (`DatabaseSync`) — there is intentionally **no** `better-sqlite3`/`sql.js` dependency. Don't add one.

## TypeScript + tsx runtime

TypeScript is adopted **file-by-file**, not all at once. The existing `.mjs`/`.jsx` files keep working untouched; new code is written in `.ts`/`.tsx`. The server-side split (`back/server/**`, `back/db/**`) is fully TypeScript; the `back/lib/**` domain modules and the two `.mjs` facades stay `.mjs` for now.

- **The server runs via `tsx`, not plain `node`.** `npm start`/`dev:server` use `tsx back/server.mjs` and `npm test` uses `node --import tsx --test`. This is required because the `.mjs` facades re-export from the `.ts` tree — plain `node` can't load `.ts`, but tsx transpiles on the fly. There is still **no build/emit step** for the server.
- **Client TS** is transpiled by Vite/esbuild as part of `npm run build`/`dev` — also no `tsc` emit.
- **Type-checking is separate from running:** `npm run typecheck` = `tsc --noEmit`. `tsconfig.json` (repo root): `strict` (+ `noUncheckedIndexedAccess`, `noUnusedParameters`, `verbatimModuleSyntax`, `isolatedModules`), `jsx: react-jsx`, `moduleResolution: bundler`, `allowImportingTsExtensions` (so the `.mjs` facades may `export * from "./db/index.ts"`), `allowJs: true` + `checkJs: false` (so `.js`/`.jsx`/`.mjs` are resolved for imports but **not** type-checked). `include` covers `front/src/**`, `back/server/**`, and `back/db/**`. New `.ts` files under those roots are type-checked automatically.
- **Strict-mode gotchas in the server/db TS:** SQLite rows come back as `Record<string, SQLOutputValue>`, so repositories cast `.all()/.get()` to small `*Row` interfaces in `back/db/types.ts`. Data crossing the untyped `back/lib/**` (`.mjs`) boundary is `any`, so route-handler array callbacks annotate params (`(app: any) => ...`). Regex capture groups are `string | undefined` → use `match[1]!`. Unused params get a leading `_`. Express is treated as untyped via `back/server/express.d.ts` (`declare module "express"`).
- **Tooling in `devDependencies`:** `typescript`, `tsx`, `@types/react`, `@types/react-dom`, `@types/node`. If `tsx`/`tsc` is missing, run `npm install`.

## Server architecture (`back/`)

`back/server.mjs` is a thin **facade** (`.mjs`): it re-exports `startServer` plus the pure domain helpers the tests import, and boots only when run directly. The Express transport layer lives in `back/server/` (TypeScript); the domain logic in `back/lib/` (`.mjs`); persistence in `back/db/` (TypeScript, see Data & persistence).

```
back/server/app.ts        createApp() + startServer() + Express wiring (middleware, static, error handler)
back/server/router.ts     handleApi — ordered RouteHandler chain + 404 fallthrough
back/server/routes/*.ts   one handler per domain: health, profile, applications, practice,
                          solid, study-plans, learning, calendar, ai
back/server/config.ts     port / role-category batch size (+ .env loading via process.loadEnvFile)
back/server/types.ts      RouteHandler + minimal ApiRequest/ApiResponse (express is untyped)

back/lib/core/        util.mjs (pure primitives), dates.mjs, http.mjs (send/sendJson/readBody),
                      security.mjs (API CORS/origin guard + code-runner flag),
                      java-types.mjs (Java type-inference leaf shared by scaffolding + runner)
back/lib/data/        storage.mjs — JSON-store-over-SQLite dispatch + typed load/save accessors
back/lib/domain/      applications.mjs, profile.mjs, practice.mjs, problems.mjs (seed bank +
                      starter-code scaffolding), calendar.mjs, studyPlans.mjs
back/lib/code-runner/ process.mjs, python.mjs, java.mjs, solid.mjs
back/lib/gemma.mjs    the local-AI proxy (controller + providers + prompts + features)
```

The dependency graph is acyclic and strictly downward: `back/lib/core` ← `back/lib/domain`/`back/lib/data` ← `back/lib/code-runner` ← `back/lib/gemma` ← `back/server/` ← `back/server.mjs`. Nothing in `back/lib/` imports `back/server/` or the facades.

- **Routing is a manual dispatch chain, not `app.get`/`app.post`.** `back/server/router.ts` holds an ordered array of `RouteHandler`s and calls each until one returns `true` (handled), else 404. Each `back/server/routes/<domain>.ts` is one handler that runs an `if (url.pathname === "/api/..." && req.method === "...")` ladder and `sendJson(...); return true;` when it owns the request — domains address disjoint path prefixes, so order isn't load-bearing. **To add an endpoint:** add a branch to the relevant route module (or add a new module and register it in `router.ts`'s array), importing helpers from `back/lib/`.
- **Static + SPA fallback:** `/vendor/ace` → ace-builds; `express.static(dist)`; everything else falls back to `dist/index.html`. So the dashboard must be built before `npm start` serves it. Path constants in `app.ts` resolve the repo root two levels up from `back/server/`.
- **Pure helpers are unit-tested directly via `back/server.mjs`'s re-export block** (e.g. `normalizeApplication`, `migrateApplications`, `simplifyStatus`, `runPythonProblem`, `buildPracticeStats`). `back/test/server.test.mjs` imports them from `../server.mjs`, which re-exports them from their `back/lib/` module — so **keep the re-export block in sync** when moving a tested symbol. The server only boots as the main module (`startServer()` at the bottom of the facade). `back/test/http-smoke.test.mjs` boots the app against a temp DB and hits every route — the safety net for the route modules.
- **Local Gemma proxy (`back/lib/gemma.mjs`):** `runGemmaControlled` enforces **single-flight** (one Gemma task at a time; concurrent calls get `{ busy: true }`) plus a short TTL cache (`GEMMA_CACHE_TTL_MS`, default 30 min). The `activeGemmaTask`/`gemmaCache` state are module-level singletons — keep them so. Targets Ollama (`:11434`) or an OpenAI-compatible server (`:1234`). Overrides: `GEMMA_MODEL`, `OLLAMA_URL`, `LOCAL_AI_URL`. Gemma is opt-in per request; rules-based extraction is the default path.
- **Code runner (`back/lib/code-runner/`):** practice/SOLID submissions are compiled and run via `spawn` (`python3`, `javac`+`java`) in a `mkdtemp` sandbox with a timeout and `SIGKILL` (`process.mjs`). The Java test harness is generated from the problem definition (`java.mjs` + `core/java-types.mjs`).

## Data & persistence

- **SQLite is the source of truth.** `back/database.mjs` is a thin **facade** (`.mjs`) re-exporting from the `back/db/` TypeScript tree (tables: applications, profile, practice_problems, courses, system_design, app_settings, profile_cvs):
  ```
  back/db/connection.ts        lazy SQLite handle — resolveDbPath / openDatabase / getDb (shared singleton)
  back/db/schema.ts            createSchema() — table creation + additive ensureColumn migrations
  back/db/legacy-migration.ts  one-time performLegacyMigration() from old JSON files
  back/db/seed.ts              seedLearningData() — default courses + system-design topics
  back/db/repositories/*.ts    typed sql* load/save accessors per table (cast rows to db/types.ts shapes)
  back/db/index.ts             composes initDatabase() + re-exports the accessors
  ```
  `initDatabase()` = `openDatabase()` → `createSchema()` → `performLegacyMigration()` → `seedLearningData()`. Repositories reach the handle via `getDb()` — keep raw `db.prepare` out of the HTTP layer; generic `app_settings` key/value access goes through `sqlLoadSetting`/`sqlSaveSetting`. The `*File` path constants live in `back/lib/data/storage.mjs` and are just dispatch keys for `readJsonFile`/`writeJsonFile`, which route to SQLite. (The Google Calendar token is still a real JSON file.) `data/` stays at the repo root; `connection.ts` (`back/db/`) and `storage.mjs` (`back/lib/data/`) each compute their own `__dirname` to resolve back up to it — mind the depth if you move them.
- **`COCKPIT_DB_PATH`** overrides the DB location and **must be set before `initDatabase()` runs** (the path resolves lazily in `back/db/connection.ts`'s `openDatabase`). Tests point it at a temp file.
- **`front/src/lib/metrics.mjs` is shared by the React app AND the Node test runner** (`front/test/metrics.test.mjs`). Keep it pure and free of any React/DOM references. Time-based helpers take an injectable `now` so tests stay deterministic — preserve that.
- **Status vocabulary is deliberately small.** Full pipeline (`PIPELINE_STATUSES`: Applied → Online Assessment → Recruiter Screen → Interview → Offer / Rejected) is collapsed to the dashboard's display set by `simplifyStatus`. Per-stage timestamps live in `stageDateTimes`; `appliedAt`/`rejectedAt` are tracked separately. When touching status logic, update `normalizeApplication` and its tests together.

## Chrome extension (`extension/`, MV3)

- **`content.js` is injected into every frame** (`all_frames: true`). The `IS_TOP_FRAME` constant gates behavior: only the top frame owns visible UI (toolbar, side panel, toasts); **subframes exist to detect and autofill application forms**, because ATS forms (Greenhouse, etc.) commonly render inside iframes.
- **Pure logic lives in `extension/lib/extract.js`.** Browser-free text/field/choice helpers (`clean`, `escapeHtml`, `escapeRegExp`, `isPlaceholderUrl`, `isGenericJobIdentity`, `cleanRole`, `findSalary`, `findLevel`, `denoiseLines`, the choice/option matchers like `normalizeChoiceText`/`choiceValueMeansYes`/`scoreOptionEntries`, …) were extracted from `content.js`. The file is listed **first** in `manifest.json`'s `content_scripts.js`, so the same global names stay defined and `content.js` calls them unchanged — only the definitions moved. It dual-exports via `module.exports` (guarded — a no-op in the browser where `module` is undefined), and `extension/package.json` marks the dir CommonJS so `extension/test/extract.test.mjs` (run by `npm test`) can import it. **DOM-coupled** helpers (`findCompany`, `cleanReadableText`, `serializeReadable`, the combobox/select pickers, …) deliberately stay in `content.js`. When adding a pure helper, prefer putting it in `extract.js` with a test; verify the split still loads with `cat extension/lib/extract.js extension/content.js | node --check -` (catches duplicate `const`/syntax across the shared scope).
- **Always call the server with absolute URLs** (`http://127.0.0.1:8787/...`). Content scripts run in the page's origin, so relative URLs hit the wrong host — this has regressed before (CV injection bug). Some requests are proxied through `background.js` to dodge page CSP.
- **The action button toggles a floating in-page toolbar**, not a popup — clicking the icon sends `TOGGLE_TOOLBAR` (injecting `content.js` first if needed). `popup.html` exists but is not the default surface.
- **`background.js`** (service worker) handles the toolbar toggle, the per-tab badge, message routing, and opening/focusing the dashboard tab (`?openApp=<id>#/dashboard`, or a `JH_OPEN_DRAWER` postMessage to an already-open tab).
- **Bump `manifest.json` `version` per shipped change** (currently 1.5.x), and reload at `chrome://extensions` after editing `extension/*.js` — Chrome does not hot-reload it.

## Committing — do this proactively, without being asked

**After finishing any discrete change, commit it.** The user should not have to ask every time — treat "the work is done and verified" as the trigger to commit. Use a clear message describing what changed.

A parallel Claude session sometimes shares this checkout (it owns the server/dashboard: `back/server.mjs`, `front/src/`, `back/database.mjs`, the `back/test/` + `front/test/` suites), so commit defensively:

- **Never `git add -A`, `git commit -am`, or `git checkout`/branch-switch.** Branch-switching moves the shared working tree and disrupts the other session. Commit on the **current branch**.
- **Stage only the files you changed, by explicit path**, and commit **with a pathspec** so nothing the other session has staged gets swept in (note: `git commit -- <paths>` records the *working-tree* content of those paths, so never list a path the other session has pending edits in):
  ```bash
  git commit -m "Extension: <what changed>" -- extension/content.js extension/manifest.json extension/lib/extract.js
  ```
- Leave the parallel session's files (`back/server.mjs`, `front/src/components/*`, `back/database.mjs`, `back/test/*`, `front/test/*`) and untracked `.claude/` alone unless they are genuinely your change.
- Bump `extension/manifest.json` `version` for each shipped extension change before committing.

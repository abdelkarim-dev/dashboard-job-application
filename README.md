# Job Hunt Cockpit

A local job-search tracker with a Chrome extension that captures the current job page into the app. The dashboard is a Vite + React app; the backend is a small Node server backed by SQLite.

## Run the local app

Install dependencies once:

```bash
npm install
```

Production-style run (serves the built dashboard from `dist/` on port 8787):

```bash
npm run build
npm start
```

Then open:

```text
http://127.0.0.1:8787
```

Development (server on 8787 + Vite dev server on 5173 with hot reload, API proxied):

```bash
npm run dev
```

The app stores its data locally in SQLite:

```text
data/cockpit.db
```

## Load the Chrome extension

1. Open Chrome and go to `chrome://extensions`.
2. Turn on Developer mode.
3. Choose Load unpacked.
4. Select this folder:

```text
job-hunt-cockpit/extension
```

After editing `extension/*.js`, return to `chrome://extensions` and click the reload icon on the card so the new code takes effect.

## Capture a job

1. Keep the local app running.
2. Open a job posting page.
3. Click the Job Hunt Cockpit Capture extension.
4. On the job page, use the floating Evaluate button when you want Gemma to score the current listing; it opens the side panel with the result.
5. Use Inject Form Fields only when you want the extension to fill visible application fields. The side panel lists every field it changed.
6. Review the extracted fields. The extension uses local rules by default; Gemma runs only when you click a Gemma action.
7. Pick one of the four statuses: Applied, Interview, Offer, or Rejected.
8. Click Save to tracker.

## Local Gemma support

The server tries local Gemma through:

```text
Ollama: http://127.0.0.1:11434
LM Studio/OpenAI-compatible: http://127.0.0.1:1234
```

Optional overrides:

```bash
GEMMA_MODEL=gemma3:4b node server.mjs
OLLAMA_URL=http://127.0.0.1:11434 node server.mjs
LOCAL_AI_URL=http://127.0.0.1:1234 node server.mjs
```

If Gemma is unavailable, the extension still works with rules-based extraction. The server also accepts only one Gemma request at a time and caches repeated prompts briefly so the laptop does not build up a heavy local-AI queue.

## Export

Use the Export JSON button in the app. The download includes export metadata and the full application records.

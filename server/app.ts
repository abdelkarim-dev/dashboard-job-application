import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { initDatabase } from "../database.mjs";
import { createApiSecurityMiddleware } from "../lib/core/security.mjs";
import { sendJson } from "../lib/core/http.mjs";
import { handleApi } from "./router";
import { port } from "./config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const aceDir = path.join(repoRoot, "node_modules", "ace-builds", "src-min-noconflict");
const distDir = path.join(repoRoot, "dist");

// Builds the Express app: security middleware, JSON body parsing, static serving
// (ace editor vendor + the built dashboard), the /api dispatch into the router,
// the SPA wildcard fallback, and the global error handler. Express is untyped
// here (see express.d.ts), so its callback params are annotated `any`.
export function createApp() {
  const app = express();

  app.use("/api", createApiSecurityMiddleware({ port } as any));
  app.use(express.json({ limit: "10mb" }));

  // Static serving
  app.use("/vendor/ace", express.static(aceDir));
  app.use(express.static(distDir));

  // API handler
  app.use("/api", async (req: any, res: any, next: (err?: unknown) => void) => {
    try {
      const url = new URL(req.originalUrl || req.url, `http://${req.headers.host || "127.0.0.1"}`);
      await handleApi(req, res, url);
    } catch (error) {
      next(error);
    }
  });

  // Single Page App wildcard fallback
  app.use((_req: any, res: any) => {
    res.sendFile(path.join(distDir, "index.html"));
  });

  // Global error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("Unhandled server error:", err);
    const status = err.status || err.statusCode || 500;
    const message = status === 413 ? "Request body too large" : "Server error";
    sendJson(res, status, { error: message });
  });

  return app;
}

let serverInstance: any = null;

export async function startServer(listenPort = port) {
  await initDatabase();
  const app = createApp();
  serverInstance = app.listen(listenPort, "127.0.0.1", () => {
    const actual = serverInstance.address()?.port ?? listenPort;
    console.log(`Claire (job hunt copilot) running at http://127.0.0.1:${actual}`);
  });
  return serverInstance;
}

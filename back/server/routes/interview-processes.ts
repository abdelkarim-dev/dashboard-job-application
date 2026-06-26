import { loadInterviewProcessesStore, saveInterviewProcessesStore } from "../../lib/data/storage.mjs";
import { normalizeInterviewProcess } from "../../lib/domain/interviewProcesses.mjs";
import { readBody, sendJson } from "../../lib/core/http.mjs";
import type { RouteHandler } from "../types";

// Interview processes — reusable, ordered step templates (e.g. "Toast: recruiter
// → coding → 5-round loop → manager → offer") defined once and assigned to
// applications. CRUD over the app_settings-backed store.
export const interviewProcessesRoutes: RouteHandler = async (req, res, url) => {
  if (url.pathname === "/api/interview-processes" && req.method === "GET") {
    const store = await loadInterviewProcessesStore();
    sendJson(res, 200, store);
    return true;
  }

  if (url.pathname === "/api/interview-processes" && req.method === "POST") {
    const input = await readBody(req);
    const store = await loadInterviewProcessesStore();
    const process = normalizeInterviewProcess(input);
    store.processes = [process, ...store.processes.filter((existing: any) => existing.id !== process.id)];
    const saved = await saveInterviewProcessesStore(store);
    sendJson(res, 201, saved.processes.find((existing: any) => existing.id === process.id) || process);
    return true;
  }

  const match = url.pathname.match(/^\/api\/interview-processes\/([^/]+)$/);
  if (match) {
    const id = decodeURIComponent(match[1]!);
    const store = await loadInterviewProcessesStore();
    const index = store.processes.findIndex((process: any) => process.id === id);
    if (index < 0) {
      sendJson(res, 404, { error: "Interview process not found" });
      return true;
    }
    if (req.method === "PUT") {
      const input = await readBody(req);
      const updated = normalizeInterviewProcess({ ...input, id }, store.processes[index]);
      store.processes[index] = updated;
      await saveInterviewProcessesStore(store);
      sendJson(res, 200, updated);
      return true;
    }
    if (req.method === "DELETE") {
      store.processes.splice(index, 1);
      await saveInterviewProcessesStore(store);
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  return false;
};

import { loadStudyPlansStore, saveStudyPlansStore } from "../../lib/data/storage.mjs";
import { normalizeStudyPlan } from "../../lib/domain/studyPlans.mjs";
import { readBody, sendJson } from "../../lib/core/http.mjs";
import type { RouteHandler } from "../types";

export const studyPlanRoutes: RouteHandler = async (req, res, url) => {
  // Study plans — curated, ordered lists of bank problems to train on as a flow.
  if (url.pathname === "/api/practice/plans" && req.method === "GET") {
    const store = await loadStudyPlansStore();
    sendJson(res, 200, store);
    return true;
  }

  if (url.pathname === "/api/practice/plans" && req.method === "POST") {
    const input = await readBody(req);
    const store = await loadStudyPlansStore();
    const plan = normalizeStudyPlan(input);
    store.plans = [plan, ...store.plans.filter((existing: any) => existing.id !== plan.id)];
    const saved = await saveStudyPlansStore(store);
    sendJson(res, 201, saved.plans.find((existing: any) => existing.id === plan.id) || plan);
    return true;
  }

  const studyPlanMatch = url.pathname.match(/^\/api\/practice\/plans\/([^/]+)$/);
  if (studyPlanMatch) {
    const id = decodeURIComponent(studyPlanMatch[1]!);
    const store = await loadStudyPlansStore();
    const index = store.plans.findIndex((plan: any) => plan.id === id);
    if (index < 0) {
      sendJson(res, 404, { error: "Study plan not found" });
      return true;
    }
    if (req.method === "PUT") {
      const input = await readBody(req);
      const updated = normalizeStudyPlan({ ...input, id }, store.plans[index]);
      store.plans[index] = updated;
      await saveStudyPlansStore(store);
      sendJson(res, 200, updated);
      return true;
    }
    if (req.method === "DELETE") {
      store.plans.splice(index, 1);
      await saveStudyPlansStore(store);
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  return false;
};

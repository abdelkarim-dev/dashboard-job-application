import { send, sendJson } from "../lib/core/http.mjs";
import type { ApiRequest, ApiResponse, RouteHandler } from "./types";
import { healthRoutes } from "./routes/health";
import { profileRoutes } from "./routes/profile";
import { applicationsRoutes } from "./routes/applications";
import { solidRoutes } from "./routes/solid";
import { practiceRoutes } from "./routes/practice";
import { studyPlanRoutes } from "./routes/study-plans";
import { interviewProcessesRoutes } from "./routes/interview-processes";
import { learningRoutes } from "./routes/learning";
import { calendarRoutes } from "./routes/calendar";
import { aiRoutes } from "./routes/ai";

// Ordered chain of domain handlers. Each returns true once it has sent a
// response; the router stops at the first that owns the request, otherwise 404.
// The domains address disjoint path prefixes, so order is not load-bearing — it
// simply mirrors the reading order of the original handleApi ladder.
const routes: RouteHandler[] = [
  healthRoutes,
  profileRoutes,
  applicationsRoutes,
  solidRoutes,
  practiceRoutes,
  studyPlanRoutes,
  interviewProcessesRoutes,
  learningRoutes,
  calendarRoutes,
  aiRoutes,
];

export async function handleApi(req: ApiRequest, res: ApiResponse, url: URL): Promise<void> {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }
  for (const route of routes) {
    if (await route(req, res, url)) return;
  }
  sendJson(res, 404, { error: "Not found" });
}

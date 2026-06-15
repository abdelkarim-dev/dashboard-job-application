import { sendJson } from "../../lib/core/http.mjs";
import type { RouteHandler } from "../types";

export const healthRoutes: RouteHandler = (_req, res, url) => {
  if (url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, app: "Claire" });
    return true;
  }
  return false;
};

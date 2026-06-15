import { loadProfile, saveProfile } from "../../lib/domain/profile.mjs";
import {
  sqlLoadCvMeta,
  sqlLoadCv,
  sqlSaveCv,
  sqlDeleteCv,
  sqlLoadSetting,
  sqlSaveSetting,
} from "../../database.mjs";
import { analyzeSkillsWithLocalGemma, gemmaStatus } from "../../lib/gemma.mjs";
import { readBody, sendJson } from "../../lib/core/http.mjs";
import type { RouteHandler } from "../types";

export const profileRoutes: RouteHandler = async (req, res, url) => {
  if (url.pathname === "/api/profile" && req.method === "GET") {
    sendJson(res, 200, await loadProfile());
    return true;
  }

  if (url.pathname === "/api/profile" && req.method === "POST") {
    const input = await readBody(req);
    await saveProfile(input);
    sendJson(res, 200, { ok: true });
    return true;
  }

  // CV file endpoints — stored separately from the main profile row
  if (url.pathname === "/api/profile/cv" && req.method === "GET") {
    sendJson(res, 200, await sqlLoadCvMeta());
    return true;
  }

  const cvVariantMatch = url.pathname.match(/^\/api\/profile\/cv\/(backend|architect)$/);
  if (cvVariantMatch) {
    const variant = cvVariantMatch[1]!;
    if (req.method === "GET") {
      const row = await sqlLoadCv(variant);
      if (!row) {
        sendJson(res, 404, { error: "No CV uploaded for this variant" });
        return true;
      }
      sendJson(res, 200, { variant: row.variant, fileName: row.fileName, mimeType: row.mimeType, data: row.data, uploadedAt: row.uploadedAt });
      return true;
    }
    if (req.method === "POST") {
      const input = await readBody(req);
      const { fileName, mimeType, data } = input || {};
      if (!fileName || !mimeType || !data) {
        sendJson(res, 400, { error: "fileName, mimeType and data are required" });
        return true;
      }
      await sqlSaveCv(variant, fileName, mimeType, data);
      sendJson(res, 200, { ok: true });
      return true;
    }
    if (req.method === "DELETE") {
      await sqlDeleteCv(variant);
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  if (url.pathname === "/api/skill-analysis" && req.method === "GET") {
    const value = await sqlLoadSetting("skill_analysis");
    if (value) {
      try {
        sendJson(res, 200, JSON.parse(value));
        return true;
      } catch {}
    }
    sendJson(res, 200, { cached: false });
    return true;
  }

  if (url.pathname === "/api/analyze-skills" && req.method === "POST") {
    const result = await analyzeSkillsWithLocalGemma();
    if (result.ok) {
      await sqlSaveSetting("skill_analysis", JSON.stringify(result));
    }
    sendJson(res, gemmaStatus(result), result);
    return true;
  }

  return false;
};

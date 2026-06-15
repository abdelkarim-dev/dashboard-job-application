import { readBody, send, sendJson } from "../../lib/core/http.mjs";
import { loadApplications, saveApplications, deleteApplication } from "../../lib/data/storage.mjs";
import { clean } from "../../lib/core/util.mjs";
import {
  sanitizeJobIdentityValue,
  inferCompanyFromSourceUrl,
  normalizeApplication,
  toCsv,
  toJson,
} from "../../lib/domain/applications.mjs";
import { categorizeWithLocalGemma } from "../../lib/gemma.mjs";
import { getLocalDateString } from "../../lib/core/dates.mjs";
import { roleCategoryBatchSize } from "../config";
import type { RouteHandler } from "../types";

export const applicationsRoutes: RouteHandler = async (req, res, url) => {
  if (url.pathname === "/api/applications" && req.method === "GET") {
    sendJson(res, 200, await loadApplications());
    return true;
  }

  if (url.pathname === "/api/applications" && req.method === "POST") {
    const input = await readBody(req);
    const applications = await loadApplications();
    const inputSourceUrl = clean(input.sourceUrl);
    const inputCompany = (sanitizeJobIdentityValue(input.company) || inferCompanyFromSourceUrl(inputSourceUrl)).toLowerCase();
    const inputRole = sanitizeJobIdentityValue(input.role).toLowerCase();
    const duplicate = applications.find((app: any) => {
      const sameUrl = inputSourceUrl && app.sourceUrl && app.sourceUrl === inputSourceUrl;
      // Only treat company+role as a match when BOTH are present. Otherwise two
      // unrelated captures with blank fields (e.g. a page the extractor couldn't
      // read) collapse onto the same row, and saves silently overwrite instead of
      // creating — the "it said done but nothing appeared" bug.
      const sameRole =
        inputCompany && inputRole &&
        clean(app.company).toLowerCase() === inputCompany &&
        clean(app.role).toLowerCase() === inputRole;
      return sameUrl || sameRole;
    });
    const app = normalizeApplication(input, duplicate || {});
    const next = duplicate
      ? applications.map((item: any) => (item.id === duplicate.id ? app : item))
      : [app, ...applications];
    await saveApplications(next);
    sendJson(res, duplicate ? 200 : 201, app);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/categorize-titles") {
    try {
      const input = await readBody(req);
      const apps = await loadApplications();
      const force = input.force !== false;
      const appsToCategorize = apps.filter((app: any) => app.role && (force || !app.group));

      if (appsToCategorize.length > 0) {
        const mappings: Record<string, any> = {};
        for (let i = 0; i < appsToCategorize.length; i += roleCategoryBatchSize) {
          const batch = appsToCategorize.slice(i, i + roleCategoryBatchSize);
          const aiResult = await categorizeWithLocalGemma(batch);
          if (!aiResult.ok) break;
          Object.assign(mappings, aiResult.mappings || {});
        }

        let updated = false;
        const categorizedAt = new Date().toISOString();
        apps.forEach((a: any) => {
          const category = mappings[a.id];
          if (category && (force || !a.group || a.group !== category)) {
            a.group = category;
            a.groupSource = "Gemma";
            a.groupUpdatedAt = categorizedAt;
            a.updatedAt = categorizedAt;
            updated = true;
          }
        });
        if (updated) {
          await saveApplications(apps);
        }
      }
      sendJson(res, 200, apps);
      return true;
    } catch (error) {
      sendJson(res, 500, { error: String(error) });
      return true;
    }
  }

  const match = url.pathname.match(/^\/api\/applications\/([^/]+)$/);
  if (match && req.method === "PUT") {
    const id = decodeURIComponent(match[1]!);
    const input = await readBody(req);
    const applications = await loadApplications();
    const existing = applications.find((app: any) => app.id === id);
    if (!existing) {
      sendJson(res, 404, { error: "Application not found" });
      return true;
    }
    const app = normalizeApplication({ ...input, id }, existing);
    await saveApplications(applications.map((item: any) => (item.id === id ? app : item)));
    sendJson(res, 200, app);
    return true;
  }

  if (match && req.method === "DELETE") {
    const id = decodeURIComponent(match[1]!);
    await deleteApplication(id);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (url.pathname === "/api/export.csv" && req.method === "GET") {
    const csv = toCsv(await loadApplications());
    // Prepend a UTF-8 BOM so Excel auto-detects the encoding and renders accented
    // characters / non-ASCII company names correctly instead of mojibake.
    const stamp = getLocalDateString(new Date());
    send(res, 200, `﻿${csv}`, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-applications-${stamp}.csv"`,
    });
    return true;
  }

  if (url.pathname === "/api/export.json" && req.method === "GET") {
    const json = toJson(await loadApplications());
    const stamp = getLocalDateString(new Date());
    send(res, 200, json, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-applications-${stamp}.json"`,
    });
    return true;
  }

  return false;
};

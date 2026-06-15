import { readFile } from "node:fs/promises";
import { googleCalendarTokenFile, loadPracticeStore, writeJsonFile } from "../../lib/data/storage.mjs";
import { buildCalendarReviewEventPayload, buildIcsReviewEvent } from "../../lib/domain/calendar.mjs";
import { cleanStageDate, getLocalDateString } from "../../lib/core/dates.mjs";
import { clean } from "../../lib/core/util.mjs";
import { port } from "../config";
import { readBody, send, sendJson } from "../../lib/core/http.mjs";
import type { RouteHandler } from "../types";

export const calendarRoutes: RouteHandler = async (req, res, url) => {
  if (url.pathname === "/api/calendar/status" && req.method === "GET") {
    let hasLocalToken = false;
    try {
      await readFile(googleCalendarTokenFile, "utf8");
      hasLocalToken = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    sendJson(res, 200, {
      configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      hasLocalToken,
      fallback: "in-app reminders",
    });
    return true;
  }

  if (url.pathname === "/api/calendar/auth-url" && req.method === "GET") {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    if (!clientId || !clientSecret) {
      sendJson(res, 200, {
        configured: false,
        error: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google Calendar OAuth.",
      });
      return true;
    }
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://127.0.0.1:${port}/api/calendar/oauth/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: "https://www.googleapis.com/auth/calendar.events",
    });
    sendJson(res, 200, {
      configured: true,
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      redirectUri,
    });
    return true;
  }

  if (url.pathname === "/api/calendar/oauth/callback" && req.method === "GET") {
    const code = clean(url.searchParams.get("code"));
    if (!code) {
      sendJson(res, 400, { error: "Missing OAuth code." });
      return true;
    }
    await writeJsonFile(googleCalendarTokenFile, {
      code,
      savedAt: new Date().toISOString(),
      note: "Local-only placeholder. Exchange this code for tokens before enabling live Calendar writes.",
    });
    sendJson(res, 200, {
      ok: true,
      message: "OAuth code saved locally. Live token exchange is intentionally left disabled until credentials are configured.",
    });
    return true;
  }

  if (url.pathname === "/api/calendar/sync-reviews" && req.method === "POST") {
    const input = await readBody(req);
    const store = await loadPracticeStore();
    const date = cleanStageDate(input.date) || getLocalDateString(new Date());
    const payload = buildCalendarReviewEventPayload(store, date, input.settings || {});
    const status = {
      configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    };
    sendJson(res, 200, {
      ok: true,
      configured: false,
      fallback: status.configured
        ? "Calendar credentials detected, but live writes are disabled in this local-only v1. Review the payload before enabling."
        : "Google Calendar credentials are missing, so the in-app due queue remains the reminder.",
      payload,
    });
    return true;
  }

  if (url.pathname === "/api/calendar/reviews.ics" && req.method === "GET") {
    const store = await loadPracticeStore();
    const date = cleanStageDate(url.searchParams.get("date")) || getLocalDateString(new Date());
    const payload = buildCalendarReviewEventPayload(store, date, {});
    send(res, 200, buildIcsReviewEvent(payload), {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leetcode-review.ics"',
    });
    return true;
  }

  return false;
};

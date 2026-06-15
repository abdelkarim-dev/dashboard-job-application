import { readBody, sendJson } from "../../lib/core/http.mjs";
import {
  loadCoursesStore,
  saveCoursesStore,
  loadSystemDesignStore,
  saveSystemDesignStore,
} from "../../lib/data/storage.mjs";
import { normalizeCourseItem, normalizeSystemDesignTopic } from "../../lib/domain/practice.mjs";
import type { RouteHandler } from "../types";

export const learningRoutes: RouteHandler = async (req, res, url) => {
  if (url.pathname === "/api/learning/courses" && req.method === "GET") {
    sendJson(res, 200, await loadCoursesStore());
    return true;
  }

  if (url.pathname === "/api/learning/courses" && req.method === "POST") {
    const input = await readBody(req);
    const store = await loadCoursesStore();
    const item: any = normalizeCourseItem(input);
    store.items = [item, ...store.items.filter((existing: any) => existing.id !== item.id)];
    await saveCoursesStore(store);
    sendJson(res, 201, item);
    return true;
  }

  const courseMatch = url.pathname.match(/^\/api\/learning\/courses\/([^/]+)$/);
  if (courseMatch) {
    const id = decodeURIComponent(courseMatch[1]!);
    const store = await loadCoursesStore();
    const index = store.items.findIndex((item: any) => item.id === id);
    if (index < 0) {
      sendJson(res, 404, { error: "Course not found" });
      return true;
    }
    if (req.method === "PUT") {
      const input = await readBody(req);
      const updated = normalizeCourseItem({ ...store.items[index], ...input, id });
      store.items[index] = updated;
      await saveCoursesStore(store);
      sendJson(res, 200, updated);
      return true;
    }
    if (req.method === "DELETE") {
      store.items.splice(index, 1);
      await saveCoursesStore(store);
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  if (url.pathname === "/api/learning/system-design" && req.method === "GET") {
    sendJson(res, 200, await loadSystemDesignStore());
    return true;
  }

  if (url.pathname === "/api/learning/system-design" && req.method === "POST") {
    const input = await readBody(req);
    const store = await loadSystemDesignStore();
    const topic: any = normalizeSystemDesignTopic(input);
    store.topics = [topic, ...store.topics.filter((existing: any) => existing.id !== topic.id)];
    await saveSystemDesignStore(store);
    sendJson(res, 201, topic);
    return true;
  }

  const systemDesignMatch = url.pathname.match(/^\/api\/learning\/system-design\/([^/]+)$/);
  if (systemDesignMatch) {
    const id = decodeURIComponent(systemDesignMatch[1]!);
    const store = await loadSystemDesignStore();
    const index = store.topics.findIndex((topic: any) => topic.id === id);
    if (index < 0) {
      sendJson(res, 404, { error: "System design topic not found" });
      return true;
    }
    if (req.method === "PUT") {
      const input = await readBody(req);
      const updated = normalizeSystemDesignTopic({ ...store.topics[index], ...input, id });
      store.topics[index] = updated;
      await saveSystemDesignStore(store);
      sendJson(res, 200, updated);
      return true;
    }
    if (req.method === "DELETE") {
      store.topics.splice(index, 1);
      await saveSystemDesignStore(store);
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  return false;
};

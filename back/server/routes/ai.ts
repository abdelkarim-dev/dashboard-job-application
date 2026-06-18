import {
  extractWithLocalGemma,
  evaluateWithLocalGemma,
  generateAnswerWithLocalGemma,
  askLearnTutorWithLocalGemma,
  generateLearnQuizWithLocalGemma,
  streamLearnTutorWithLocalGemma,
  autofillWithLocalGemma,
  gemmaStatus,
} from "../../lib/gemma.mjs";
import { sanitizeAutofillMappings } from "../../lib/domain/applications.mjs";
import { readBody, sendJson } from "../../lib/core/http.mjs";
import type { RouteHandler } from "../types";

export const aiRoutes: RouteHandler = async (req, res, url) => {
  if (url.pathname === "/api/extract-ai" && req.method === "POST") {
    const input = await readBody(req);
    const result = await extractWithLocalGemma(input);
    sendJson(res, gemmaStatus(result), result);
    return true;
  }

  if (url.pathname === "/api/evaluate-job" && req.method === "POST") {
    const input = await readBody(req);
    const result = await evaluateWithLocalGemma(input);
    sendJson(res, gemmaStatus(result), result);
    return true;
  }

  if (url.pathname === "/api/generate-answer" && req.method === "POST") {
    const input = await readBody(req);
    const result = await generateAnswerWithLocalGemma(input);
    sendJson(res, gemmaStatus(result), result);
    return true;
  }

  if (url.pathname === "/api/learn-ask" && req.method === "POST") {
    const input = await readBody(req);
    const result = await askLearnTutorWithLocalGemma(input);
    sendJson(res, gemmaStatus(result), result);
    return true;
  }

  if (url.pathname === "/api/learn-quiz" && req.method === "POST") {
    const input = await readBody(req);
    const result = await generateLearnQuizWithLocalGemma(input);
    sendJson(res, gemmaStatus(result), result);
    return true;
  }

  if (url.pathname === "/api/learn-ask-stream" && req.method === "POST") {
    const input = await readBody(req);
    res.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    });
    const emit = (event: unknown) => {
      try {
        res.write(`${JSON.stringify(event)}\n`);
      } catch {
        // client gone
      }
    };
    try {
      await streamLearnTutorWithLocalGemma(input, emit);
    } catch (error) {
      emit({ type: "error", text: String((error as Error)?.message || error) });
    }
    res.end();
    return true;
  }

  if (url.pathname === "/api/autofill-ai" && req.method === "POST") {
    const input = await readBody(req);
    const result = await autofillWithLocalGemma(input);
    // Scrub placeholder URLs at the boundary too: the in-memory Gemma cache can
    // hold entries produced before the in-producer scrub existed (long-lived
    // server process), and those must never reach the form.
    if (result && result.mappings) result.mappings = sanitizeAutofillMappings(result.mappings);
    sendJson(res, gemmaStatus(result), result);
    return true;
  }

  return false;
};

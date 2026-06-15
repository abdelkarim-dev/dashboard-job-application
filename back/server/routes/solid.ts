import { readBody, sendJson } from "../../lib/core/http.mjs";
import { runSolidJavaExercise } from "../../lib/code-runner/solid.mjs";
import { isLocalCodeRunnerEnabled } from "../../lib/core/security.mjs";
import type { RouteHandler } from "../types";

export const solidRoutes: RouteHandler = async (req, res, url) => {
  const solidJavaExerciseMatch = url.pathname.match(/^\/api\/solid-java\/exercises\/([^/]+)\/run$/);
  if (solidJavaExerciseMatch && req.method === "POST") {
    if (!isLocalCodeRunnerEnabled()) {
      sendJson(res, 403, { error: "Local code runner is disabled. Set CLAIRE_ENABLE_CODE_RUNNER=1 to enable it for trusted local use." });
      return true;
    }
    const exerciseId = decodeURIComponent(solidJavaExerciseMatch[1]!);
    const input = await readBody(req);
    const result = await runSolidJavaExercise(exerciseId, input.code);
    sendJson(res, 200, result);
    return true;
  }

  return false;
};

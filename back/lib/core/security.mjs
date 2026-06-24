// Local HTTP boundary protection. The app is intentionally bound to localhost,
// but browsers can still make requests to localhost from arbitrary websites.
// These helpers keep cross-site pages from reading or mutating private local data.

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const EXTENSION_PROTOCOLS = new Set(["chrome-extension:", "moz-extension:"]);
const CORS_METHODS = "GET,POST,PUT,DELETE,OPTIONS";
const CORS_HEADERS = "Content-Type";

function parseAllowedOrigins(value = "") {
  return String(value || "")
    .split(/[, ]+/)
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function normalizePort(value, fallback) {
  const num = Number(value || fallback);
  return Number.isFinite(num) && num > 0 ? String(Math.floor(num)) : String(fallback);
}

function createAllowedOriginChecker({ port, extraOrigins = [] } = {}) {
  const appPort = normalizePort(port, 8787);
  const explicit = new Set([
    `http://127.0.0.1:${appPort}`,
    `http://localhost:${appPort}`,
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    ...parseAllowedOrigins(process.env.CLAIRE_ALLOWED_ORIGINS),
    ...extraOrigins,
  ]);

  return function isAllowedOrigin(origin = "") {
    if (!origin) return true;
    if (explicit.has(origin)) return true;
    try {
      const parsed = new URL(origin);
      if (EXTENSION_PROTOCOLS.has(parsed.protocol)) return true;
      if (!["http:", "https:"].includes(parsed.protocol)) return false;
      if (!LOOPBACK_HOSTS.has(parsed.hostname)) return false;
      // Any loopback origin is the user's own machine — there is no cross-site
      // threat, since a remote page can never present a loopback Origin. Don't
      // pin the port: Vite auto-increments (5173 → 5174 → …) when another dev
      // server already holds 5173, and the dashboard's writes (PUT/POST/DELETE)
      // carry that drifted Origin. Pinning it to 8787/5173 here 403s those.
      return true;
    } catch {
      return false;
    }
  };
}

function isCrossSiteFetch(req) {
  const site = String(req.headers["sec-fetch-site"] || "").toLowerCase();
  return site === "cross-site";
}

function isSameOriginLoopback(origin = "", hostHeader = "") {
  if (!origin || !hostHeader) return false;
  try {
    const parsed = new URL(origin);
    return ["http:", "https:"].includes(parsed.protocol)
      && LOOPBACK_HOSTS.has(parsed.hostname)
      && parsed.host === hostHeader;
  } catch {
    return false;
  }
}

function writeForbidden(res) {
  res.status(403).json({
    error: "Forbidden origin. Claire only accepts same-origin, localhost dev, or extension requests.",
  });
}

function createApiSecurityMiddleware({ port, extraOrigins = [] } = {}) {
  const isAllowedOrigin = createAllowedOriginChecker({ port, extraOrigins });

  return function apiSecurityMiddleware(req, res, next) {
    const origin = req.headers.origin || "";
    const allowedOrigin = origin && (isAllowedOrigin(origin) || isSameOriginLoopback(origin, req.headers.host || ""));
    if ((origin && !allowedOrigin) || (!origin && isCrossSiteFetch(req))) {
      writeForbidden(res);
      return;
    }

    if (allowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", CORS_METHODS);
      res.setHeader("Access-Control-Allow-Headers", CORS_HEADERS);
    }

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    next();
  };
}

function isLocalCodeRunnerEnabled() {
  return /^(1|true|yes|on)$/i.test(String(process.env.CLAIRE_ENABLE_CODE_RUNNER || ""));
}

export {
  createAllowedOriginChecker,
  createApiSecurityMiddleware,
  isLocalCodeRunnerEnabled,
};

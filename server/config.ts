// Runtime configuration shared across the server modules. Mirrors the constants
// that used to live at the top of server.mjs.

// Load a local .env (Node 20.12+) so flags like CLAIRE_ENABLE_CODE_RUNNER can
// live in a file at the repo root. This module is the first to read process.env
// at load time (for `port`), so the .env must be loaded here — before that read.
// Shell-provided env vars still work without one; a missing .env is ignored.
try {
  process.loadEnvFile();
} catch {}

export const port = Number(process.env["PORT"] || process.argv[2] || 8787);

const configuredRoleCategoryBatchSize = Number(process.env["ROLE_CATEGORY_BATCH_SIZE"] || 10);
export const roleCategoryBatchSize =
  Number.isFinite(configuredRoleCategoryBatchSize) && configuredRoleCategoryBatchSize > 0
    ? Math.floor(configuredRoleCategoryBatchSize)
    : 10;

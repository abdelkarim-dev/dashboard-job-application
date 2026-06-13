// Sandboxed child-process execution plus runner stdout payload parsing, shared by
// the Python, Java and SOLID runners.
import { spawn } from "node:child_process";

function runProcess(command, args, { cwd, timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({ code: 1, stdout, stderr: stderr || String(error), timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

function parseRunnerPayload(stdout = "") {
  const line = String(stdout).split(/\r?\n/).findLast((item) => item.startsWith("__JH_RESULT__"));
  if (!line) return null;
  try {
    return JSON.parse(line.slice("__JH_RESULT__".length));
  } catch {
    return null;
  }
}

function stripRunnerPayload(stdout = "") {
  return String(stdout)
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("__JH_RESULT__"))
    .join("\n")
    .trim();
}

export {
  runProcess,
  parseRunnerPayload,
  stripRunnerPayload,
};

import { spawn, spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.join(frontendDir, ".e2e-runtime");
const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 15175);
const serviceUrl = `http://127.0.0.1:${frontendPort}/login`;
let services;
let stopping = false;

function stopProcessTree(child) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      windowsHide: true,
      stdio: "ignore"
    });
  } else {
    child.kill("SIGTERM");
  }
}

async function cleanup() {
  if (stopping) return;
  stopping = true;
  stopProcessTree(services);
  await rm(runtimeRoot, { recursive: true, force: true });
}

async function waitForServices(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    if (services.exitCode !== null) {
      throw new Error(`E2E 服务启动器提前退出，退出码 ${services.exitCode}`);
    }
    try {
      const response = await fetch(serviceUrl, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`E2E 服务在 ${timeoutMs}ms 内未就绪: ${lastError}`);
}

function runPlaywright() {
  const cli = path.join(frontendDir, "node_modules", "@playwright", "test", "cli.js");
  const child = spawn(process.execPath, [cli, "test", "--config", "playwright.config.mjs"], {
    cwd: frontendDir,
    env: process.env,
    stdio: "inherit",
    windowsHide: true
  });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`Playwright 被信号 ${signal} 终止`));
      else resolve(code ?? 1);
    });
  });
}

process.once("SIGINT", () => void cleanup().finally(() => process.exit(130)));
process.once("SIGTERM", () => void cleanup().finally(() => process.exit(143)));

let exitCode = 1;
try {
  await rm(runtimeRoot, { recursive: true, force: true });
  services = spawn(process.execPath, ["scripts/e2e-services.mjs"], {
    cwd: frontendDir,
    env: process.env,
    stdio: "inherit",
    windowsHide: true
  });
  await waitForServices();
  exitCode = await runPlaywright();
} catch (error) {
  process.stderr.write(`[run-e2e] ${error.stack || error.message}\n`);
} finally {
  await cleanup();
}

process.exit(exitCode);

import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceDir = path.resolve(frontendDir, "..");
const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 15175);
const backendPort = Number(process.env.E2E_BACKEND_PORT || 18001);
const host = "127.0.0.1";
const runtimeDir = path.join(frontendDir, ".e2e-runtime", String(process.pid));
const evidenceDir = path.join(frontendDir, "e2e-artifacts", "service-logs");
const databaseRelativePath = `./frontend/.e2e-runtime/${process.pid}/e2e.sqlite`;
const children = [];
let shuttingDown = false;

function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", (error) => {
      reject(new Error(`E2E 端口 ${port} 已被占用，请先结束占用进程。原始错误: ${error.message}`));
    });
    server.listen(port, host, () => server.close(resolve));
  });
}

function pythonCandidates() {
  return [
    process.env.E2E_PYTHON,
    path.join(workspaceDir, ".venv", "Scripts", "python.exe"),
    path.join(homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe"),
    "python"
  ].filter(Boolean);
}

function resolvePython() {
  for (const candidate of pythonCandidates()) {
    if (candidate.includes(path.sep) && !existsSync(candidate)) continue;
    const check = spawnSync(candidate, ["-c", "import uvicorn, fastapi"], {
      cwd: workspaceDir,
      encoding: "utf8",
      windowsHide: true
    });
    if (check.status === 0) return candidate;
  }
  throw new Error("找不到可运行 FastAPI/uvicorn 的 Python。请通过 E2E_PYTHON 指定解释器路径。");
}

function initializeDatabase(python, databaseUrl) {
  const setup = spawnSync(
    python,
    [
      "-c",
      "from backend.app import models; from backend.app.database import Base, engine; Base.metadata.create_all(bind=engine)"
    ],
    {
      cwd: workspaceDir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: "utf8",
      windowsHide: true
    }
  );
  if (setup.status !== 0) {
    throw new Error(`E2E 数据库初始化失败:\n${setup.stderr || setup.stdout || `退出码 ${setup.status}`}`);
  }
}

function pipeLog(child, name) {
  const log = createWriteStream(path.join(evidenceDir, `${name}.log`), { flags: "w" });
  child.stdout?.on("data", (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
    log.write(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
    log.write(chunk);
  });
  child.once("close", () => log.end());
}

function start(name, command, args, options) {
  const child = spawn(command, args, {
    ...options,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  children.push(child);
  pipeLog(child, name);
  child.once("exit", (code, signal) => {
    if (!shuttingDown && code !== null) {
      void shutdown(1, new Error(`${name} 服务提前退出，退出码 ${code}${signal ? `，信号 ${signal}` : ""}`));
    }
  });
  return child;
}

async function waitForHttp(url, label, child, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${label} 在健康检查前已退出，退出码 ${child.exitCode}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} 在 ${timeoutMs}ms 内未就绪: ${lastError}`);
}

function stopChild(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

async function shutdown(code = 0, error) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (error) process.stderr.write(`[e2e-services] ${error.stack || error.message}\n`);
  for (const child of [...children].reverse()) stopChild(child);
  await rm(runtimeDir, { recursive: true, force: true });
  process.exit(code);
}

process.once("SIGINT", () => void shutdown(0));
process.once("SIGTERM", () => void shutdown(0));
process.once("uncaughtException", (error) => void shutdown(1, error));
process.once("unhandledRejection", (error) => {
  void shutdown(1, error instanceof Error ? error : new Error(String(error)));
});

async function main() {
  await Promise.all([assertPortAvailable(frontendPort), assertPortAvailable(backendPort)]);
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(evidenceDir, { recursive: true });

  const python = resolvePython();
  const databaseUrl = `sqlite:///${databaseRelativePath}`;
  initializeDatabase(python, databaseUrl);
  const backend = start(
    "backend",
    python,
    ["-m", "uvicorn", "backend.app.main:app", "--host", host, "--port", String(backendPort)],
    {
      cwd: workspaceDir,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        PYTHONUNBUFFERED: "1"
      }
    }
  );
  await waitForHttp(`http://${host}:${backendPort}/api/health`, "后端", backend);

  const frontend = start(
    "frontend",
    process.execPath,
    ["scripts/dev-server.mjs"],
    {
      cwd: frontendDir,
      env: {
        ...process.env,
        FRONTEND_HOST: host,
        FRONTEND_PORT: String(frontendPort),
        API_PROXY_TARGET: `http://${host}:${backendPort}`
      }
    }
  );
  await waitForHttp(`http://${host}:${frontendPort}/login`, "前端", frontend);
  process.stdout.write(`[e2e-services] ready frontend=http://${host}:${frontendPort} backend=http://${host}:${backendPort}\n`);
}

await main().catch((error) => shutdown(1, error));

/**
 * 完整浏览器端到端自动测试
 *
 * 使用方法：
 *   1. 先启动后端：cd backend && py -m uvicorn app.main:app --port 8000
 *   2. 先启动前端：cd frontend && npm run dev
 *   3. 打开 Chrome，关闭所有标签页，打开一个新标签页（可空白）
 *   4. 启动 Chrome 远程调试端口：chrome.exe --remote-debugging-port=9223
 *   5. 运行本脚本：node scripts/chrome-full-e2e-test.js
 *
 * 或者一键顺序执行：
 *   node scripts/chrome-full-e2e-test.js
 *
 * 本脚本会自动打开 Chrome 并连接到前端进行测试。
 */
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || 15175);
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT || 8000);
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
const CDP_PORT = 9223;
const cdpUrl = `http://127.0.0.1:${CDP_PORT}`;
const SCREENSHOT_DIR = path.resolve(__dirname, "..", "screenshots");
const REPORT_DIR = path.resolve(__dirname, "..", "reports");

let client = null;
let currentStatus = "pass";

// ─── Test report tracking ────────────────────────────────────────────────────

const results = [];
let startTime = null;

function record(name, status, detail = "") {
  results.push({ name, status, detail, time: Date.now() - (startTime || Date.now()) });
  const icon = status === "pass" ? "✓" : status === "fail" ? "✗" : "→";
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ""}`);
  if (status === "fail") currentStatus = "fail";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms || 600));
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
}

async function connectCDP() {
  const pages = await getJson(`${cdpUrl}/json`);
  // Find or create a tab
  let page = pages.find((p) => p.url && !p.url.startsWith("devtools"));
  if (!page) {
    // Create a new tab
    const response = await fetch(`${cdpUrl}/json/new`);
    page = await response.json();
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let seq = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    if (msg.method) events.push(msg);
  });
  function send(method, params = {}) {
    const id = ++seq;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }
  return { send, events, close: () => ws.close() };
}

async function evaluate(expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
}

async function navigate(url) {
  await client.send("Page.navigate", { url });
  await sleep(1500);
}

async function clickText(text, exact = false) {
  const ok = await evaluate(`(() => {
    const matches = Array.from(document.querySelectorAll('button, a, [role="button"], .nav-list button, .sub-item, label, span, strong, div'))
      .filter(el => el.offsetParent !== null && !el.closest('#codex-e2e-panel'));
    const target = matches.find(el => {
      const t = (el.innerText || el.textContent || '').trim();
      return ${exact ? `t === ${JSON.stringify(text)}` : `t.includes(${JSON.stringify(text)})`};
    });
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  })()`);
  if (!ok) throw new Error(`找不到按钮/链接: ${text}`);
  await sleep(800);
}

async function getVisibleText() {
  return evaluate("document.body.innerText");
}

async function setField(label, value) {
  const ok = await evaluate(`(() => {
    const labelEl = Array.from(document.querySelectorAll('label'))
      .find(item => (item.innerText || '').includes(${JSON.stringify(label)}));
    if (!labelEl) return false;
    const field = labelEl.querySelector('input, textarea, select');
    if (!field) return false;
    field.value = ${JSON.stringify(value)};
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!ok) throw new Error(`无法填写字段: ${label}`);
}

async function setSelect(label, value) {
  const ok = await evaluate(`(() => {
    const labelEl = Array.from(document.querySelectorAll('label'))
      .find(item => (item.innerText || '').includes(${JSON.stringify(label)}));
    if (!labelEl) return false;
    const select = labelEl.querySelector('select');
    if (!select) return false;
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!ok) throw new Error(`无法选择字段: ${label}`);
}

async function waitForText(text, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const body = await getVisibleText();
    if (body.includes(text)) return true;
    await sleep(300);
  }
  const body = await getVisibleText();
  throw new Error(`等待文本超时(8s): "${text}"，当前页面内容: ${body.slice(0, 300)}`);
}

async function assertText(text) {
  const body = await getVisibleText();
  if (!body.includes(text)) throw new Error(`页面未包含预期文本: "${text}"`);
}

async function assertNoText(text) {
  const body = await getVisibleText();
  if (body.includes(text)) throw new Error(`页面包含不应出现的文本: "${text}"`);
}

async function takeScreenshot(name) {
  try {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const result = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    fs.writeFileSync(filePath, Buffer.from(result.data, "base64"));
    return filePath;
  } catch (e) {
    return `截图失败: ${e.message}`;
  }
}

async function checkConsoleErrors() {
  const errors = client.events
    ? client.events.filter(
        (e) =>
          (e.method === "Runtime.exceptionThrown" || e.method === "Log.entryAdded") &&
          !String(e.params?.entry?.text || "").includes("Password field is not contained in a form") &&
          !String(e.params?.entry?.url || "").endsWith("/favicon.ico")
      )
    : [];
  return errors;
}

// ─── Step runner ─────────────────────────────────────────────────────────────

async function step(name, fn) {
  try {
    const detail = await fn();
    record(name, "pass", detail || "");
  } catch (error) {
    record(name, "fail", error.message);
    await takeScreenshot(`fail-${name.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 60)}`);
  }
}

// ─── Wait for services ───────────────────────────────────────────────────────

async function waitForBackend(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/health`);
      if (resp.ok) return;
    } catch (_) {}
    await sleep(1000);
  }
  throw new Error("后端服务未能在 60s 内就绪");
}

async function waitForFrontend(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(FRONTEND_URL);
      if (resp.ok) return;
    } catch (_) {}
    await sleep(1000);
  }
  throw new Error("前端服务未能在 60s 内就绪");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  startTime = Date.now();
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║       完整浏览器端到端自动测试                    ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Wait for services
  console.log("[准备] 等待后端服务就绪...");
  await waitForBackend();
  console.log("[准备] 后端服务已就绪 ✓");

  console.log("[准备] 等待前端服务就绪...");
  await waitForFrontend();
  console.log("[准备] 前端服务已就绪 ✓");

  // Connect to Chrome via CDP
  console.log("[准备] 连接 Chrome 远程调试...");
  client = await connectCDP();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");
  console.log("[准备] Chrome 已连接 ✓\n");

  // ─── Login Tests ──────────────────────────────────────────────────────

  await step("导航到登录页面", async () => {
    await navigate(`${FRONTEND_URL}/login`);
    await assertText("运维项目管理系统");
    await assertText("登录");
    return "登录页渲染正常";
  });

  await step("登录：空用户名/密码校验", async () => {
    await setField("用户名", "");
    await setField("密码", "");
    await clickText("登录");
    await sleep(500);
    // Should stay on login page
    const url = await evaluate("location.pathname");
    if (url !== "/login") throw new Error("空字段应停留在登录页");
    return "空字段验证正常";
  });

  await step("登录：错误密码显示错误信息", async () => {
    await setField("用户名", "admin");
    await setField("密码", "wrongpassword");
    await clickText("登录");
    await sleep(1000);
    await assertText("用户名或密码错误");
    return "错误密码提示正确";
  });

  await step("管理员登录成功进入工作台", async () => {
    await setField("用户名", "admin");
    await setField("密码", "admin123");
    await clickText("登录");
    await sleep(1500);
    await waitForText("工作台", 5000);
    await assertText("项目总数");
    await assertText("客户数量");
    await assertText("系统管理员");
    return "登录成功，工作台数据加载正常";
  });

  // ─── Dashboard Tests ───────────────────────────────────────────────────

  await step("工作台仪表盘数据展示", async () => {
    await assertText("接口连接状态");
    await assertText("后端服务连接正常");
    const body = await getVisibleText();
    if (!body.includes("支持单") && !body.includes("近期支持单")) throw new Error("工作台缺少工单数据");
    return "仪表盘所有指标和工单列表可见";
  });

  // ─── Customer Tests ────────────────────────────────────────────────────

  await step("客户信息页面 - 列表展示", async () => {
    // Click nav
    await clickText("协同支持");
    await sleep(300);
    await clickText("客户信息");
    await sleep(1500);
    await assertText("客户信息");
    await assertText("华东产业园");
    await assertText("城投集团");
    return "客户列表展示正常";
  });

  const customerId = `E2E客户-${Date.now().toString(36).slice(-6)}`;
  await step("客户信息 - 新增客户", async () => {
    await clickText("新增客户");
    await sleep(500);
    await setField("客户名称", customerId);
    await setField("销售", "E2E销售");
    await clickText("提交");
    await sleep(1500);
    await assertText(customerId);
    return `成功创建客户: ${customerId}`;
  });

  await step("客户信息 - 搜索过滤", async () => {
    await setField("客户名称", "华东");
    await clickText("查询");
    await sleep(1000);
    await assertText("华东产业园");
    const body = await getVisibleText();
    if (body.includes(customerId)) throw new Error("搜索结果不应包含其他客户");
    // Reset search
    await setField("客户名称", "");
    await clickText("查询");
    await sleep(1000);
    return "搜索过滤功能正常";
  });

  // ─── Project Tests ─────────────────────────────────────────────────────

  await step("项目台账 - 列表和详情加载", async () => {
    await clickText("项目台账");
    await sleep(1500);
    await waitForText("服务版本", 5000);
    await waitForText("更新记录", 5000);
    await assertText("客户");
    await assertText("产品");
    return "项目列表和详情（版本、更新记录）正常加载";
  });

  const projectId = `E2E项目-${Date.now().toString(36).slice(-6)}`;
  await step("项目台账 - 新建项目", async () => {
    await clickText("新建项目台账");
    await sleep(500);
    await setField("平台版本", projectId);
    await clickText("提交");
    await sleep(2000);
    await assertText(projectId);
    return `成功创建项目: ${projectId}`;
  });

  // ─── Deployment Tests ──────────────────────────────────────────────────

  const deployName = `E2E部署-${Date.now().toString(36).slice(-6)}`;
  await step("项目部署 - 创建部署申请", async () => {
    await clickText("协同支持");
    await sleep(300);
    await clickText("项目部署");
    await sleep(1500);
    await clickText("新建项目部署");
    await sleep(500);
    await setField("项目名称", deployName);
    await setField("说明", "自动化测试部署申请");
    await setField("远程方式", "堡垒机 / SSH");
    await setField("服务器信息", "10.0.0.1 / Ubuntu / /opt/app");
    // Click submit button in the modal
    await clickText("提交");
    await sleep(2000);
    await assertText(deployName);
    return `成功创建部署申请: ${deployName}`;
  });

  // ─── Config Tests ──────────────────────────────────────────────────────

  await step("配置管理 - 产品名称列表", async () => {
    await clickText("配置");
    await sleep(300);
    await clickText("产品名称");
    await sleep(1500);
    await assertText("产品名称");
    await assertText("edhr");
    await assertText("edhr MAX");
    return "产品名称列表正常";
  });

  await step("配置管理 - 新增产品名称", async () => {
    const productName = `E2E产品-${Date.now().toString(36).slice(-4)}`;
    await clickText("新增");
    await sleep(500);
    await setField("名称", productName);
    await clickText("提交");
    await sleep(1500);
    await assertText(productName);
    return `成功创建产品: ${productName}`;
  });

  await step("配置管理 - 使用类型列表", async () => {
    await clickText("使用类型");
    await sleep(1500);
    await assertText("使用类型");
    await assertText("项目部署");
    await assertText("技术支持");
    return "使用类型列表正常";
  });

  await step("配置管理 - 新增使用类型", async () => {
    await clickText("新增");
    await sleep(500);
    await setField("名称", "E2E紧急支持");
    await clickText("提交");
    await sleep(1500);
    await assertText("E2E紧急支持");
    return "成功创建使用类型";
  });

  await step("配置管理 - 流程配置列表", async () => {
    await clickText("流程");
    await sleep(1500);
    await assertText("流程配置");
    await assertText("交付 -> 运维");
    return "流程配置列表正常";
  });

  // ─── Credential Tests ──────────────────────────────────────────────────

  const credentialName = `E2E凭证-${Date.now().toString(36).slice(-6)}`;
  await step("客户凭证 - 新增凭证", async () => {
    await clickText("客户凭证");
    await sleep(1500);
    await clickText("新增凭证");
    await sleep(500);
    await setField("凭证名称", credentialName);
    await setField("类型", "SSH");
    await setField("账号", `e2e_user_${Date.now().toString(36).slice(-4)}`);
    await setField("密文", `Secret-${Date.now().toString(36).slice(-6)}`);
    await clickText("提交");
    await sleep(1500);
    await assertText(credentialName);
    return `成功创建凭证: ${credentialName}`;
  });

  await step("客户凭证 - 查看明文写入审计", async () => {
    // Select the credential
    await clickText(credentialName);
    await sleep(500);
    // Verify it's masked
    const body = await getVisibleText();
    if (body.includes("Secret-")) {
      // Check if it has mask chars
      const hasMask = body.includes("****") || body.includes("***");
      if (!hasMask && body.match(/Secret-/)) throw new Error("凭证可能泄露了明文");
    }
    await clickText("查看明文");
    await sleep(1500);
    await assertText("审计日志");
    return "查看明文后审计日志出现";
  });

  // ─── User Management Tests ─────────────────────────────────────────────

  await step("用户管理 - 列表加载", async () => {
    await clickText("用户管理");
    await sleep(300);
    await clickText("用户");
    await sleep(1500);
    await assertText("账号");
    await assertText("admin");
    await assertText("姓名");
    await assertText("部门");
    return "用户列表正常加载";
  });

  await step("角色管理 - 列表加载", async () => {
    await clickText("角色");
    await sleep(1500);
    await assertText("角色管理");
    await assertText("系统管理员");
    await assertText("交付人员");
    return "角色列表正常加载";
  });

  // ─── Asset Tests ───────────────────────────────────────────────────────

  await step("运维资产 - 页面加载", async () => {
    await clickText("运维资产");
    await sleep(1500);
    await assertText("服务器资产台账");
    const body = await getVisibleText();
    if (!body.includes("部署工单") && !body.includes("客户") && !body.includes("产品")) {
      throw new Error("资产表格缺少必要列");
    }
    return "资产页面正常加载";
  });

  // ─── Permission Tests ──────────────────────────────────────────────────

  await step("权限检查 - 交付人员不能看到用户管理", async () => {
    // Logout
    await clickText("退出");
    await sleep(1000);
    // Login as delivery
    await setField("用户名", "delivery");
    await setField("密码", "user123");
    await clickText("登录");
    await sleep(1500);
    await waitForText("工作台", 5000);
    // Try to navigate to /users directly
    await navigate(`${FRONTEND_URL}/users`);
    await sleep(1500);
    // Should be redirected
    const pathname = await evaluate("location.pathname");
    if (pathname === "/users") {
      // Check if it actually loaded
      const body = await getVisibleText();
      if (!body.includes("无权限") && !body.includes("403")) {
        // It might have rendered empty - check if admin-specific content exists
        if (body.includes("账号") && body.includes("角色")) {
          throw new Error("交付人员不应看到用户管理页面");
        }
      }
    }
    return `权限拦截正常, 当前路径: ${pathname}`;
  });

  await step("权限检查 - 交付人员可见凭证管理", async () => {
    await navigate(`${FRONTEND_URL}/config/credentials`);
    await sleep(1500);
    await assertText("客户凭证");
    return "交付人员可正常访问凭证管理";
  });

  // ─── Console Error Check ───────────────────────────────────────────────

  await step("浏览器控制台无异常", async () => {
    const errors = await checkConsoleErrors();
    if (errors && errors.length > 0) {
      const msgs = errors.map((e) => JSON.stringify(e.params?.entry?.text || e.params?.exceptionDetails?.text || "")).join("; ");
      if (msgs) throw new Error(`控制台存在异常: ${msgs.slice(0, 500)}`);
    }
    return "浏览器控制台无异常";
  });

  // ─── Screenshot ────────────────────────────────────────────────────────

  const screenshotPath = await takeScreenshot("e2e-final");
  console.log(`\n[截图] ${screenshotPath}`);

  // ─── Summary ───────────────────────────────────────────────────────────

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║                   测试报告                        ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`  总数: ${results.length}`);
  console.log(`  通过: ${passed}`);
  console.log(`  失败: ${failed}`);
  console.log(`  耗时: ${duration}s`);

  if (failed > 0) {
    console.log("\n  失败项:");
    results.filter((r) => r.status === "fail").forEach((r) => console.log(`    ✗ ${r.name}: ${r.detail}`));
  }

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    total: results.length,
    passed,
    failed,
    results,
    status: currentStatus,
  };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, "chrome-full-e2e-report.json"), JSON.stringify(report, null, 2));
  console.log(`\n[报告] reports/chrome-full-e2e-report.json`);

  if (client) client.close();
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\n[严重错误] ${error.stack || error.message}`);
  if (client) client.close();
  process.exit(1);
});
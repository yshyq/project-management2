const fs = require("fs");

const cdp = "http://127.0.0.1:9223";
const frontendUrl = "http://127.0.0.1:4173/";
const backendUrl = "http://127.0.0.1:8001";
const delayMs = Number(process.env.VISIBLE_TEST_DELAY || 1200);

async function sleep(ms = delayMs) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let seq = 0;
  const pending = new Map();
  const events = [];

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
      return;
    }
    if (message.method) events.push(message);
  });

  function send(method, params = {}) {
    const id = ++seq;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  return { send, events, close: () => ws.close() };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime.evaluate failed");
  }
  return result.result.value;
}

function js(value) {
  return JSON.stringify(value);
}

async function installOverlay(client) {
  await evaluate(
    client,
    `(() => {
      const old = document.querySelector('#codex-visible-test-panel');
      if (old) old.remove();
      const panel = document.createElement('section');
      panel.id = 'codex-visible-test-panel';
      panel.innerHTML = '<strong>前后端完整测试</strong><ol id="codex-visible-test-list"></ol>';
      Object.assign(panel.style, {
        position: 'fixed',
        top: '14px',
        right: '14px',
        zIndex: 999999,
        width: '390px',
        maxHeight: '78vh',
        overflow: 'auto',
        padding: '14px 16px',
        background: 'rgba(15, 23, 42, 0.94)',
        color: 'white',
        borderRadius: '10px',
        boxShadow: '0 18px 45px rgba(0,0,0,.28)',
        font: '14px/1.5 Microsoft YaHei, system-ui, sans-serif'
      });
      document.body.appendChild(panel);
    })()`
  );
}

async function showStep(client, text, status = "running", detail = "") {
  await evaluate(
    client,
    `(() => {
      const list = document.querySelector('#codex-visible-test-list');
      if (!list) return false;
      const item = document.createElement('li');
      const color = ${js(status)} === 'pass' ? '#86efac' : ${js(status)} === 'fail' ? '#fca5a5' : '#fde68a';
      item.innerHTML = '<span style="color:' + color + ';font-weight:700">' +
        (${js(status)} === 'pass' ? '通过' : ${js(status)} === 'fail' ? '失败' : '执行中') +
        '</span> ' + ${js(text)} + (${js(detail)} ? '<br><small style="color:#cbd5e1">' + ${js(detail)} + '</small>' : '');
      list.appendChild(item);
      item.scrollIntoView({ block: 'nearest' });
      return true;
    })()`
  );
}

async function click(client, selector, label) {
  const clicked = await evaluate(
    client,
    `(() => {
      const target = document.querySelector(${js(selector)});
      if (!target) return false;
      target.scrollIntoView({ block: 'center', inline: 'center' });
      target.click();
      return true;
    })()`
  );
  if (!clicked) throw new Error(`找不到控件：${label} (${selector})`);
  await sleep();
}

async function expectState(client, label, predicateSource) {
  const ok = await evaluate(client, `(() => Boolean(${predicateSource}))()`);
  if (!ok) throw new Error(`检查失败：${label}`);
  await showStep(client, label, "pass");
  await sleep();
}

async function api(client, path, options = {}) {
  return evaluate(
    client,
    `fetch(${js(`${backendUrl}${path}`)}, ${js({
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      method: options.method || "GET",
      body: options.body ? JSON.stringify(options.body) : undefined,
    })}).then(async (res) => ({ ok: res.ok, status: res.status, body: await res.json().catch(() => null) }))`
  );
}

async function runStep(client, report, name, fn) {
  await showStep(client, name, "running");
  try {
    const detail = await fn();
    report.steps.push({ name, status: "pass", detail: detail || "" });
    await showStep(client, name, "pass", detail || "");
  } catch (error) {
    report.steps.push({ name, status: "fail", detail: error.message });
    await showStep(client, name, "fail", error.message);
    throw error;
  }
  await sleep();
}

async function main() {
  const pages = await getJson(`${cdp}/json`);
  const page = pages.find((item) => item.url && item.url.startsWith("http://127.0.0.1:4173"));
  if (!page) throw new Error("没有找到已打开的前端 Chrome 标签页");

  const client = await connect(page.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");
  await evaluate(client, `location.href = ${js(frontendUrl)}; true`);
  await sleep(1500);
  await installOverlay(client);

  const report = {
    startedAt: new Date().toISOString(),
    frontendUrl,
    backendUrl,
    steps: [],
  };

  let adminToken = "";
  let deliveryToken = "";
  let customerId = 1;
  let credentialId = 0;

  try {
    await runStep(client, report, "前端页面打开", async () => {
      await expectState(client, "标题为运维项目管理系统原型", `document.title === '运维项目管理系统原型'`);
      return await evaluate(client, "location.href");
    });

    await runStep(client, report, "后端健康接口", async () => {
      const response = await api(client, "/api/health");
      if (!response.ok || response.body?.data?.status !== "ok") throw new Error(JSON.stringify(response));
      return "/api/health status=ok";
    });

    await runStep(client, report, "管理员登录 API + 菜单权限", async () => {
      const login = await api(client, "/api/auth/login", {
        method: "POST",
        body: { username: "admin", password: "admin123" },
      });
      if (!login.ok || !login.body?.data?.accessToken) throw new Error(JSON.stringify(login));
      adminToken = login.body.data.accessToken;
      const headers = { Authorization: `Bearer ${adminToken}` };
      const profile = await api(client, "/api/auth/profile", { headers });
      const menus = await api(client, "/api/auth/menus", { headers });
      if (!profile.ok || !menus.body?.data?.includes("credentials")) throw new Error("管理员菜单未包含客户凭证");
      return profile.body.data.roles.join(",");
    });

    await runStep(client, report, "创建客户与项目 API", async () => {
      const suffix = String(Date.now()).slice(-6);
      const headers = { Authorization: `Bearer ${adminToken}` };
      const customer = await api(client, "/api/customers", {
        method: "POST",
        headers,
        body: { name: `可视化测试客户${suffix}`, salesName: "测试销售", note: "Chrome 可视化测试数据" },
      });
      if (!customer.ok) throw new Error(JSON.stringify(customer));
      customerId = customer.body.data.id;
      const project = await api(client, "/api/projects", {
        method: "POST",
        headers,
        body: {
          customerId,
          productTypeId: 1,
          platformVersion: "edhr v2.8.1",
          onlineStatus: "运维中",
          projectManagerId: 5,
          serviceVersions: [{ serviceName: "API", version: "v2.8.1" }],
          updateLogs: [{ version: "v2.8.1", content: "可视化测试更新记录" }],
        },
      });
      if (!project.ok) throw new Error(JSON.stringify(project));
      return `customerId=${customerId}, projectId=${project.body.data.id}`;
    });

    await runStep(client, report, "交付登录 API + 创建项目部署单", async () => {
      const login = await api(client, "/api/auth/login", {
        method: "POST",
        body: { username: "delivery", password: "user123" },
      });
      if (!login.ok) throw new Error(JSON.stringify(login));
      deliveryToken = login.body.data.accessToken;
      const ticket = await api(client, "/api/support-tickets", {
        method: "POST",
        headers: { Authorization: `Bearer ${deliveryToken}` },
        body: {
          supportType: "项目部署",
          customerId,
          projectName: "可视化测试生产部署",
          productTypeId: 1,
          priority: "高",
          env: "生产",
          description: "部署 v2.8.1 版本",
          remoteMethod: "堡垒机 / SSH",
          remoteInfo: "需要预约窗口",
          serverInfo: "10.24.6.18:22 / Ubuntu / /opt/app",
          authorizationText: "授权人：测试；有效期：2026-12-31",
        },
      });
      if (!ticket.ok || ticket.body.data.status !== "待运维接收") throw new Error(JSON.stringify(ticket));
      return `${ticket.body.data.title} -> ${ticket.body.data.currentHandlerName}`;
    });

    await runStep(client, report, "凭证脱敏、明文查看和审计 API", async () => {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const created = await api(client, "/api/credentials", {
        method: "POST",
        headers,
        body: {
          customerId,
          productTypeId: 1,
          credentialName: "可视化测试 SSH",
          credentialType: "SSH",
          account: "ops_admin",
          secret: "Srv@visible-2026",
          ownerId: 2,
          rule: "运维管理员审批",
        },
      });
      if (!created.ok) throw new Error(JSON.stringify(created));
      credentialId = created.body.data.id;
      const listed = await api(client, "/api/credentials", { headers });
      const item = listed.body.data.list.find((entry) => entry.id === credentialId);
      if (!item || item.secretMask.includes("visible")) throw new Error("凭证未脱敏");
      const revealed = await api(client, `/api/credentials/${credentialId}/reveal`, {
        method: "POST",
        headers,
        body: { reason: "可视化测试查看", action: "view" },
      });
      if (revealed.body.data.secret !== "Srv@visible-2026") throw new Error("明文查看失败");
      const audit = await api(client, "/api/credentials/audit", { headers });
      if (!audit.body.data.list.some((entry) => entry.credentialId === credentialId)) throw new Error("审计记录缺失");
      return `mask=${item.secretMask}, audit=ok`;
    });

    await runStep(client, report, "普通用户 UI：登录、项目台账、项目部署表单", async () => {
      await click(client, "#user-login", "普通用户登录");
      await click(client, 'button[data-view="projects"]', "项目台账");
      await click(client, 'button[data-view="supportDeploy"]', "项目部署");
      await click(client, "#add-support-ticket", "新建项目部署");
      const checks = await evaluate(
        client,
        `(() => {
          const text = document.querySelector('#create-form-grid')?.innerText || '';
          return {
            title: document.querySelector('#page-title')?.innerText || '',
            hasCustomer: text.includes('客户名称'),
            hasProjectName: text.includes('项目名称'),
            hasRemoteMethod: text.includes('远程方式'),
            hasOpsHandler: text.includes('运维处理人'),
            hasTitle: text.includes('标题')
          };
        })()`
      );
      if (!checks.hasCustomer || !checks.hasProjectName || !checks.hasRemoteMethod || checks.hasOpsHandler || checks.hasTitle) {
        throw new Error(JSON.stringify(checks));
      }
      await click(client, "#cancel-create", "关闭项目部署弹窗");
      return checks.title;
    });

    await runStep(client, report, "普通用户 UI：技术支持表单字段", async () => {
      await click(client, 'button[data-view="supportTech"]', "技术支持");
      await click(client, "#add-support-ticket", "新建技术支持");
      const checks = await evaluate(
        client,
        `(() => {
          const text = document.querySelector('#create-form-grid')?.innerText || '';
          return {
            hasTitle: text.includes('标题'),
            hasOpsHandler: text.includes('运维处理人'),
            hasDevHandler: text.includes('研发处理人'),
            hasDeliveryHandler: text.includes('交付确认人')
          };
        })()`
      );
      if (!checks.hasTitle || !checks.hasOpsHandler || !checks.hasDevHandler || !checks.hasDeliveryHandler) {
        throw new Error(JSON.stringify(checks));
      }
      await click(client, "#cancel-create", "关闭技术支持弹窗");
      return "标题/运维/研发/交付字段齐全";
    });

    await runStep(client, report, "普通用户 UI：客户凭证新增权限限制", async () => {
      await click(client, 'button[data-view="credentials"]', "客户凭证");
      await click(client, "#primary-create", "新增当前功能");
      const state = await evaluate(
        client,
        `({
          toast: document.querySelector('#toast')?.innerText || '',
          addVisible: (() => {
            const el = document.querySelector('#add-credential');
            return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && !el.closest('.hidden');
          })(),
          includesApply: document.body.innerText.includes('申请查看')
        })`
      );
      if (!state.toast.includes("普通用户不可新增凭证") || state.addVisible || !state.includesApply) {
        throw new Error(JSON.stringify(state));
      }
      return state.toast;
    });

    await runStep(client, report, "管理员 UI：客户凭证与用户管理", async () => {
      await click(client, "#logout-button", "退出");
      await click(client, "#admin-login", "管理员登录");
      await click(client, 'button[data-view="credentials"]', "管理员客户凭证");
      const credentialState = await evaluate(
        client,
        `({
          title: document.querySelector('#page-title')?.innerText || '',
          addVisible: (() => {
            const el = document.querySelector('#add-credential');
            return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && !el.closest('.hidden');
          })(),
          canApprove: document.body.innerText.includes('同意')
        })`
      );
      await click(client, 'button[data-view="users"]', "用户管理");
      const userTitle = await evaluate(client, "document.querySelector('#page-title')?.innerText || ''");
      if (!credentialState.addVisible || !credentialState.canApprove || !userTitle.includes("用户管理")) {
        throw new Error(JSON.stringify({ credentialState, userTitle }));
      }
      return `${credentialState.title} -> ${userTitle}`;
    });

    await runStep(client, report, "前端布局和控制台检查", async () => {
      const state = await evaluate(
        client,
        `({
          noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
          title: document.title
        })`
      );
      const errors = client.events
        .filter((event) => event.method === "Runtime.exceptionThrown" || event.method === "Log.entryAdded")
        .map((event) => event.params)
        .filter((entry) => !(entry.entry?.url || "").endsWith("/favicon.ico"));
      if (!state.noHorizontalOverflow || errors.length) throw new Error(JSON.stringify({ state, errors }));
      return "无横向溢出，无业务控制台错误";
    });

    const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const screenshotPath = "screenshots/chrome-visible-full-test.png";
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
    report.screenshotPath = screenshotPath;
    report.finishedAt = new Date().toISOString();
    report.status = "pass";
    fs.writeFileSync("screenshots/chrome-visible-full-test-report.json", JSON.stringify(report, null, 2));
    await showStep(client, "完整测试结束，结果已保存", "pass", screenshotPath);
    await sleep(2500);
    client.close();
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.status = "fail";
    report.error = error.message;
    fs.writeFileSync("screenshots/chrome-visible-full-test-report.json", JSON.stringify(report, null, 2));
    client.close();
    console.error(error.stack || error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

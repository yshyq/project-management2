const fs = require("fs");

const cdp = "http://127.0.0.1:9223";
const frontendUrl = process.env.FRONTEND_URL || "http://127.0.0.1:5175";
const delayMs = Number(process.env.VISIBLE_TEST_DELAY || 650);

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
      const handlers = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handlers.reject(new Error(JSON.stringify(message.error)));
      else handlers.resolve(message.result);
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
    throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
}

const q = JSON.stringify;

async function installOverlay(client) {
  await evaluate(client, `(() => {
    document.querySelector('#codex-e2e-panel')?.remove();
    const panel = document.createElement('section');
    panel.id = 'codex-e2e-panel';
    panel.innerHTML = '<strong>Vue 前后端 E2E 测试</strong><ol id="codex-e2e-list"></ol>';
    Object.assign(panel.style, {
      position: 'fixed',
      right: '14px',
      top: '14px',
      width: '420px',
      maxHeight: '80vh',
      overflow: 'auto',
      padding: '14px 16px',
      background: 'rgba(2, 6, 23, .94)',
      color: '#fff',
      zIndex: 999999,
      borderRadius: '10px',
      font: '14px/1.5 Microsoft YaHei, system-ui, sans-serif',
      boxShadow: '0 18px 50px rgba(0,0,0,.32)'
    });
    document.body.appendChild(panel);
  })()`);
}

async function show(client, status, text, detail = "") {
  await evaluate(client, `(() => {
    const list = document.querySelector('#codex-e2e-list');
    if (!list) return;
    const li = document.createElement('li');
    const color = ${q(status)} === 'pass' ? '#86efac' : ${q(status)} === 'fail' ? '#fca5a5' : '#fde68a';
    li.innerHTML = '<span style="color:' + color + ';font-weight:700">' +
      (${q(status)} === 'pass' ? '通过' : ${q(status)} === 'fail' ? '失败' : '执行中') +
      '</span> ' + ${q(text)} + (${q(detail)} ? '<br><small style="color:#cbd5e1">' + ${q(detail)} + '</small>' : '');
    list.appendChild(li);
    li.scrollIntoView({ block: 'nearest' });
  })()`);
}

async function step(client, report, name, fn) {
  await show(client, "run", name);
  try {
    const detail = await fn();
    report.steps.push({ name, status: "pass", detail: detail || "" });
    await show(client, "pass", name, detail || "");
    await sleep();
  } catch (error) {
    report.steps.push({ name, status: "fail", detail: error.message });
    report.findings.push({ name, detail: error.message });
    await show(client, "fail", name, error.message);
    await sleep(1200);
  }
}

async function clickText(client, text) {
  const ok = await evaluate(client, `(() => {
    const target = Array.from(document.querySelectorAll('button, a, [role="button"]'))
      .filter((el) => !el.closest('#codex-e2e-panel'))
      .find((el) => (el.innerText || el.textContent || '').trim() === ${q(text)}
        || (el.innerText || el.textContent || '').trim().includes(${q(text)}));
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  })()`);
  if (!ok) throw new Error(`找不到按钮/链接：${text}`);
  await sleep();
}

async function clickNav(client, text) {
  const ok = await evaluate(client, `(() => {
    const target = Array.from(document.querySelectorAll('.nav-list button'))
      .find((el) => (el.innerText || el.textContent || '').trim() === ${q(text)}
        || (el.innerText || el.textContent || '').trim().includes(${q(text)}));
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  })()`);
  if (!ok) throw new Error(`找不到导航：${text}`);
  await sleep();
}

async function clickSupportChild(client, text) {
  let ok = await evaluate(client, `(() => {
    const target = Array.from(document.querySelectorAll('.nav-list button.sub-item'))
      .find((el) => (el.innerText || el.textContent || '').trim() === ${q(text)}
        || (el.innerText || el.textContent || '').trim().includes(${q(text)}));
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  })()`);
  if (!ok) {
    await clickNav(client, "协同支持");
    ok = await evaluate(client, `(() => {
      const target = Array.from(document.querySelectorAll('.nav-list button.sub-item'))
        .find((el) => (el.innerText || el.textContent || '').trim() === ${q(text)}
          || (el.innerText || el.textContent || '').trim().includes(${q(text)}));
      if (!target) return false;
      target.scrollIntoView({ block: 'center', inline: 'center' });
      target.click();
      return true;
    })()`);
  }
  if (!ok) throw new Error(`找不到协同支持子导航：${text}`);
  await sleep();
}

async function clickSelector(client, selector) {
  const ok = await evaluate(client, `(() => {
    const target = document.querySelector(${q(selector)});
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  })()`);
  if (!ok) throw new Error(`找不到选择器：${selector}`);
  await sleep();
}

async function setByLabel(client, labelText, value) {
  const ok = await evaluate(client, `(() => {
    const label = Array.from(document.querySelectorAll('label'))
      .find((item) => (item.innerText || '').includes(${q(labelText)}));
    if (!label) return false;
    const field = label.querySelector('input, textarea, select');
    if (!field) return false;
    field.value = ${q(value)};
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!ok) throw new Error(`无法填写字段：${labelText}`);
}

async function visibleText(client) {
  return evaluate(client, "document.body.innerText");
}

async function main() {
  const pages = await getJson(`${cdp}/json`);
  const page = pages.find((item) => item.url?.startsWith(frontendUrl));
  if (!page) throw new Error(`没有找到 ${frontendUrl} 的 Chrome 标签页，请先打开前端页面`);

  const client = await connect(page.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");
  await evaluate(client, `location.href = ${q(`${frontendUrl}/login`)}; true`);
  await sleep(1300);
  await installOverlay(client);

  const suffix = String(Date.now()).slice(-6);
  const report = {
    startedAt: new Date().toISOString(),
    frontendUrl,
    steps: [],
    findings: [],
    screenshotPath: "screenshots/vue-frontend-e2e.png",
    reportPath: "screenshots/vue-frontend-e2e-report.json",
  };

  await step(client, report, "页面身份和登录页渲染", async () => {
    const state = await evaluate(client, `({ title: document.title, text: document.body.innerText, url: location.href })`);
    if (!state.text.includes("运维项目管理系统") || !state.text.includes("前后端分离工程版")) {
      throw new Error(JSON.stringify(state));
    }
    return state.url;
  });

  await step(client, report, "管理员登录进入工作台", async () => {
    await setByLabel(client, "用户名", "admin");
    await setByLabel(client, "密码", "admin123");
    await clickText(client, "登录");
    await sleep(1200);
    const text = await visibleText(client);
    if (!text.includes("工作台") || !text.includes("项目总数") || !text.includes("系统管理员")) throw new Error(text.slice(0, 500));
    return "工作台 API 数据已渲染";
  });

  await step(client, report, "项目台账列表和详情加载", async () => {
    await clickText(client, "项目台账");
    await sleep(1000);
    const text = await visibleText(client);
    if (!text.includes("服务版本") || !text.includes("更新记录") || !text.includes("客户")) throw new Error(text.slice(0, 800));
    return "项目列表、服务版本、更新记录可见";
  });

  await step(client, report, "通过前端创建项目台账", async () => {
    await clickText(client, "新建项目台账");
    await setByLabel(client, "平台版本", `edhr e2e-${suffix}`);
    await clickText(client, "提交");
    await sleep(1400);
    const text = await visibleText(client);
    if (!text.includes(`edhr e2e-${suffix}`)) throw new Error("新项目未出现在列表");
    return `edhr e2e-${suffix}`;
  });

  await step(client, report, "项目部署表单字段和创建", async () => {
    await clickSupportChild(client, "项目部署");
    await sleep(900);
    await clickText(client, "新建项目部署");
    let modalText = await visibleText(client);
    if (!modalText.includes("远程方式") || !modalText.includes("服务器信息") || modalText.includes("运维处理人")) {
      throw new Error("项目部署表单字段不符合预期");
    }
    await setByLabel(client, "项目名称", `E2E部署${suffix}`);
    await setByLabel(client, "说明", "前端完整测试创建部署单");
    await setByLabel(client, "远程方式", "堡垒机 / SSH");
    await setByLabel(client, "服务器信息", "10.88.0.1 / Ubuntu / /opt/e2e");
    await setByLabel(client, "授权信息", "授权人：E2E");
    await clickText(client, "提交");
    await sleep(1400);
    const text = await visibleText(client);
    if (!text.includes(`E2E部署${suffix}`) || !text.includes("待运维接收")) throw new Error("部署单创建后未出现在列表");
    return `E2E部署${suffix}`;
  });

  await step(client, report, "技术支持表单字段检查", async () => {
    await clickSupportChild(client, "技术支持");
    await sleep(900);
    await clickText(client, "新建技术支持");
    const text = await visibleText(client);
    if (!text.includes("标题") || text.includes("远程方式") || text.includes("授权信息")) {
      throw new Error("技术支持表单字段不符合预期");
    }
    await clickText(client, "取消");
    return "标题字段可见，部署专属字段隐藏";
  });

  await step(client, report, "新增凭证、脱敏展示、查看明文、审计日志", async () => {
    await clickNav(client, "客户凭证");
    await sleep(1000);
    await clickText(client, "新增凭证");
    await setByLabel(client, "凭证名称", `E2E SSH ${suffix}`);
    await setByLabel(client, "类型", "SSH");
    await setByLabel(client, "账号", `e2e_${suffix}`);
    await setByLabel(client, "密文", `Secret-${suffix}`);
    await clickText(client, "提交");
    await sleep(1200);
    let text = await visibleText(client);
    if (!text.includes(`E2E SSH ${suffix}`) || text.includes(`Secret-${suffix}`)) {
      throw new Error("凭证未新增或列表泄露明文");
    }
    await clickText(client, "查看明文");
    await sleep(900);
    text = await visibleText(client);
    if (!text.includes(`Secret-${suffix}`) || !text.includes("前端查看明文")) {
      throw new Error("明文查看或审计日志未显示");
    }
    return "凭证列表脱敏，reveal 后审计可见";
  });

  await step(client, report, "用户管理页面加载", async () => {
    await clickNav(client, "用户管理");
    await clickNav(client, "用户");
    await sleep(900);
    const text = await visibleText(client);
    if (!text.includes("账号") || !text.includes("admin") || !text.includes("角色")) throw new Error(text.slice(0, 700));
    return "用户列表可见";
  });

  await step(client, report, "普通用户权限检查", async () => {
    await clickText(client, "退出");
    await sleep(800);
    await setByLabel(client, "用户名", "delivery");
    await setByLabel(client, "密码", "user123");
    await clickText(client, "登录");
    await sleep(1200);
    const navText = await evaluate(client, `Array.from(document.querySelectorAll('.nav-list button')).map((el) => (el.innerText || '').trim()).join('\\n')`);
    if (navText.includes("用户管理")) throw new Error(`交付用户不应看到用户管理菜单：${navText}`);
    await evaluate(client, `location.href = ${q(`${frontendUrl}/users`)}; true`);
    await sleep(1200);
    const state = await evaluate(client, `({ path: location.pathname, text: document.body.innerText })`);
    const restrictedNavText = await evaluate(client, `Array.from(document.querySelectorAll('.nav-list button')).map((el) => (el.innerText || '').trim()).join('\\n')`);
    if (state.path === "/users" || restrictedNavText.includes("用户管理")) throw new Error(`交付用户可访问用户管理路由：${JSON.stringify({ path: state.path, restrictedNavText })}`);
    return `受限路由已拦截到 ${state.path}`;
  });

  await step(client, report, "控制台和布局检查", async () => {
    const errors = client.events
      .filter((event) => event.method === "Runtime.exceptionThrown" || event.method === "Log.entryAdded")
      .map((event) => event.params)
      .filter((entry) => !(entry.entry?.url || "").endsWith("/favicon.ico"))
      .filter((entry) => entry.entry?.level !== "verbose")
      .filter((entry) => !String(entry.entry?.text || "").includes("Password field is not contained in a form"));
    const layout = await evaluate(client, `({
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
      title: document.title,
      path: location.pathname
    })`);
    if (errors.length || !layout.noHorizontalOverflow) throw new Error(JSON.stringify({ errors, layout }));
    return `${layout.title} ${layout.path}`;
  });

  const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(report.screenshotPath, Buffer.from(screenshot.data, "base64"));
  report.finishedAt = new Date().toISOString();
  report.status = report.findings.length ? "fail" : "pass";
  fs.writeFileSync(report.reportPath, JSON.stringify(report, null, 2));
  await show(client, report.status === "pass" ? "pass" : "fail", "完整测试结束", report.status);
  await sleep(1800);
  client.close();
  console.log(JSON.stringify(report, null, 2));
  if (report.findings.length) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

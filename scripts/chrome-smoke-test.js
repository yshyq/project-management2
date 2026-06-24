const fs = require("fs");

const cdp = "http://127.0.0.1:9223";

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

async function main() {
  const pages = await getJson(`${cdp}/json`);
  const page = pages.find((item) => item.url && item.url.startsWith("http://127.0.0.1:4173"));
  if (!page) throw new Error("No Chrome tab found for http://127.0.0.1:4173");

  const client = await connect(page.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");
  await evaluate(client, "location.href = 'http://127.0.0.1:4173/'; true");
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const result = {
    url: await evaluate(client, "location.href"),
    title: await evaluate(client, "document.title"),
    bodyHasText: {},
    clicks: [],
    visibleButtons: [],
    consoleErrors: [],
  };

  const requiredTexts = [
    "运维项目管理系统",
    "管理员后台管理页面",
    "普通用户登录页面",
    "项目台账",
    "项目支持",
    "客户凭证",
    "用户管理",
  ];

  for (const text of requiredTexts) {
    result.bodyHasText[text] = await evaluate(client, `document.body.innerText.includes(${JSON.stringify(text)})`);
  }

  result.visibleButtons = await evaluate(
    client,
    `Array.from(document.querySelectorAll('button, [role="button"], .menu-item, .nav-item, a'))
      .map((el) => (el.innerText || el.textContent || '').trim())
      .filter(Boolean)
      .slice(0, 80)`
  );

  async function clickSelector(label, selector) {
    const clicked = await evaluate(
      client,
      `(() => {
        const target = document.querySelector(${JSON.stringify(selector)});
        if (!target) return false;
        target.scrollIntoView({ block: 'center', inline: 'center' });
        target.click();
        return true;
      })()`
    );
    await new Promise((resolve) => setTimeout(resolve, 350));
    const state = await evaluate(
      client,
      `({
        pageTitle: document.querySelector('#page-title')?.innerText || '',
        activeView: document.querySelector('.view.active')?.id || '',
        hash: location.hash,
        toast: document.querySelector('#toast')?.innerText || '',
        modalOpen: document.querySelector('#create-modal')?.classList.contains('open') || false,
        modalTitle: document.querySelector('#create-modal-title')?.innerText || ''
      })`
    );
    result.clicks.push({ label, selector, clicked, state });
    return state;
  }

  await clickSelector("普通用户登录", "#user-login");
  await clickSelector("普通用户-项目台账", 'button[data-view="projects"]');
  await clickSelector("普通用户-项目部署", 'button[data-view="supportDeploy"]');
  await clickSelector("普通用户-新建支持单", "#add-support-ticket");

  const supportDeployModal = await evaluate(
    client,
    `({
      open: document.querySelector('#create-modal')?.classList.contains('open') || false,
      title: document.querySelector('#create-modal-title')?.innerText || '',
      text: document.querySelector('#create-form-grid')?.innerText || '',
      hasCustomer: document.querySelector('#create-form-grid')?.innerText.includes('客户名称') || false,
      hasManualProjectName: document.querySelector('#create-form-grid')?.innerText.includes('项目名称') || false,
      hasRemoteMethod: document.querySelector('#create-form-grid')?.innerText.includes('远程方式') || false,
      hasOpsHandler: document.querySelector('#create-form-grid')?.innerText.includes('运维处理人') || false,
      hasTitleField: document.querySelector('#create-form-grid')?.innerText.includes('标题') || false
    })`
  );
  await clickSelector("关闭支持单弹窗", "#cancel-create");

  await clickSelector("普通用户-技术支持", 'button[data-view="supportTech"]');
  await clickSelector("普通用户-新建技术支持", "#add-support-ticket");
  const techSupportModal = await evaluate(
    client,
    `({
      open: document.querySelector('#create-modal')?.classList.contains('open') || false,
      title: document.querySelector('#create-modal-title')?.innerText || '',
      text: document.querySelector('#create-form-grid')?.innerText || '',
      hasTitleField: document.querySelector('#create-form-grid')?.innerText.includes('标题') || false,
      hasOpsHandler: document.querySelector('#create-form-grid')?.innerText.includes('运维处理人') || false,
      hasDevHandler: document.querySelector('#create-form-grid')?.innerText.includes('研发处理人') || false,
      hasDeliveryHandler: document.querySelector('#create-form-grid')?.innerText.includes('交付确认人') || false
    })`
  );
  await clickSelector("关闭技术支持弹窗", "#cancel-create");

  await clickSelector("普通用户-客户凭证", 'button[data-view="credentials"]');
  await clickSelector("普通用户-新增凭证按钮", "#primary-create");
  const normalCredentialState = await evaluate(
    client,
    `({
      activeView: document.querySelector('.view.active')?.id || '',
      title: document.querySelector('#page-title')?.innerText || '',
      toast: document.querySelector('#toast')?.innerText || '',
      hasVisibleAddCredentialButton: (() => {
        const el = document.querySelector('#add-credential');
        return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && !el.closest('.hidden');
      })(),
      bodyIncludesApply: document.body.innerText.includes('申请查看'),
      bodyIncludesAudit: document.body.innerText.includes('审计')
    })`
  );

  await clickSelector("管理员登录", "#logout-button");
  await clickSelector("管理员后台登录", "#admin-login");
  await clickSelector("管理员-客户凭证", 'button[data-view="credentials"]');
  const adminCredentialState = await evaluate(
    client,
    `({
      activeView: document.querySelector('.view.active')?.id || '',
      title: document.querySelector('#page-title')?.innerText || '',
      hasVisibleAddCredentialButton: (() => {
        const el = document.querySelector('#add-credential');
        return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && !el.closest('.hidden');
      })(),
      bodyIncludesAudit: document.body.innerText.includes('审计'),
      bodyIncludesApprove: document.body.innerText.includes('同意')
    })`
  );
  await clickSelector("管理员-用户管理", 'button[data-view="users"]');

  result.postClickChecks = {
    supportDeployModal,
    techSupportModal,
    normalCredentialState,
    adminCredentialState,
    projectForm: supportDeployModal.hasCustomer && supportDeployModal.hasManualProjectName && supportDeployModal.hasRemoteMethod,
    deployFormHidesHandlersAndTitle: !supportDeployModal.hasOpsHandler && !supportDeployModal.hasTitleField,
    techFormHasHandlersAndTitle: techSupportModal.hasTitleField && techSupportModal.hasOpsHandler && techSupportModal.hasDevHandler && techSupportModal.hasDeliveryHandler,
    credentialMasking: normalCredentialState.bodyIncludesApply && !normalCredentialState.hasVisibleAddCredentialButton,
    noHorizontalOverflow: await evaluate(client, `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2`),
  };

  const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const screenshotPath = "screenshots/chrome-smoke-test.png";
  fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));

  result.consoleErrors = client.events
    .filter((event) => event.method === "Runtime.exceptionThrown" || event.method === "Log.entryAdded")
    .map((event) => event.params)
    .slice(0, 20);

  client.close();
  console.log(JSON.stringify({ screenshotPath, result }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

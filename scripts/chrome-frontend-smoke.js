const cdp = process.env.CDP_URL || "http://127.0.0.1:9223";
const frontendUrl = process.env.FRONTEND_URL || "http://127.0.0.1:5175";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handlers.reject(new Error(JSON.stringify(message.error)));
    else handlers.resolve(message.result);
  });

  return {
    send(method, params = {}) {
      const id = ++seq;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() {
      ws.close();
    }
  };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
}

function assert(condition, message, details) {
  if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ""}`);
}

async function main() {
  const pages = await getJson(`${cdp}/json`);
  const page = pages.find((item) => item.url?.startsWith(frontendUrl)) || pages.find((item) => item.type === "page");
  assert(page, "No Chrome page found. Start Chrome with --remote-debugging-port=9223 first");

  const client = await connect(page.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  await evaluate(client, `location.href = ${JSON.stringify(`${frontendUrl}/login`)}; true`);
  await sleep(1800);

  const loginState = await evaluate(client, `(() => ({
    url: location.href,
    title: document.title,
    text: document.body.innerText,
    inputs: document.querySelectorAll('input').length,
    buttons: Array.from(document.querySelectorAll('button')).map((button) => button.innerText.trim())
  }))()`);
  assert(loginState.url.includes("/login"), "Direct /login did not load", loginState);
  assert(loginState.text.includes("OpsProject"), "Vue login page did not render", loginState);
  assert(loginState.inputs >= 2, "Login form inputs are missing", loginState);

  await evaluate(client, `(() => {
    const inputs = document.querySelectorAll('input');
    inputs[0].value = 'admin';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[1].value = 'admin123';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('button[type="submit"], button')?.click();
    return true;
  })()`);
  await sleep(2500);

  const dashboardState = await evaluate(client, `(() => ({
    url: location.href,
    text: document.body.innerText,
    token: Boolean(localStorage.getItem('ops_pm_token'))
  }))()`);
  assert(dashboardState.token, "Login token was not stored", dashboardState);
  assert(dashboardState.text.includes("/api/projects"), "Dashboard project API data did not render", dashboardState);
  assert(dashboardState.text.includes("/api/customers"), "Dashboard customer API data did not render", dashboardState);

  const proxyState = await evaluate(client, `fetch('/api/projects', {
    headers: { Authorization: 'Bearer ' + localStorage.getItem('ops_pm_token') }
  }).then((response) => response.json()).then((payload) => ({
    code: payload.code,
    dataType: Array.isArray(payload.data) ? 'array' : typeof payload.data,
    count: Array.isArray(payload.data) ? payload.data.length : payload.data?.items?.length ?? null
  }))`);
  assert(proxyState.code === 0 && proxyState.dataType !== "undefined", "Vite /api proxy failed", proxyState);

  await evaluate(client, `location.href = ${JSON.stringify(`${frontendUrl}/projects`)}; true`);
  await sleep(1500);
  const projectsState = await evaluate(client, `(() => ({
    url: location.href,
    text: document.body.innerText
  }))()`);
  assert(projectsState.url.includes("/projects"), "Direct /projects route did not load", projectsState);
  assert(projectsState.text.includes("OpsProject"), "Projects route did not render Vue app", projectsState);

  client.close();
  console.log(JSON.stringify({
    loginUrl: loginState.url,
    title: loginState.title,
    dashboardUrl: dashboardState.url,
    proxyProjectsCount: proxyState.count,
    projectsUrl: projectsState.url
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

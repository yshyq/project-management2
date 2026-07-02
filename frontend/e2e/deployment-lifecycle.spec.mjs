import { expect, test } from "@playwright/test";

const runId = `DEPLOY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const customerName = "华东产业园";
const products = ["edhr", "MedPro5"];

function collectBrowserEvidence(page) {
  const evidence = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: []
  };
  page.on("console", (message) => {
    if (message.type() === "error") evidence.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => evidence.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText || "";
    if (errorText.includes("ERR_ABORTED")) return;
    evidence.requestFailures.push(`${request.method()} ${request.url()} ${errorText}`.trim());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      evidence.httpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return evidence;
}

async function attachEvidence(testInfo, evidence) {
  if (!Object.values(evidence).some((items) => items.length)) return;
  await testInfo.attach("browser-evidence", {
    body: Buffer.from(JSON.stringify(evidence, null, 2)),
    contentType: "application/json"
  });
}

async function login(page, username) {
  await page.goto("/login");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel("用户名").fill(username);
  await page.getByLabel("密码").fill("user123");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function openDeployment(page, projectName) {
  await page.goto("/support/deployments");
  const row = page.locator(".table-row").filter({ hasText: projectName });
  await expect(row).toBeVisible();
  await row.click();
  return row;
}

async function createDeployment(page, projectName) {
  await page.goto("/support/deployments");
  await page.getByRole("button", { name: "新建项目部署", exact: true }).click();
  const modal = page.locator(".modal");
  await expect(modal).toBeVisible();
  await expect.poll(() => modal.locator('select[name="customerId"] option').count()).toBeGreaterThan(1);
  await modal.locator('select[name="customerId"]').selectOption({ label: customerName });
  await modal.locator('input[name="projectName"]').fill(projectName);
  for (const product of products) {
    await modal.getByLabel(product, { exact: true }).check();
  }
  await modal.getByLabel("说明", { exact: true }).fill(`${runId} 自动化部署申请`);
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/support-tickets") && response.request().method() === "POST"
  );
  await modal.getByRole("button", { name: "提交", exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.data).toMatchObject({
    requesterName: "王二",
    projectName,
    status: "待运维接收"
  });
  return payload.data;
}

async function receiveDeployment(page, projectName) {
  await openDeployment(page, projectName);
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes("/receive") && response.request().method() === "POST"
  );
  await page.locator('[data-test="receive-deployment"]').click();
  expect((await responsePromise).status()).toBe(200);
  await openDeployment(page, projectName);
  await expect(page.getByText("待安排部署", { exact: true }).last()).toBeVisible();
}

async function completeDeployment(page, projectName, environment, verifyRequired = false) {
  await openDeployment(page, projectName);
  await page.locator('[data-test="complete-deployment"]').click();
  const modal = page.locator(".modal").filter({ hasText: "提交部署结果" });
  await expect(modal).toBeVisible();

  if (verifyRequired) {
    await modal.locator('[data-test="confirm-complete-deployment"]').click();
    for (const message of [
      "请填写环境类型",
      "请填写内网 IP",
      "请填写主机名",
      "请填写操作系统",
      "请填写用途",
      "请填写部署版本"
    ]) {
      await expect(modal.getByText(message, { exact: true })).toBeVisible();
    }
  }

  await modal.locator('[name="servers.0.environment"]').fill(environment.environment);
  await modal.locator('[name="servers.0.innerIp"]').fill(environment.innerIp);
  await modal.locator('[name="servers.0.outerIp"]').fill(environment.outerIp);
  await modal.locator('[name="servers.0.hostname"]').fill(environment.hostname);
  await modal.locator('[name="servers.0.os"]').fill(environment.os);
  await modal.locator('[name="servers.0.purpose"]').fill(environment.purpose);
  await modal.locator('[name="servers.0.deploymentVersion"]').fill(environment.deploymentVersion);
  await modal.locator('[name="servers.0.remark"]').fill(environment.remark);

  const responsePromise = page.waitForResponse((response) =>
    response.url().includes("/complete-deployment") && response.request().method() === "POST"
  );
  await modal.locator('[data-test="confirm-complete-deployment"]').click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.data).toMatchObject({
    projectName,
    status: "已部署",
    deployedByName: environment.deployedByName
  });
  await expect(modal).toBeHidden();
  await openDeployment(page, projectName);
  await expect(page.getByText("实际部署人", { exact: true })).toBeVisible();
  await expect(page.getByText(environment.deployedByName, { exact: true }).last()).toBeVisible();
  await expect(page.getByText(new RegExp(environment.hostname))).toBeVisible();
  return payload.data;
}

async function expectAssetsCreated(page, ticket, environment) {
  const token = await page.evaluate(() => localStorage.getItem("ops_pm_token"));
  expect(token).toBeTruthy();
  const response = await page.request.get(`/api/assets?ticketId=${ticket.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(response.status()).toBe(200);
  const payload = await response.json();
  const rows = Array.isArray(payload.data) ? payload.data : payload.data.list;
  const matching = rows.filter((asset) =>
    asset.ticketId === ticket.id &&
    asset.projectName === ticket.projectName &&
    asset.hostname === environment.hostname &&
    asset.innerIp === environment.innerIp
  );
  expect(matching.length).toBeGreaterThanOrEqual(products.length);
  expect(new Set(matching.map((asset) => asset.productName))).toEqual(new Set(products));
}

test.describe.serial("项目部署跨账号闭环", () => {
  test("王二提交，张三接收分配，李四完成并生成资产", async ({ page }, testInfo) => {
    const evidence = collectBrowserEvidence(page);
    const projectName = `${runId}-李四部署`;
    const environment = {
      environment: "生产",
      innerIp: "10.20.30.40",
      outerIp: "203.0.113.40",
      hostname: `${runId.toLowerCase()}-app-01`,
      os: "Rocky Linux 9",
      purpose: "应用服务",
      deploymentVersion: "v2.8.1",
      remark: "李四自动化部署完成",
      deployedByName: "李四"
    };

    try {
      await login(page, "wanger");
      const ticket = await createDeployment(page, projectName);

      await login(page, "zhangsan");
      await receiveDeployment(page, projectName);
      await page.getByLabel("部署负责人").selectOption({ label: "李四" });
      const assignPromise = page.waitForResponse((response) =>
        response.url().includes("/assign") && response.request().method() === "POST"
      );
      await page.locator('[data-test="assign-deployment"]').click();
      expect((await assignPromise).status()).toBe(200);

      await login(page, "lisi");
      const completedTicket = await completeDeployment(page, projectName, environment, true);
      await expectAssetsCreated(page, { ...ticket, id: completedTicket.id }, environment);

      expect(evidence.consoleErrors).toEqual([]);
      expect(evidence.pageErrors).toEqual([]);
      expect(evidence.requestFailures).toEqual([]);
      expect(evidence.httpErrors).toEqual([]);
    } finally {
      await attachEvidence(testInfo, evidence);
    }
  });

  test("张三接收后自领并完成部署", async ({ page }, testInfo) => {
    const evidence = collectBrowserEvidence(page);
    const projectName = `${runId}-张三部署`;
    const environment = {
      environment: "验证",
      innerIp: "10.20.31.50",
      outerIp: "",
      hostname: `${runId.toLowerCase()}-verify-01`,
      os: "Ubuntu 24.04",
      purpose: "验证服务",
      deploymentVersion: "v3.0.0-rc1",
      remark: "张三自领部署完成",
      deployedByName: "张三"
    };

    try {
      await login(page, "wanger");
      const ticket = await createDeployment(page, projectName);

      await login(page, "zhangsan");
      await receiveDeployment(page, projectName);
      const selfAssignPromise = page.waitForResponse((response) =>
        response.url().includes("/self-assign") && response.request().method() === "POST"
      );
      await page.locator('[data-test="self-assign-deployment"]').click();
      expect((await selfAssignPromise).status()).toBe(200);

      const completedTicket = await completeDeployment(page, projectName, environment);
      await expectAssetsCreated(page, { ...ticket, id: completedTicket.id }, environment);

      expect(evidence.consoleErrors).toEqual([]);
      expect(evidence.pageErrors).toEqual([]);
      expect(evidence.requestFailures).toEqual([]);
      expect(evidence.httpErrors).toEqual([]);
    } finally {
      await attachEvidence(testInfo, evidence);
    }
  });
});

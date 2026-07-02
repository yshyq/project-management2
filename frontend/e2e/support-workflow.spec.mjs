import { expect, test } from "@playwright/test";

const runId = `E2E-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const deployedCustomer = `${runId}-已部署客户`;
const emptyCustomer = `${runId}-空项目客户`;
const projectName = `${runId}-生产平台`;
const deployedProducts = ["edhr", "edhr MAX"];

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
    if (errorText === "net::ERR_ABORTED" && request.method() === "GET") return;
    evidence.requestFailures.push(`${request.method()} ${request.url()} ${errorText}`.trim());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) evidence.httpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
  });
  return evidence;
}

async function attachEvidence(testInfo, evidence) {
  if (Object.values(evidence).some((items) => items.length)) {
    await testInfo.attach("browser-evidence", {
      body: Buffer.from(JSON.stringify(evidence, null, 2)),
      contentType: "application/json"
    });
  }
}

async function loginAsAdmin(page) {
  await page.goto("/login");
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("admin123");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "工作台" })).toBeVisible();
}

async function createCustomer(page, name) {
  await page.goto("/support/customers");
  await page.getByRole("button", { name: "新增客户", exact: true }).click();
  const modal = page.locator(".modal");
  await expect(modal).toBeVisible();
  await modal.getByLabel("客户名称", { exact: true }).fill(name);
  await modal.getByLabel("销售", { exact: true }).fill("E2E销售");
  await modal.getByLabel("客户说明", { exact: true }).fill(`${runId} 自动化测试数据`);
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/customers") && response.request().method() === "POST"
  );
  await modal.getByRole("button", { name: "提交", exact: true }).click();
  expect((await responsePromise).status()).toBe(200);
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

async function openSupportForm(page, path, supportType) {
  await page.goto(path);
  await page.getByRole("button", { name: `新建${supportType}`, exact: true }).click();
  const modal = page.locator(".modal");
  await expect(modal).toBeVisible();
  if (supportType === "项目部署") {
    await expect.poll(() => modal.locator('select[name="customerId"] option').count()).toBeGreaterThan(1);
  } else {
    await expect(modal.locator('select[name="projectName"]')).toBeVisible();
  }
  return modal;
}

async function submitProjectSupport(
  page,
  path,
  supportType,
  title
) {
  const modal = await openSupportForm(page, path, supportType);
  const projectSelect = modal.locator('select[name="projectName"]');
  const productSelect = modal.locator('select[name="productId"]');
  await expect.poll(() => projectSelect.locator("option").count()).toBeGreaterThan(1);
  await expect(projectSelect).toBeEnabled();
  await expect(productSelect).toBeDisabled();

  await projectSelect.selectOption({ label: projectName });
  await productSelect.selectOption({ label: deployedProducts[0] });
  await modal.locator('input[name="title"]').fill(title);
  await modal.getByLabel("说明", { exact: true }).fill(`${runId} ${supportType}自动化说明`);

  const createPromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/support-tickets") && response.request().method() === "POST"
  );
  await modal.getByRole("button", { name: "提交", exact: true }).click();
  const response = await createPromise;
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.data).toMatchObject({
    supportType,
    customerName: deployedCustomer,
    projectName,
    productName: deployedProducts[0],
    title
  });
  await expect(modal).toBeHidden();
  await expect(page.locator(".data-table").getByText(title, { exact: true })).toBeVisible();
}

test.describe.serial("支持申请真实浏览器闭环", () => {
  test("管理员完成双产品部署和三类项目支持申请", async ({ page }, testInfo) => {
    const evidence = collectBrowserEvidence(page);
    try {
      await loginAsAdmin(page);
      await expect(page.locator("#global-search")).toHaveCount(0);
      await expect(page.getByText("编辑原型", { exact: true })).toHaveCount(0);
      await createCustomer(page, deployedCustomer);
      await createCustomer(page, emptyCustomer);

      const deploymentModal = await openSupportForm(page, "/support/deployments", "项目部署");
      await deploymentModal.locator('select[name="customerId"]').selectOption({ label: deployedCustomer });
      await deploymentModal.locator('input[name="projectName"]').fill(projectName);
      for (const product of deployedProducts) {
        await deploymentModal.getByLabel(product, { exact: true }).check();
      }
      await deploymentModal.getByLabel("说明", { exact: true }).fill(`${runId} 双产品部署`);

      const deploymentPromise = page.waitForResponse((response) =>
        response.url().endsWith("/api/support-tickets") && response.request().method() === "POST"
      );
      await deploymentModal.getByRole("button", { name: "提交", exact: true }).click();
      const deploymentResponse = await deploymentPromise;
      expect(deploymentResponse.status()).toBe(200);
      const deploymentPayload = await deploymentResponse.json();
      expect(deploymentPayload.data.projectName).toBe(projectName);
      expect(deploymentPayload.data.products.map((product) => product.name)).toEqual(deployedProducts);
      await expect(deploymentModal).toBeHidden();

      const technicalModal = await openSupportForm(page, "/support/technical", "技术支持");
      const projectSelect = technicalModal.locator('select[name="projectName"]');
      const productSelect = technicalModal.locator('select[name="productId"]');
      await expect(technicalModal.locator('select[name="customerId"]')).toHaveCount(0);
      await expect.poll(() => projectSelect.locator("option").count()).toBeGreaterThan(1);
      await expect(projectSelect).toBeEnabled();
      await expect(productSelect).toBeDisabled();

      await projectSelect.selectOption({ label: projectName });
      await productSelect.selectOption({ label: deployedProducts[0] });
      await technicalModal.getByRole("button", { name: "取消", exact: true }).click();

      await submitProjectSupport(page, "/support/technical", "技术支持", `${runId}-技术支持`);
      await submitProjectSupport(page, "/support/requirements", "项目需求", `${runId}-项目需求`);
      await submitProjectSupport(page, "/support/others", "其他支持", `${runId}-其他支持`);

      expect(evidence.consoleErrors).toEqual([]);
      expect(evidence.pageErrors).toEqual([]);
      expect(evidence.requestFailures).toEqual([]);
      expect(evidence.httpErrors).toEqual([]);
    } finally {
      await attachEvidence(testInfo, evidence);
    }
  });

  test("项目选项接口失败时显示可恢复错误且页面无控制台异常", async ({ page }, testInfo) => {
    const evidence = collectBrowserEvidence(page);
    try {
      await loginAsAdmin(page);
      await page.route("**/api/deployment-project-options*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            code: 1,
            message: "E2E 模拟项目选项失败",
            data: null,
            traceId: "e2e-project-options-error"
          })
        });
      });
      const modal = await openSupportForm(page, "/support/technical", "技术支持");
      await expect(modal.getByText("E2E 模拟项目选项失败", { exact: true })).toBeVisible();
      await expect(modal.locator('select[name="productId"]')).toBeDisabled();

      expect(evidence.consoleErrors).toEqual([]);
      expect(evidence.pageErrors).toEqual([]);
      expect(evidence.requestFailures).toEqual([]);
      expect(evidence.httpErrors).toEqual([]);
    } finally {
      await attachEvidence(testInfo, evidence);
    }
  });
});

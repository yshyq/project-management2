import { describe, expect, it } from "vitest";
import {
  buildSupportTicketPayload,
  clearAfterCustomerChange,
  clearAfterProjectChange,
  createSupportForm,
  productDisplayNames,
  selectDeploymentProject,
  validateSupportForm
} from "./supportForm";

describe("support request form rules", () => {
  it("clears the selected project and products when customer changes", () => {
    const form = createSupportForm();
    form.customerId = 2;
    form.projectName = "生产平台";
    form.productId = 11;
    form.productIds = [11, 12];

    clearAfterCustomerChange(form, 3);

    expect(form.customerId).toBe(3);
    expect(form.projectName).toBe("");
    expect(form.productId).toBeNull();
    expect(form.productIds).toEqual([]);
  });

  it("clears the selected product when project changes", () => {
    const form = createSupportForm();
    form.projectName = "生产平台";
    form.productId = 11;

    clearAfterProjectChange(form, "数据平台");

    expect(form.projectName).toBe("数据平台");
    expect(form.productId).toBeNull();
  });

  it("selects a customer-scoped project and clears product", () => {
    const form = createSupportForm();
    form.customerId = 3;
    form.productId = 11;

    selectDeploymentProject(form, {
      customerId: 3,
      customerName: "华南客户",
      projectName: "生产平台",
      products: [{ id: 11, name: "edhr", enabled: true }]
    });

    expect(form.customerId).toBe(3);
    expect(form.projectName).toBe("生产平台");
    expect(form.productId).toBeNull();
  });

  it("requires customer, a typed project name, and at least one product for deployment", () => {
    const form = createSupportForm();

    expect(validateSupportForm(form, true)).toEqual({
      customerId: "请选择客户",
      projectName: "请填写项目名称",
      productIds: "请至少选择一个产品"
    });
  });

  it("requires an existing project and one project product for non-deployment support", () => {
    const form = createSupportForm();

    expect(validateSupportForm(form, false)).toEqual({
      customerId: "请选择客户",
      projectName: "请选择已部署项目",
      productId: "请选择该项目已部署的产品",
      title: "请填写标题"
    });
  });

  it("builds deployment payload with productIds", () => {
    const form = createSupportForm();
    Object.assign(form, {
      customerId: 1,
      projectName: "华东生产平台",
      productIds: [3, 5],
      priority: "高",
      env: "生产"
    });

    expect(buildSupportTicketPayload(form, "项目部署")).toMatchObject({
      supportType: "项目部署",
      customerId: 1,
      projectName: "华东生产平台",
      productIds: [3, 5]
    });
    expect(buildSupportTicketPayload(form, "项目部署")).not.toHaveProperty("productId");
  });

  it("builds non-deployment payload with a single productId", () => {
    const form = createSupportForm();
    Object.assign(form, {
      customerId: 1,
      projectName: "华东生产平台",
      productId: 3,
      title: "登录异常"
    });

    expect(buildSupportTicketPayload(form, "技术支持")).toMatchObject({
      supportType: "技术支持",
      customerId: 1,
      projectName: "华东生产平台",
      productId: 3,
      title: "登录异常"
    });
    expect(buildSupportTicketPayload(form, "技术支持")).not.toHaveProperty("productIds");
  });
});

describe("product display compatibility", () => {
  it("shows every product from new and legacy response shapes", () => {
    expect(productDisplayNames({ productNames: ["edhr", "MedPro5"] })).toBe("edhr、MedPro5");
    expect(productDisplayNames({ products: [{ id: 1, name: "edhr" }, { id: 2, name: "edhr MAX" }] })).toBe("edhr、edhr MAX");
    expect(productDisplayNames({ productName: "edhr" })).toBe("edhr");
  });
});

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../stores/auth";
import type { Profile, SupportTicket } from "../api/types";
import SupportPage from "./SupportPage.vue";

const apiMock = vi.hoisted(() => ({
  tickets: vi.fn(),
  customers: vi.fn(),
  products: vi.fn(),
  deploymentProjects: vi.fn(),
  createTicket: vi.fn(),
  handleTicket: vi.fn(),
  closeTicket: vi.fn(),
  users: vi.fn(),
  receiveTicket: vi.fn(),
  assignTicket: vi.fn(),
  selfAssignTicket: vi.fn(),
  completeDeployment: vi.fn(),
  assets: vi.fn()
}));

vi.mock("../api", () => ({ api: apiMock }));

const customers = [
  { id: 1, name: "华东客户", salesName: "", note: "" },
  { id: 2, name: "华南客户", salesName: "", note: "" }
];
const products = [
  { id: 3, name: "edhr", enabled: true },
  { id: 5, name: "MedPro5", enabled: true }
];

const baseProfile: Profile = {
  id: 10,
  username: "wanger",
  name: "王二",
  dept: "交付部",
  roles: ["交付人员"],
  roleId: 3,
  menus: ["supportDeploy"],
  credentialPolicy: "申请查看"
};

function deploymentTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 101,
    ticketNo: "SUP-101",
    supportType: "项目部署",
    customerId: 1,
    customerName: "华东客户",
    projectName: "华东生产平台",
    productIds: [3, 5],
    productNames: ["edhr", "MedPro5"],
    products,
    title: "华东生产平台项目部署",
    priority: "中",
    env: "生产",
    description: "部署说明",
    status: "待运维接收",
    currentHandlerId: null,
    currentHandlerName: "",
    requesterId: 10,
    requesterName: "王二",
    deploymentExtra: null,
    createdAt: "2026-06-09T10:00:00Z",
    updatedAt: "2026-06-09T10:00:00Z",
    ...overrides
  };
}

async function mountPage(
  supportType: string,
  options: { profile?: Profile; tickets?: SupportTicket[]; openCreate?: boolean } = {}
) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.profile = options.profile || baseProfile;
  apiMock.tickets.mockResolvedValue({
    list: options.tickets || [],
    page: 1,
    pageSize: 20,
    total: options.tickets?.length || 0
  });
  const wrapper = mount(SupportPage, {
    props: { supportType },
    global: { plugins: [pinia] }
  });
  await flushPromises();
  if (options.openCreate !== false) {
    await wrapper.get("button.primary-button").trigger("click");
    await flushPromises();
  }
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.tickets.mockResolvedValue({ list: [], page: 1, pageSize: 20, total: 0 });
  apiMock.customers.mockResolvedValue({ list: customers, page: 1, pageSize: 20, total: 2 });
  apiMock.products.mockResolvedValue({ list: products, page: 1, pageSize: 20, total: 2 });
  apiMock.deploymentProjects.mockResolvedValue([]);
  apiMock.createTicket.mockResolvedValue({});
  apiMock.users.mockResolvedValue({
    list: [
      {
        id: 12,
        username: "lisi",
        name: "李四",
        dept: "运维部",
        roles: ["运维工程师"],
        roleId: 5,
        menus: ["supportDeploy"],
        credentialPolicy: "申请查看"
      }
    ],
    page: 1,
    pageSize: 20,
    total: 1
  });
  apiMock.receiveTicket.mockResolvedValue({});
  apiMock.assignTicket.mockResolvedValue({});
  apiMock.selfAssignTicket.mockResolvedValue({});
  apiMock.completeDeployment.mockResolvedValue({});
  apiMock.assets.mockResolvedValue({ list: [], page: 1, pageSize: 20, total: 0 });
});

describe("deployment request form", () => {
  it("uses a required project text input and product multi-select controls", async () => {
    const wrapper = await mountPage("项目部署");

    expect(wrapper.get('[name="projectName"]').attributes("required")).toBeDefined();
    expect(wrapper.findAll('input[name="productIds"][type="checkbox"]')).toHaveLength(2);
  });

  it("shows validation errors and submits all selected products", async () => {
    const wrapper = await mountPage("项目部署");

    await wrapper.get('[data-test="submit-ticket"]').trigger("click");
    expect(wrapper.text()).toContain("请选择客户");
    expect(wrapper.text()).toContain("请填写项目名称");
    expect(wrapper.text()).toContain("请至少选择一个产品");

    await wrapper.get('[name="customerId"]').setValue("1");
    await wrapper.get('[name="projectName"]').setValue("华东生产平台");
    const productChecks = wrapper.findAll('input[name="productIds"]');
    await productChecks[0].setValue(true);
    await productChecks[1].setValue(true);
    await wrapper.get('[data-test="submit-ticket"]').trigger("click");
    await flushPromises();

    expect(apiMock.createTicket).toHaveBeenCalledWith(expect.objectContaining({
      supportType: "项目部署",
      customerId: 1,
      projectName: "华东生产平台",
      productIds: [3, 5]
    }));
  });
});

describe("existing project support form", () => {
  it("loads projects after customer selection and products after project selection", async () => {
    apiMock.deploymentProjects.mockResolvedValue([
      { customerId: 1, customerName: "华东客户", projectName: "生产平台", products: [products[0]] },
    ]);
    const wrapper = await mountPage("技术支持");
    const projectSelect = wrapper.get('[name="projectName"]');
    const productSelect = wrapper.get('[name="productId"]');

    expect(wrapper.find('[name="customerId"]').exists()).toBe(true);
    expect(apiMock.customers).toHaveBeenCalled();
    expect(apiMock.products).not.toHaveBeenCalled();
    expect(apiMock.deploymentProjects).not.toHaveBeenCalled();
    expect(projectSelect.attributes("disabled")).toBeDefined();
    expect(productSelect.attributes("disabled")).toBeDefined();

    await wrapper.get('[name="customerId"]').setValue("1");
    await flushPromises();
    expect(apiMock.deploymentProjects).toHaveBeenCalledWith(1);
    expect(projectSelect.attributes("disabled")).toBeUndefined();

    await projectSelect.setValue("生产平台");
    await flushPromises();
    expect(productSelect.attributes("disabled")).toBeUndefined();
    expect(productSelect.findAll("option").map((option) => option.text())).toContain("edhr");
  });

  it("clears stale project and product when the customer changes", async () => {
    apiMock.deploymentProjects.mockResolvedValue([
      { customerId: 1, customerName: "华东客户", projectName: "生产平台", products: [products[0]] },
    ]);
    const wrapper = await mountPage("项目需求");

    await wrapper.get('[name="customerId"]').setValue("1");
    await flushPromises();
    await wrapper.get('[name="projectName"]').setValue("生产平台");
    await wrapper.get('[name="productId"]').setValue("3");
    await wrapper.get('[name="customerId"]').setValue("2");
    await flushPromises();

    expect((wrapper.get('[name="projectName"]').element as HTMLSelectElement).value).toBe("");
    expect((wrapper.get('[name="productId"]').element as HTMLSelectElement).value).toBe("");
  });

  it("shows a clear empty state when the selected customer has no deployed projects", async () => {
    const wrapper = await mountPage("其他支持");

    await wrapper.get('[name="customerId"]').setValue("1");
    await flushPromises();

    expect(wrapper.text()).toContain("该客户暂无已部署项目");
  });

  it("shows the project loading error after customer selection", async () => {
    apiMock.deploymentProjects.mockRejectedValue(new Error("项目选项加载失败"));

    const wrapper = await mountPage("技术支持");
    await wrapper.get('[name="customerId"]').setValue("1");
    await flushPromises();

    expect(wrapper.text()).toContain("项目选项加载失败");
  });
});

describe("deployment lifecycle actions", () => {
  const leaderProfile: Profile = {
    ...baseProfile,
    id: 11,
    username: "zhangsan",
    name: "张三",
    dept: "运维部",
    roles: ["运维 Leader"],
    roleId: 4
  };
  const engineerProfile: Profile = {
    ...baseProfile,
    id: 12,
    username: "lisi",
    name: "李四",
    dept: "运维部",
    roles: ["运维工程师"],
    roleId: 5
  };

  it("shows receive only to the operations leader for a pending deployment", async () => {
    const leader = await mountPage("项目部署", {
      profile: leaderProfile,
      tickets: [deploymentTicket()],
      openCreate: false
    });
    expect(leader.find('[data-test="receive-deployment"]').exists()).toBe(true);
    expect(leader.find('[data-test="complete-deployment"]').exists()).toBe(false);

    const delivery = await mountPage("项目部署", {
      tickets: [deploymentTicket()],
      openCreate: false
    });
    expect(delivery.find('[data-test="receive-deployment"]').exists()).toBe(false);
  });

  it("does not show leader actions to an operations administrator", async () => {
    const administratorProfile: Profile = {
      ...leaderProfile,
      username: "ops-admin",
      name: "运维管理员",
      roles: ["运维管理员"]
    };
    const pending = await mountPage("项目部署", {
      profile: administratorProfile,
      tickets: [deploymentTicket()],
      openCreate: false
    });

    expect(pending.find('[data-test="receive-deployment"]').exists()).toBe(false);

    const arranging = await mountPage("项目部署", {
      profile: administratorProfile,
      tickets: [deploymentTicket({
        status: "待安排部署",
        receivedById: leaderProfile.id,
        receivedByName: leaderProfile.name
      })],
      openCreate: false
    });

    expect(arranging.find('[data-test="self-assign-deployment"]').exists()).toBe(false);
    expect(arranging.find('[data-test="assign-deployment"]').exists()).toBe(false);
    expect(arranging.find('[name="deploymentHandlerId"]').exists()).toBe(false);

    const deploying = await mountPage("项目部署", {
      profile: administratorProfile,
      tickets: [deploymentTicket({
        status: "部署中",
        currentHandlerId: engineerProfile.id,
        currentHandlerName: engineerProfile.name
      })],
      openCreate: false
    });

    expect(deploying.find('[data-test="reassign-deployment"]').exists()).toBe(false);
    expect(apiMock.users).not.toHaveBeenCalled();
  });

  it("lets the leader self-assign or assign an operations engineer after receiving", async () => {
    const wrapper = await mountPage("项目部署", {
      profile: leaderProfile,
      tickets: [deploymentTicket({
        status: "待安排部署",
        receivedById: leaderProfile.id,
        receivedByName: leaderProfile.name
      })],
      openCreate: false
    });

    expect(wrapper.find('[data-test="self-assign-deployment"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="assign-deployment"]').exists()).toBe(true);
    expect(wrapper.find('[name="deploymentHandlerId"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("李四");
  });

  it("shows completion only to the assigned handler and validates required environment fields", async () => {
    const assignedTicket = deploymentTicket({
      status: "部署中",
      currentHandlerId: engineerProfile.id,
      currentHandlerName: engineerProfile.name,
      receivedById: leaderProfile.id,
      receivedByName: leaderProfile.name
    });
    const wrapper = await mountPage("项目部署", {
      profile: engineerProfile,
      tickets: [assignedTicket],
      openCreate: false
    });

    await wrapper.get('[data-test="complete-deployment"]').trigger("click");
    await wrapper.get('[data-test="confirm-complete-deployment"]').trigger("click");
    expect(apiMock.completeDeployment).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("请填写环境类型");
    expect(wrapper.text()).toContain("请填写内网 IP");
    expect(wrapper.text()).toContain("请填写主机名");
    expect(wrapper.text()).toContain("请填写操作系统");
    expect(wrapper.text()).toContain("请填写用途");
    expect(wrapper.text()).toContain("请填写部署版本");

    await wrapper.get('[name="environment"]').setValue("生产");
    await wrapper.get('[name="innerIp"]').setValue("10.20.30.40");
    await wrapper.get('[name="hostname"]').setValue("prod-app-01");
    await wrapper.get('[name="os"]').setValue("Rocky Linux 9");
    await wrapper.get('[name="purpose"]').setValue("应用服务");
    await wrapper.get('[name="deploymentVersion"]').setValue("v2.8.1");
    await wrapper.get('[name="outerIp"]').setValue("203.0.113.10");
    await wrapper.get('[name="remark"]').setValue("自动化验收");
    await wrapper.get('[data-test="confirm-complete-deployment"]').trigger("click");
    await flushPromises();

    expect(apiMock.completeDeployment).toHaveBeenCalledWith(assignedTicket.id, {
      environment: "生产",
      innerIp: "10.20.30.40",
      outerIp: "203.0.113.10",
      hostname: "prod-app-01",
      os: "Rocky Linux 9",
      purpose: "应用服务",
      deploymentVersion: "v2.8.1",
      remark: "自动化验收"
    });

    const nonHandler = await mountPage("项目部署", {
      profile: leaderProfile,
      tickets: [assignedTicket],
      openCreate: false
    });
    expect(nonHandler.find('[data-test="complete-deployment"]').exists()).toBe(false);
    expect(nonHandler.find('[data-test="reassign-deployment"]').exists()).toBe(true);
  });

  it("renders the deployer and environment summary for a completed deployment", async () => {
    apiMock.assets.mockResolvedValue({
      list: [{
        id: 201,
        projectId: null,
        ticketId: 101,
        ticketNo: "SUP-101",
        customerId: 1,
        customerName: "华东客户",
        projectName: "华东生产平台",
        productTypeId: 3,
        productName: "edhr",
        deployedById: engineerProfile.id,
        deployedByName: engineerProfile.name,
        environment: "生产",
        innerIp: "10.20.30.40",
        outerIp: "",
        hostname: "prod-app-01",
        os: "Rocky Linux 9",
        purpose: "应用服务",
        deploymentVersion: "v2.8.1",
        remark: "",
        createdAt: "2026-06-09T12:00:00Z",
        updatedAt: "2026-06-09T12:00:00Z"
      }],
      page: 1,
      pageSize: 20,
      total: 1
    });
    const wrapper = await mountPage("项目部署", {
      profile: baseProfile,
      tickets: [deploymentTicket({
        status: "已部署",
        currentHandlerId: engineerProfile.id,
        currentHandlerName: engineerProfile.name,
        deployedById: engineerProfile.id,
        deployedByName: engineerProfile.name,
        deployedAt: "2026-06-09T12:00:00Z",
        deploymentResult: null
      })],
      openCreate: false
    });

    expect(wrapper.text()).toContain("实际部署人");
    expect(wrapper.text()).toContain("李四");
    expect(wrapper.text()).toContain("prod-app-01");
    expect(wrapper.text()).toContain("10.20.30.40");
    expect(wrapper.text()).toContain("v2.8.1");
    expect(apiMock.assets).toHaveBeenCalledWith(101);
  });
});

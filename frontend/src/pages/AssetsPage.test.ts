import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AssetsPage from "./AssetsPage.vue";

const apiMock = vi.hoisted(() => ({
  assets: vi.fn()
}));

vi.mock("../api", () => ({ api: apiMock }));

describe("AssetsPage", () => {
  beforeEach(() => {
    apiMock.assets.mockReset();
    apiMock.assets.mockResolvedValue({
      list: [{
        id: 1,
        ticketId: 8,
        ticketNo: "SUP-20260609-001",
        customerName: "华东产业园",
        projectName: "生产平台",
        productName: "edhr",
        environment: "生产",
        innerIp: "10.20.30.40",
        outerIp: "",
        hostname: "prod-app-01",
        os: "Rocky Linux 9",
        purpose: "应用服务",
        deploymentVersion: "v2.8.1",
        deployedByName: "李四",
        remark: "部署完成"
      }],
      page: 1,
      pageSize: 20,
      total: 1
    });
  });

  it("renders deployed server assets from the API", async () => {
    const wrapper = mount(AssetsPage);
    await flushPromises();

    expect(apiMock.assets).toHaveBeenCalledWith();
    expect(wrapper.text()).toContain("SUP-20260609-001");
    expect(wrapper.text()).toContain("prod-app-01");
    expect(wrapper.text()).toContain("李四");
    expect(wrapper.text()).not.toContain("等待后端补充");
  });
});

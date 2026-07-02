import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./index";

describe("deployment project API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("loads deployment projects for the selected customer", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        message: "ok",
        traceId: "test",
        data: [{ projectName: "生产平台", products: [{ id: 3, name: "edhr" }] }]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.deploymentProjects(7)).resolves.toEqual([
      { projectName: "生产平台", products: [{ id: 3, name: "edhr" }] }
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/deployment-project-options?customerId=7",
      expect.objectContaining({ headers: expect.any(Headers) })
    );
  });

  it("loads all deployment projects for project-first support selection", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        message: "ok",
        traceId: "test",
        data: [{
          customerId: 7,
          customerName: "华东客户",
          projectName: "生产平台",
          products: [{ id: 3, name: "edhr" }]
        }]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.deploymentProjects();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/deployment-project-options",
      expect.objectContaining({ headers: expect.any(Headers) })
    );
  });
});

describe("support ticket API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("passes pagination parameters when loading support tickets", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        message: "ok",
        traceId: "test",
        data: { list: [], page: 3, pageSize: 10, total: 0 }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.tickets("项目部署", "生产", 3, 10);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/support-tickets?supportType=%E9%A1%B9%E7%9B%AE%E9%83%A8%E7%BD%B2&keyword=%E7%94%9F%E4%BA%A7&pageNo=3&pageSize=10",
      expect.objectContaining({ headers: expect.any(Headers) })
    );
  });
});

describe("API error messages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("uses a Chinese fallback when the server only returns an English HTTP status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({})
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.tickets()).rejects.toThrow("服务器处理失败，请稍后重试");
  });

  it("uses a Chinese message when the request cannot reach the server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(api.tickets()).rejects.toThrow("网络连接异常，请检查网络后重试");
  });
});

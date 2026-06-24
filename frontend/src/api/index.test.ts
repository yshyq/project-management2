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

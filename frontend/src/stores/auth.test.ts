import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./auth";

describe("auth menu permissions", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("always allows collaborative support menus for authenticated users", () => {
    const auth = useAuthStore();
    auth.menus = ["dashboard", "supportDeploy", "supportTech"];

    expect(auth.canSee("customerInfo")).toBe(true);
    expect(auth.canSee("supportDeploy")).toBe(true);
    expect(auth.canSee("supportTech")).toBe(true);
    expect(auth.canSee("supportNeed")).toBe(true);
    expect(auth.canSee("supportOther")).toBe(true);
    expect(auth.canSee("assets")).toBe(false);
  });
});

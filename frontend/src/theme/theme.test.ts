import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ThemePicker from "../components/ThemePicker.vue";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  contrastRatio,
  createThemeVariables,
  loadTheme,
  normalizeHex,
  resetTheme,
  saveTheme,
  themePresets
} from "./theme";

describe("theme presets", () => {
  it("provides the four approved presets", () => {
    expect(themePresets.map((preset) => preset.name)).toEqual([
      "科技蓝",
      "运维绿",
      "清晰红",
      "琥珀金"
    ]);
    expect(themePresets.map((preset) => preset.id)).toEqual([
      "tech-blue",
      "ops-green",
      "clear-red",
      "amber-gold"
    ]);
  });
});

describe("theme colors", () => {
  it("normalizes valid short and long HEX values", () => {
    expect(normalizeHex("#2f7cff")).toBe("#2F7CFF");
    expect(normalizeHex("0aC")).toBe("#00AACC");
  });

  it("falls back to the default primary for invalid HEX values", () => {
    expect(normalizeHex("not-a-color")).toBe(DEFAULT_THEME.primary);
    expect(normalizeHex("#12")).toBe(DEFAULT_THEME.primary);
  });

  it("creates distinct interaction and emphasis colors from a custom primary", () => {
    const variables = createThemeVariables("#23A66F");

    expect(variables["--theme-primary"]).toBe("#23A66F");
    expect(variables["--theme-hover"]).not.toBe(variables["--theme-primary"]);
    expect(variables["--theme-active"]).not.toBe(variables["--theme-primary"]);
    expect(variables["--theme-soft"]).toMatch(/^rgba\(/);
    expect(variables["--theme-focus"]).toMatch(/^rgba\(/);
    expect(variables["--theme-on-primary"]).toMatch(/^#[0-9A-F]{6}$/);
  });

  it.each(themePresets)(
    "chooses WCAG-compliant primary text for the $name preset",
    (preset) => {
      const variables = createThemeVariables(preset.primary);

      expect(
        contrastRatio(
          variables["--theme-primary"],
          variables["--theme-on-primary"]
        )
      ).toBeGreaterThanOrEqual(4.5);
    }
  );

  it.each(["#FFFFFF", "#000000", "#777777", "#2F7CFF", "#C88719"])(
    "chooses the higher-contrast foreground for custom color %s",
    (primary) => {
      const variables = createThemeVariables(primary);
      const selectedRatio = contrastRatio(
        variables["--theme-primary"],
        variables["--theme-on-primary"]
      );
      const whiteRatio = contrastRatio(variables["--theme-primary"], "#FFFFFF");
      const darkRatio = contrastRatio(variables["--theme-primary"], "#000000");

      expect(selectedRatio).toBeGreaterThanOrEqual(4.5);
      expect(selectedRatio).toBe(Math.max(whiteRatio, darkRatio));
    }
  );

  it("applies generated CSS variables to the document root", () => {
    applyTheme({ preset: "custom", primary: "#D14B57" });

    expect(document.documentElement.style.getPropertyValue("--theme-primary")).toBe("#D14B57");
    expect(document.documentElement.style.getPropertyValue("--theme-hover")).not.toBe("");
  });
});

describe("theme persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
  });

  it("saves and loads the selected theme", () => {
    saveTheme({ preset: "custom", primary: "#23A66F" });

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(
      JSON.stringify({ preset: "custom", primary: "#23A66F" })
    );
    expect(loadTheme()).toEqual({ preset: "custom", primary: "#23A66F" });
  });

  it("ignores malformed stored data", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "{bad-json");

    expect(loadTheme()).toEqual(DEFAULT_THEME);
  });

  it("restores the default theme and removes persisted customization", () => {
    saveTheme({ preset: "custom", primary: "#23A66F" });

    expect(resetTheme()).toEqual(DEFAULT_THEME);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--theme-primary")).toBe(DEFAULT_THEME.primary);
  });
});

describe("ThemePicker", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
  });

  it("opens the panel and applies a preset", async () => {
    const wrapper = mount(ThemePicker);

    await wrapper.get('[aria-label="打开主题颜色设置"]').trigger("click");
    expect(wrapper.get('[role="dialog"]').isVisible()).toBe(true);

    await wrapper.get('[data-theme-preset="ops-green"]').trigger("click");
    expect(document.documentElement.style.getPropertyValue("--theme-primary")).toBe("#23A66F");
    expect(loadTheme()).toEqual({ preset: "ops-green", primary: "#23A66F" });
  });

  it("validates custom HEX and can restore the default", async () => {
    const wrapper = mount(ThemePicker);
    await wrapper.get('[aria-label="打开主题颜色设置"]').trigger("click");

    const input = wrapper.get<HTMLInputElement>('[data-testid="custom-hex"]');
    await input.setValue("#12");
    expect(wrapper.get('[role="alert"]').text()).toContain("有效的 HEX");

    await input.setValue("#D14B57");
    await wrapper.get('[data-testid="apply-custom"]').trigger("click");
    expect(document.documentElement.style.getPropertyValue("--theme-primary")).toBe("#D14B57");

    await wrapper.get('[data-testid="reset-theme"]').trigger("click");
    expect(document.documentElement.style.getPropertyValue("--theme-primary")).toBe(DEFAULT_THEME.primary);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("moves focus into the dialog and closes with Escape", async () => {
    const wrapper = mount(ThemePicker, { attachTo: document.body });
    const trigger = wrapper.get<HTMLButtonElement>('[data-testid="theme-trigger"]');

    trigger.element.focus();
    await trigger.trigger("click");

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    expect(document.activeElement).toBe(
      wrapper.get<HTMLButtonElement>('[data-testid="theme-close"]').element
    );

    await wrapper.get('[role="dialog"]').trigger("keydown", { key: "Escape" });

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(document.activeElement).toBe(trigger.element);
    wrapper.unmount();
  });
});

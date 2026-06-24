export const THEME_STORAGE_KEY = "ops-project-theme";

export type ThemePresetId = "tech-blue" | "ops-green" | "clear-red" | "amber-gold";
export type ThemeSelection = {
  preset: ThemePresetId | "custom";
  primary: string;
};

export type ThemePreset = {
  id: ThemePresetId;
  name: string;
  primary: string;
};

export const themePresets: ThemePreset[] = [
  { id: "tech-blue", name: "科技蓝", primary: "#2F7CFF" },
  { id: "ops-green", name: "运维绿", primary: "#23A66F" },
  { id: "clear-red", name: "清晰红", primary: "#D14B57" },
  { id: "amber-gold", name: "琥珀金", primary: "#C88719" }
];

export const DEFAULT_THEME: ThemeSelection = {
  preset: "tech-blue",
  primary: themePresets[0].primary
};

type Rgb = { r: number; g: number; b: number };
export type ThemeVariables = Record<`--theme-${string}`, string>;

function expandHex(value: string) {
  return value.length === 3
    ? value.split("").map((character) => character + character).join("")
    : value;
}

export function normalizeHex(value: string, fallback = DEFAULT_THEME.primary) {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) {
    return fallback;
  }
  return `#${expandHex(normalized).toUpperCase()}`;
}

function hexToRgb(value: string): Rgb {
  const hex = normalizeHex(value).slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  };
}

function toHex(value: number) {
  return Math.round(value).toString(16).padStart(2, "0").toUpperCase();
}

function rgbToHex({ r, g, b }: Rgb) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mix(color: Rgb, target: Rgb, amount: number): Rgb {
  return {
    r: color.r + (target.r - color.r) * amount,
    g: color.g + (target.g - color.g) * amount,
    b: color.b + (target.b - color.b) * amount
  };
}

function relativeLuminance({ r, g, b }: Rgb) {
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(hexToRgb(first));
  const secondLuminance = relativeLuminance(hexToRgb(second));
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function choosePrimaryForeground(primary: string) {
  const lightForeground = "#FFFFFF";
  const darkForeground = "#000000";
  return contrastRatio(primary, lightForeground) >= contrastRatio(primary, darkForeground)
    ? lightForeground
    : darkForeground;
}

export function createThemeVariables(primaryValue: string): ThemeVariables {
  const primary = normalizeHex(primaryValue);
  const rgb = hexToRgb(primary);
  const luminance = relativeLuminance(rgb);
  const hoverTarget = luminance > 0.42
    ? { r: 0, g: 0, b: 0 }
    : { r: 255, g: 255, b: 255 };

  return {
    "--theme-primary": primary,
    "--theme-hover": rgbToHex(mix(rgb, hoverTarget, 0.14)),
    "--theme-active": rgbToHex(mix(rgb, { r: 0, g: 0, b: 0 }, 0.22)),
    "--theme-soft": `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`,
    "--theme-soft-strong": `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.26)`,
    "--theme-focus": `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.24)`,
    "--theme-shadow": `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`,
    "--theme-on-primary": choosePrimaryForeground(primary)
  };
}

function sanitizeTheme(selection: ThemeSelection): ThemeSelection {
  const preset = selection.preset === "custom"
    ? "custom"
    : themePresets.some((item) => item.id === selection.preset)
      ? selection.preset
      : DEFAULT_THEME.preset;

  return {
    preset,
    primary: normalizeHex(selection.primary)
  };
}

export function applyTheme(selection: ThemeSelection) {
  const theme = sanitizeTheme(selection);
  const root = document.documentElement;
  Object.entries(createThemeVariables(theme.primary)).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  root.dataset.themePreset = theme.preset;
  return theme;
}

export function saveTheme(selection: ThemeSelection) {
  const theme = applyTheme(selection);
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  return theme;
}

export function loadTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (!stored) return applyTheme(DEFAULT_THEME);
    const parsed = JSON.parse(stored) as Partial<ThemeSelection>;
    if (typeof parsed.primary !== "string" || typeof parsed.preset !== "string") {
      return applyTheme(DEFAULT_THEME);
    }
    return applyTheme(parsed as ThemeSelection);
  } catch {
    return applyTheme(DEFAULT_THEME);
  }
}

export function resetTheme() {
  localStorage.removeItem(THEME_STORAGE_KEY);
  return applyTheme(DEFAULT_THEME);
}

<template>
  <div class="theme-picker">
    <button
      ref="triggerButton"
      class="icon-button theme-trigger"
      type="button"
      data-testid="theme-trigger"
      aria-label="打开主题颜色设置"
      title="主题颜色"
      :aria-expanded="open"
      @click="togglePicker"
    >
      <span class="theme-trigger-mark" aria-hidden="true">
        <i></i><i></i><i></i><i></i>
      </span>
    </button>

    <div
      v-if="open"
      class="theme-popover"
      role="dialog"
      aria-label="主题颜色设置"
      @keydown.esc.stop.prevent="closePicker"
    >
      <div class="theme-popover-head">
        <div>
          <strong>主题颜色</strong>
          <span>预设或自定义主色</span>
        </div>
        <button
          ref="closeButton"
          class="theme-close"
          type="button"
          data-testid="theme-close"
          aria-label="关闭主题颜色设置"
          title="关闭"
          @click="closePicker"
        >×</button>
      </div>

      <div class="theme-presets" aria-label="主题预设">
        <button
          v-for="preset in themePresets"
          :key="preset.id"
          class="theme-preset"
          :class="{ active: selection.preset === preset.id }"
          type="button"
          :data-theme-preset="preset.id"
          @click="selectPreset(preset)"
        >
          <span class="theme-swatch" :style="{ backgroundColor: preset.primary }" aria-hidden="true"></span>
          <span>{{ preset.name }}</span>
        </button>
      </div>

      <div class="theme-custom">
        <label>
          <span>自定义主色</span>
          <span class="theme-color-row">
            <input
              v-model="colorValue"
              class="theme-color-input"
              type="color"
              aria-label="选择自定义主色"
              @input="syncColorInput"
            />
            <input
              v-model.trim="customHex"
              data-testid="custom-hex"
              inputmode="text"
              maxlength="7"
              autocomplete="off"
              spellcheck="false"
              aria-label="自定义主色 HEX"
              @input="validateDraft"
              @keyup.enter="applyCustom"
            />
          </span>
        </label>
        <span v-if="error" class="theme-error" role="alert">{{ error }}</span>
        <button class="primary-button theme-apply" type="button" data-testid="apply-custom" @click="applyCustom">
          应用自定义颜色
        </button>
      </div>

      <button class="theme-reset" type="button" data-testid="reset-theme" @click="restoreDefault">
        恢复默认主题
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import {
  loadTheme,
  normalizeHex,
  resetTheme,
  saveTheme,
  themePresets,
  type ThemePreset,
  type ThemeSelection
} from "../theme/theme";

const selection = ref<ThemeSelection>(loadTheme());
const open = ref(false);
const triggerButton = ref<HTMLButtonElement>();
const closeButton = ref<HTMLButtonElement>();
const customHex = ref(selection.value.primary);
const colorValue = ref(selection.value.primary);
const error = ref("");

watch(open, async (isOpen) => {
  if (!isOpen) return;
  await nextTick();
  closeButton.value?.focus();
});

function togglePicker() {
  if (open.value) {
    closePicker();
    return;
  }
  open.value = true;
}

async function closePicker() {
  open.value = false;
  await nextTick();
  triggerButton.value?.focus();
}

function selectPreset(preset: ThemePreset) {
  selection.value = saveTheme({ preset: preset.id, primary: preset.primary });
  customHex.value = preset.primary;
  colorValue.value = preset.primary;
  error.value = "";
}

function isValidHex(value: string) {
  return /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function applyCustom() {
  if (!isValidHex(customHex.value)) {
    error.value = "请输入有效的 HEX 颜色，例如 #2F7CFF";
    return;
  }
  const primary = normalizeHex(customHex.value);
  selection.value = saveTheme({ preset: "custom", primary });
  customHex.value = primary;
  colorValue.value = primary;
  error.value = "";
}

function syncColorInput() {
  customHex.value = normalizeHex(colorValue.value);
  applyCustom();
}

function validateDraft() {
  error.value = isValidHex(customHex.value)
    ? ""
    : "请输入有效的 HEX 颜色，例如 #2F7CFF";
}

function restoreDefault() {
  selection.value = resetTheme();
  customHex.value = selection.value.primary;
  colorValue.value = selection.value.primary;
  error.value = "";
}
</script>

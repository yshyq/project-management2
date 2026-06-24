<template>
  <span class="badge" :class="colorClass">{{ text }}</span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ text: string }>();
const colorClass = computed(() => {
  if (/成功|上线|运维中|启用|approved/.test(props.text)) return "green";
  if (/待|部署|处理中|申请|pending/.test(props.text)) return "blue";
  if (/高|紧急|超时|失败|rejected/.test(props.text)) return "red";
  return "amber";
});
</script>

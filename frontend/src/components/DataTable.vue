<template>
  <div class="data-table">
    <div class="table-head" :style="{ gridTemplateColumns: columnsTemplate }">
      <div v-for="column in columns" :key="column.key">{{ column.label }}</div>
    </div>
    <div v-if="loading" class="empty-state">正在加载数据...</div>
    <div v-else-if="!rows.length" class="empty-state">暂无数据</div>
    <div
      v-for="row in rows"
      v-else
      :key="rowIdentity(row)"
      class="table-row"
      :class="{ selected: selectedKey === row[rowKey] }"
      :style="{ gridTemplateColumns: columnsTemplate }"
      @click="$emit('select', row)"
    >
      <div v-for="column in columns" :key="column.key">
        <slot :name="column.key" :row="row">{{ row[column.key] || "-" }}</slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface TableColumn {
  key: string;
  label: string;
  width?: string;
}

defineEmits<{ select: [row: Record<string, unknown>] }>();

const props = withDefaults(defineProps<{
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  rowKey?: string;
  selectedKey?: string | number | null;
  loading?: boolean;
}>(), {
  rowKey: "id",
  selectedKey: null,
  loading: false
});

const columnsTemplate = props.columns.map((column) => column.width || "minmax(120px, 1fr)").join(" ");

function rowIdentity(row: Record<string, unknown>) {
  const value = row[props.rowKey];
  return typeof value === "string" || typeof value === "number" || typeof value === "symbol"
    ? value
    : JSON.stringify(row);
}
</script>

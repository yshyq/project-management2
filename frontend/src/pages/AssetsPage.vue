<template>
  <section class="asset-page">
    <div class="panel-head">
      <div><h2>服务器资产台账</h2><p>项目部署完成后自动生成，可追溯工单、项目、产品和实际部署人。</p></div>
      <button class="secondary-button" type="button" :disabled="loading" @click="load">刷新</button>
    </div>
    <div v-if="error" class="error-box page-message">{{ error }}</div>
    <section class="panel">
      <DataTable :columns="columns" :rows="assets" :loading="loading">
        <template #network="{ row }">
          {{ row.innerIp }}<small v-if="row.outerIp" class="asset-secondary">外网 {{ row.outerIp }}</small>
        </template>
        <template #host="{ row }">
          {{ row.hostname }}<small class="asset-secondary">{{ row.os }}</small>
        </template>
        <template #deployment="{ row }">
          {{ row.deploymentVersion }}<small class="asset-secondary">{{ row.deployedByName }}</small>
        </template>
      </DataTable>
    </section>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../api";
import type { ServerAsset } from "../api/types";
import DataTable from "../components/DataTable.vue";

const assets = ref<ServerAsset[]>([]);
const loading = ref(false);
const error = ref("");
const columns = [
  { key: "ticketNo", label: "部署工单", width: "150px" },
  { key: "customerName", label: "客户", width: "150px" },
  { key: "projectName", label: "项目", width: "minmax(180px,1fr)" },
  { key: "productName", label: "产品", width: "120px" },
  { key: "environment", label: "环境", width: "80px" },
  { key: "network", label: "网络", width: "150px" },
  { key: "host", label: "主机", width: "180px" },
  { key: "deployment", label: "版本 / 部署人", width: "130px" }
];

async function load() {
  loading.value = true;
  error.value = "";
  try {
    assets.value = (await api.assets()).list;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "资产加载失败，请稍后重试";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

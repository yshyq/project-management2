<template>
  <section>
    <div class="metrics-grid">
      <article class="metric"><span>项目总数</span><strong>{{ projects.length }}</strong><small>来自 /api/projects</small></article>
      <article class="metric"><span>支持单</span><strong>{{ tickets.length }}</strong><small>来自 /api/support-tickets</small></article>
      <article class="metric"><span>客户数量</span><strong>{{ customers.length }}</strong><small>来自 /api/customers</small></article>
      <article class="metric"><span>凭证数量</span><strong>{{ credentials.length }}</strong><small>默认脱敏展示</small></article>
    </div>
    <div class="two-column">
      <section class="panel">
        <div class="panel-head"><h2>近期支持单</h2><button class="secondary-button" @click="load">刷新</button></div>
        <DataTable :columns="ticketColumns" :rows="tickets" :loading="loading">
          <template #status="{ row }"><StatusBadge :text="String(row.status)" /></template>
        </DataTable>
      </section>
      <aside class="panel detail-side">
        <h2>接口连接状态</h2>
        <div v-if="error" class="error-box">{{ error }}</div>
        <div v-else class="success-box">后端服务连接正常，业务数据已实时同步。</div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../api";
import type { Credential, Customer, Project, SupportTicket } from "../api/types";
import DataTable from "../components/DataTable.vue";
import StatusBadge from "../components/StatusBadge.vue";

const loading = ref(false);
const error = ref("");
const projects = ref<Project[]>([]);
const tickets = ref<SupportTicket[]>([]);
const customers = ref<Customer[]>([]);
const credentials = ref<Credential[]>([]);
const ticketColumns = [
  { key: "ticketNo", label: "编号", width: "130px" },
  { key: "title", label: "标题", width: "minmax(220px,1fr)" },
  { key: "supportType", label: "类型", width: "120px" },
  { key: "currentHandlerName", label: "处理人", width: "120px" },
  { key: "status", label: "状态", width: "120px" }
];

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [projectPage, ticketPage, customerPage, credentialPage] = await Promise.all([
      api.projects(),
      api.tickets(),
      api.customers(),
      api.credentials()
    ]);
    projects.value = projectPage.list;
    tickets.value = ticketPage.list;
    customers.value = customerPage.list;
    credentials.value = credentialPage.list;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "接口连接失败";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

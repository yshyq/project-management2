<template>
  <section>
    <div class="filter-bar">
      <label>关键字<input v-model="keyword" placeholder="客户、产品、版本" @keyup.enter="load" /></label>
      <button class="secondary-button" @click="load">查询</button>
      <button class="primary-button" @click="openCreate">新建项目台账</button>
    </div>
    <div class="two-column">
      <section class="panel">
        <DataTable :columns="columns" :rows="projects" :selected-key="selected?.id" :loading="loading" @select="selectProject">
          <template #onlineStatus="{ row }"><StatusBadge :text="String(row.onlineStatus)" /></template>
        </DataTable>
      </section>
      <aside class="panel detail-side">
        <template v-if="selected">
          <div class="panel-head"><h2>{{ selected.productName }}</h2><StatusBadge :text="selected.onlineStatus" /></div>
          <div class="meta-grid">
            <div><span>客户</span><strong>{{ selected.customerName }}</strong></div>
            <div><span>平台版本</span><strong>{{ selected.platformVersion || "待维护" }}</strong></div>
            <div><span>项目经理</span><strong>{{ selected.projectManagerName || "待分配" }}</strong></div>
            <div><span>更新时间</span><strong>{{ formatDate(selected.updatedAt) }}</strong></div>
          </div>
          <h2 style="margin-top:16px">服务版本</h2>
          <div class="detail-list">
            <div v-for="item in versions" :key="item.id"><strong>{{ item.serviceName }}</strong><span>{{ item.version }} {{ item.remark }}</span></div>
          </div>
          <h2 style="margin-top:16px">更新记录</h2>
          <div class="detail-list">
            <div v-for="item in updates" :key="item.id"><strong>{{ item.version }}</strong><span>{{ item.content }}</span></div>
          </div>
        </template>
        <div v-else class="empty-state">选择一个项目查看详情</div>
      </aside>
    </div>
    <AppModal :open="modalOpen" title="新建项目台账" @close="modalOpen = false">
      <div class="form-grid">
        <label>客户<select v-model.number="form.customerId"><option v-for="item in customers" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
        <label>产品<select v-model.number="form.productTypeId"><option v-for="item in products" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
        <label>平台版本<input v-model="form.platformVersion" placeholder="例如 edhr v2.8.1" /></label>
        <label>上线状态<select v-model="form.onlineStatus"><option>未上线</option><option>上线准备中</option><option>部署中</option><option>已上线</option><option>运维中</option></select></label>
      </div>
      <template #footer>
        <button class="secondary-button" @click="modalOpen = false">取消</button>
        <button class="primary-button" @click="createProject">提交</button>
      </template>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { api } from "../api";
import type { Customer, ProductType, Project } from "../api/types";
import AppModal from "../components/AppModal.vue";
import DataTable from "../components/DataTable.vue";
import StatusBadge from "../components/StatusBadge.vue";

const keyword = ref("");
const loading = ref(false);
const modalOpen = ref(false);
const projects = ref<Project[]>([]);
const customers = ref<Customer[]>([]);
const products = ref<ProductType[]>([]);
const selected = ref<Project | null>(null);
const versions = ref<{ id: number; serviceName: string; version: string; remark: string }[]>([]);
const updates = ref<{ id: number; version: string; content: string; updatedAt: string }[]>([]);
const form = reactive({ customerId: 1, productTypeId: 1, platformVersion: "", onlineStatus: "未上线" });
const columns = [
  { key: "customerName", label: "客户", width: "minmax(180px,1fr)" },
  { key: "productName", label: "产品", width: "120px" },
  { key: "platformVersion", label: "平台版本", width: "150px" },
  { key: "onlineStatus", label: "上线状态", width: "120px" },
  { key: "projectManagerName", label: "项目经理", width: "120px" }
];

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString("zh-CN") : "-";
}

async function load() {
  loading.value = true;
  const [projectPage, customerPage, productPage] = await Promise.all([api.projects(keyword.value), api.customers(), api.products()]);
  projects.value = projectPage.list;
  customers.value = customerPage.list;
  products.value = productPage.list;
  if (!selected.value && projects.value[0]) await selectProject(projects.value[0] as unknown as Record<string, unknown>);
  loading.value = false;
}

async function selectProject(row: Record<string, unknown>) {
  selected.value = row as unknown as Project;
  const [versionPage, updatePage] = await Promise.all([api.projectVersions(selected.value.id), api.projectUpdates(selected.value.id)]);
  versions.value = versionPage.list;
  updates.value = updatePage.list;
}

function openCreate() {
  form.customerId = customers.value[0]?.id || 1;
  form.productTypeId = products.value[0]?.id || 1;
  modalOpen.value = true;
}

async function createProject() {
  await api.createProject({
    customerId: form.customerId,
    productTypeId: form.productTypeId,
    platformVersion: form.platformVersion,
    onlineStatus: form.onlineStatus
  });
  modalOpen.value = false;
  await load();
}

onMounted(load);
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <div>
        <h2>{{ title }}</h2>
        <p>配置数据直接写入后端配置接口，供新建项目和支持单选择。</p>
      </div>
      <button class="primary-button" @click="openCreate">新增</button>
    </div>
    <DataTable v-if="tab === 'products'" :columns="productColumns" :rows="products" :loading="loading">
      <template #enabled="{ row }"><StatusBadge :text="row.enabled ? '启用' : '停用'" /></template>
    </DataTable>
    <DataTable v-else-if="tab === 'supportTypes'" :columns="supportTypeColumns" :rows="supportTypes" :loading="loading">
      <template #enabled="{ row }"><StatusBadge :text="row.enabled ? '启用' : '停用'" /></template>
    </DataTable>
    <DataTable v-else :columns="workflowColumns" :rows="workflows" :loading="loading">
      <template #departments="{ row }">{{ Array.isArray(row.departments) ? row.departments.join("、") : "" }}</template>
      <template #enabled="{ row }"><StatusBadge :text="row.enabled ? '启用' : '停用'" /></template>
    </DataTable>
    <AppModal :open="modalOpen" :title="`新增${title}`" @close="modalOpen = false">
      <div class="form-grid">
        <label>名称<input v-model="form.name" /></label>
        <label v-if="tab === 'supportTypes'">流程 Key<input v-model="form.workflowKey" /></label>
        <label v-if="tab === 'workflows'">适用类型<input v-model="form.supportType" /></label>
        <label v-if="tab === 'workflows'" class="span-2">流程部门<textarea v-model="form.departmentsText" placeholder="交付部、研发部、运维部" /></label>
      </div>
      <template #footer>
        <button class="secondary-button" @click="modalOpen = false">取消</button>
        <button class="primary-button" @click="submit">提交</button>
      </template>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { api } from "../api";
import type { ProductType, SupportType, WorkflowTemplate } from "../api/types";
import AppModal from "../components/AppModal.vue";
import DataTable from "../components/DataTable.vue";
import StatusBadge from "../components/StatusBadge.vue";

const props = defineProps<{ tab: "workflows" | "products" | "supportTypes" }>();
const loading = ref(false);
const modalOpen = ref(false);
const products = ref<ProductType[]>([]);
const supportTypes = ref<SupportType[]>([]);
const workflows = ref<WorkflowTemplate[]>([]);
const form = reactive({ name: "", workflowKey: "ops", supportType: "全部", departmentsText: "交付部、运维部" });
const title = computed(() => props.tab === "products" ? "产品名称" : props.tab === "supportTypes" ? "使用类型" : "流程配置");
const productColumns = [{ key: "name", label: "产品名称" }, { key: "enabled", label: "状态", width: "120px" }];
const supportTypeColumns = [{ key: "name", label: "使用类型" }, { key: "workflowKey", label: "流程 Key", width: "140px" }, { key: "enabled", label: "状态", width: "120px" }];
const workflowColumns = [{ key: "name", label: "流程名称" }, { key: "supportType", label: "适用类型", width: "140px" }, { key: "departments", label: "流程部门" }, { key: "enabled", label: "状态", width: "120px" }];

async function load() {
  loading.value = true;
  if (props.tab === "products") products.value = (await api.products()).list;
  if (props.tab === "supportTypes") supportTypes.value = (await api.supportTypes()).list;
  if (props.tab === "workflows") workflows.value = (await api.workflows()).list;
  loading.value = false;
}

function openCreate() {
  Object.assign(form, { name: "", workflowKey: "ops", supportType: "全部", departmentsText: "交付部、运维部" });
  modalOpen.value = true;
}

async function submit() {
  if (props.tab === "products") await api.createProduct({ name: form.name });
  if (props.tab === "supportTypes") await api.createSupportType({ name: form.name, workflowKey: form.workflowKey });
  if (props.tab === "workflows") await api.createWorkflow({ name: form.name, supportType: form.supportType, departments: form.departmentsText.split(/[、,，]/).map((item) => item.trim()).filter(Boolean) });
  modalOpen.value = false;
  await load();
}

watch(() => props.tab, load);
onMounted(load);
</script>

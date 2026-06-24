<template>
  <section class="panel">
    <div class="panel-head">
      <div><h2>客户信息</h2><p>客户资料从 `/api/customers` 加载，新建后可被项目和支持单选择。</p></div>
      <button class="primary-button" @click="openCreate">新增客户</button>
    </div>
    <div class="filter-bar">
      <label>客户名称<input v-model="keyword" @keyup.enter="load" /></label>
      <button class="secondary-button" @click="load">查询</button>
    </div>
    <DataTable :columns="columns" :rows="customers" :loading="loading" />
    <AppModal :open="modalOpen" title="新增客户" @close="modalOpen = false">
      <div class="form-grid">
        <label>客户名称<input v-model="form.name" /></label>
        <label>销售<input v-model="form.salesName" /></label>
        <label class="span-2">客户说明<textarea v-model="form.note" /></label>
      </div>
      <template #footer>
        <button class="secondary-button" @click="modalOpen = false">取消</button>
        <button class="primary-button" @click="submit">提交</button>
      </template>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { api } from "../api";
import type { Customer } from "../api/types";
import AppModal from "../components/AppModal.vue";
import DataTable from "../components/DataTable.vue";

const customers = ref<Customer[]>([]);
const loading = ref(false);
const keyword = ref("");
const modalOpen = ref(false);
const form = reactive({ name: "", salesName: "", note: "" });
const columns = [
  { key: "name", label: "客户名称", width: "minmax(220px,1fr)" },
  { key: "salesName", label: "销售", width: "140px" },
  { key: "note", label: "客户说明", width: "minmax(280px,1.5fr)" }
];

async function load() {
  loading.value = true;
  customers.value = (await api.customers(keyword.value)).list;
  loading.value = false;
}

function openCreate() {
  Object.assign(form, { name: "", salesName: "", note: "" });
  modalOpen.value = true;
}

async function submit() {
  await api.createCustomer(form);
  modalOpen.value = false;
  await load();
}

onMounted(load);
</script>

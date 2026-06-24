<template>
  <section>
    <div class="panel-head">
      <div><h2>客户凭证</h2><p>列表默认脱敏；明文查看必须单独调用 reveal 接口并写审计。</p></div>
      <button class="primary-button" @click="openCreate">新增凭证</button>
    </div>
    <div class="two-column">
      <section class="panel">
        <DataTable :columns="columns" :rows="credentials" :selected-key="selected?.id" :loading="loading" @select="selectCredential">
          <template #secretMask="{ row }"><code>{{ row.account }} / {{ row.secretMask }}</code></template>
        </DataTable>
      </section>
      <aside class="panel detail-side">
        <template v-if="selected">
          <div class="panel-head"><h2>{{ selected.credentialName }}</h2><StatusBadge :text="selected.credentialType" /></div>
          <div class="meta-grid">
            <div><span>客户</span><strong>{{ selected.customerName }}</strong></div>
            <div><span>产品</span><strong>{{ selected.productName }}</strong></div>
            <div><span>责任人</span><strong>{{ selected.ownerName || "待维护" }}</strong></div>
            <div><span>查看规则</span><strong>{{ selected.rule }}</strong></div>
          </div>
          <div class="button-row" style="margin-top:12px">
            <button class="secondary-button" @click="apply">申请查看</button>
            <button class="primary-button" @click="reveal">查看明文</button>
          </div>
          <div v-if="secret" class="success-box" style="margin-top:12px">明文：{{ secret }}</div>
        </template>
        <div v-else class="empty-state">选择凭证查看操作</div>
      </aside>
    </div>
    <section class="panel" style="margin-top:14px">
      <div class="panel-head"><h2>审计日志</h2><button class="secondary-button" @click="loadAudit">刷新审计</button></div>
      <DataTable :columns="auditColumns" :rows="audits" />
    </section>
    <AppModal :open="modalOpen" title="新增客户凭证" @close="modalOpen = false">
      <div class="form-grid">
        <label>客户<select v-model.number="form.customerId"><option v-for="item in customers" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
        <label>产品<select v-model.number="form.productTypeId"><option v-for="item in products" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
        <label>凭证名称<input v-model="form.credentialName" /></label>
        <label>类型<input v-model="form.credentialType" placeholder="SSH / 数据库 / VPN" /></label>
        <label>账号<input v-model="form.account" /></label>
        <label>密文<input v-model="form.secret" type="password" /></label>
      </div>
      <template #footer><button class="secondary-button" @click="modalOpen = false">取消</button><button class="primary-button" @click="submit">提交</button></template>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { api } from "../api";
import type { AuditLog, Credential, Customer, ProductType } from "../api/types";
import AppModal from "../components/AppModal.vue";
import DataTable from "../components/DataTable.vue";
import StatusBadge from "../components/StatusBadge.vue";

const loading = ref(false);
const modalOpen = ref(false);
const credentials = ref<Credential[]>([]);
const selected = ref<Credential | null>(null);
const audits = ref<AuditLog[]>([]);
const customers = ref<Customer[]>([]);
const products = ref<ProductType[]>([]);
const secret = ref("");
const form = reactive({ customerId: 1, productTypeId: 1, credentialName: "", credentialType: "SSH", account: "", secret: "" });
const columns = [
  { key: "credentialName", label: "凭证" },
  { key: "customerName", label: "客户", width: "160px" },
  { key: "credentialType", label: "类型", width: "120px" },
  { key: "secretMask", label: "账号/脱敏", width: "220px" }
];
const auditColumns = [{ key: "operatorName", label: "操作人" }, { key: "action", label: "动作" }, { key: "reason", label: "原因" }, { key: "operatedAt", label: "时间" }];

async function load() {
  loading.value = true;
  const [credentialPage, customerPage, productPage] = await Promise.all([api.credentials(), api.customers(), api.products()]);
  credentials.value = credentialPage.list;
  customers.value = customerPage.list;
  products.value = productPage.list;
  selected.value = credentials.value[0] || null;
  loading.value = false;
  await loadAudit();
}

async function loadAudit() {
  audits.value = (await api.credentialAudit()).list;
}

function selectCredential(row: Record<string, unknown>) {
  selected.value = row as unknown as Credential;
  secret.value = "";
}

function openCreate() {
  Object.assign(form, { customerId: customers.value[0]?.id || 1, productTypeId: products.value[0]?.id || 1, credentialName: "", credentialType: "SSH", account: "", secret: "" });
  modalOpen.value = true;
}

async function submit() {
  await api.createCredential(form);
  modalOpen.value = false;
  await load();
}

async function apply() {
  if (!selected.value) return;
  await api.applyCredential(selected.value.id, "前端申请查看");
}

async function reveal() {
  if (!selected.value) return;
  secret.value = (await api.revealCredential(selected.value.id, "前端查看明文")).secret;
  await loadAudit();
}

onMounted(load);
</script>

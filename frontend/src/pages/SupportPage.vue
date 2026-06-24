<template>
  <section class="support-page">
    <div class="filter-bar">
      <label>关键字<input v-model="keyword" placeholder="标题、项目、说明" @keyup.enter="load" /></label>
      <button class="secondary-button" type="button" @click="load">查询</button>
      <button class="primary-button" type="button" @click="openCreate">新建{{ supportType }}</button>
    </div>
    <div v-if="listError" class="error-box page-message">{{ listError }}</div>
    <div class="two-column">
      <section class="panel">
        <DataTable :columns="columns" :rows="tickets" :selected-key="selected?.id" :loading="loading" @select="selectTicket">
          <template #productName="{ row }">{{ productDisplayNames(row) }}</template>
          <template #priority="{ row }"><StatusBadge :text="String(row.priority)" /></template>
          <template #status="{ row }"><StatusBadge :text="String(row.status)" /></template>
        </DataTable>
      </section>
      <aside class="panel detail-side">
        <template v-if="selected">
          <div class="panel-head"><h2>{{ selected.title }}</h2><StatusBadge :text="selected.status" /></div>
          <div class="meta-grid">
            <div><span>客户</span><strong>{{ selected.customerName }}</strong></div>
            <div><span>项目</span><strong>{{ selected.projectName }}</strong></div>
            <div><span>产品</span><strong>{{ productDisplayNames(selected) }}</strong></div>
            <div><span>当前处理人</span><strong>{{ selected.currentHandlerName || "待分派" }}</strong></div>
            <div><span>发起人</span><strong>{{ selected.requesterName }}</strong></div>
            <div v-if="isDeployment"><span>接收人</span><strong>{{ selected.receivedByName || "待接收" }}</strong></div>
            <div v-if="isDeployment && selected.deployedByName"><span>实际部署人</span><strong>{{ selected.deployedByName }}</strong></div>
          </div>
          <div class="detail-list" style="margin-top:12px">
            <div><strong>说明</strong><span>{{ selected.description || "暂无说明" }}</span></div>
            <div v-if="selected.deploymentExtra"><strong>部署扩展信息</strong><span>{{ selected.deploymentExtra.remoteMethod }} / {{ selected.deploymentExtra.serverInfo }}</span></div>
            <div v-if="isDeployment && selected.receivedAt"><strong>接收时间</strong><span>{{ selected.receivedAt }}</span></div>
            <div v-if="isDeployment && selected.deployedAt"><strong>完成时间</strong><span>{{ selected.deployedAt }}</span></div>
            <div v-if="isDeployment && deploymentSummary">
              <strong>部署环境</strong>
              <span>
                {{ deploymentSummary.environment }} /
                {{ deploymentSummary.hostname }} /
                {{ deploymentSummary.innerIp }} /
                {{ deploymentSummary.deploymentVersion }}
              </span>
            </div>
          </div>
          <div v-if="isDeployment" class="button-row" style="margin-top:12px">
            <button
              v-if="canReceive"
              class="primary-button"
              data-test="receive-deployment"
              type="button"
              :disabled="actionLoading"
              @click="receiveDeployment"
            >
              接收
            </button>
            <button
              v-if="canArrange"
              class="secondary-button"
              data-test="self-assign-deployment"
              type="button"
              :disabled="actionLoading"
              @click="selfAssignDeployment"
            >
              我来部署
            </button>
            <select
              v-if="canArrange || canReassign"
              v-model.number="assignmentHandlerId"
              name="deploymentHandlerId"
              aria-label="部署负责人"
            >
              <option :value="null">选择运维人员</option>
              <option v-for="item in operationsUsers" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
            <button
              v-if="canArrange"
              class="secondary-button"
              data-test="assign-deployment"
              type="button"
              :disabled="actionLoading || !assignmentHandlerId"
              @click="assignDeployment"
            >
              分配给运维
            </button>
            <button
              v-if="canReassign"
              class="secondary-button"
              data-test="reassign-deployment"
              type="button"
              :disabled="actionLoading || !assignmentHandlerId"
              @click="assignDeployment"
            >
              重新分配
            </button>
            <button
              v-if="canComplete"
              class="primary-button"
              data-test="complete-deployment"
              type="button"
              :disabled="actionLoading"
              @click="openCompletion"
            >
              提交部署结果
            </button>
          </div>
          <div v-else class="button-row" style="margin-top:12px">
            <button class="secondary-button" type="button" @click="handle('待交付确认')">处理</button>
            <button class="secondary-button" type="button" @click="handle('待研发处理')">转研发</button>
            <button class="secondary-button danger" type="button" @click="closeTicket">关闭</button>
          </div>
          <div v-if="actionError" class="error-box">{{ actionError }}</div>
        </template>
        <div v-else class="empty-state">选择一条支持单查看详情</div>
      </aside>
    </div>

    <AppModal :open="modalOpen" :title="`新建${supportType}`" @close="modalOpen = false">
      <form id="support-ticket-form" novalidate @submit.prevent="submit">
        <div class="form-grid">
          <label>
            客户
            <select name="customerId" required :value="form.customerId ?? ''" @change="onCustomerChange">
              <option value="">请选择客户</option>
              <option v-for="item in customers" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
            <small v-if="errors.customerId" class="field-error">{{ errors.customerId }}</small>
          </label>

          <label v-if="isDeployment">
            项目名称
            <input
              v-model="form.projectName"
              name="projectName"
              required
              autocomplete="off"
              placeholder="请手工填写部署项目名称"
              @input="clearError('projectName')"
            />
            <small v-if="errors.projectName" class="field-error">{{ errors.projectName }}</small>
          </label>

          <label v-else>
            项目名称
            <select
              name="projectName"
              required
              :disabled="!form.customerId || projectsLoading"
              :value="form.projectName"
              @change="onProjectChange"
            >
              <option value="">{{ projectsLoading ? "正在加载项目..." : "请选择已部署项目" }}</option>
              <option v-for="item in deploymentProjects" :key="item.projectName" :value="item.projectName">
                {{ item.projectName }}
              </option>
            </select>
            <small v-if="errors.projectName" class="field-error">{{ errors.projectName }}</small>
            <small v-else-if="projectsLoading" class="field-hint">正在加载该客户的部署项目...</small>
            <small v-else-if="projectsError" class="field-error">{{ projectsError }}</small>
            <small v-else-if="form.customerId && !deploymentProjects.length" class="field-hint">该客户暂无已部署项目</small>
          </label>

          <fieldset v-if="isDeployment" class="form-field span-2">
            <legend>产品 <span aria-hidden="true">*</span></legend>
            <div class="checkbox-grid" role="group" aria-label="部署产品">
              <label v-for="item in products" :key="item.id" class="checkbox-option">
                <input v-model="form.productIds" name="productIds" type="checkbox" :value="item.id" @change="clearError('productIds')" />
                <span>{{ item.name }}</span>
              </label>
            </div>
            <small v-if="!products.length" class="field-hint">暂无可选产品，请先在产品名称配置中维护</small>
            <small v-if="errors.productIds" class="field-error">{{ errors.productIds }}</small>
          </fieldset>

          <label v-else>
            产品
            <select
              name="productId"
              required
              :disabled="!form.projectName || !projectProducts.length"
              :value="form.productId ?? ''"
              @change="onProductChange"
            >
              <option value="">{{ form.projectName && !projectProducts.length ? "该项目暂无已部署产品" : "请选择产品" }}</option>
              <option v-for="item in projectProducts" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
            <small v-if="errors.productId" class="field-error">{{ errors.productId }}</small>
            <small v-else-if="form.projectName && !projectProducts.length" class="field-hint">该项目暂无已部署产品</small>
          </label>

          <label>优先级<select v-model="form.priority"><option>高</option><option>中</option><option>低</option><option>紧急</option></select></label>
          <label>环境<select v-model="form.env"><option>生产</option><option>验证</option><option>开发</option></select></label>
          <label v-if="!isDeployment">
            标题
            <input v-model="form.title" name="title" required @input="clearError('title')" />
            <small v-if="errors.title" class="field-error">{{ errors.title }}</small>
          </label>
          <label class="span-2">说明<textarea v-model="form.description" /></label>
          <label v-if="isDeployment">远程方式<input v-model="form.remoteMethod" /></label>
          <label v-if="isDeployment">远程方式信息<input v-model="form.remoteInfo" /></label>
          <label v-if="isDeployment">服务器信息<input v-model="form.serverInfo" /></label>
          <label v-if="isDeployment" class="span-2">授权信息<textarea v-model="form.authorizationText" /></label>
        </div>
        <div v-if="submitError" class="error-box">{{ submitError }}</div>
      </form>
      <template #footer>
        <button class="secondary-button" type="button" @click="modalOpen = false">取消</button>
        <button
          class="primary-button"
          data-test="submit-ticket"
          type="button"
          :disabled="submitting"
          @click="submit"
        >
          {{ submitting ? "提交中..." : "提交" }}
        </button>
      </template>
    </AppModal>

    <AppModal :open="completionOpen" title="提交部署结果" @close="completionOpen = false">
      <form id="deployment-completion-form" novalidate @submit.prevent="submitCompletion">
        <div class="form-grid">
          <label>
            环境类型
            <input v-model="completionForm.environment" name="environment" @input="clearCompletionError('environment')" />
            <small v-if="completionErrors.environment" class="field-error">{{ completionErrors.environment }}</small>
          </label>
          <label>
            内网 IP
            <input v-model="completionForm.innerIp" name="innerIp" @input="clearCompletionError('innerIp')" />
            <small v-if="completionErrors.innerIp" class="field-error">{{ completionErrors.innerIp }}</small>
          </label>
          <label>
            外网 IP
            <input v-model="completionForm.outerIp" name="outerIp" />
          </label>
          <label>
            主机名
            <input v-model="completionForm.hostname" name="hostname" @input="clearCompletionError('hostname')" />
            <small v-if="completionErrors.hostname" class="field-error">{{ completionErrors.hostname }}</small>
          </label>
          <label>
            操作系统
            <input v-model="completionForm.os" name="os" @input="clearCompletionError('os')" />
            <small v-if="completionErrors.os" class="field-error">{{ completionErrors.os }}</small>
          </label>
          <label>
            用途
            <input v-model="completionForm.purpose" name="purpose" @input="clearCompletionError('purpose')" />
            <small v-if="completionErrors.purpose" class="field-error">{{ completionErrors.purpose }}</small>
          </label>
          <label>
            部署版本
            <input v-model="completionForm.deploymentVersion" name="deploymentVersion" @input="clearCompletionError('deploymentVersion')" />
            <small v-if="completionErrors.deploymentVersion" class="field-error">{{ completionErrors.deploymentVersion }}</small>
          </label>
          <label class="span-2">
            备注
            <textarea v-model="completionForm.remark" name="remark" />
          </label>
        </div>
        <div v-if="completionSubmitError" class="error-box">{{ completionSubmitError }}</div>
      </form>
      <template #footer>
        <button class="secondary-button" type="button" @click="completionOpen = false">取消</button>
        <button
          class="primary-button"
          data-test="confirm-complete-deployment"
          type="button"
          :disabled="actionLoading"
          @click="submitCompletion"
        >
          {{ actionLoading ? "提交中..." : "确认部署完成" }}
        </button>
      </template>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { api } from "../api";
import type {
  Customer,
  DeploymentCompletion,
  DeploymentProject,
  ProductType,
  ServerAsset,
  SupportTicket,
  UserAccount
} from "../api/types";
import { useAuthStore } from "../stores/auth";
import AppModal from "../components/AppModal.vue";
import DataTable from "../components/DataTable.vue";
import StatusBadge from "../components/StatusBadge.vue";
import {
  buildSupportTicketPayload,
  clearAfterCustomerChange,
  createSupportForm,
  productDisplayNames,
  selectDeploymentProject,
  validateSupportForm,
  type SupportFormErrors
} from "./supportForm";

const props = defineProps<{ supportType: string }>();
const auth = useAuthStore();
const keyword = ref("");
const loading = ref(false);
const submitting = ref(false);
const modalOpen = ref(false);
const listError = ref("");
const submitError = ref("");
const actionError = ref("");
const completionSubmitError = ref("");
const projectsError = ref("");
const projectsLoading = ref(false);
const tickets = ref<SupportTicket[]>([]);
const selected = ref<SupportTicket | null>(null);
const customers = ref<Customer[]>([]);
const products = ref<ProductType[]>([]);
const deploymentProjects = ref<DeploymentProject[]>([]);
const operationsUsers = ref<UserAccount[]>([]);
const selectedAssets = ref<ServerAsset[]>([]);
const assignmentHandlerId = ref<number | null>(null);
const completionOpen = ref(false);
const actionLoading = ref(false);
const completionForm = reactive(createCompletionForm());
const completionErrors = ref<Partial<Record<keyof DeploymentCompletion, string>>>({});
const form = reactive(createSupportForm());
const errors = ref<SupportFormErrors>({});
let projectsRequestId = 0;

const isDeployment = computed(() => props.supportType === "项目部署");
const isOperationsLeader = computed(() =>
  Boolean(auth.profile?.roles.some((role) => role === "运维 Leader"))
);
const canReceive = computed(() =>
  isDeployment.value && isOperationsLeader.value && selected.value?.status === "待运维接收"
);
const canArrange = computed(() =>
  isDeployment.value && isOperationsLeader.value && selected.value?.status === "待安排部署"
);
const canReassign = computed(() =>
  isDeployment.value && isOperationsLeader.value && selected.value?.status === "部署中"
);
const canComplete = computed(() =>
  isDeployment.value &&
  selected.value?.status === "部署中" &&
  selected.value.currentHandlerId === auth.profile?.id
);
const deploymentSummary = computed<DeploymentCompletion | null>(() =>
  selected.value?.deploymentResult || selectedAssets.value[0] || null
);
const selectedProject = computed(() => deploymentProjects.value.find((item) => item.projectName === form.projectName));
const projectProducts = computed(() => selectedProject.value?.products || []);
const columns = [
  { key: "ticketNo", label: "编号", width: "130px" },
  { key: "title", label: "标题", width: "minmax(220px,1fr)" },
  { key: "customerName", label: "客户", width: "150px" },
  { key: "productName", label: "产品", width: "160px" },
  { key: "priority", label: "优先级", width: "90px" },
  { key: "currentHandlerName", label: "处理人", width: "110px" },
  { key: "status", label: "状态", width: "110px" }
];

async function load() {
  loading.value = true;
  listError.value = "";
  const customersPromise = api.customers();
  const productsPromise = isDeployment.value
    ? api.products()
    : Promise.resolve({ list: [] as ProductType[], page: 1, pageSize: 20, total: 0 });
  try {
    const [ticketPage, customerPage, productPage] = await Promise.all([
      api.tickets(props.supportType, keyword.value),
      customersPromise,
      productsPromise
    ]);
    tickets.value = ticketPage.list;
    customers.value = customerPage.list;
    products.value = productPage.list;
    selected.value = tickets.value[0] || null;
    assignmentHandlerId.value = selected.value?.currentHandlerId || null;
    await loadSelectedAssets();
    if (isDeployment.value && isOperationsLeader.value) {
      operationsUsers.value = (await api.users("运维部")).list;
    } else {
      operationsUsers.value = [];
    }
  } catch (error) {
    listError.value = error instanceof Error ? error.message : "数据加载失败，请稍后重试";
  } finally {
    loading.value = false;
  }
}

async function loadSelectedAssets() {
  selectedAssets.value = [];
  if (!isDeployment.value || selected.value?.status !== "已部署") return;
  try {
    selectedAssets.value = (await api.assets(selected.value.id)).list;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "部署环境信息加载失败";
  }
}

function createCompletionForm(): DeploymentCompletion {
  return {
    environment: "",
    innerIp: "",
    outerIp: "",
    hostname: "",
    os: "",
    purpose: "",
    deploymentVersion: "",
    remark: ""
  };
}

function validateCompletion() {
  const labels: Record<"environment" | "innerIp" | "hostname" | "os" | "purpose" | "deploymentVersion", string> = {
    environment: "环境类型",
    innerIp: "内网 IP",
    hostname: "主机名",
    os: "操作系统",
    purpose: "用途",
    deploymentVersion: "部署版本"
  };
  const next: Partial<Record<keyof DeploymentCompletion, string>> = {};
  for (const [key, label] of Object.entries(labels) as [keyof typeof labels, string][]) {
    if (!completionForm[key].trim()) next[key] = `请填写${label}`;
  }
  completionErrors.value = next;
  return Object.keys(next).length === 0;
}

function clearCompletionError(key: keyof DeploymentCompletion) {
  if (!completionErrors.value[key]) return;
  const next = { ...completionErrors.value };
  delete next[key];
  completionErrors.value = next;
}

function openCompletion() {
  Object.assign(completionForm, createCompletionForm());
  completionErrors.value = {};
  completionSubmitError.value = "";
  completionOpen.value = true;
}

async function runDeploymentAction(action: () => Promise<unknown>) {
  actionLoading.value = true;
  actionError.value = "";
  try {
    await action();
    await load();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "部署操作失败，请稍后重试";
  } finally {
    actionLoading.value = false;
  }
}

async function receiveDeployment() {
  if (!selected.value) return;
  await runDeploymentAction(() => api.receiveTicket(selected.value!.id));
}

async function selfAssignDeployment() {
  if (!selected.value) return;
  await runDeploymentAction(() => api.selfAssignTicket(selected.value!.id));
}

async function assignDeployment() {
  if (!selected.value || !assignmentHandlerId.value) return;
  await runDeploymentAction(() => api.assignTicket(selected.value!.id, assignmentHandlerId.value!));
}

async function submitCompletion() {
  if (!selected.value || !validateCompletion()) return;
  actionLoading.value = true;
  completionSubmitError.value = "";
  try {
    await api.completeDeployment(selected.value.id, { ...completionForm });
    completionOpen.value = false;
    await load();
  } catch (error) {
    completionSubmitError.value = error instanceof Error ? error.message : "部署结果提交失败，请稍后重试";
  } finally {
    actionLoading.value = false;
  }
}

async function selectTicket(row: Record<string, unknown>) {
  selected.value = row as unknown as SupportTicket;
  assignmentHandlerId.value = selected.value.currentHandlerId || null;
  actionError.value = "";
  await loadSelectedAssets();
}

function openCreate() {
  Object.assign(form, createSupportForm());
  deploymentProjects.value = [];
  errors.value = {};
  projectsError.value = "";
  submitError.value = "";
  modalOpen.value = true;
}

async function onCustomerChange(event: Event) {
  const rawValue = (event.target as HTMLSelectElement).value;
  const customerId = rawValue ? Number(rawValue) : null;
  clearAfterCustomerChange(form, customerId);
  deploymentProjects.value = [];
  projectsError.value = "";
  errors.value = {};
  if (!isDeployment.value && customerId) await loadDeploymentProjects(customerId);
}

async function loadDeploymentProjects(customerId: number) {
  const requestId = ++projectsRequestId;
  projectsLoading.value = true;
  projectsError.value = "";
  try {
    const rows = await api.deploymentProjects(customerId);
    if (requestId === projectsRequestId && form.customerId === customerId) {
      deploymentProjects.value = rows;
    }
  } catch (error) {
    if (requestId === projectsRequestId && form.customerId === customerId) {
      deploymentProjects.value = [];
      projectsError.value = error instanceof Error ? error.message : "部署项目加载失败，请稍后重试";
    }
  } finally {
    if (requestId === projectsRequestId) projectsLoading.value = false;
  }
}

function onProjectChange(event: Event) {
  const projectName = (event.target as HTMLSelectElement).value;
  const project = deploymentProjects.value.find((item) => item.projectName === projectName) || null;
  selectDeploymentProject(form, project);
  clearError("projectName");
  clearError("productId");
}

function onProductChange(event: Event) {
  const rawValue = (event.target as HTMLSelectElement).value;
  form.productId = rawValue ? Number(rawValue) : null;
  clearError("productId");
}

function clearError(key: keyof SupportFormErrors) {
  if (!errors.value[key]) return;
  const next = { ...errors.value };
  delete next[key];
  errors.value = next;
}

async function submit() {
  const nextErrors = validateSupportForm(form, isDeployment.value);
  errors.value = nextErrors;
  submitError.value = "";
  if (Object.keys(nextErrors).length) return;

  submitting.value = true;
  try {
    await api.createTicket(buildSupportTicketPayload(form, props.supportType));
    modalOpen.value = false;
    await load();
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : "提交失败，请稍后重试";
  } finally {
    submitting.value = false;
  }
}

async function handle(nextStatus: string) {
  if (!selected.value) return;
  await api.handleTicket(selected.value.id, { nextStatus });
  await load();
}

async function closeTicket() {
  if (!selected.value) return;
  await api.closeTicket(selected.value.id);
  await load();
}

watch(() => props.supportType, () => {
  modalOpen.value = false;
  load();
});
onMounted(load);
</script>

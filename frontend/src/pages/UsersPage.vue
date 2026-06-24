<template>
  <section class="panel">
    <div class="panel-head">
      <div><h2>{{ tab === "users" ? "用户管理" : "角色管理" }}</h2><p>账号、角色和菜单权限来自后端 RBAC 数据。</p></div>
    </div>
    <DataTable v-if="tab === 'users'" :columns="userColumns" :rows="users" :loading="loading">
      <template #roles="{ row }">{{ Array.isArray(row.roles) ? row.roles.join("、") : "" }}</template>
    </DataTable>
    <DataTable v-else :columns="roleColumns" :rows="roles" :loading="loading">
      <template #menus="{ row }">{{ Array.isArray(row.menus) ? row.menus.join("、") : "" }}</template>
    </DataTable>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { api } from "../api";
import type { Role, UserAccount } from "../api/types";
import DataTable from "../components/DataTable.vue";

const props = defineProps<{ tab: "users" | "roles" }>();
const loading = ref(false);
const users = ref<UserAccount[]>([]);
const roles = ref<Role[]>([]);
const userColumns = [{ key: "username", label: "账号" }, { key: "name", label: "姓名" }, { key: "dept", label: "部门" }, { key: "roles", label: "角色" }, { key: "credentialPolicy", label: "凭证权限" }];
const roleColumns = [{ key: "name", label: "角色" }, { key: "dataScope", label: "数据范围" }, { key: "credentialPolicy", label: "凭证策略" }, { key: "menus", label: "菜单权限" }];

async function load() {
  loading.value = true;
  if (props.tab === "users") users.value = (await api.users()).list;
  else roles.value = (await api.roles()).list;
  loading.value = false;
}

watch(() => props.tab, load);
onMounted(load);
</script>

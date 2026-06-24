<template>
  <section class="login-screen">
    <form class="login-panel" @submit.prevent="submit">
      <div class="brand">
        <div class="brand-mark">OP</div>
        <div class="brand-copy">
          <strong>OpsProject</strong>
          <span>运维协同与项目治理平台</span>
        </div>
      </div>
      <h1>运维项目管理系统</h1>
      <p>统一管理客户、项目部署、技术支持与运维资产。</p>
      <div class="login-form">
        <label>用户名<input v-model="username" autocomplete="username" /></label>
        <label>密码<input v-model="password" type="password" autocomplete="current-password" /></label>
        <button class="primary-button" :disabled="auth.loading" type="submit">{{ auth.loading ? "登录中..." : "登录" }}</button>
        <div class="button-row">
          <button class="secondary-button" type="button" @click="quick('admin', 'admin123')">管理员</button>
          <button class="secondary-button" type="button" @click="quick('ops', 'user123')">运维</button>
          <button class="secondary-button" type="button" @click="quick('delivery', 'user123')">交付</button>
        </div>
        <div v-if="error" class="error-box">{{ error }}</div>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const username = ref("admin");
const password = ref("admin123");
const error = ref("");
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

function quick(user: string, pass: string) {
  username.value = user;
  password.value = pass;
}

async function submit() {
  error.value = "";
  try {
    await auth.login(username.value, password.value);
    router.push(String(route.query.redirect || "/dashboard"));
  } catch (err) {
    error.value = err instanceof Error ? err.message : "登录失败，请检查后端服务是否启动";
  }
}
</script>

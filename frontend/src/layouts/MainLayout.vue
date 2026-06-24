<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': collapsed }">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">OP</div>
        <div class="brand-copy">
          <strong>OpsProject</strong>
          <span>运维项目管理</span>
        </div>
        <button class="sidebar-toggle" type="button" @click="collapsed = !collapsed">{{ collapsed ? "›" : "☰" }}</button>
      </div>
      <nav class="nav-list">
        <template v-for="item in visibleMenus" :key="item.key">
          <button
            v-if="!item.children"
            class="nav-item"
            :class="{ active: route.meta.menuKey === item.key }"
            @click="router.push(item.path!)"
          >
            <span class="icon">{{ iconFor(item.key) }}</span><span>{{ item.label }}</span>
          </button>
          <template v-else>
            <button class="nav-item nav-parent" :class="{ active: groupActive(item), 'is-collapsed': collapsedGroups.has(item.key) }" @click="toggleGroup(item.key)">
              <span class="icon">{{ iconFor(item.key) }}</span><span>{{ item.label }}</span>
            </button>
            <div v-if="!collapsed && !collapsedGroups.has(item.key)" class="sub-nav">
              <button
                v-for="child in item.children"
                :key="child.key"
                class="nav-item sub-item"
                :class="{ active: route.meta.menuKey === child.key }"
                @click="router.push(child.path!)"
              >
                {{ child.label }}
              </button>
            </div>
          </template>
        </template>
      </nav>
    </aside>
    <main class="main">
      <header class="topbar">
        <div>
          <p class="eyebrow">{{ auth.profile?.roles?.[0] || "运维视角" }}</p>
          <h1>{{ route.meta.title || "运维项目管理" }}</h1>
        </div>
        <div class="top-actions">
          <ThemePicker />
          <span class="user-chip">{{ auth.displayName }}</span>
          <button class="secondary-button" type="button" @click="logout">退出</button>
        </div>
      </header>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import ThemePicker from "../components/ThemePicker.vue";
import { menuRoutes } from "../router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const collapsed = ref(window.matchMedia("(max-width: 760px)").matches);
const collapsedGroups = ref(new Set<string>());

const visibleMenus = computed(() => menuRoutes
  .map((item) => item.children
    ? { ...item, children: item.children.filter((child) => auth.canSee(child.key)) }
    : item)
  .filter((item) => item.children ? item.children.length : auth.canSee(item.key)));

function toggleGroup(key: string) {
  if (collapsed.value) {
    collapsed.value = false;
    return;
  }
  const next = new Set(collapsedGroups.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  collapsedGroups.value = next;
}

function groupActive(item: { children?: { key: string }[] }) {
  return Boolean(item.children?.some((child) => child.key === route.meta.menuKey));
}

function iconFor(key: string) {
  const icons: Record<string, string> = {
    dashboard: "⌂",
    projects: "▦",
    support: "◇",
    assets: "▣",
    config: "☰",
    credentials: "◎",
    userAdmin: "☷"
  };
  return icons[key] || "•";
}

function logout() {
  auth.logout();
  router.push("/login");
}
</script>

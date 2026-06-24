import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { useAuthStore } from "../stores/auth";
import MainLayout from "../layouts/MainLayout.vue";
import LoginPage from "../pages/LoginPage.vue";
import DashboardPage from "../pages/DashboardPage.vue";
import ProjectsPage from "../pages/ProjectsPage.vue";
import CustomersPage from "../pages/CustomersPage.vue";
import SupportPage from "../pages/SupportPage.vue";
import AssetsPage from "../pages/AssetsPage.vue";
import ConfigPage from "../pages/ConfigPage.vue";
import CredentialsPage from "../pages/CredentialsPage.vue";
import UsersPage from "../pages/UsersPage.vue";

export const menuRoutes = [
  { key: "dashboard", label: "工作台", path: "/dashboard" },
  { key: "projects", label: "项目台账", path: "/projects" },
  {
    key: "support",
    label: "协同支持",
    children: [
      { key: "customerInfo", label: "客户信息", path: "/support/customers" },
      { key: "supportDeploy", label: "项目部署", path: "/support/deployments" },
      { key: "supportTech", label: "技术支持", path: "/support/technical" },
      { key: "supportNeed", label: "项目需求", path: "/support/requirements" },
      { key: "supportOther", label: "其他支持", path: "/support/others" }
    ]
  },
  { key: "assets", label: "运维资产", path: "/assets" },
  {
    key: "config",
    label: "配置",
    children: [
      { key: "flow", label: "流程", path: "/config/workflows" },
      { key: "projectNames", label: "产品名称", path: "/config/products" },
      { key: "supportTypes", label: "使用类型", path: "/config/support-types" }
    ]
  },
  { key: "credentials", label: "客户凭证", path: "/config/credentials" },
  {
    key: "userAdmin",
    label: "用户管理",
    children: [
      { key: "users", label: "用户", path: "/users" },
      { key: "roles", label: "角色", path: "/roles" }
    ]
  }
];

const routes: RouteRecordRaw[] = [
  { path: "/login", component: LoginPage },
  {
    path: "/",
    component: MainLayout,
    redirect: "/dashboard",
    children: [
      { path: "dashboard", component: DashboardPage, meta: { menuKey: "dashboard", title: "工作台" } },
      { path: "projects", component: ProjectsPage, meta: { menuKey: "projects", title: "项目台账" } },
      { path: "support/customers", component: CustomersPage, meta: { menuKey: "customerInfo", title: "客户信息" } },
      { path: "support/deployments", component: SupportPage, props: { supportType: "项目部署" }, meta: { menuKey: "supportDeploy", title: "项目部署" } },
      { path: "support/technical", component: SupportPage, props: { supportType: "技术支持" }, meta: { menuKey: "supportTech", title: "技术支持" } },
      { path: "support/requirements", component: SupportPage, props: { supportType: "项目需求" }, meta: { menuKey: "supportNeed", title: "项目需求" } },
      { path: "support/others", component: SupportPage, props: { supportType: "其他支持" }, meta: { menuKey: "supportOther", title: "其他支持" } },
      { path: "assets", component: AssetsPage, meta: { menuKey: "assets", title: "运维资产" } },
      { path: "config/workflows", component: ConfigPage, props: { tab: "workflows" }, meta: { menuKey: "flow", title: "流程配置" } },
      { path: "config/products", component: ConfigPage, props: { tab: "products" }, meta: { menuKey: "projectNames", title: "产品名称配置" } },
      { path: "config/support-types", component: ConfigPage, props: { tab: "supportTypes" }, meta: { menuKey: "supportTypes", title: "使用类型配置" } },
      { path: "config/credentials", component: CredentialsPage, meta: { menuKey: "credentials", title: "客户凭证" } },
      { path: "users", component: UsersPage, props: { tab: "users" }, meta: { menuKey: "users", title: "用户管理" } },
      { path: "roles", component: UsersPage, props: { tab: "roles" }, meta: { menuKey: "roles", title: "角色管理" } }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (to.path === "/login") return true;
  if (!auth.ready) await auth.bootstrap();
  if (!auth.isAuthenticated) return `/login?redirect=${encodeURIComponent(to.fullPath)}`;
  const menuKey = to.meta.menuKey as string | undefined;
  if (menuKey && !auth.canSee(menuKey)) return "/dashboard";
  return true;
});

export default router;

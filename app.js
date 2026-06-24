const projects = [
  {
    id: 1,
    name: "edhr",
    customer: "华东产业园",
    manager: "周经理",
    ops: "陈运维",
    delivery: "李交付",
    dev: "王研发",
    status: "online",
    online: "运维中",
    deploy: "Docker Compose",
    remote: "堡垒机 / SSH",
    access: "https://park.example.cn",
    createdBy: "陈运维",
    platformVersion: "edhr v2.8.1",
    serviceVersions: ["Web v2.8.1", "API v2.8.1", "报表服务 v1.9.4"],
    updateDetails: ["2026-05-20 修复组织同步异常", "2026-05-12 更新报表导出组件"],
    configDetails: ["Docker Compose", "Nginx 反向代理", "PostgreSQL 14"],
    support: { deploy: 8, ops: 16, bug: 7, need: 5 },
    stats: [36, 12, 7, 2]
  },
  {
    id: 2,
    name: "edhr MAX",
    customer: "城投集团",
    manager: "赵经理",
    ops: "刘运维",
    delivery: "孙交付",
    dev: "钱研发",
    status: "deploying",
    online: "部署中",
    deploy: "Kubernetes",
    remote: "VPN / kubectl",
    access: "https://pay.example.cn",
    createdBy: "刘运维",
    platformVersion: "edhr MAX v3.4.0",
    serviceVersions: ["Console v3.4.0", "Workflow v3.3.7", "Payment API v2.6.2"],
    updateDetails: ["2026-05-28 部署审批流优化", "2026-05-16 调整支付回调重试策略"],
    configDetails: ["Kubernetes", "Ingress + VPN", "Redis Cluster"],
    support: { deploy: 11, ops: 10, bug: 12, need: 4 },
    stats: [37, 17, 12, 4]
  },
  {
    id: 3,
    name: "MedPro5",
    customer: "省级监管局",
    manager: "吴经理",
    ops: "郑运维",
    delivery: "冯交付",
    dev: "陈研发",
    status: "risk",
    online: "上线准备中",
    deploy: "手工部署",
    remote: "客户远程 / RDP",
    access: "内网地址",
    createdBy: "郑运维",
    platformVersion: "MedPro5 v5.2.6",
    serviceVersions: ["Portal v5.2.6", "Device Gateway v2.1.0", "Audit Service v1.8.8"],
    updateDetails: ["2026-05-24 增加监管字段校验", "2026-05-09 优化设备数据同步"],
    configDetails: ["手工部署", "客户 VPN / RDP", "MySQL 8"],
    support: { deploy: 5, ops: 18, bug: 15, need: 9 },
    stats: [47, 24, 15, 8]
  },
  {
    id: 4,
    name: "edhr",
    customer: "北区能源",
    manager: "马经理",
    ops: "许运维",
    delivery: "高交付",
    dev: "林研发",
    status: "online",
    online: "已上线",
    deploy: "CI/CD",
    remote: "堡垒机",
    access: "https://portal.example.cn",
    createdBy: "许运维",
    platformVersion: "edhr v2.7.9",
    serviceVersions: ["Web v2.7.9", "API v2.7.9", "Scheduler v1.6.2"],
    updateDetails: ["2026-05-18 更新登录安全策略", "2026-04-30 修复数据看板筛选"],
    configDetails: ["CI/CD", "堡垒机访问", "MySQL 5.7"],
    support: { deploy: 4, ops: 8, bug: 3, need: 6 },
    stats: [21, 5, 3, 0]
  }
];

const customerRecords = [
  { name: "华东产业园", sales: "许销售", note: "园区人事系统与内网部署客户，生产访问需走堡垒机。" },
  { name: "城投集团", sales: "周销售", note: "集团版客户，部署和支付相关流程需销售同步窗口。" },
  { name: "省级监管局", sales: "宋销售", note: "监管场景客户，现场网络限制较多，需提前确认远程方式。" },
  { name: "北区能源", sales: "郑销售", note: "能源行业客户，常规运维窗口在工作日晚间。" }
];
const customers = customerRecords.map((customer) => customer.name);
const projectNames = ["edhr", "edhr MAX", "MedPro5"];
const supportTypes = ["项目部署", "技术支持", "项目需求", "其他支持"];

const tickets = [
  { title: "v2.8.1 生产部署申请", project: "edhr", type: "项目部署", priority: "高", status: "待运维接收", owner: "李交付", env: "生产" },
  { title: "客户内网无法访问管理后台", project: "MedPro5", type: "技术支持", priority: "紧急", status: "运维处理中", owner: "郑运维", env: "生产" },
  { title: "结算接口返回金额精度异常", project: "edhr MAX", type: "技术支持", priority: "高", status: "待研发处理", owner: "钱研发", env: "验证" },
  { title: "新增月度统计报表字段", project: "edhr", type: "项目需求", priority: "中", status: "待研发处理", owner: "林研发", env: "开发" },
  { title: "生产证书下周到期", project: "edhr", type: "其他支持", priority: "高", status: "运维处理中", owner: "陈运维", env: "生产" },
  { title: "补丁包部署后交付验证", project: "edhr MAX", type: "项目部署", priority: "中", status: "待交付确认", owner: "孙交付", env: "验证" }
];

const systemMessages = [
  { to: "陈运维", title: "生产证书下周到期", content: "新的项目支持已流转到你处理", time: "09:40", read: false },
  { to: "李交付", title: "补丁包部署后交付验证", content: "支持单等待交付确认", time: "10:15", read: false }
];

const servers = [
  { name: "park-prod-app-01", env: "生产", ip: "10.24.6.18", outer: "122.18.*.*", os: "Ubuntu 22.04", use: "应用服务", path: "/opt/park/app", expire: "2027-02-11" },
  { name: "park-prod-db-01", env: "生产", ip: "10.24.6.21", outer: "无", os: "CentOS 7.9", use: "PostgreSQL", path: "/data/postgresql", expire: "2026-11-30" },
  { name: "pay-prod-k8s-01", env: "生产", ip: "10.31.2.10", outer: "121.44.*.*", os: "Rocky Linux 9", use: "K8s Master", path: "/etc/kubernetes", expire: "2027-05-19" },
  { name: "report-pre-01", env: "预发", ip: "172.16.8.33", outer: "无", os: "Windows Server", use: "报送联调", path: "D:\\apps\\report", expire: "2026-09-01" }
];

const credentials = [
  {
    id: 1,
    customer: "华东产业园",
    project: "edhr",
    name: "生产环境完整凭证",
    type: "SSH、数据库、平台登录、堡垒机",
    account: "ops_admin",
    secret: "••••••••••",
    secretValue: "demo-ssh-secret",
    owner: "陈运维",
    rule: "运维管理员审批",
    authorizedUsers: ["陈运维"],
    authorizedByType: { SSH: ["陈运维"], 数据库: ["陈运维"], 平台登录: ["陈运维"], 堡垒机: ["陈运维"] },
    remoteMethod: "堡垒机 / SSH",
    serverIp: "10.24.6.18",
    serverPort: "22",
    serverAccount: "ops_admin",
    serverPassword: "Srv@park-2026",
    dbIp: "10.24.6.21",
    dbPort: "5432",
    dbAccount: "park_dba",
    dbPassword: "Pg@park-2026",
    platformUrl: "https://park.example.cn/admin",
    platformAccount: "admin",
    platformPassword: "Admin@park"
  },
  {
    id: 2,
    customer: "华东产业园",
    project: "edhr",
    name: "数据库账号",
    type: "数据库",
    account: "park_dba",
    secret: "••••••••••",
    secretValue: "demo-db-secret",
    owner: "陈运维",
    rule: "运维管理员审批",
    authorizedUsers: ["陈运维", "李交付"],
    authorizedByType: { SSH: ["陈运维"], 数据库: ["陈运维", "李交付"], 平台登录: ["陈运维"] },
    remoteMethod: "堡垒机",
    serverIp: "10.24.6.21",
    serverPort: "22",
    serverAccount: "readonly",
    serverPassword: "SrvReadonly@2026",
    dbIp: "10.24.6.21",
    dbPort: "5432",
    dbAccount: "park_dba",
    dbPassword: "Pg@park-2026",
    platformUrl: "https://park.example.cn/admin",
    platformAccount: "readonly",
    platformPassword: "Read@park"
  },
  {
    id: 3,
    customer: "省级监管局",
    project: "MedPro5",
    name: "客户 VPN",
    type: "VPN",
    account: "delivery_ops",
    secret: "••••••••••",
    secretValue: "demo-vpn-secret",
    owner: "郑运维",
    rule: "运维管理员审批",
    authorizedUsers: ["陈运维"],
    authorizedByType: { VPN: ["陈运维"], RDP: ["陈运维"], 数据库: ["陈运维"], 平台登录: ["陈运维"] },
    remoteMethod: "客户 VPN / RDP",
    serverIp: "172.16.8.33",
    serverPort: "3389",
    serverAccount: "delivery_ops",
    serverPassword: "MedSrv@2026",
    dbIp: "172.16.8.40",
    dbPort: "3306",
    dbAccount: "med_dba",
    dbPassword: "MedDb@2026",
    platformUrl: "http://medpro5.local/admin",
    platformAccount: "admin",
    platformPassword: "MedAdmin@2026"
  },
  {
    id: 4,
    customer: "城投集团",
    project: "edhr MAX",
    name: "管理后台",
    type: "平台登录",
    account: "admin",
    secret: "••••••••••",
    secretValue: "demo-platform-secret",
    owner: "刘运维",
    rule: "运维管理员审批",
    authorizedUsers: ["陈运维", "刘运维"],
    authorizedByType: { SSH: ["陈运维", "刘运维"], 数据库: ["陈运维", "刘运维"], 平台登录: ["陈运维", "刘运维"], VPN: ["陈运维", "刘运维"] },
    remoteMethod: "VPN / kubectl",
    serverIp: "10.31.2.10",
    serverPort: "22",
    serverAccount: "deploy",
    serverPassword: "Deploy@max",
    dbIp: "10.31.2.20",
    dbPort: "5432",
    dbAccount: "max_dba",
    dbPassword: "MaxDb@2026",
    platformUrl: "https://pay.example.cn/admin",
    platformAccount: "admin",
    platformPassword: "Admin@max"
  }
];

const credentialRequests = [
  { credentialId: 3, type: "VPN", requester: "王研发", reason: "排查验证环境登录问题", status: "待运维管理员审批" }
];

const users = [
  { name: "陈运维", dept: "运维部", role: "运维管理员", scope: "全部运维项目", credential: "可维护/审计", menus: ["projects", "support", "assets", "flow", "projectNames", "supportTypes", "credentials", "users"] },
  { name: "刘运维", dept: "运维部", role: "运维人员", scope: "负责项目", credential: "授权查看", menus: ["dashboard", "projects", "support", "credentials"] },
  { name: "李交付", dept: "交付部", role: "交付人员", scope: "参与项目", credential: "申请查看", menus: ["dashboard", "projects", "support", "credentials"] },
  { name: "王研发", dept: "研发部", role: "研发人员", scope: "分派问题", credential: "申请查看", menus: ["dashboard", "projects", "support", "credentials"] },
  { name: "周经理", dept: "项目部", role: "项目经理", scope: "负责项目", credential: "默认不可见", menus: ["dashboard", "projects", "support", "credentials"] }
];

const roles = [
  { name: "系统管理员", scope: "全部数据", menus: ["projects", "supportDeploy", "supportTech", "supportNeed", "supportOther", "flow", "projectNames", "supportTypes", "credentials", "users", "roles"], credential: "可维护/审计" },
  { name: "运维管理员", scope: "全部运维项目", menus: ["projects", "supportDeploy", "supportTech", "supportNeed", "supportOther", "assets", "flow", "credentials"], credential: "审批查看" },
  { name: "交付人员", scope: "参与项目", menus: ["dashboard", "projects", "supportDeploy", "supportTech", "credentials"], credential: "申请查看" },
  { name: "研发人员", scope: "分派问题", menus: ["dashboard", "projects", "supportTech", "supportNeed", "credentials"], credential: "申请查看" },
  { name: "项目经理", scope: "负责项目", menus: ["dashboard", "projects", "supportNeed", "supportOther"], credential: "默认不可见" }
];

const flowMap = {
  ops: {
    title: "交付 → 运维",
    desc: "适用于部署、环境、访问、服务器、证书等运维类支持",
    departments: ["交付部", "运维部"],
    defaultHandlers: { delivery: "李交付", ops: "陈运维", dev: "" },
    nodes: ["交付提交", "运维接收", "运维处理", "交付确认", "关闭归档"]
  },
  devops: {
    title: "交付 → 研发 → 运维",
    desc: "适用于 Bug、新需求、版本包、代码修复后需要部署的问题",
    departments: ["交付部", "研发部", "运维部"],
    defaultHandlers: { delivery: "李交付", ops: "陈运维", dev: "王研发" },
    nodes: ["交付提交", "研发接收", "研发处理", "运维部署", "交付确认", "关闭归档"]
  },
  custom: {
    title: "客户现场升级流程",
    desc: "适用于重点客户现场问题，需要项目经理和部门负责人介入",
    departments: ["项目部", "研发部", "运维部"],
    defaultHandlers: { delivery: "李交付", ops: "刘运维", dev: "王研发" },
    nodes: ["交付提交", "项目经理确认", "研发/运维协同", "部门负责人升级", "交付确认", "关闭归档"]
  }
};

let selectedProject = projects[0];
let currentView = "dashboard";
let customFlowCount = 1;
let projectCounter = projects.length;
let serverCounter = servers.length;
let credentialCounter = credentials.length;
let userCounter = users.length;
let ticketCounter = tickets.length;
let goliveCounter = 0;
let activeFormType = "support";
let currentRole = null;
let currentUserName = null;
let sidebarCollapsed = false;
const collapsedMenuGroups = new Set();
const revealedCredentialIds = new Set();
let credentialCustomerFilter = "all";
let credentialTypeFilter = "all";
let credentialAuditProjectFilter = "all";
let credentialAuditUserFilter = "all";
let projectStatusFilter = "all";
let supportKeywordFilter = "";
const projectFilters = {
  keyword: "",
  customer: "",
  product: "",
  owner: "",
  online: ""
};

const menuLabels = {
  adminHome: "后台首页",
  dashboard: "工作台",
  projects: "项目台账",
  support: "协同支持",
  customerInfo: "客户信息",
  supportDeploy: "项目部署",
  supportTech: "技术支持",
  supportNeed: "项目需求",
  supportOther: "其他支持",
  assets: "运维资产",
  flow: "流程",
  projectNames: "产品名称",
  supportTypes: "使用类型",
  credentials: "客户凭证",
  users: "用户",
  roles: "角色"
};

const roleMenus = {
  admin: ["adminHome", "dashboard", "projects", "customerInfo", "supportDeploy", "supportTech", "supportNeed", "supportOther", "assets", "flow", "projectNames", "supportTypes", "credentials", "users", "roles"],
  user: ["dashboard", "projects", "customerInfo", "supportDeploy", "supportTech", "supportNeed", "supportOther", "credentials"]
};

const titles = {
  adminHome: "管理员后台",
  dashboard: "运维工作台",
  projects: "项目台账",
  support: "协同支持",
  customerInfo: "协同支持 / 客户信息",
  supportDeploy: "协同支持 / 项目部署",
  supportTech: "协同支持 / 技术支持",
  supportNeed: "协同支持 / 项目需求",
  supportOther: "协同支持 / 其他支持",
  assets: "运维资产",
  flow: "配置 / 流程",
  projectNames: "配置 / 产品名称",
  supportTypes: "配置 / 使用类型",
  credentials: "客户凭证管理",
  users: "用户管理 / 用户",
  roles: "用户管理 / 角色"
};

const routes = {
  adminHome: "/admin",
  dashboard: "/dashboard",
  projects: "/projects",
  customerInfo: "/support/customers",
  supportDeploy: "/support/deployments",
  supportTech: "/support/technical",
  supportNeed: "/support/requirements",
  supportOther: "/support/others",
  assets: "/assets",
  flow: "/config/workflows",
  projectNames: "/config/products",
  supportTypes: "/config/support-types",
  credentials: "/config/credentials",
  users: "/users",
  roles: "/roles"
};

const viewsByRoute = Object.fromEntries(Object.entries(routes).map(([view, route]) => [route, view]));
let routeSyncing = false;

const supportViewTypes = {
  supportDeploy: "项目部署",
  supportTech: "技术支持",
  supportNeed: "项目需求",
  supportOther: "其他支持"
};

const supportBaseFields = [
  { name: "customer", label: "项目名称（必填）", required: true, type: "select", options: () => customerOptions(), value: () => selectedProject.customer },
  { name: "project", label: "产品类型", type: "select", options: () => projectNames, value: () => selectedProject.name },
  { name: "type", label: "类型", type: "select", options: () => supportViewTypes[currentView] ? [supportViewTypes[currentView]] : supportTypes, value: () => supportViewTypes[currentView] || supportTypes[0] },
  { name: "priority", label: "优先级", type: "select", options: ["高", "中", "低", "紧急"] },
  { name: "env", label: "环境", type: "select", options: ["生产", "验证", "开发"] }
];

function supportFormNote() {
  return currentView === "supportDeploy"
    ? "项目部署类型固定为项目部署，提交后默认流转到运维管理员。"
    : "项目名称从已有项目资料中选择；产品类型从配置的产品名称中选择，处理人可按对应团队选择。";
}

function supportFormFields() {
  const titleField = { name: "title", label: "标题", span: true, placeholder: "例如：生产环境 v2.8.1 部署申请" };
  const descriptionField = { name: "description", label: "说明", type: "textarea", span: true, placeholder: "补充版本、部署包、影响范围、期望完成时间" };
  const descriptionFileField = { name: "descriptionFile", label: "说明附件上传", type: "file", span: true };
  if (currentView === "supportDeploy") {
    return [
      { name: "customer", label: "客户名称（必填）", required: true, type: "select", options: () => customerOptions(), value: () => selectedProject.customer },
      { name: "project", label: "项目名称（必填）", required: true, placeholder: "请手动填写部署项目名称" },
      { name: "productType", label: "产品类型", type: "select", options: () => projectNames, value: () => selectedProject.name },
      { name: "type", label: "类型", type: "select", options: () => ["项目部署"], value: "项目部署" },
      { name: "priority", label: "优先级", type: "select", options: ["高", "中", "低", "紧急"] },
      { name: "env", label: "环境", type: "select", options: ["生产", "验证", "开发"] },
      { name: "authorizationFile", label: "授权信息上传", type: "file", span: true },
      { name: "authorizationText", label: "授权信息填写", type: "textarea", span: true, placeholder: "可直接填写授权范围、授权人、有效期、备注等信息" },
      { name: "remoteMethod", label: "远程方式", placeholder: "例如：堡垒机 / VPN / RDP / SSH" },
      { name: "remoteInfo", label: "远程方式信息", span: true, placeholder: "例如：堡垒机地址、VPN 账号、远程入口、连接说明" },
      { name: "serverInfo", label: "服务器信息", span: true, placeholder: "例如：服务器 IP、端口、系统、部署目录、用途" },
      descriptionField,
      descriptionFileField
    ];
  }
  return [
    ...supportBaseFields,
    { name: "opsHandler", label: "运维处理人", type: "select", options: () => ["", ...userOptionsByDept("运维部", [selectedProject.ops])] },
    { name: "devHandler", label: "研发处理人", type: "select", options: () => ["", ...userOptionsByDept("研发部", [selectedProject.dev])] },
    { name: "deliveryHandler", label: "交付确认人", type: "select", options: () => ["", ...userOptionsByDept("交付部", [selectedProject.delivery])] },
    titleField,
    descriptionField,
    descriptionFileField
  ];
}

function viewElementId(name) {
  if (supportViewTypes[name]) return "support";
  return name;
}

function navGroupForView(name) {
  if (name === "customerInfo" || supportViewTypes[name]) return "support";
  if (["flow", "projectNames", "supportTypes", "credentials"].includes(name)) return "config";
  if (["users", "roles"].includes(name)) return "users";
  return "";
}

function badgeClass(value) {
  if (["运维中", "已上线", "低"].includes(value)) return "green";
  if (["部署中", "中"].includes(value)) return "blue";
  if (["上线准备中", "高"].includes(value)) return "amber";
  return "red";
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getProjectByCustomerAndName(customer, name) {
  return projects.find((project) => project.customer === customer && project.name === name) || projects.find((project) => project.name === name);
}

function customerOptions() {
  return [...new Set([
    ...customerRecords.map((customer) => customer.name),
    ...projects.filter(isProjectRelatedToCurrentUser).map((project) => project.customer)
  ])];
}

function ensureCustomerRecord(name, sales = "待维护", note = "待补充客户说明") {
  const customerName = String(name || "").trim();
  if (!customerName) return;
  if (!customers.includes(customerName)) customers.push(customerName);
  if (!customerRecords.some((customer) => customer.name === customerName)) {
    customerRecords.push({ name: customerName, sales, note });
  }
}

function projectOptionsForCustomer(customer) {
  const matches = projects.filter((project) => project.customer === customer && isProjectRelatedToCurrentUser(project)).map((project) => project.name);
  return matches.length ? [...new Set(matches)] : projectNames;
}

function isProjectRelatedToCurrentUser(project) {
  if (currentRole === "admin") return true;
  if (!currentUserName) return true;
  return [project.manager, project.ops, project.delivery, project.dev].includes(currentUserName);
}

function currentUserRecord() {
  return users.find((item) => item.name === currentUserName);
}

function usersByDept(dept) {
  return users.filter((user) => user.dept === dept).map((user) => user.name);
}

function userOptionsByDept(dept, fallback = []) {
  const matches = usersByDept(dept);
  return [...new Set([...fallback.filter(Boolean), ...matches])];
}

function isOpsAdmin() {
  const user = currentUserRecord();
  return currentRole === "admin" || Boolean(user && ["系统管理员", "运维管理员"].includes(user.role));
}

function canEditProjectInfo(project) {
  return isOpsAdmin() || project.createdBy === currentUserName;
}

function projectStatusFromOnline(online) {
  if (["已上线", "运维中", "已下线"].includes(online)) return "online";
  if (["部署中", "未上线"].includes(online)) return "deploying";
  return "risk";
}

function isTicketVisible(ticket) {
  if (currentRole === "admin") return true;
  if (!currentUserName) return true;
  const project = projects.find((item) => item.name === ticket.project);
  const participants = [
    ticket.owner,
    ticket.requester,
    ticket.currentHandler,
    ...(ticket.history || []).map((item) => item.user)
  ];
  return participants.includes(currentUserName) || (project && isProjectRelatedToCurrentUser(project));
}

function ticketProject(ticket) {
  return projects.find((item) => item.name === ticket.project) || selectedProject;
}

function defaultTicketHandler(ticket) {
  const project = ticketProject(ticket);
  if (ticket.status === "待研发处理" && ticket.devHandler) return ticket.devHandler;
  if (["待运维接收", "运维处理中"].includes(ticket.status) && ticket.opsHandler) return ticket.opsHandler;
  if (ticket.status === "待交付确认" && ticket.deliveryHandler) return ticket.deliveryHandler;
  if (ticket.status === "待研发处理") return project.dev;
  if (ticket.status === "待交付确认") return project.delivery;
  return project.ops;
}

function ensureTicketMeta(ticket) {
  if (!ticket.id) {
    ticketCounter += 1;
    ticket.id = ticketCounter;
  }
  if (!ticket.requester) ticket.requester = ticket.owner;
  if (!ticket.currentHandler && ticket.status !== "已关闭") ticket.currentHandler = defaultTicketHandler(ticket);
  if (!ticket.history) ticket.history = [];
  return ticket;
}

function canHandleTicket(ticket) {
  return currentRole === "admin" || ticket.currentHandler === currentUserName;
}

function notifyUser(to, title, content) {
  systemMessages.unshift({
    to,
    title,
    content,
    time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    read: false
  });
}

function ticketNextStep(ticket) {
  if (ticket.status === "待运维接收") return { status: "运维处理中", handler: ticket.opsHandler || ticketProject(ticket).ops, note: "已接收并进入运维处理" };
  if (ticket.status === "待研发处理") return { status: "运维处理中", handler: ticket.opsHandler || ticketProject(ticket).ops, note: "研发处理完成，回到运维确认" };
  if (ticket.status === "运维处理中") return { status: "待交付确认", handler: ticket.deliveryHandler || ticketProject(ticket).delivery, note: "运维处理完成，等待交付确认" };
  if (ticket.status === "待交付确认") return { status: "已关闭", handler: "", note: "交付已确认，支持单关闭" };
  return { status: ticket.status, handler: ticket.currentHandler, note: "已记录处理进展" };
}

function handleTicket(ticketId) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket || !canHandleTicket(ticket)) return;
  const next = ticketNextStep(ticket);
  ticket.status = next.status;
  ticket.currentHandler = next.handler;
  ticket.history.push({ user: currentUserName || "管理员", action: next.note });
  if (next.handler) notifyUser(next.handler, ticket.title, `${next.note}，当前处理人：${next.handler}`);
  renderSupportBoard();
  showToast(next.handler ? `已流转给 ${next.handler}` : "支持单已关闭");
}

function transferTicket(ticketId, handler) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket || !handler || !canHandleTicket(ticket)) return;
  ticket.currentHandler = handler;
  ticket.history.push({ user: currentUserName || "管理员", action: `转办给 ${handler}` });
  notifyUser(handler, ticket.title, `支持单已转办给你，请继续处理`);
  renderSupportBoard();
  showToast(`已转办给 ${handler}`);
}

function isCredentialVisibleInList(credential) {
  if (currentRole === "admin") return true;
  return projects.some((project) =>
    project.customer === credential.customer && isProjectRelatedToCurrentUser(project)
  );
}

function credentialTypes(credential) {
  return [...new Set(String(credential.type || "待识别").split(/[、,，/]/).map((item) => item.trim()).filter(Boolean))];
}

function credentialAccessKey(credential, type) {
  return `${credential.id}:${type}`;
}

function authorizedUsersForType(credential, type) {
  return credential.authorizedByType?.[type] || [];
}

function hasCredentialAccess(credential, type) {
  return currentRole === "admin" || authorizedUsersForType(credential, type).includes(currentUserName);
}

function canCreateCredential() {
  if (currentRole === "admin") return true;
  const user = currentUserRecord();
  return Boolean(user && user.role.includes("运维"));
}

function canShowCredentialDetail(credential, type) {
  return currentRole === "admin" || revealedCredentialIds.has(credentialAccessKey(credential, type));
}

function credentialAccountInfo(credential, type, showDetail) {
  const mask = credential.secret;
  if (["SSH", "RDP", "VPN", "堡垒机"].includes(type)) {
    return `${credential.serverAccount || credential.account || "待补充"} / ${showDetail ? (credential.serverPassword || credential.secretValue || "待补充") : mask}`;
  }
  if (type === "数据库") {
    return `${credential.dbAccount || "待补充"} / ${showDetail ? (credential.dbPassword || "待补充") : mask}`;
  }
  if (type === "平台登录") {
    return `${credential.platformAccount || credential.account || "待补充"} / ${showDetail ? (credential.platformPassword || "待补充") : mask}`;
  }
  return `${credential.account || "待补充"} / ${showDetail ? (credential.secretValue || "待补充") : mask}`;
}

function credentialDetailHtml(credential, type) {
  const remoteFields = `
    <div><span>远程方式</span><strong>${credential.remoteMethod || "待补充"}</strong></div>
    <div><span>服务器 IP/端口</span><strong>${credential.serverIp || "待补充"}:${credential.serverPort || "22"}</strong></div>
    <div><span>服务器账号</span><strong>${credential.serverAccount || "待补充"}</strong></div>
    <div><span>服务器密码</span><strong>${credential.serverPassword || credential.secretValue || "待补充"}</strong></div>
  `;
  const dbFields = `
    <div><span>数据库 IP/端口</span><strong>${credential.dbIp || "待补充"}:${credential.dbPort || "待补充"}</strong></div>
    <div><span>数据库账号</span><strong>${credential.dbAccount || "待补充"}</strong></div>
    <div><span>数据库密码</span><strong>${credential.dbPassword || "待补充"}</strong></div>
  `;
  const platformFields = `
    <div><span>平台登录地址</span><strong>${credential.platformUrl || "待补充"}</strong></div>
    <div><span>平台账号</span><strong>${credential.platformAccount || credential.account || "待补充"}</strong></div>
    <div><span>平台密码</span><strong>${credential.platformPassword || "待补充"}</strong></div>
  `;
  const fields = type === "数据库"
    ? dbFields
    : type === "平台登录"
      ? platformFields
      : remoteFields;
  return `<div class="credential-detail">${fields}</div>`;
}

function inferCredentialTypes(values = {}) {
  const source = `${values.remoteMethod || ""} ${values.type || ""}`.toLowerCase();
  const types = [];
  const hasServerLogin = values.serverIp || values.serverPort || values.serverAccount || values.serverPassword;
  const hasDbLogin = values.dbIp || values.dbPort || values.dbAccount || values.dbPassword;
  const hasPlatformLogin = values.platformUrl || values.platformAccount || values.platformPassword;

  if (hasServerLogin) types.push(source.includes("rdp") || values.serverPort === "3389" ? "RDP" : "SSH");
  if (hasDbLogin) types.push("数据库");
  if (hasPlatformLogin) types.push("平台登录");
  if (source.includes("vpn")) types.push("VPN");
  if (source.includes("堡垒")) types.push("堡垒机");
  if (source.includes("token")) types.push("Token");
  return [...new Set(types)].join("、") || "待识别";
}

function requestForCurrentUser(credential, type) {
  return credentialRequests.find((request) =>
    request.credentialId === credential.id && request.type === type && request.requester === currentUserName
  );
}

function pendingRequestsForCredential(credential, type) {
  return credentialRequests.filter((request) =>
    request.credentialId === credential.id && request.type === type && request.status === "待运维管理员审批"
  );
}

function credentialsForProject(project) {
  return credentials.filter((credential) =>
    credential.customer === project.customer &&
    (!credential.project || credential.project === project.name)
  );
}

function credentialProjectKey(credential) {
  return `${credential.customer}__${credential.project || "客户通用"}`;
}

function credentialProjectLabel(credential) {
  return `${credential.customer} / ${credential.project || "客户通用"}`;
}

function credentialPermissionRecords(sourceCredentials = credentials) {
  return sourceCredentials.flatMap((credential) =>
    credentialTypes(credential).flatMap((type) =>
      authorizedUsersForType(credential, type).map((user) => ({ credential, type, user }))
    )
  );
}

function projectSearchText(project) {
  return [
    project.customer,
    project.name,
    project.manager,
    project.ops,
    project.delivery,
    project.dev,
    project.online,
    project.status
  ].join(" ");
}

function projectMatchesText(value, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;
  return normalizeText(value).includes(normalizedQuery);
}

function projectMatchesFilters(project, statusFilter = projectStatusFilter) {
  if (statusFilter !== "all" && project.status !== statusFilter) return false;
  if (!projectMatchesText(projectSearchText(project), projectFilters.keyword)) return false;
  if (!projectMatchesText(project.customer, projectFilters.customer)) return false;
  if (!projectMatchesText(project.name, projectFilters.product)) return false;
  if (!projectMatchesText([project.manager, project.ops, project.delivery, project.dev].join(" "), projectFilters.owner)) return false;
  if (!projectMatchesText(project.online, projectFilters.online)) return false;
  return true;
}

function projectFilterOptions() {
  const relatedProjects = projects.filter(isProjectRelatedToCurrentUser);
  const owners = relatedProjects.flatMap((project) => [project.manager, project.ops, project.delivery, project.dev]).filter(Boolean);
  const onlineStatuses = relatedProjects.map((project) => project.online).filter(Boolean);
  const keywords = relatedProjects.flatMap((project) => [
    project.customer,
    project.name,
    project.manager,
    project.ops,
    project.delivery,
    project.dev,
    project.online
  ]).filter(Boolean);
  return {
    keywords: [...new Set(keywords)],
    customers: [...new Set(relatedProjects.map((project) => project.customer))],
    products: [...new Set([...projectNames, ...relatedProjects.map((project) => project.name)])],
    owners: [...new Set(owners)],
    onlineStatuses: [...new Set(onlineStatuses)]
  };
}

function renderDatalist(id, options) {
  const list = document.querySelector(id);
  if (!list) return;
  list.innerHTML = options.map((option) => `<option value="${option}"></option>`).join("");
}

function renderProjectFilterOptions() {
  const options = projectFilterOptions();
  renderDatalist("#project-keyword-options", options.keywords);
  renderDatalist("#project-customer-options", options.customers);
  renderDatalist("#project-product-options", options.products);
  renderDatalist("#project-owner-options", options.owners);
  renderDatalist("#project-online-options", options.onlineStatuses);
}

function syncProjectFilterInputs() {
  const mapping = {
    "#project-keyword-filter": "keyword",
    "#project-customer-filter": "customer",
    "#project-product-filter": "product",
    "#project-owner-filter": "owner",
    "#project-online-filter": "online"
  };
  Object.entries(mapping).forEach(([selector, key]) => {
    const input = document.querySelector(selector);
    if (input && input.value !== projectFilters[key]) input.value = projectFilters[key];
  });
}

function renderSupportBars() {
  const root = document.querySelector("#support-bars");
  const customerStats = customerOptions().map((customer) => {
    const relatedProjects = projects.filter((project) => project.customer === customer && isProjectRelatedToCurrentUser(project));
    const support = relatedProjects.reduce((acc, project) => {
      acc.deploy += project.support.deploy;
      acc.ops += project.support.ops;
      acc.bug += project.support.bug;
      acc.need += project.support.need;
      return acc;
    }, { deploy: 0, ops: 0, bug: 0, need: 0 });
    return { customer, projectCount: relatedProjects.length, support };
  });
  root.innerHTML = customerStats.map((item) => {
    const total = Object.values(item.support).reduce((sum, value) => sum + value, 0) || 1;
    const deploy = `${(item.support.deploy / total) * 100}fr`;
    const ops = `${(item.support.ops / total) * 100}fr`;
    const bug = `${(item.support.bug / total) * 100}fr`;
    const need = `${(item.support.need / total) * 100}fr`;
    return `
      <div class="bar-row">
        <div class="bar-label"><strong>${item.customer}</strong><span>${item.projectCount} 个项目</span></div>
        <div class="bar-track" style="--deploy:${deploy};--ops:${ops};--bug:${bug};--need:${need}">
          <i></i><i></i><i></i><i></i>
        </div>
        <em>${total} 单</em>
      </div>
    `;
  }).join("");
}

function renderProjectTable(filter = projectStatusFilter) {
  projectStatusFilter = filter;
  renderProjectFilterOptions();
  syncProjectFilterInputs();
  const filteredProjects = projects.filter((project) => projectMatchesFilters(project, filter));
  if (filteredProjects.length && !filteredProjects.some((project) => project.id === selectedProject.id)) {
    selectedProject = filteredProjects[0];
  }
  const rows = filteredProjects
    .map((project) => `
      <div class="table-row project-ledger-row ${project.id === selectedProject.id ? "selected" : ""}" data-project-id="${project.id}">
        <div class="cell-title"><strong>${project.customer}</strong><span>${project.access}</span></div>
        <div>${project.projectTitle || `${project.customer}${project.name}项目`}</div>
        <div>${project.name}</div>
        <div><button class="link-button" data-project-info="${project.id}:version">${project.platformVersion || "--"}</button></div>
        <div><span class="badge ${badgeClass(project.online)}">${project.online}</span></div>
        <div>${project.manager}</div>
        <div><button class="link-button" data-project-info="${project.id}:update">查看</button></div>
        <div><button class="link-button" data-project-info="${project.id}:config">查看</button></div>
      </div>
    `).join("");

  document.querySelector("#project-table").innerHTML = `
    <div class="table-row project-ledger-row header"><div>客户名称</div><div>项目名称</div><div>产品</div><div>平台版本</div><div>上线情况</div><div>项目经理</div><div>更新详情</div><div>配置详情</div></div>
    ${rows || `<div class="empty-state">没有匹配的项目台账，请调整客户、产品、负责人或状态筛选。</div>`}
  `;

  document.querySelectorAll("[data-project-id]").forEach((row) => {
    row.addEventListener("click", () => {
      selectedProject = projects.find((project) => project.id === Number(row.dataset.projectId));
      renderProjectTable(projectStatusFilter);
      renderProjectDetail();
    });
  });
  document.querySelectorAll("[data-project-info]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const [projectId, type] = button.dataset.projectInfo.split(":");
      showProjectInfo(Number(projectId), type);
    });
  });
  refreshPrototypeTables();
}

function showProjectInfo(projectId, type) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;
  const titleMap = {
    version: `${project.customer} / ${project.name} 服务版本`,
    update: `${project.customer} / ${project.name} 更新详情`,
    config: `${project.customer} / ${project.name} 已授权凭证`
  };
  const visibleCredentials = credentialsForProject(project)
    .flatMap((credential) => credentialTypes(credential).map((credentialType) => ({ credential, credentialType })))
    .filter(({ credential, credentialType }) => hasCredentialAccess(credential, credentialType));
  const itemsMap = {
    version: project.serviceVersions || [project.platformVersion || "未维护服务版本"],
    update: project.updateDetails || ["暂无更新记录"]
  };
  document.querySelector("#create-modal-title").textContent = titleMap[type] || `${project.customer} / ${project.name}`;
  document.querySelector("#create-form-grid").innerHTML = type === "config" ? `
    <div class="detail-list span-2">
      ${visibleCredentials.length ? visibleCredentials.map(({ credential, credentialType }) => `
        <div>
          <strong>${credentialType} · ${credential.name}</strong>
          <span>${credential.customer} / ${credential.project || "客户通用"}</span>
          ${credentialDetailHtml(credential, credentialType)}
        </div>
      `).join("") : `<div>当前账号还没有该客户的凭证查看权限，可到配置 / 客户凭证中发起申请。</div>`}
    </div>
  ` : `
    <div class="detail-list span-2">
      ${(itemsMap[type] || []).map((item) => `<div>${item}</div>`).join("")}
    </div>
  `;
  document.querySelector("#create-field-note").textContent = type === "config"
    ? "这里只展示当前账号已授权查看的客户凭证。"
    : "这里展示项目的真实版本和更新记录数据。";
  document.querySelector("#submit-create").classList.add("hidden");
  const modal = document.querySelector("#create-modal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function renderProjectDetail() {
  const root = document.querySelector("#project-detail");
  if (!root) return;
  const canEdit = canEditProjectInfo(selectedProject);
  const credentialNote = currentRole === "admin"
    ? "管理员可查看全部凭证"
    : "凭证信息需授权后查看";
  const visibleCredentials = credentialsForProject(selectedProject)
    .flatMap((credential) => credentialTypes(credential).map((type) => ({ credential, type })))
    .filter(({ credential, type }) => hasCredentialAccess(credential, type));
  const credentialCards = visibleCredentials.length
    ? visibleCredentials.map(({ credential, type }) => `
        <div class="credential-mini-card">
          <strong>${type} · ${credential.name}</strong>
          <span>${credential.customer} / ${credential.project || "客户通用"}</span>
          ${credentialDetailHtml(credential, type)}
        </div>
      `).join("")
    : `<div class="empty-state">当前账号还没有该客户的凭证查看权限，可到凭证管理发起申请。</div>`;
  root.innerHTML = `
    <div class="detail-summary">
      <div class="detail-hero">
        <span class="badge ${badgeClass(selectedProject.online)}">${selectedProject.online}</span>
        <h2>${selectedProject.name}</h2>
        <p>${selectedProject.customer} · ${selectedProject.access}</p>
      </div>
      <div class="meta-grid">
        <div><span>项目经理</span><strong>${selectedProject.manager}</strong></div>
        <div><span>交付负责人</span><strong>${selectedProject.delivery}</strong></div>
        <div><span>运维负责人</span><strong>${selectedProject.ops}</strong></div>
        <div><span>研发负责人</span><strong>${selectedProject.dev}</strong></div>
        <div><span>客户凭证</span><strong>${credentialNote}</strong></div>
      </div>
      <div class="mini-stats">
        <div><strong>${selectedProject.stats[0]}</strong><span>支持总数</span></div>
        <div><strong>${selectedProject.stats[1]}</strong><span>处理中</span></div>
        <div><strong>${selectedProject.stats[2]}</strong><span>Bug</span></div>
        <div><strong>${selectedProject.stats[3]}</strong><span>超时</span></div>
      </div>
      <div class="access-list">
        <div><span>凭证状态</span><strong>${credentialNote}</strong></div>
        <div><span>查看方式</span><strong>${currentRole === "admin" ? "后台凭证管理查看" : "提交授权申请"}</strong></div>
      </div>
      <div class="project-edit-panel ${canEdit ? "" : "readonly"}">
        <div class="section-title">项目信息维护</div>
        ${canEdit ? `
          <div class="project-edit-grid">
            <label>上线状态<select id="project-online-edit">
              ${["未上线", "上线准备中", "部署中", "已上线", "运维中", "已下线"].map((item) => `<option ${item === selectedProject.online ? "selected" : ""}>${item}</option>`).join("")}
            </select></label>
            <label>项目经理<input id="project-manager-edit" value="${selectedProject.manager}" /></label>
            <label>交付负责人<input id="project-delivery-edit" value="${selectedProject.delivery}" /></label>
            <label>运维负责人<input id="project-ops-edit" value="${selectedProject.ops}" /></label>
            <label>研发负责人<input id="project-dev-edit" value="${selectedProject.dev}" /></label>
            <button class="primary-button" id="save-project-info">保存项目信息</button>
          </div>
        ` : `
          <div class="empty-state">仅运维管理员或项目创建者可更新上线状态和相关负责人信息。</div>
        `}
      </div>
      <div class="credential-mini-list">
        <div class="section-title">已授权客户凭证</div>
        ${credentialCards}
      </div>
    </div>
  `;

  document.querySelector("#save-project-info")?.addEventListener("click", () => {
    selectedProject.online = document.querySelector("#project-online-edit").value;
    selectedProject.status = projectStatusFromOnline(selectedProject.online);
    selectedProject.manager = document.querySelector("#project-manager-edit").value.trim() || selectedProject.manager;
    selectedProject.delivery = document.querySelector("#project-delivery-edit").value.trim() || selectedProject.delivery;
    selectedProject.ops = document.querySelector("#project-ops-edit").value.trim() || selectedProject.ops;
    selectedProject.dev = document.querySelector("#project-dev-edit").value.trim() || selectedProject.dev;
    renderProjectTable(document.querySelector(".filter.active")?.dataset.filter || "all");
    renderProjectDetail();
    showToast("项目信息已更新");
  });
}

function renderSupportBoard() {
  tickets.forEach(ensureTicketMeta);
  renderSystemMessages();
  const keyword = normalizeText(supportKeywordFilter);
  const currentSupportType = supportViewTypes[currentView] || "项目部署";
  const visibleTickets = tickets.filter((ticket) => {
    const project = ticketProject(ticket);
    const searchable = [
      ticket.title,
      ticket.project,
      ticket.type,
      ticket.status,
      ticket.priority,
      ticket.currentHandler,
      ticket.requester,
      ticket.owner,
      ticket.env,
      project?.customer
    ].join(" ");
    return ticket.type === currentSupportType && isTicketVisible(ticket) && (!keyword || normalizeText(searchable).includes(keyword));
  });
  const rows = visibleTickets.map((ticket) => {
    const project = ticketProject(ticket);
    const customer = project?.customer || "未知客户";
    const canHandle = canHandleTicket(ticket);
    const handlerOptions = users.map((user) => `<option value="${user.name}" ${ticket.currentHandler === user.name ? "selected" : ""}>${user.name} · ${user.role}</option>`).join("");
    return `
      <div class="support-table-row">
        <div class="support-title-cell">
          <strong>${customer}</strong>
          <span>${ticket.title}</span>
        </div>
        <div>${ticket.project}<br><span class="muted-small">${ticket.productType || project?.platformVersion || "--"}</span></div>
        <div>${ticket.env}</div>
        <div><span class="badge ${badgeClass(ticket.priority)}">${ticket.priority}</span></div>
        <div>${ticket.type === "项目部署" ? "交付 → 运维" : ticket.type === "项目需求" ? "交付 → 研发 → 运维" : "按类型匹配流程"}</div>
        <div>${ticket.requester || ticket.owner}</div>
        <div>${ticket.currentHandler || "--"}</div>
        <div><span class="badge ${badgeClass(ticket.status)}">${ticket.status}</span></div>
        <div class="support-op-cell">
          <button class="link-button" data-ticket-detail="${ticket.id}">查看</button>
          ${canHandle && ticket.status !== "已关闭" ? `
            <button class="link-button" data-ticket-handle="${ticket.id}">处理</button>
            <select data-ticket-transfer-target="${ticket.id}">${handlerOptions}</select>
            <button class="link-button" data-ticket-transfer="${ticket.id}">转办</button>
          ` : `
            <span>${ticket.status === "已关闭" ? "已完成" : "等待处理"}</span>
          `}
        </div>
      </div>
    `;
  }).join("");

  document.querySelector("#support-board").innerHTML = `
    <div class="support-table-row support-table-head">
      <div>项目名称</div>
      <div>产品信息</div>
      <div>环境</div>
      <div>优先级</div>
      <div>默认流程</div>
      <div>发起人</div>
      <div>当前处理人</div>
      <div>状态</div>
      <div>操作</div>
    </div>
    ${rows || `<div class="empty-state">没有匹配的${currentSupportType}记录，请调整名称、客户、产品或处理人筛选。</div>`}
  `;
  document.querySelector("#support-total").textContent = `共 ${visibleTickets.length} 条数据`;

  document.querySelectorAll("[data-ticket-handle]").forEach((button) => {
    button.addEventListener("click", () => handleTicket(Number(button.dataset.ticketHandle)));
  });
  document.querySelectorAll("[data-ticket-detail]").forEach((button) => {
    button.addEventListener("click", () => showSupportTicketDetail(Number(button.dataset.ticketDetail)));
  });
  document.querySelectorAll("[data-ticket-transfer]").forEach((button) => {
    button.addEventListener("click", () => {
      const ticketId = Number(button.dataset.ticketTransfer);
      const target = document.querySelector(`[data-ticket-transfer-target="${ticketId}"]`)?.value;
      transferTicket(ticketId, target);
    });
  });
  refreshPrototypeTables();
}

function showSupportTicketDetail(ticketId) {
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) return;
  ensureTicketMeta(ticket);
  const project = ticketProject(ticket);
  const history = ticket.history?.length ? ticket.history : [{ user: ticket.requester || ticket.owner, action: "提交支持单" }];
  const extraRows = [
    ["客户名称", project?.customer || "未知客户"],
    ["产品/项目", ticket.project],
    ["支持类型", ticket.type],
    ["环境", ticket.env],
    ["优先级", ticket.priority],
    ["当前状态", ticket.status],
    ["当前处理人", ticket.currentHandler || "待分派"],
    ["发起人", ticket.requester || ticket.owner],
    ["运维处理人", ticket.opsHandler || project?.ops || "按流程兜底"],
    ["研发处理人", ticket.devHandler || project?.dev || "按流程兜底"],
    ["交付确认人", ticket.deliveryHandler || project?.delivery || "按流程兜底"]
  ];
  const deploymentRows = ticket.type === "项目部署" ? [
    ["远程方式", ticket.remoteMethod || "待补充"],
    ["远程方式信息", ticket.remoteInfo || "待补充"],
    ["服务器信息", ticket.serverInfo || "待补充"],
    ["授权信息", ticket.authorizationText || ticket.authorizationFile || "待补充"]
  ] : [];

  document.querySelector("#create-modal-title").textContent = `支持单详情：${ticket.title}`;
  document.querySelector("#create-form-grid").innerHTML = `
    <div class="detail-list span-2">
      ${extraRows.concat(deploymentRows).map(([label, value]) => `
        <div><strong>${label}</strong><span>${value}</span></div>
      `).join("")}
      <div><strong>问题说明</strong><span>${ticket.description || "暂无说明"}</span></div>
      <div>
        <strong>流转记录</strong>
        ${history.map((item) => `<span>${item.user}：${item.action}</span>`).join("")}
      </div>
    </div>
  `;
  document.querySelector("#create-field-note").textContent = "详情弹窗展示支持单主数据、项目部署扩展信息和处理流转记录。";
  document.querySelector("#submit-create").classList.add("hidden");
  const modal = document.querySelector("#create-modal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function renderSystemMessages() {
  const list = document.querySelector("#system-message-list");
  const count = document.querySelector("#message-count");
  if (!list || !count) return;
  const messages = systemMessages.filter((message) => currentRole === "admin" || message.to === currentUserName);
  count.textContent = String(messages.filter((message) => !message.read).length);
  list.innerHTML = messages.length
    ? messages.slice(0, 6).map((message) => `
        <div class="message-item ${message.read ? "" : "unread"}">
          <strong>${message.title}</strong>
          <span>${message.content}</span>
          <em>${message.to} · ${message.time}</em>
        </div>
      `).join("")
    : `<div class="empty-state">暂无与你相关的系统消息。</div>`;
}

function renderServers() {
  document.querySelector("#server-grid").innerHTML = `
    <div class="data-table-row server-row data-table-head">
      <div>服务器名称</div><div>环境</div><div>内网 IP</div><div>外网 IP</div><div>系统</div><div>用途</div><div>部署目录</div><div>到期</div>
    </div>
    ${servers.map((server) => `
      <div class="data-table-row server-row">
        <div><strong>${server.name}</strong></div>
        <div><span class="badge ${badgeClass(server.env)}">${server.env}</span></div>
        <div>${server.ip}</div>
        <div>${server.outer}</div>
        <div>${server.os}</div>
        <div>${server.use}</div>
        <div>${server.path}</div>
        <div>${server.expire}</div>
      </div>
    `).join("")}
  `;
  refreshPrototypeTables();
}

function renderFlow(key = "ops") {
  const flow = flowMap[key];
  document.querySelector("#flow-title").textContent = flow.title;
  document.querySelector("#flow-desc").textContent = flow.desc;
  const defaults = flow.defaultHandlers || {};
  document.querySelector("#flow-canvas").innerHTML = `
    <div class="flow-node flow-config-node">
      <strong>流程部门</strong>
      <span>${(flow.departments || []).join("、") || "未配置"}</span>
    </div>
    <div class="flow-arrow">→</div>
    <div class="flow-node flow-config-node">
      <strong>默认处理人员</strong>
      <span>交付：${defaults.delivery || "未配置"}</span>
      <span>研发：${defaults.dev || "未配置"}</span>
      <span>运维：${defaults.ops || "未配置"}</span>
    </div>
    <div class="flow-arrow">→</div>
    ${flow.nodes.map((node, index) => `
    <div class="flow-node"><strong>${node}</strong><span>${index === 0 ? "发起节点" : index === flow.nodes.length - 1 ? "完成节点" : "处理节点"}</span></div>
    ${index === flow.nodes.length - 1 ? "" : "<div class='flow-arrow'>→</div>"}
  `).join("")}
  `;
}

function renderProjectNames() {
  document.querySelector("#project-name-list").innerHTML = `
    <div class="data-table-row config-row data-table-head"><div>名称</div><div>类型</div><div>状态</div><div>操作</div></div>
    ${projectNames.map((name, index) => `
    <div class="data-table-row config-row">
      <div><strong>${name}</strong></div>
      <div><span class="badge ${index < 3 ? "blue" : "green"}">${index < 3 ? "默认项目" : "自定义项目"}</span></div>
      <div>启用</div>
      <div><button class="link-button" data-project-name="${name}">编辑</button></div>
    </div>
  `).join("")}
  `;
  document.querySelector("#admin-project-name-count").textContent = String(projectNames.length);
  refreshPrototypeTables();
}

function renderSupportTypes() {
  document.querySelector("#support-type-list").innerHTML = `
    <div class="data-table-row config-row data-table-head"><div>名称</div><div>类型</div><div>状态</div><div>操作</div></div>
    ${supportTypes.map((name, index) => `
    <div class="data-table-row config-row">
      <div><strong>${name}</strong></div>
      <div><span class="badge ${index < 4 ? "blue" : "green"}">${index < 4 ? "默认类型" : "自定义类型"}</span></div>
      <div>启用</div>
      <div><button class="link-button" data-support-type="${name}">编辑</button></div>
    </div>
  `).join("")}
  `;
  refreshPrototypeTables();
}

function addFlowTemplate(values = {}) {
  customFlowCount += 1;
  const supportType = values.supportType || supportTypes[0];
  const departments = (values.departments || "交付部、运维部")
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const key = `custom-${customFlowCount}`;
  flowMap[key] = {
    title: values.name || `自定义流程 ${customFlowCount}`,
    desc: values.desc || `适用于 ${supportType || "自定义类型"} 的流程模板，可配置流程部门、默认处理人员和节点动作`,
    departments,
    defaultHandlers: {
      delivery: values.defaultDelivery || "李交付",
      ops: values.defaultOps || "陈运维",
      dev: values.defaultDev || ""
    },
    nodes: (values.nodes || "发起,节点审批,处理执行,结果确认,关闭").split(/[,，]/).map((item) => item.trim()).filter(Boolean)
  };

  document.querySelectorAll(".flow-template").forEach((item) => item.classList.remove("active"));
  const button = document.createElement("button");
  button.className = "flow-template active";
  button.dataset.flow = key;
  button.textContent = flowMap[key].title;
  button.addEventListener("click", () => {
    document.querySelectorAll(".flow-template").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderFlow(key);
  });
  document.querySelector(".flow-list").appendChild(button);
  renderFlow(key);
  document.querySelector("#admin-flow-count").textContent = String(Object.keys(flowMap).length);
  showToast(`已新增流程模板：${flowMap[key].title}`);
}

function addSupportTypeRecord(values = {}) {
  const name = (values.name || "").trim() || `自定义使用类型 ${supportTypes.length + 1}`;
  if (!supportTypes.includes(name)) {
    supportTypes.push(name);
  }
  renderSupportTypes();
  showToast(`已新增使用类型：${name}`);
}

function addCustomerRecord(values = {}) {
  const name = (values.name || "").trim();
  if (!name) {
    showToast("客户名称为必填项，请先填写客户名称");
    return;
  }
  ensureCustomerRecord(name, values.sales || "待维护", values.note || "待补充客户说明");
  renderCustomers();
  showToast(`已新增客户：${name}`);
}

function addProjectNameRecord(values = {}) {
  const name = (values.name || "").trim() || `自定义项目 ${projectNames.length + 1}`;
  if (!projectNames.includes(name)) {
    projectNames.push(name);
  }
  renderProjectNames();
  showToast(`已新增产品名称：${name}`);
}

function addProjectRecord(values = {}) {
  projectCounter += 1;
  const customer = values.customer || "待录入客户";
  const projectName = values.name || "edhr";
  const project = {
    id: Date.now(),
    name: projectName,
    customer,
    manager: values.manager || "待分配",
    ops: values.ops || "待分配",
    delivery: values.delivery || "待分配",
    dev: values.dev || "待分配",
    status: "deploying",
    online: values.online || "上线准备中",
    deploy: "由运维资产维护",
    remote: "由运维资产维护",
    access: "由运维资产维护",
    createdBy: currentUserName || "陈运维",
    support: { deploy: 0, ops: 0, bug: 0, need: 0 },
    stats: [0, 0, 0, 0]
  };
  project.status = projectStatusFromOnline(project.online);
  projects.unshift(project);
  selectedProject = project;
  renderSupportBars();
  renderProjectTable(document.querySelector(".filter.active")?.dataset.filter || "all");
  renderProjectDetail();
  showToast(`已新增项目台账：${project.name}`);
}

function addServerRecord(values = {}) {
  serverCounter += 1;
  servers.unshift({
    name: values.name || `new-prod-app-${String(serverCounter).padStart(2, "0")}`,
    env: values.env || "生产",
    ip: values.ip || `10.88.${serverCounter}.10`,
    outer: values.outer || "待补充",
    os: values.os || "Linux",
    use: values.use || "新增应用服务",
    path: values.path || "/opt/apps/new-service",
    expire: values.expire || "待确认"
  });
  renderServers();
  showToast("已新增服务器资产，并显示在服务器列表顶部");
}

function addCredentialRecord(values = {}) {
  credentialCounter += 1;
  const customer = values.customer || selectedProject.customer;
  const projectName = values.project || "";
  const inferredType = inferCredentialTypes(values);
  const authorizedUsers = (values.authorizedUsers || "")
    .split(/[、,，\s]+/)
    .map((name) => name.trim())
    .filter(Boolean);
  credentials.unshift({
    id: credentialCounter,
    customer,
    name: values.name || `新增客户凭证 ${credentialCounter}`,
    project: projectName,
    account: values.platformAccount || values.serverAccount || values.dbAccount || "待录入账号",
    type: inferredType,
    secret: "••••••••••",
    secretValue: values.serverPassword || values.platformPassword || values.secret || "待录入密文",
    owner: values.owner || selectedProject.ops,
    rule: values.rule || "运维管理员审批",
    authorizedUsers: [...new Set([values.owner || selectedProject.ops, "陈运维", ...authorizedUsers].filter(Boolean))],
    authorizedByType: Object.fromEntries(inferredType.split("、").filter(Boolean).map((type) => [
      type,
      [...new Set([values.owner || selectedProject.ops, "陈运维", ...authorizedUsers].filter(Boolean))]
    ])),
    remoteMethod: values.remoteMethod || "待补充",
    serverIp: values.serverIp || "待补充",
    serverPort: values.serverPort || "22",
    serverAccount: values.serverAccount || "待补充",
    serverPassword: values.serverPassword || "待补充",
    dbIp: values.dbIp || "待补充",
    dbPort: values.dbPort || "待补充",
    dbAccount: values.dbAccount || "待补充",
    dbPassword: values.dbPassword || "待补充",
    platformUrl: values.platformUrl || "待补充",
    platformAccount: values.platformAccount || "待补充",
    platformPassword: values.platformPassword || "待补充"
  });
  renderCredentials();
  renderProjectDetail();
  showToast("已新增客户凭证，默认脱敏；未授权用户需申请并由运维管理员审批");
}

function addUserRecord(values = {}) {
  userCounter += 1;
  users.unshift({
    name: values.name || `新增用户 ${userCounter}`,
    dept: values.dept || "待分配部门",
    role: values.role || "运维人员",
    scope: values.scope || "负责项目",
    credential: values.credential || "申请查看"
  });
  renderUsers();
  showToast("已新增用户，并加入用户管理列表");
}

function addGoLiveRecord(values = {}) {
  goliveCounter += 1;
  const customer = values.customer || selectedProject.customer;
  const project = values.project || projectNames[0];
  if (!customers.includes(customer)) customers.push(customer);
  const item = document.createElement("div");
  item.className = "timeline-item active";
  const version = values.version || `新增上线记录 ${goliveCounter}`;
  const env = values.env || "生产";
  const result = values.result || "待确认";
  item.innerHTML = `<strong>${project}</strong><span>${version} · ${env} · ${result}</span>`;
  document.querySelector("#golive-list").prepend(item);
  showToast("已新增上线记录，并显示在工作台上线记录列表");
}

function addSupportTicketFromForm(values = {}) {
  const customer = values.customer || selectedProject.customer;
  const project = values.project || projectOptionsForCustomer(customer)[0] || projectNames[0];
  ensureCustomerRecord(customer);
  const type = supportViewTypes[currentView] || values.type || supportTypes[0];
  const priority = values.priority || "高";
  const env = values.env || "生产";
  const title = (values.title || "").trim() || (type === "项目部署" ? `${project}部署申请` : `${env}${type}：待补充标题`);
  const normalizedType = type;
  const status = normalizedType === "项目需求" ? "待研发处理" : "待运维接收";
  const targetProject = getProjectByCustomerAndName(customer, project) || selectedProject;
  const opsHandler = normalizedType === "项目部署" ? "陈运维" : (values.opsHandler || targetProject.ops);
  const devHandler = values.devHandler || targetProject.dev;
  const deliveryHandler = values.deliveryHandler || targetProject.delivery;
  const currentHandler = status === "待研发处理" ? devHandler : opsHandler;
  ticketCounter += 1;

  tickets.unshift({
    id: ticketCounter,
    title,
    project,
    type: normalizedType,
    priority,
    status,
    owner: currentUserName || "当前交付",
    requester: currentUserName || "当前交付",
    currentHandler,
    opsHandler,
    devHandler,
    deliveryHandler,
    env,
    remoteMethod: values.remoteMethod || "",
    remoteInfo: values.remoteInfo || "",
    serverInfo: values.serverInfo || "",
    productType: values.productType || targetProject.name,
    authorizationFile: values.authorizationFile || "",
    authorizationText: values.authorizationText || "",
    description: values.description || "",
    descriptionFile: values.descriptionFile || "",
    history: [{ user: currentUserName || "当前交付", action: `提交${normalizedType}支持` }]
  });
  notifyUser(currentHandler, title, `新的项目支持已流转到你处理`);

  if (targetProject) {
    targetProject.stats[0] += 1;
    targetProject.stats[1] += 1;
    if (normalizedType === "项目部署") targetProject.support.deploy += 1;
    if (["技术支持", "其他支持"].includes(normalizedType)) targetProject.support.ops += 1;
    if (normalizedType === "技术支持") {
      targetProject.support.bug += 1;
      targetProject.stats[2] += 1;
    }
    if (normalizedType === "项目需求") targetProject.support.need += 1;
  }

  renderSupportBoard();
  renderSupportBars();
  renderProjectTable(document.querySelector(".filter.active")?.dataset.filter || "all");
  renderProjectDetail();
  showToast(`已新增项目支持：${title}`);
}

function renderCredentialAdminAudit(visibleCredentials) {
  if (currentRole !== "admin") return "";
  const projectOptions = ["all", ...new Set(visibleCredentials.map(credentialProjectKey))];
  const projectLabels = Object.fromEntries(visibleCredentials.map((credential) => [credentialProjectKey(credential), credentialProjectLabel(credential)]));
  if (credentialAuditProjectFilter !== "all" && !projectOptions.includes(credentialAuditProjectFilter)) {
    credentialAuditProjectFilter = "all";
  }

  const credentialsInProject = visibleCredentials.filter((credential) =>
    credentialAuditProjectFilter === "all" || credentialProjectKey(credential) === credentialAuditProjectFilter
  );
  const projectRows = credentialsInProject.flatMap((credential) =>
    credentialTypes(credential).map((type) => ({
      label: `${credentialProjectLabel(credential)} · ${credential.name}`,
      type,
      users: authorizedUsersForType(credential, type)
    }))
  );

  const permissionRecords = credentialPermissionRecords(visibleCredentials);
  const userOptions = ["all", ...new Set([...users.map((user) => user.name), ...permissionRecords.map((item) => item.user)])];
  if (credentialAuditUserFilter !== "all" && !userOptions.includes(credentialAuditUserFilter)) {
    credentialAuditUserFilter = "all";
  }
  const userRows = permissionRecords.filter((item) =>
    credentialAuditUserFilter === "all" || item.user === credentialAuditUserFilter
  );

  return `
    <div class="credential-audit">
      <section>
        <div class="audit-head">
          <strong>按项目凭证查看授权用户</strong>
          <select id="credential-audit-project">
            ${projectOptions.map((key) => `<option value="${key}" ${credentialAuditProjectFilter === key ? "selected" : ""}>${key === "all" ? "全部项目凭证" : projectLabels[key]}</option>`).join("")}
          </select>
        </div>
        <div class="audit-list">
          ${projectRows.length ? projectRows.map((row) => `
            <div>
              <span>${row.label}</span>
              <strong>${row.type}：${row.users.join("、") || "暂无授权用户"}</strong>
            </div>
          `).join("") : `<div class="empty-state">当前筛选下暂无凭证授权记录。</div>`}
        </div>
      </section>
      <section>
        <div class="audit-head">
          <strong>按用户查看项目凭证权限</strong>
          <select id="credential-audit-user">
            ${userOptions.map((name) => `<option value="${name}" ${credentialAuditUserFilter === name ? "selected" : ""}>${name === "all" ? "全部用户" : name}</option>`).join("")}
          </select>
        </div>
        <div class="audit-list">
          ${userRows.length ? userRows.map(({ credential, type, user }) => `
            <div>
              <span>${user}</span>
              <strong>${credentialProjectLabel(credential)} · ${type} · ${credential.name}</strong>
            </div>
          `).join("") : `<div class="empty-state">该用户暂无项目凭证权限。</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderCredentials() {
  const visibleCredentials = credentials.filter(isCredentialVisibleInList);
  const credentialRows = visibleCredentials.flatMap((credential) =>
    credentialTypes(credential).map((type) => ({ credential, type }))
  ).filter(({ credential, type }) =>
    (credentialCustomerFilter === "all" || credential.customer === credentialCustomerFilter) &&
    (credentialTypeFilter === "all" || type === credentialTypeFilter)
  );
  const customerFilterOptions = ["all", ...new Set(visibleCredentials.map((credential) => credential.customer))];
  const typeFilterOptions = ["all", ...new Set(visibleCredentials.flatMap(credentialTypes))];
  const addCredentialButton = document.querySelector("#add-credential");
  if (addCredentialButton) addCredentialButton.classList.toggle("hidden", !canCreateCredential());
  document.querySelector("#credential-table").innerHTML = `
    ${renderCredentialAdminAudit(visibleCredentials)}
    <div class="credential-filters">
      <label>客户
        <select id="credential-customer-filter">
          ${customerFilterOptions.map((customer) => `<option value="${customer}" ${credentialCustomerFilter === customer ? "selected" : ""}>${customer === "all" ? "全部客户" : customer}</option>`).join("")}
        </select>
      </label>
      <label>凭证类型
        <select id="credential-type-filter">
          ${typeFilterOptions.map((type) => `<option value="${type}" ${credentialTypeFilter === type ? "selected" : ""}>${type === "all" ? "全部类型" : type}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="credential-row header"><div>客户信息</div><div>凭证类型</div><div>已授权用户</div><div>账号/规则</div><div>操作</div></div>
    ${credentialRows.map(({ credential: item, type }) => {
      const canView = hasCredentialAccess(item, type);
      const showDetail = canView && canShowCredentialDetail(item, type);
      const request = requestForCurrentUser(item, type);
      const pending = pendingRequestsForCredential(item, type);
      const key = credentialAccessKey(item, type);
      const action = currentRole === "admin" && pending.length
        ? `<button class="link-button" data-approve="${item.id}:${type}:${pending[0].requester}">同意 ${pending[0].requester}</button>`
        : canView
          ? `<button class="link-button" data-reveal="${key}">${showDetail ? "收起" : "查看"}</button>`
          : request
            ? `<span class="badge amber">${request.status}</span>`
            : `<button class="link-button" data-apply="${key}">申请查看</button>`;
      const accountInfo = credentialAccountInfo(item, type, canView && showDetail);
      return `
      <article class="credential-item">
        <div class="credential-row">
          <div><strong>${item.customer}</strong><br><span>${item.project || "客户通用"} · ${item.name}</span></div>
          <div><span class="badge blue">${type}</span></div>
          <div>${authorizedUsersForType(item, type).join("、") || "暂无"}</div>
          <div>${accountInfo}<br><span>${item.rule}</span></div>
          <div>${action}</div>
        </div>
        ${showDetail ? credentialDetailHtml(item, type) : ""}
      </article>
    `;
    }).join("")}
  `;

  document.querySelector("#credential-customer-filter")?.addEventListener("change", (event) => {
    credentialCustomerFilter = event.target.value;
    renderCredentials();
  });
  document.querySelector("#credential-type-filter")?.addEventListener("change", (event) => {
    credentialTypeFilter = event.target.value;
    renderCredentials();
  });
  document.querySelector("#credential-audit-project")?.addEventListener("change", (event) => {
    credentialAuditProjectFilter = event.target.value;
    renderCredentials();
  });
  document.querySelector("#credential-audit-user")?.addEventListener("change", (event) => {
    credentialAuditUserFilter = event.target.value;
    renderCredentials();
  });

  document.querySelectorAll("[data-apply]").forEach((button) => {
    button.addEventListener("click", () => {
      const [credentialId, type] = button.dataset.apply.split(":");
      const exists = credentialRequests.some((request) =>
        request.credentialId === Number(credentialId) && request.type === type && request.requester === currentUserName
      );
      if (!exists) {
        credentialRequests.push({
          credentialId: Number(credentialId),
          type,
          requester: currentUserName,
          reason: `业务处理需要查看 ${type} 凭证`,
          status: "待运维管理员审批"
        });
      }
      renderCredentials();
      showToast(`${type} 凭证查看申请已提交，默认流转到运维管理员审批`);
    });
  });

  document.querySelectorAll("[data-approve]").forEach((button) => {
    button.addEventListener("click", () => {
      const [credentialId, type, requester] = button.dataset.approve.split(":");
      const credential = credentials.find((item) => item.id === Number(credentialId));
      const request = credentialRequests.find((item) =>
        item.credentialId === Number(credentialId) && item.type === type && item.requester === requester
      );
      if (credential && request) {
        credential.authorizedByType = credential.authorizedByType || {};
        credential.authorizedByType[type] = [...new Set([...(credential.authorizedByType[type] || []), requester])];
        request.status = "已同意";
      }
      renderCredentials();
      renderProjectDetail();
      showToast(`已同意 ${requester} 查看 ${type} 凭证`);
    });
  });

  document.querySelectorAll("[data-reveal]").forEach((button) => {
    button.addEventListener("click", () => {
      const [credentialId, type] = button.dataset.reveal.split(":");
      const credential = credentials.find((item) => item.id === Number(credentialId));
      if (!credential) return;
      const key = credentialAccessKey(credential, type);
      if (revealedCredentialIds.has(key)) {
        revealedCredentialIds.delete(key);
        showToast(`已收起：${credential.customer} / ${type}`);
      } else {
        revealedCredentialIds.add(key);
        showToast(`已展开凭证详情：${credential.customer} / ${type}`);
      }
      renderCredentials();
    });
  });
  refreshPrototypeTables();
}

function renderUsers() {
  document.querySelector("#user-table").innerHTML = `
    <div class="user-row header"><div>用户</div><div>部门</div><div>角色</div><div>数据范围</div><div>菜单权限</div></div>
    ${users.map((user) => `
      <div class="user-row">
        <div><strong>${user.name}</strong><br><span>${user.role}</span></div>
        <div>${user.dept}</div>
        <div><span class="badge ${user.credential.includes("申请") ? "amber" : "blue"}">${user.role}</span></div>
        <div>${user.scope}</div>
        <div class="menu-permissions">
          ${Object.entries(menuLabels).filter(([key]) => key !== "adminHome").map(([key, label]) => `
            <label><input type="checkbox" data-user-menu="${user.name}:${key}" ${user.menus?.includes(key) ? "checked" : ""}>${label}</label>
          `).join("")}
        </div>
      </div>
    `).join("")}
  `;
  document.querySelectorAll("[data-user-menu]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const [userName, menu] = checkbox.dataset.userMenu.split(":");
      const user = users.find((item) => item.name === userName);
      if (!user) return;
      user.menus = user.menus || [];
      if (checkbox.checked && !user.menus.includes(menu)) user.menus.push(menu);
      if (!checkbox.checked) user.menus = user.menus.filter((item) => item !== menu);
      showToast(`${userName} 的菜单权限已更新`);
    });
  });
  refreshPrototypeTables();
}

function renderRoles() {
  const root = document.querySelector("#role-table");
  if (!root) return;
  root.innerHTML = `
    <div class="user-row role-row header"><div>角色</div><div>数据范围</div><div>凭证权限</div><div>可访问菜单</div><div>操作</div></div>
    ${roles.map((role) => `
      <div class="user-row role-row">
        <div><strong>${role.name}</strong></div>
        <div>${role.scope}</div>
        <div><span class="badge ${role.credential.includes("申请") ? "amber" : "blue"}">${role.credential}</span></div>
        <div class="menu-permissions">
          ${role.menus.map((key) => `<label>${menuLabels[key] || key}</label>`).join("")}
        </div>
        <div><button class="link-button" data-role-edit="${role.name}">编辑</button></div>
      </div>
    `).join("")}
  `;
  document.querySelectorAll("[data-role-edit]").forEach((button) => {
    button.addEventListener("click", () => showToast(`${button.dataset.roleEdit} 的角色配置可在下一版弹窗中维护`));
  });
  refreshPrototypeTables();
}

function renderCustomers() {
  const root = document.querySelector("#customer-table");
  if (!root) return;
  root.innerHTML = `
    <div class="user-row customer-row header"><div>客户名称</div><div>销售</div><div>客户说明</div><div>项目数量</div><div>操作</div></div>
    ${customerRecords.map((customer) => {
      const projectCount = projects.filter((project) => project.customer === customer.name).length;
      return `
        <div class="user-row customer-row">
          <div><strong>${customer.name}</strong></div>
          <div>${customer.sales || "待维护"}</div>
          <div>${customer.note || "待补充客户说明"}</div>
          <div>${projectCount}</div>
          <div><button class="link-button" data-customer-view="${customer.name}">查看</button></div>
        </div>
      `;
    }).join("")}
  `;
  document.querySelectorAll("[data-customer-view]").forEach((button) => {
    button.addEventListener("click", () => showToast(`已查看客户：${button.dataset.customerView}`));
  });
  refreshPrototypeTables();
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function routeForView(name) {
  return routes[name] || "/dashboard";
}

function viewFromRoute() {
  const route = decodeURIComponent(window.location.hash.replace(/^#/, "")) || "/dashboard";
  return viewsByRoute[route] || "dashboard";
}

function syncRoute(name) {
  const nextHash = `#${routeForView(name)}`;
  if (window.location.hash === nextHash) return;
  routeSyncing = true;
  window.location.hash = nextHash;
  window.setTimeout(() => {
    routeSyncing = false;
  }, 0);
}

function switchView(name, options = {}) {
  const allowed = roleMenus[currentRole] || [];
  if (!allowed.includes(name)) {
    name = allowed[0] || "dashboard";
  }
  currentView = name;
  if (!options.skipRoute) syncRoute(name);
  const activeGroup = navGroupForView(name);
  if (activeGroup) collapsedMenuGroups.delete(activeGroup);
  document.querySelectorAll(".nav-item").forEach((item) => {
    const sameView = item.dataset.view === name;
    const supportParent = (name === "customerInfo" || supportViewTypes[name]) && item.classList.contains("nav-parent") && item.dataset.view === "supportDeploy";
    const configParent = ["flow", "projectNames", "supportTypes", "credentials"].includes(name) && item.classList.contains("nav-parent") && item.dataset.view === "flow";
    const userParent = ["users", "roles"].includes(name) && item.classList.contains("nav-parent") && item.dataset.view === "users";
    item.classList.toggle("active", sameView || supportParent || configParent || userParent);
  });
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${viewElementId(name)}-view`).classList.add("active");
  document.querySelector("#page-title").textContent = titles[name];
  if (name === "dashboard") renderSupportBars();
  if (name === "customerInfo") renderCustomers();
  if (supportViewTypes[name]) renderSupportBoard();
  if (name === "credentials") renderCredentials();
  if (name === "roles") renderRoles();
  if (name === "projects") {
    renderProjectTable(document.querySelector(".filter.active")?.dataset.filter || "all");
    renderProjectDetail();
  }
  updatePrimaryCreate();
  updateSubMenuVisibility();
}

function renderMenuForRole(role) {
  const allowed = roleMenus[role] || [];
  document.querySelectorAll(".nav-item").forEach((item) => {
    const view = item.dataset.view;
    const isSupportParent = item.classList.contains("nav-parent") && view === "supportDeploy" && allowed.some((name) => name === "customerInfo" || supportViewTypes[name]);
    const isConfigParent = item.classList.contains("nav-parent") && view === "flow" && allowed.some((name) => ["flow", "projectNames", "supportTypes", "credentials"].includes(name));
    const isUserParent = item.classList.contains("nav-parent") && view === "users" && allowed.some((name) => ["users", "roles"].includes(name));
    item.classList.toggle("hidden", !(allowed.includes(view) || isSupportParent || isConfigParent || isUserParent));
  });
  document.querySelectorAll(".sub-nav").forEach((group) => {
    const hasVisibleItem = Array.from(group.querySelectorAll(".sub-item")).some((item) => !item.classList.contains("hidden"));
    group.classList.toggle("hidden", !hasVisibleItem);
  });
  updateSubMenuVisibility();
}

function setSidebarCollapsed(collapsed) {
  sidebarCollapsed = collapsed;
  const shell = document.querySelector("#app-shell");
  const toggle = document.querySelector("#sidebar-toggle");
  shell?.classList.toggle("sidebar-collapsed", sidebarCollapsed);
  if (toggle) {
    toggle.textContent = sidebarCollapsed ? "›" : "☰";
    toggle.title = sidebarCollapsed ? "展开菜单" : "收起菜单";
    toggle.setAttribute("aria-label", sidebarCollapsed ? "展开菜单" : "收起菜单");
    toggle.setAttribute("aria-pressed", String(sidebarCollapsed));
  }
}

function updateSubMenuVisibility() {
  document.querySelectorAll(".sub-nav").forEach((group) => {
    const hasVisibleItem = Array.from(group.querySelectorAll(".sub-item")).some((item) => !item.classList.contains("hidden"));
    const collapsed = collapsedMenuGroups.has(group.dataset.menuGroup);
    group.classList.toggle("collapsed", collapsed || !hasVisibleItem);
  });
  document.querySelectorAll(".nav-parent").forEach((item) => {
    const group = navGroupForView(item.dataset.view);
    const hasVisibleChild = group ? Array.from(document.querySelectorAll(`.sub-nav[data-menu-group="${group}"] .sub-item`)).some((child) => !child.classList.contains("hidden")) : false;
    const collapsed = group ? collapsedMenuGroups.has(group) || !hasVisibleChild : false;
    item.classList.toggle("is-collapsed", collapsed);
    item.setAttribute("aria-expanded", String(!collapsed));
  });
}

function loginAs(role) {
  currentRole = role;
  currentUserName = role === "admin" ? "陈运维" : "李交付";
  credentialCustomerFilter = "all";
  credentialTypeFilter = "all";
  document.querySelector("#login-screen").classList.add("hidden");
  document.querySelector("#app-shell").classList.remove("hidden");
  document.querySelector("#role-eyebrow").textContent = role === "admin" ? "管理员后台" : "普通用户";
  renderMenuForRole(role);
  const requestedView = viewFromRoute();
  switchView(roleMenus[role].includes(requestedView) ? requestedView : roleMenus[role][0]);
}

function logout() {
  currentRole = null;
  currentUserName = null;
  document.querySelector("#app-shell").classList.add("hidden");
  document.querySelector("#login-screen").classList.remove("hidden");
  routeSyncing = true;
  window.location.hash = "";
  window.setTimeout(() => {
    routeSyncing = false;
  }, 0);
}

function updatePrimaryCreate() {
  const button = document.querySelector("#primary-create");
  const searchBox = document.querySelector(".search-box");
  const labels = {
    adminHome: "新增产品名称",
    dashboard: "登记上线记录",
    projects: "新建项目台账",
    support: "新建支持单",
    supportDeploy: "新建项目部署",
    supportTech: "新建技术支持",
    supportNeed: "新建项目需求",
    supportOther: "新建其他支持",
    customerInfo: "新增客户",
    assets: "新增服务器",
    flow: "新增流程",
    projectNames: "新增产品名称",
    supportTypes: "新增使用类型",
    credentials: "新增客户凭证",
    users: "新增用户"
  };
  button.title = labels[currentView];
  button.setAttribute("aria-label", labels[currentView]);
  const hideCreateAndSearch = currentView === "dashboard" || currentView === "projects" || (currentView === "credentials" && !canCreateCredential()) || currentView === "roles";
  button.classList.toggle("hidden", hideCreateAndSearch);
  searchBox.classList.toggle("hidden", hideCreateAndSearch);
}

function runCreateAction() {
  if (currentView === "credentials" && !canCreateCredential()) {
    showToast("普通用户不可新增凭证，请联系运维人员或管理员维护");
    return;
  }
  const actions = {
    adminHome: () => openCreateModal("projectName"),
    dashboard: () => openCreateModal("golive"),
    projects: () => openCreateModal("project"),
    support: () => openCreateModal("support"),
    supportDeploy: () => openCreateModal("support"),
    supportTech: () => openCreateModal("support"),
    supportNeed: () => openCreateModal("support"),
    supportOther: () => openCreateModal("support"),
    customerInfo: () => openCreateModal("customer"),
    assets: () => openCreateModal("server"),
    flow: () => openCreateModal("flow"),
    projectNames: () => openCreateModal("projectName"),
    supportTypes: () => openCreateModal("supportType"),
    credentials: () => openCreateModal("credential"),
    users: () => openCreateModal("user"),
    roles: () => showToast("角色新增可在下一版扩展为弹窗配置")
  };
  actions[currentView]();
}

const formConfigs = {
  customer: {
    title: "新增客户",
    note: "客户信息用于协同支持、项目部署和客户凭证选择。",
    fields: [
      { name: "name", label: "客户名称（必填）", required: true, placeholder: "例如：华南医疗集团" },
      { name: "sales", label: "销售", placeholder: "例如：张销售" },
      { name: "note", label: "客户说明", type: "textarea", span: true, placeholder: "填写客户背景、网络限制、支持注意事项等" }
    ],
    submit: addCustomerRecord
  },
  projectName: {
    title: "新增产品名称",
    note: "管理员用于维护产品名称选项，默认已有 edhr、edhr MAX、MedPro5；一个客户可关联多个产品或多套项目服务。",
    fields: [
      { name: "name", label: "产品名称（必填）", required: true, placeholder: "例如：MedPro6" },
      { name: "remark", label: "说明", span: true, placeholder: "可填写适用客户、版本、项目服务或业务说明" }
    ],
    submit: addProjectNameRecord
  },
  supportType: {
    title: "新增使用类型",
    note: "管理员在这里维护流程适用类型和项目支持类型，流程配置只能选择已配置类型。",
    fields: [
      { name: "name", label: "使用类型（必填）", required: true, placeholder: "例如：数据修复" },
      { name: "remark", label: "说明", span: true, placeholder: "可填写适用场景、默认流程或处理规则" }
    ],
    submit: addSupportTypeRecord
  },
  golive: {
    title: "登记上线记录",
    note: "客户名称为必填首字段；产品名称只能从管理员后台配置的产品名称中选择。",
    fields: [
      { name: "customer", label: "客户名称（必填）", required: true, type: "datalist", options: () => customers, placeholder: "输入或选择已有客户", value: () => selectedProject.customer },
      { name: "project", label: "产品名称", type: "select", options: () => projectNames, value: () => projectNames.includes(selectedProject.name) ? selectedProject.name : projectNames[0] },
      { name: "version", label: "版本", placeholder: "例如：v2.8.1" },
      { name: "env", label: "环境", type: "select", options: ["生产", "验证", "开发"] },
      { name: "result", label: "部署结果", type: "select", options: ["成功", "失败", "回滚", "待确认"] },
      { name: "operator", label: "部署人", placeholder: "例如：陈运维" },
      { name: "rollback", label: "回滚说明", span: true, placeholder: "无回滚可填：无" }
    ],
    submit: addGoLiveRecord
  },
  project: {
    title: "新建项目台账",
    note: "客户名称为必填首字段；产品名称只能从管理员后台配置的产品名称中选择。",
    fields: [
      { name: "customer", label: "客户名称（必填）", required: true, type: "datalist", options: () => customers, placeholder: "输入或选择已有客户", value: () => selectedProject.customer },
      { name: "name", label: "产品名称", type: "select", options: () => projectNames },
      { name: "manager", label: "项目经理", placeholder: "例如：周经理" },
      { name: "delivery", label: "交付负责人", placeholder: "例如：李交付" },
      { name: "ops", label: "运维负责人", placeholder: "例如：陈运维" },
      { name: "dev", label: "研发负责人", placeholder: "例如：王研发" },
      { name: "online", label: "上线状态", type: "select", options: ["未上线", "上线准备中", "部署中", "已上线", "运维中", "已下线"] }
    ],
    submit: addProjectRecord
  },
  server: {
    title: "新增服务器",
    note: "建议字段：服务器名称、环境、内网 IP、外网 IP、系统、用途、部署目录、到期时间。",
    fields: [
      { name: "name", label: "服务器名称", placeholder: "例如：park-prod-app-01" },
      { name: "env", label: "环境", type: "select", options: ["生产", "验证", "开发"] },
      { name: "ip", label: "内网 IP", placeholder: "例如：10.24.6.18" },
      { name: "outer", label: "外网 IP", placeholder: "没有可填：无" },
      { name: "os", label: "操作系统", placeholder: "例如：Ubuntu 22.04" },
      { name: "use", label: "用途", placeholder: "例如：应用服务 / 数据库" },
      { name: "path", label: "部署目录", placeholder: "例如：/opt/apps/project" },
      { name: "expire", label: "到期时间", placeholder: "例如：2027-02-11" }
    ],
    submit: addServerRecord
  },
  flow: {
    title: "新增流程",
    note: "流程按使用类型、流程部门和默认处理人员配置，不绑定具体客户；如需新增适用类型，请先到使用类型配置。",
    fields: [
      { name: "name", label: "流程名称", placeholder: "例如：交付-研发-运维紧急流程" },
      { name: "supportType", label: "适用类型", type: "select", options: () => [...supportTypes, "全部"] },
      { name: "departments", label: "流程部门", placeholder: "例如：交付部、研发部、运维部", value: "交付部、运维部" },
      { name: "project", label: "适用产品名称", type: "select", options: () => ["全部产品", ...projectNames] },
      { name: "defaultDelivery", label: "默认交付处理人", type: "select", options: () => userOptionsByDept("交付部", ["李交付"]) },
      { name: "defaultDev", label: "默认研发处理人", type: "select", options: () => ["", ...userOptionsByDept("研发部", ["王研发"])] },
      { name: "defaultOps", label: "默认运维处理人", type: "select", options: () => userOptionsByDept("运维部", ["陈运维"]) },
      { name: "nodes", label: "节点列表", span: true, placeholder: "例如：交付提交,研发负责人,研发处理,运维部署,交付确认" },
      { name: "desc", label: "流程说明", span: true, placeholder: "说明适用场景、处理规则、升级条件" }
    ],
    submit: addFlowTemplate
  },
  credential: {
    title: "新增客户凭证",
    note: "无需手选凭证类型，系统会按填写的信息自动识别：服务器登录默认 SSH，数据库信息识别为数据库，平台地址识别为平台登录。",
    fields: [
      { name: "customer", label: "客户名称（必填）", required: true, type: "datalist", options: () => customers, placeholder: "输入客户名称检索", value: () => selectedProject.customer },
      { name: "project", label: "关联产品/服务", type: "select", options: () => projectOptionsForCustomer(selectedProject.customer), value: () => selectedProject.name },
      { name: "name", label: "凭证名称", placeholder: "例如：生产环境完整凭证" },
      { name: "owner", label: "责任人", placeholder: "例如：陈运维" },
      { name: "remoteMethod", label: "远程方式", placeholder: "例如：堡垒机 / SSH / VPN / RDP" },
      { name: "serverIp", label: "服务器 IP", placeholder: "例如：10.24.6.18" },
      { name: "serverPort", label: "服务器端口", placeholder: "默认 22，例如：22 / 3389" },
      { name: "serverAccount", label: "服务器账号", placeholder: "例如：ops_admin" },
      { name: "serverPassword", label: "服务器密码", type: "password", placeholder: "服务器登录密码或密钥摘要" },
      { name: "dbIp", label: "数据库 IP", placeholder: "例如：10.24.6.21" },
      { name: "dbPort", label: "数据库端口", placeholder: "例如：5432 / 3306" },
      { name: "dbAccount", label: "数据库账号", placeholder: "例如：park_dba" },
      { name: "dbPassword", label: "数据库密码", type: "password", placeholder: "数据库密码" },
      { name: "platformUrl", label: "平台登录地址", span: true, placeholder: "例如：https://park.example.cn/admin" },
      { name: "platformAccount", label: "平台账号", placeholder: "例如：admin" },
      { name: "platformPassword", label: "平台密码", type: "password", placeholder: "平台登录密码" },
      { name: "authorizedUsers", label: "已授权用户查看权限", span: true, placeholder: "例如：陈运维、李交付" },
      { name: "rule", label: "查看规则", span: true, type: "select", options: ["运维管理员审批", "按客户授权", "按支持单申请", "仅运维管理员可看"] }
    ],
    submit: addCredentialRecord
  },
  user: {
    title: "新增用户",
    note: "建议字段：姓名、部门、角色、数据范围、凭证权限、联系方式。",
    fields: [
      { name: "name", label: "姓名", placeholder: "例如：陈运维" },
      { name: "dept", label: "部门", type: "select", options: ["运维部", "交付部", "研发部", "项目部", "管理层"] },
      { name: "role", label: "角色", type: "select", options: ["系统管理员", "运维管理员", "运维人员", "交付人员", "研发人员", "项目经理"] },
      { name: "scope", label: "数据范围", type: "select", options: ["全部项目", "负责项目", "参与项目", "分派问题", "本人数据"] },
      { name: "credential", label: "凭证权限", type: "select", options: ["默认不可见", "申请查看", "授权查看", "可维护/审计"] },
      { name: "phone", label: "联系方式", placeholder: "手机号或企业微信" }
    ],
    submit: addUserRecord
  },
  support: {
    title: "新建支持单",
    note: supportFormNote,
    fields: supportFormFields,
    submit: addSupportTicketFromForm
  }
};

function fieldOptions(field) {
  return typeof field.options === "function" ? field.options() : field.options || [];
}

function openCreateModal(type) {
  activeFormType = type;
  const config = formConfigs[type];
  document.querySelector("#submit-create").classList.remove("hidden");
  document.querySelector("#create-modal-title").textContent = config.title;
  document.querySelector("#create-field-note").textContent = typeof config.note === "function" ? config.note() : config.note;
  const fields = typeof config.fields === "function" ? config.fields() : config.fields;
  document.querySelector("#create-form-grid").innerHTML = fields.map((field) => {
    const span = field.span ? " span-2" : "";
    const value = typeof field.value === "function" ? field.value() : field.value || "";
    const required = field.required ? "required" : "";
    if (field.type === "select") {
      const options = fieldOptions(field).map((option) => `<option value="${option}" ${option === value ? "selected" : ""}>${option || "请选择"}</option>`).join("");
      return `<label class="${span.trim()}">${field.label}<select data-field="${field.name}" ${required}>${options}</select></label>`;
    }
    if (field.type === "datalist") {
      const listId = `${type}-${field.name}-options`;
      const options = fieldOptions(field).map((option) => `<option value="${option}"></option>`).join("");
      return `<label class="${span.trim()}">${field.label}<input data-field="${field.name}" list="${listId}" type="text" value="${value}" ${required} placeholder="${field.placeholder || ""}" /><datalist id="${listId}">${options}</datalist></label>`;
    }
    if (field.type === "textarea") {
      return `<label class="${span.trim()}">${field.label}<textarea data-field="${field.name}" ${required} placeholder="${field.placeholder || ""}">${value}</textarea></label>`;
    }
    const inputType = field.type || "text";
    return `<label class="${span.trim()}">${field.label}<input data-field="${field.name}" type="${inputType}" value="${value}" ${required} placeholder="${field.placeholder || ""}" /></label>`;
  }).join("");
  bindDynamicFormEvents();
  const modal = document.querySelector("#create-modal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeCreateModal() {
  const modal = document.querySelector("#create-modal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function bindDynamicFormEvents() {
  const customerInput = document.querySelector('[data-field="customer"]');
  const projectInput = document.querySelector('[data-field="project"]');
  if (["support", "credential"].includes(activeFormType) && customerInput && projectInput) {
    customerInput.addEventListener("change", () => {
      if (activeFormType === "credential") {
        const options = projectOptionsForCustomer(customerInput.value);
        projectInput.innerHTML = options.map((option) => `<option>${option}</option>`).join("");
      }
      if (activeFormType === "support" && currentView !== "supportDeploy") updateSupportDefaultHandlers();
    });
    projectInput.addEventListener("change", () => {
      if (activeFormType === "support" && currentView !== "supportDeploy") updateSupportDefaultHandlers();
    });
  }
  if (activeFormType !== "support") return;
  const typeInput = document.querySelector('[data-field="type"]');
  if (!typeInput) return;
  typeInput.addEventListener("change", () => {
    const value = typeInput.value;
    document.querySelector("#create-field-note").textContent =
      value === "项目需求"
        ? "流程预览：交付 → 研发 → 运维 → 交付确认。请确认是否还需要补充版本、附件或影响范围字段。"
        : value === "项目部署"
          ? "流程预览：交付 → 运维 → 交付确认。项目部署默认直接流转到运维。"
          : "流程预览：按使用类型匹配流程，可转研发或运维协同处理。";
  });
}

function updateSupportDefaultHandlers() {
  const customer = document.querySelector('[data-field="customer"]')?.value;
  const product = document.querySelector('[data-field="project"]')?.value;
  const project = getProjectByCustomerAndName(customer, product) || selectedProject;
  const optionsByField = {
    opsHandler: userOptionsByDept("运维部", [project.ops]),
    devHandler: userOptionsByDept("研发部", [project.dev]),
    deliveryHandler: userOptionsByDept("交付部", [project.delivery])
  };
  Object.entries(optionsByField).forEach(([field, options]) => {
    const input = document.querySelector(`[data-field="${field}"]`);
    if (!input) return;
    input.innerHTML = ["", ...options].map((option) => `<option value="${option}">${option || "请选择"}</option>`).join("");
    input.value = "";
  });
}

function readCreateFormValues() {
  const values = {};
  document.querySelectorAll("[data-field]").forEach((field) => {
    values[field.dataset.field] = field.value;
  });
  return values;
}

function submitCreateForm() {
  const config = formConfigs[activeFormType];
  const values = readCreateFormValues();
  if ("customer" in values && !values.customer.trim()) {
    showToast("客户名称为必填项，请先填写客户名称");
    return;
  }
  if (activeFormType === "support" && !String(values.project || "").trim()) {
    showToast("项目名称为必填项，请先选择项目名称");
    return;
  }
  if (activeFormType === "project" && !customers.includes(values.customer)) {
    showToast("项目台账必须先选择已有客户，请先在协同支持 / 客户信息中维护客户");
    return;
  }
  if (activeFormType === "credential" && !customers.includes(values.customer)) {
    showToast("客户凭证必须先选择已有客户，请先在项目台账中维护客户信息");
    return;
  }
  closeCreateModal();
  config.submit(values);
}

function tableStorageKey(row) {
  const table = row.closest(".support-table, .server-grid, .name-config-list, .table, .credential-table, .user-table");
  return table?.id ? `prototype-columns:${table.id}` : "";
}

function tableRowsForHeader(header) {
  const parent = header.parentElement;
  const rowClass = ["support-table-row", "data-table-row", "table-row", "credential-row", "user-row"]
    .find((className) => header.classList.contains(className));
  const selector = rowClass ? `.${rowClass}` : "";
  if (!parent || !selector) return [];
  return Array.from(parent.querySelectorAll(selector)).filter((row) => {
    const cells = row.children.length;
    return cells === header.children.length;
  });
}

function applyStoredTableColumns() {
  document.querySelectorAll(".support-table-head, .data-table-head, .table-row.header, .credential-row.header, .user-row.header").forEach((header) => {
    const key = tableStorageKey(header);
    const columns = key ? localStorage.getItem(key) : "";
    if (!columns) return;
    tableRowsForHeader(header).forEach((row) => {
      row.style.gridTemplateColumns = columns;
    });
  });
}

function refreshPrototypeTables() {
  applyStoredTableColumns();
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      if (item.classList.contains("nav-parent")) {
        const group = navGroupForView(item.dataset.view);
        if (sidebarCollapsed) {
          setSidebarCollapsed(false);
        }
        if (group && navGroupForView(currentView) === group) {
          if (collapsedMenuGroups.has(group)) collapsedMenuGroups.delete(group);
          else collapsedMenuGroups.add(group);
          updateSubMenuVisibility();
          return;
        }
        if (group) collapsedMenuGroups.delete(group);
      }
      switchView(item.dataset.view);
    });
  });

  document.querySelector("#sidebar-toggle")?.addEventListener("click", () => {
    setSidebarCollapsed(!sidebarCollapsed);
  });

  document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderProjectTable(button.dataset.filter);
      renderProjectDetail();
    });
  });

  const projectFilterInputs = {
    "#project-keyword-filter": "keyword",
    "#project-customer-filter": "customer",
    "#project-product-filter": "product",
    "#project-owner-filter": "owner",
    "#project-online-filter": "online"
  };
  Object.entries(projectFilterInputs).forEach(([selector, key]) => {
    document.querySelector(selector)?.addEventListener("input", (event) => {
      projectFilters[key] = event.target.value.trim();
      renderProjectTable(projectStatusFilter);
      renderProjectDetail();
    });
  });
  document.querySelector("#clear-project-filters")?.addEventListener("click", () => {
    Object.keys(projectFilters).forEach((key) => {
      projectFilters[key] = "";
    });
    syncProjectFilterInputs();
    renderProjectTable(projectStatusFilter);
    renderProjectDetail();
    showToast("项目台账筛选已清空");
  });

  document.querySelectorAll(".segmented button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".segmented button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      showToast(`统计周期已切换为：${button.textContent}`);
    });
  });

  document.querySelectorAll(".flow-template").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".flow-template").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderFlow(button.dataset.flow);
    });
  });

  document.querySelector("#primary-create").addEventListener("click", runCreateAction);
  document.querySelector("#add-support-ticket")?.addEventListener("click", () => openCreateModal("support"));
  document.querySelector("#search-support-filter")?.addEventListener("click", () => {
    supportKeywordFilter = document.querySelector("#support-keyword-filter")?.value.trim() || "";
    renderSupportBoard();
  });
  document.querySelector("#clear-support-filter")?.addEventListener("click", () => {
    supportKeywordFilter = "";
    const input = document.querySelector("#support-keyword-filter");
    if (input) input.value = "";
    renderSupportBoard();
    showToast("事务列表筛选已清空");
  });
  document.querySelector("#support-keyword-filter")?.addEventListener("input", (event) => {
    supportKeywordFilter = event.target.value.trim();
    renderSupportBoard();
  });
  document.querySelector("#admin-login").addEventListener("click", () => loginAs("admin"));
  document.querySelector("#user-login").addEventListener("click", () => loginAs("user"));
  document.querySelector("#logout-button").addEventListener("click", logout);
  document.querySelectorAll("[data-shortcut]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.shortcut));
  });
  document.querySelector("#close-create").addEventListener("click", closeCreateModal);
  document.querySelector("#cancel-create").addEventListener("click", closeCreateModal);
  document.querySelector("#submit-create").addEventListener("click", submitCreateForm);

  const addGoliveButton = document.querySelector("#add-golive");
  if (addGoliveButton) {
    addGoliveButton.addEventListener("click", () => openCreateModal("golive"));
  }
  document.querySelector("#add-project").addEventListener("click", () => {
    openCreateModal("project");
  });
  document.querySelector("#add-server").addEventListener("click", () => {
    openCreateModal("server");
  });
  document.querySelector("#save-flow").addEventListener("click", () => {
    showToast("流程配置已保存：节点、角色和适用规则会进入流程模板");
  });
  document.querySelector("#add-flow").addEventListener("click", () => openCreateModal("flow"));
  document.querySelector("#add-project-name").addEventListener("click", () => openCreateModal("projectName"));
  document.querySelector("#add-support-type").addEventListener("click", () => openCreateModal("supportType"));
  document.querySelector("#add-credential").addEventListener("click", () => {
    if (canCreateCredential()) openCreateModal("credential");
    else showToast("普通用户不可新增凭证，请联系运维人员或管理员维护");
  });
  document.querySelector("#add-user").addEventListener("click", () => {
    openCreateModal("user");
  });
  document.querySelector("#add-role")?.addEventListener("click", () => {
    showToast("角色新增可在下一版扩展为弹窗配置");
  });
  document.querySelector("#add-customer")?.addEventListener("click", () => {
    openCreateModal("customer");
  });

  window.addEventListener("hashchange", () => {
    if (routeSyncing || !currentRole) return;
    switchView(viewFromRoute(), { skipRoute: true });
  });
}

renderSupportBars();
renderProjectTable();
renderProjectDetail();
renderSupportBoard();
renderServers();
renderFlow();
renderProjectNames();
renderSupportTypes();
renderCredentials();
renderUsers();
renderRoles();
renderCustomers();
bindEvents();

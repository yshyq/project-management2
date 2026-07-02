import { get, post, put } from "./client";
import type {
  AuditLog,
  Credential,
  Customer,
  DeploymentCompletion,
  DeploymentCompletionInput,
  DeploymentProject,
  PageResult,
  ProductType,
  Profile,
  Project,
  Role,
  ServerAsset,
  SupportTicket,
  SupportTicketCreateInput,
  SupportType,
  UserAccount,
  WorkflowTemplate
} from "./types";

export const api = {
  login: (payload: { username: string; password: string }) =>
    post<{ accessToken: string; tokenType: string; profile: Profile }>("/auth/login", payload),
  profile: () => get<Profile>("/auth/profile"),
  menus: () => get<string[]>("/auth/menus"),
  customers: (keyword = "") => get<PageResult<Customer>>(`/customers${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ""}`),
  createCustomer: (payload: { name: string; salesName?: string; note?: string }) => post<Customer>("/customers", payload),
  deploymentProjects: (customerId?: number) =>
    get<DeploymentProject[]>(`/deployment-project-options${customerId === undefined ? "" : `?customerId=${customerId}`}`),
  products: () => get<PageResult<ProductType>>("/config/product-types"),
  createProduct: (payload: { name: string }) => post<ProductType>("/config/product-types", payload),
  supportTypes: () => get<PageResult<SupportType>>("/config/support-types"),
  createSupportType: (payload: { name: string; workflowKey?: string }) => post<SupportType>("/config/support-types", payload),
  workflows: () => get<PageResult<WorkflowTemplate>>("/config/workflows"),
  createWorkflow: (payload: {
    name: string;
    supportType: string;
    departments: string[];
    defaultOpsHandlerId?: number | null;
    defaultDevHandlerId?: number | null;
    defaultDeliveryHandlerId?: number | null;
  }) => post<{ id: number; name: string }>("/config/workflows", payload),
  projects: (keyword = "") => get<PageResult<Project>>(`/projects${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ""}`),
  createProject: (payload: Record<string, unknown>) => post<Project>("/projects", payload),
  projectVersions: (id: number) => get<PageResult<{ id: number; serviceName: string; version: string; remark: string }>>(`/projects/${id}/versions`),
  projectUpdates: (id: number) => get<PageResult<{ id: number; version: string; content: string; updatedAt: string }>>(`/projects/${id}/updates`),
  projectDashboard: (id: number) => get<{ ticketTotal: number; processingTotal: number; closedTotal: number; byType: Record<string, number> }>(`/projects/${id}/dashboard`),
  tickets: (supportType = "", keyword = "") => {
    const params = new URLSearchParams();
    if (supportType) params.set("supportType", supportType);
    if (keyword) params.set("keyword", keyword);
    return get<PageResult<SupportTicket>>(`/support-tickets${params.size ? `?${params}` : ""}`);
  },
  createTicket: (payload: SupportTicketCreateInput) => post<SupportTicket>("/support-tickets", payload),
  receiveTicket: (id: number) => post<SupportTicket>(`/support-tickets/${id}/receive`),
  assignTicket: (id: number, handlerId: number) =>
    post<SupportTicket>(`/support-tickets/${id}/assign`, { handlerId }),
  selfAssignTicket: (id: number) => post<SupportTicket>(`/support-tickets/${id}/self-assign`),
  completeDeployment: (id: number, payload: DeploymentCompletion | DeploymentCompletionInput) =>
    post<SupportTicket>(`/support-tickets/${id}/complete-deployment`, payload),
  assets: (ticketId?: number) =>
    get<PageResult<ServerAsset>>(`/assets${ticketId === undefined ? "" : `?ticketId=${ticketId}`}`),
  handleTicket: (id: number, payload: { handlerId?: number | null; nextStatus?: string; result?: string }) => post<SupportTicket>(`/support-tickets/${id}/handle`, payload),
  transferTicket: (id: number, payload: { handlerId?: number | null; nextStatus?: string; result?: string }) => post<SupportTicket>(`/support-tickets/${id}/transfer`, payload),
  closeTicket: (id: number) => post<SupportTicket>(`/support-tickets/${id}/close`),
  credentials: () => get<PageResult<Credential>>("/credentials"),
  createCredential: (payload: Record<string, unknown>) => post<Credential>("/credentials", payload),
  applyCredential: (id: number, reason: string) => post<{ id: number; status: string }>(`/credentials/${id}/apply`, { reason }),
  revealCredential: (id: number, reason: string) => post<{ id: number; secret: string }>(`/credentials/${id}/reveal`, { reason, action: "view" }),
  credentialAudit: () => get<PageResult<AuditLog>>("/credentials/audit"),
  users: (dept = "") => get<PageResult<UserAccount>>(`/users${dept ? `?dept=${encodeURIComponent(dept)}` : ""}`),
  createUser: (payload: { username: string; name: string; password?: string; dept?: string; roleId: number }) => post<UserAccount>("/users", payload),
  roles: () => get<PageResult<Role>>("/roles"),
  createRole: (payload: { name: string; dataScope: string; menus: string[]; credentialPolicy: string }) => post<{ id: number; name: string }>("/roles", payload),
  updateCustomer: (id: number, payload: { name: string; salesName?: string; note?: string }) => put<Customer>(`/customers/${id}`, payload)
};

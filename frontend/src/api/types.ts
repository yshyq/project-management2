export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  traceId: string;
}

export interface PageResult<T> {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Profile {
  id: number;
  username: string;
  name: string;
  dept: string;
  roles: string[];
  roleId: number;
  menus: string[];
  credentialPolicy: string;
}

export interface Customer {
  id: number;
  name: string;
  salesName: string;
  note: string;
}

export interface ProductType {
  id: number;
  name: string;
  enabled: boolean;
}

export interface DeploymentProject {
  customerId: number;
  customerName: string;
  projectName: string;
  products: ProductType[];
}

export interface SupportType {
  id: number;
  name: string;
  workflowKey: string;
  enabled: boolean;
}

export interface WorkflowTemplate {
  id: number;
  name: string;
  supportType: string;
  departments: string[];
  defaultOpsHandlerId?: number | null;
  defaultDevHandlerId?: number | null;
  defaultDeliveryHandlerId?: number | null;
  enabled: boolean;
}

export interface Project {
  id: number;
  customerId: number;
  customerName: string;
  productTypeId: number;
  productName: string;
  platformVersion: string;
  onlineStatus: string;
  projectManagerId?: number | null;
  projectManagerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentExtra {
  remoteMethod: string;
  remoteInfo: string;
  serverInfo: string;
  authorizationText: string;
}

export interface DeploymentCompletion {
  environment: string;
  innerIp: string;
  outerIp?: string;
  hostname: string;
  os: string;
  purpose: string;
  deploymentVersion: string;
  remark?: string;
}

export interface ServerAsset extends DeploymentCompletion {
  id: number;
  projectId?: number | null;
  ticketId?: number | null;
  ticketNo: string;
  customerId?: number | null;
  customerName: string;
  projectName: string;
  productTypeId?: number | null;
  productName: string;
  deployedById?: number | null;
  deployedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: number;
  ticketNo: string;
  supportType: string;
  customerId: number;
  customerName: string;
  projectName: string;
  productTypeId?: number;
  productId?: number;
  productIds?: number[];
  productName?: string;
  productNames?: string[];
  products?: ProductType[];
  title: string;
  priority: string;
  env: string;
  description: string;
  status: string;
  currentHandlerId?: number | null;
  currentHandlerName: string;
  requesterId?: number | null;
  requesterName: string;
  receivedById?: number | null;
  receivedByName?: string;
  receivedAt?: string | null;
  deployedById?: number | null;
  deployedByName?: string;
  deployedAt?: string | null;
  deploymentResult?: DeploymentCompletion | null;
  deploymentExtra?: DeploymentExtra | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketCommonInput {
  supportType: string;
  customerId: number;
  projectName: string;
  priority: string;
  env: string;
  description: string;
}

export interface DeploymentTicketInput extends SupportTicketCommonInput {
  supportType: "项目部署";
  productIds: number[];
  remoteMethod: string;
  remoteInfo: string;
  serverInfo: string;
  authorizationText: string;
}

export interface ProjectSupportTicketInput extends SupportTicketCommonInput {
  productId: number;
  title: string;
}

export type SupportTicketCreateInput = DeploymentTicketInput | ProjectSupportTicketInput;

export interface Credential {
  id: number;
  customerId: number;
  customerName: string;
  productTypeId: number;
  productName: string;
  credentialName: string;
  credentialType: string;
  account: string;
  secretMask: string;
  ownerId?: number | null;
  ownerName: string;
  rule: string;
  createdAt: string;
}

export interface UserAccount {
  id: number;
  username: string;
  name: string;
  dept: string;
  roles: string[];
  roleId: number;
  menus: string[];
  credentialPolicy: string;
}

export interface Role {
  id: number;
  name: string;
  dataScope: string;
  menus: string[];
  credentialPolicy: string;
}

export interface AuditLog {
  id: number;
  credentialId: number;
  operatorId: number;
  operatorName: string;
  action: string;
  reason: string;
  operatedAt: string;
  clientIp: string;
}

export interface Notification {
  id: number;
  title: string;
  content: string;
  refType: string;
  refId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCount {
  count: number;
}

export interface TicketProcessLog {
  id: number;
  action: string;
  fromStatus: string;
  toStatus: string;
  operatorName: string;
  handlerName: string;
  remark: string;
  createdAt: string;
}

export interface FileAttachment {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface UploadResult {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}
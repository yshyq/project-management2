import type { DeploymentProject, SupportTicketCreateInput } from "../api/types";

export interface SupportRequestForm {
  customerId: number | null;
  projectName: string;
  productId: number | null;
  productIds: number[];
  priority: string;
  env: string;
  title: string;
  description: string;
  remoteMethod: string;
  remoteInfo: string;
  serverInfo: string;
  authorizationText: string;
}

export type SupportFormErrors = Partial<Record<"customerId" | "projectName" | "productId" | "productIds" | "title", string>>;

export function createSupportForm(): SupportRequestForm {
  return {
    customerId: null,
    projectName: "",
    productId: null,
    productIds: [],
    priority: "高",
    env: "生产",
    title: "",
    description: "",
    remoteMethod: "",
    remoteInfo: "",
    serverInfo: "",
    authorizationText: ""
  };
}

export function clearAfterCustomerChange(form: SupportRequestForm, customerId: number | null) {
  form.customerId = customerId;
  form.projectName = "";
  form.productId = null;
  form.productIds = [];
}

export function clearAfterProjectChange(form: SupportRequestForm, projectName: string) {
  form.projectName = projectName;
  form.productId = null;
}

export function selectDeploymentProject(form: SupportRequestForm, project: DeploymentProject | null) {
  form.projectName = project?.projectName ?? "";
  form.productId = null;
}

export function validateSupportForm(form: SupportRequestForm, isDeployment: boolean): SupportFormErrors {
  const errors: SupportFormErrors = {};
  if (!form.customerId) errors.customerId = "请选择客户";
  if (!form.projectName.trim()) {
    errors.projectName = isDeployment ? "请填写项目名称" : "请选择已部署项目";
  }
  if (isDeployment) {
    if (!form.productIds.length) errors.productIds = "请至少选择一个产品";
  } else {
    if (!form.productId) errors.productId = "请选择该项目已部署的产品";
    if (!form.title.trim()) errors.title = "请填写标题";
  }
  return errors;
}

export function buildSupportTicketPayload(form: SupportRequestForm, supportType: string): SupportTicketCreateInput {
  const common = {
    customerId: form.customerId as number,
    projectName: form.projectName.trim(),
    priority: form.priority,
    env: form.env,
    description: form.description.trim()
  };

  if (supportType === "项目部署") {
    return {
      ...common,
      supportType: "项目部署",
      productIds: [...form.productIds],
      remoteMethod: form.remoteMethod.trim(),
      remoteInfo: form.remoteInfo.trim(),
      serverInfo: form.serverInfo.trim(),
      authorizationText: form.authorizationText.trim()
    };
  }

  return {
    ...common,
    supportType,
    productId: form.productId as number,
    title: form.title.trim()
  };
}

export function productDisplayNames(ticket: {
  productNames?: string[] | null;
  products?: Array<{ id?: number; name: string }> | null;
  productName?: string | null;
}) {
  if (ticket.productNames?.length) return ticket.productNames.join("、");
  if (ticket.products?.length) return ticket.products.map((product) => product.name).join("、");
  return ticket.productName || "-";
}

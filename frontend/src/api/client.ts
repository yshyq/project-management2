import type { ApiResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const TOKEN_KEY = "ops_pm_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token: string) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  traceId?: string;

  constructor(message: string, status: number, traceId?: string) {
    super(message);
    this.status = status;
    this.traceId = traceId;
  }
}

function hasChinese(text: string) {
  return /[\u4e00-\u9fff]/.test(text);
}

function fallbackHttpMessage(status: number) {
  if (status === 401) return "登录已过期，请重新登录";
  if (status === 403) return "没有权限执行此操作";
  if (status === 404) return "请求的资源不存在";
  if (status === 422) return "请求参数不完整，请检查表单填写内容";
  if (status >= 500) return "服务器处理失败，请稍后重试";
  return "操作失败，请稍后重试";
}

function errorMessage(payload: unknown, fallback: string) {
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim() && hasChinese(detail)) return detail.trim();
  if (Array.isArray(detail)) return "请求参数不完整，请检查表单填写内容";
  return fallback;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("网络连接异常，请检查网络后重试", 0);
  }
  let payload: ApiResponse<T> | { detail?: string };
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    throw new ApiError(errorMessage(payload, fallbackHttpMessage(response.status)), response.status);
  }
  const apiPayload = payload as ApiResponse<T>;
  if (apiPayload.code !== 0) {
    const message = apiPayload.message && hasChinese(apiPayload.message)
      ? apiPayload.message
      : "接口返回异常，请稍后重试";
    throw new ApiError(message, response.status, apiPayload.traceId);
  }
  return apiPayload.data;
}

export function get<T>(path: string) {
  return request<T>(path);
}

export function post<T>(path: string, body?: unknown) {
  return request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}

export function put<T>(path: string, body: unknown) {
  return request<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

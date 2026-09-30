import JSZip from "jszip";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_URL.replace(/\/api\/?$/, "");

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window === "undefined" ? null : localStorage.getItem("skillsEdgeToken");
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;
  if (!response.ok || !payload.success) throw new Error(payload.message || "Request failed");
  return payload.data as T;
}

export type ApiUser = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "designer";
  isActive: boolean;
  lastSeen: string | null;
};

export type ApiFile = {
  _id: string;
  owner?: Pick<ApiUser, "_id" | "name" | "email" | "role">;
  originalName: string;
  secureUrl: string;
  format: string | null;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type ApiOrder = {
  _id: string;
  orderNumber: string;
  customerName: string;
  designName: string;
  format: string;
  status: string;
  assignedDesigner?: Pick<ApiUser, "_id" | "name" | "email"> | null;
  createdAt: string;
  notes: string;
  sourceFiles: { file: { _id: string; originalName: string } | string; name?: string }[];
  sentToCustomer: string;
};

export type ApiFileShare = {
  _id: string;
  file: Pick<ApiFile, "_id" | "originalName" | "secureUrl" | "size" | "mimeType" | "format">;
  sharedBy?: Pick<ApiUser, "_id" | "name" | "email">;
  sharedWith?: Pick<ApiUser, "_id" | "name" | "email" | "role">;
  createdAt: string;
};

export type ApiTeamUser = Pick<ApiUser, "_id" | "name" | "email" | "role">;

export type ApiTeam = {
  _id: string;
  name: string;
  owner: ApiTeamUser;
  members: ApiTeamUser[];
  createdAt: string;
  updatedAt: string;
};

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const payload = (await response.json().catch(() => ({}))) as { success?: boolean; token?: string; data?: ApiUser; message?: string };
  if (!response.ok || !payload.success || !payload.token || !payload.data) throw new Error(payload.message || "Invalid email or password");
  return { token: payload.token, data: payload.data };
}

export function getCurrentUser() {
  return request<ApiUser>("/users/me");
}

export function listFiles() {
  return request<ApiFile[]>("/files");
}

export function listOrders() {
  return request<ApiOrder[]>("/orders");
}

export function createOrder(order: { orderNumber: string; customerName: string; designName: string; format: string; notes: string; sourceFiles: { fileKey: string; name: string }[] }) {
  return request<ApiOrder>("/orders", { method: "POST", body: JSON.stringify(order) });
}

export function assignOrder(orderNumber: string, designerId: string) {
  return request<ApiOrder>(`/orders/${encodeURIComponent(orderNumber)}/assignment`, {
    method: "PATCH",
    body: JSON.stringify({ designerId })
  });
}

export function updateOrder(orderNumber: string, update: { status: string; sentToCustomer?: string }) {
  return request<ApiOrder>(`/orders/${encodeURIComponent(orderNumber)}`, {
    method: "PATCH",
    body: JSON.stringify(update)
  });
}

export function deleteOrder(orderNumber: string) {
  return request<{ orderNumber: string }>(`/orders/${encodeURIComponent(orderNumber)}`, { method: "DELETE" });
}

export function uploadFiles(files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("file", file));
  return request<ApiFile[]>("/files/upload", { method: "POST", body: formData });
}

export function createUser(name: string, email: string, password: string, role: "user" | "admin" | "designer" = "user") {
  return request<ApiUser>("/users", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role })
  });
}

export async function signup(name: string, email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });
  const payload = (await response.json().catch(() => ({}))) as { success?: boolean; token?: string; data?: ApiUser; message?: string };
  if (!response.ok || !payload.success || !payload.token || !payload.data) throw new Error(payload.message || "Unable to create account");
  return { token: payload.token, data: payload.data };
}

export function listUsers(role?: ApiUser["role"]) {
  const query = role ? `?role=${encodeURIComponent(role)}` : "";
  return request<ApiUser[]>(`/users${query}`);
}

export function listTeams() {
  return request<ApiTeam[]>("/teams");
}

export function listMyTeams() {
  return request<ApiTeam[]>("/teams/mine");
}

export function getTeam(teamId: string) {
  return request<ApiTeam>(`/teams/${teamId}`);
}

export function createTeam(name: string, memberIds: string[]) {
  return request<ApiTeam>("/teams", {
    method: "POST",
    body: JSON.stringify({ name, memberIds })
  });
}

export function updateTeam(teamId: string, name: string, memberIds: string[]) {
  return request<ApiTeam>(`/teams/${teamId}`, {
    method: "PATCH",
    body: JSON.stringify({ name, memberIds })
  });
}

export function deleteTeam(teamId: string) {
  return request<{ _id: string }>(`/teams/${teamId}`, { method: "DELETE" });
}

export function bulkDeleteFiles(options: { fileIds?: string[]; deleteAll?: boolean }) {
  return request<{ deletedCount: number; failedCount: number }>("/files/admin/bulk-delete", {
    method: "POST",
    body: JSON.stringify(options)
  });
}

export function deactivateDesigner(designerId: string) {
  return request<{ _id: string; isActive: boolean }>(`/users/designers/${designerId}`, { method: "DELETE" });
}

export function addTeamMember(teamId: string, userId: string) {
  return request<ApiTeam>(`/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId })
  });
}

export function removeTeamMember(teamId: string, userId: string) {
  return request<ApiTeam>(`/teams/${teamId}/members/${userId}`, { method: "DELETE" });
}

export function shareFileWithTeam(fileId: string, teamId: string, permission: "view" | "edit" = "view") {
  return request<{ teamId: string; teamName: string; sharedCount: number; skippedCount: number }>(`/shares/files/${fileId}/team/${teamId}`, {
    method: "POST",
    body: JSON.stringify({ permission })
  });
}

export function shareFileWithUser(fileId: string, userId: string, permission: "view" | "edit" = "view") {
  return request<ApiFileShare>(`/shares/files/${fileId}`, {
    method: "POST",
    body: JSON.stringify({ userId, permission })
  });
}

export function shareFileWithAdmins(fileId: string) {
  return request<{ sharedCount: number; skippedCount: number }>(`/shares/files/${fileId}/admin`, { method: "POST" });
}

export function listReceivedShares() {
  return request<ApiFileShare[]>("/shares/received");
}

export function listSentShares() {
  return request<ApiFileShare[]>("/shares/sent");
}

export function listDesigners() {
  return request<ApiUser[]>("/users/designers");
}

export async function downloadFile(fileId: string, filename: string) {
  const token = typeof window === "undefined" ? null : localStorage.getItem("skillsEdgeToken");
  const response = await fetch(`${API_URL}/files/${fileId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(payload.message || "Unable to download file");
  }
  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export async function downloadFilesAsZip(files: { fileId: string; filename: string }[], archiveName: string) {
  const token = typeof window === "undefined" ? null : localStorage.getItem("skillsEdgeToken");
  const zip = new JSZip();
  const filenameCounts = new Map<string, number>();
  await Promise.all(files.map(async (file) => {
    const response = await fetch(`${API_URL}/files/${file.fileId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(payload.message || `Unable to download ${file.filename}`);
    }
    const extensionIndex = file.filename.lastIndexOf(".");
    const baseName = extensionIndex > 0 ? file.filename.slice(0, extensionIndex) : file.filename;
    const extension = extensionIndex > 0 ? file.filename.slice(extensionIndex) : "";
    const count = (filenameCounts.get(file.filename) || 0) + 1;
    filenameCounts.set(file.filename, count);
    const filename = count === 1 ? file.filename : `${baseName} (${count})${extension}`;
    zip.file(filename, await response.blob());
  }));
  const blobUrl = URL.createObjectURL(await zip.generateAsync({ type: "blob" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = archiveName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export async function getFilePreviewUrl(fileId: string) {
  const token = typeof window === "undefined" ? null : localStorage.getItem("skillsEdgeToken");
  const response = await fetch(`${API_URL}/files/${fileId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(payload.message || "Unable to preview file");
  }
  return URL.createObjectURL(await response.blob());
}
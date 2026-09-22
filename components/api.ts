const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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
  originalName: string;
  secureUrl: string;
  format: string | null;
  mimeType: string;
  size: number;
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
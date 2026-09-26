"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, listFiles, type ApiFile, type ApiUser } from "./api";

export type Role = "admin" | "customer" | "designer";
export type User = { username: string; password: string; role: Role; name: string; id?: string; email?: string };
export type Order = {
  id: string; customer: string; name: string; format: string; status: string;
  designer: string; date: string; notes: string; fileUrl: string; fileKey?: string;
  downloadName: string; sourceFiles?: { fileKey: string; name: string }[]; sentToCustomer: string;
};
export type CompletedFile = {
  name: string; fileUrl: string; fileKey?: string; format: string; order: string;
  customer: string; designer: string; date: string; ownerId?: string; ownerName?: string; ownerRole?: string;
};

const defaultUsers: Record<string, User> = {
  admin: { username: "admin", password: "admin123", role: "admin", name: "Admin" },
  wilcom: { username: "wilcom", password: "wilcom123", role: "customer", name: "Wilcom" },
  wingsxp: { username: "wingsxp", password: "wings123", role: "customer", name: "WingsXP" },
  ubaid: { username: "ubaid", password: "ubaid123", role: "designer", name: "UBAID" },
  haseeb: { username: "haseeb", password: "haseeb123", role: "designer", name: "HASEEB" },
  ibrahim: { username: "ibrahim", password: "ibrahim123", role: "designer", name: "IBRAHIM" },
  jutt: { username: "jutt", password: "jutt123", role: "designer", name: "JUTT" },
  tufail: { username: "tufail", password: "tufail123", role: "designer", name: "TUFAIL" },
  zeshan: { username: "zeshan", password: "zeshan123", role: "designer", name: "ZESHAN" },
  shahbaz: { username: "shahbaz", password: "shahbaz123", role: "designer", name: "SHAHBAZ JR" },
};

type PortalContextValue = {
  user: User; users: Record<string, User>; orders: Order[]; files: CompletedFile[];
  addOrder: (order: Order) => void; updateOrder: (id: string, patch: Partial<Order>) => void;
  removeOrder: (id: string) => void; addFile: (file: CompletedFile) => void;
  updatePassword: (password: string) => void; logout: () => void;
};

function mapUser(user: ApiUser): User {
  return { id: user._id, username: user.email, email: user.email, password: "", role: user.role === "admin" ? "admin" : user.role === "designer" ? "designer" : "customer", name: user.name };
}

function mapFile(file: ApiFile): CompletedFile {
  return { name: file.originalName, fileUrl: file.secureUrl, fileKey: file._id, format: file.format || file.mimeType, order: "", customer: "", designer: "", date: file.createdAt, ownerId: file.owner?._id, ownerName: file.owner?.name, ownerRole: file.owner?.role };
}
const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<Record<string, User>>(defaultUsers);
  const [orders, setOrders] = useState<Order[]>([]);
  const [files, setFiles] = useState<CompletedFile[]>([]);

  useEffect(() => {
    const hydrate = async () => {
      const saved = localStorage.getItem("skillsEdgeCurrentSession");
      const token = localStorage.getItem("skillsEdgeToken");
      const savedUsers = localStorage.getItem("skillsEdgeUsers");
      const today = new Date().toDateString();
      if (localStorage.getItem("skillsEdgeLastDate") !== today) {
        localStorage.setItem("skillsEdgeOrders", "[]"); localStorage.setItem("skillsEdgeFiles", "[]");
        localStorage.setItem("skillsEdgeLastDate", today);
      }
      if (savedUsers) setUsers(JSON.parse(savedUsers));
      if (!token || !saved) { window.location.href = "/"; return; }
      const storedOrders = JSON.parse(localStorage.getItem("skillsEdgeOrders") || "[]") as Order[];
      const cleanOrders = storedOrders.map(({ fileUrl, ...order }) => ({ ...order, fileUrl: fileUrl?.startsWith("data:") ? "" : fileUrl || "" }));
      setOrders(cleanOrders);
      localStorage.setItem("skillsEdgeOrders", JSON.stringify(cleanOrders));
      try {
        const [currentUser, apiFiles] = await Promise.all([getCurrentUser(), listFiles()]);
        const nextUser = mapUser(currentUser);
        const nextFiles = apiFiles.map(mapFile);
        setUser(nextUser);
        setFiles(nextFiles);
        localStorage.setItem("skillsEdgeCurrentSession", JSON.stringify(nextUser));
        localStorage.setItem("skillsEdgeFiles", JSON.stringify(nextFiles));
        setReady(true);
      } catch {
        localStorage.removeItem("skillsEdgeToken");
        localStorage.removeItem("skillsEdgeCurrentSession");
        window.location.href = "/";
      }
    };
    void hydrate();
  }, []);

  const persistOrders = (next: Order[]) => { setOrders(next); localStorage.setItem("skillsEdgeOrders", JSON.stringify(next)); };
  const persistFiles = (next: CompletedFile[]) => { setFiles(next); localStorage.setItem("skillsEdgeFiles", JSON.stringify(next)); };
  const addOrder = (order: Order) => persistOrders([order, ...orders]);
  const updateOrder = (id: string, patch: Partial<Order>) => persistOrders(orders.map((order) => order.id === id ? { ...order, ...patch } : order));
  const removeOrder = (id: string) => { persistOrders(orders.filter((order) => order.id !== id)); persistFiles(files.filter((file) => !file.order.startsWith(id))); };
  const addFile = (file: CompletedFile) => persistFiles([file, ...files]);
  const updatePassword = (password: string) => {
    if (!user) return;
    const nextUsers = { ...users, [user.username]: { ...user, password } };
    setUsers(nextUsers); setUser(nextUsers[user.username]);
    localStorage.setItem("skillsEdgeUsers", JSON.stringify(nextUsers));
    localStorage.setItem("skillsEdgeCurrentSession", JSON.stringify(nextUsers[user.username]));
  };
  const logout = () => { setUser(null); localStorage.removeItem("skillsEdgeToken"); localStorage.removeItem("skillsEdgeCurrentSession"); };

  if (!ready || !user) return null;
  return <PortalContext.Provider value={{ user, users, orders, files, addOrder, updateOrder, removeOrder, addFile, updatePassword, logout }}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) throw new Error("usePortal must be used within PortalProvider");
  return context;
}

export { defaultUsers };
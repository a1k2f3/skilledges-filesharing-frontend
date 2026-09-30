"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { io } from "socket.io-client";
import { assignOrder as assignOrderRequest, createOrder as createOrderRequest, deleteOrder as deleteOrderRequest, getCurrentUser, listFiles, listOrders, listReceivedShares, SOCKET_URL, updateOrder as updateOrderRequest, type ApiFile, type ApiFileShare, type ApiOrder, type ApiUser } from "./api";

export type Role = "admin" | "customer" | "designer";
export type User = { username: string; password: string; role: Role; name: string; id?: string; email?: string };
export type Order = {
  id: string; customer: string; name: string; format: string; status: string;
  designer: string; designerId?: string; date: string; notes: string; fileUrl: string; fileKey?: string;
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
  user: User; users: Record<string, User>; orders: Order[]; files: CompletedFile[]; receivedShares: ApiFileShare[];
  addOrder: (order: Order) => Promise<void>; updateOrder: (id: string, patch: Partial<Order>) => Promise<void>;
  assignOrder: (id: string, designerId: string) => Promise<void>; removeOrder: (id: string) => Promise<void>; addFile: (file: CompletedFile) => void;
  refreshFiles: () => Promise<void>; refreshReceivedShares: () => Promise<void>;
  updatePassword: (password: string) => void; logout: () => void;
};

function mapUser(user: ApiUser): User {
  return { id: user._id, username: user.email, email: user.email, password: "", role: user.role === "admin" ? "admin" : user.role === "designer" ? "designer" : "customer", name: user.name };
}

function mapFile(file: ApiFile): CompletedFile {
  return { name: file.originalName, fileUrl: file.secureUrl, fileKey: file._id, format: file.format || file.mimeType, order: "", customer: "", designer: "", date: file.createdAt, ownerId: file.owner?._id, ownerName: file.owner?.name, ownerRole: file.owner?.role };
}

function mapOrder(order: ApiOrder): Order {
  const sourceFiles = (order.sourceFiles || []).flatMap((item) => {
    if (!item.file) return [];
    const fileKey = typeof item.file === "string" ? item.file : item.file._id;
    const fileName = typeof item.file === "string" ? "File" : item.file.originalName;
    return [{ fileKey, name: item.name || fileName }];
  });
  return {
    id: order.orderNumber,
    customer: order.customerName,
    name: order.designName,
    format: order.format,
    status: order.status,
    designer: order.assignedDesigner?.name || "",
    designerId: order.assignedDesigner?._id,
    date: new Date(order.createdAt).toLocaleString(),
    notes: order.notes || "",
    fileUrl: "",
    fileKey: sourceFiles[0]?.fileKey,
    downloadName: sourceFiles[0]?.name || "",
    sourceFiles,
    sentToCustomer: order.sentToCustomer || ""
  };
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<Record<string, User>>(defaultUsers);
  const [orders, setOrders] = useState<Order[]>([]);
  const [files, setFiles] = useState<CompletedFile[]>([]);
  const [receivedShares, setReceivedShares] = useState<ApiFileShare[]>([]);
  const refreshFiles = useCallback(async () => {
    const nextFiles = (await listFiles()).map(mapFile);
    setFiles(nextFiles);
    localStorage.setItem("skillsEdgeFiles", JSON.stringify(nextFiles));
  }, []);
  const refreshReceivedShares = useCallback(async () => {
    setReceivedShares(await listReceivedShares());
  }, []);
  const refreshOrders = useCallback(async () => {
    setOrders((await listOrders()).map(mapOrder));
  }, []);

  useEffect(() => {
    const hydrate = async () => {
      const saved = localStorage.getItem("skillsEdgeCurrentSession");
      const token = localStorage.getItem("skillsEdgeToken");
      const savedUsers = localStorage.getItem("skillsEdgeUsers");
      const today = new Date().toDateString();
      if (localStorage.getItem("skillsEdgeLastDate") !== today) {
        localStorage.setItem("skillsEdgeFiles", "[]");
        localStorage.setItem("skillsEdgeLastDate", today);
      }
      if (savedUsers) setUsers(JSON.parse(savedUsers));
      if (!token || !saved) { window.location.href = "/"; return; }
      try {
        const [currentUser, apiFiles, apiOrders] = await Promise.all([getCurrentUser(), listFiles(), listOrders()]);
        const apiShares = await listReceivedShares().catch(() => []);
        const nextUser = mapUser(currentUser);
        const nextFiles = apiFiles.map(mapFile);
        setOrders(apiOrders.map(mapOrder));
        setReceivedShares(apiShares);
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

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("skillsEdgeToken");
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token }, autoConnect: false });
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refreshWorkspace = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void refreshFiles().catch(() => undefined);
        void refreshReceivedShares().catch(() => undefined);
        void refreshOrders().catch(() => undefined);
      }, 75);
    };
    socket.on("connect", refreshWorkspace);
    socket.on("file:uploaded", refreshWorkspace);
    socket.on("file:deleted", refreshWorkspace);
    socket.on("file:shared", refreshWorkspace);
    socket.on("file:share-revoked", refreshWorkspace);
    socket.on("order:updated", () => { void refreshOrders().catch(() => undefined); });
    socket.connect();
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      socket.disconnect();
    };
  }, [user, refreshFiles, refreshOrders, refreshReceivedShares]);

  const persistFiles = (next: CompletedFile[]) => { setFiles(next); localStorage.setItem("skillsEdgeFiles", JSON.stringify(next)); };
  const addOrder = async (order: Order) => {
    const created = await createOrderRequest({
      orderNumber: order.id,
      customerName: order.customer,
      designName: order.name,
      format: order.format,
      notes: order.notes,
      sourceFiles: order.sourceFiles || []
    });
    setOrders((current) => [mapOrder(created), ...current.filter((item) => item.id !== created.orderNumber)]);
  };
  const updateOrder = async (id: string, patch: Partial<Order>) => {
    const updated = await updateOrderRequest(id, { status: patch.status || "", sentToCustomer: patch.sentToCustomer });
    setOrders((current) => current.map((order) => order.id === id ? { ...mapOrder(updated), fileUrl: order.fileUrl, downloadName: order.downloadName } : order));
  };
  const assignOrder = async (id: string, designerId: string) => {
    const updated = await assignOrderRequest(id, designerId);
    setOrders((current) => current.map((order) => order.id === id ? mapOrder(updated) : order));
  };
  const removeOrder = async (id: string) => {
    await deleteOrderRequest(id);
    setOrders((current) => current.filter((order) => order.id !== id));
    persistFiles(files.filter((file) => !file.order.startsWith(id)));
  };
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
  return <PortalContext.Provider value={{ user, users, orders, files, receivedShares, addOrder, updateOrder, assignOrder, removeOrder, addFile, refreshFiles, refreshReceivedShares, updatePassword, logout }}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) throw new Error("usePortal must be used within PortalProvider");
  return context;
}

export { defaultUsers };
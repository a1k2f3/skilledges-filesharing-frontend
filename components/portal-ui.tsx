"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listDesigners, shareFileWithAdmins, shareFileWithUser, uploadFiles, type ApiUser } from "./api";
import { usePortal, type Order } from "./portal-context";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>;
}

export function StatusBadge({ status }: { status: string }) { return <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>; }

export function OrderTable({ orders, compact = false }: { orders: Order[]; compact?: boolean }) {
  const { user, updateOrder, assignOrder, removeOrder } = usePortal();
  const [uploads, setUploads] = useState<Record<string, File[]>>({});
  const [pendingAssignments, setPendingAssignments] = useState<Record<string, string>>({});
  const [rowMessages, setRowMessages] = useState<Record<string, string>>({});
  const [busyOrder, setBusyOrder] = useState("");
  const [designers, setDesigners] = useState<ApiUser[]>([]);
  useEffect(() => {
    if (user.role !== "admin") return;
    void listDesigners().then(setDesigners).catch(() => setDesigners([]));
  }, [user.role]);
  if (!orders.length) return <div className="empty-state"><span className="empty-icon">∅</span><strong>No orders here yet</strong><p>New design requests will appear in this workspace.</p><Link href="/upload" className="button button-secondary">Upload a design</Link></div>;
  async function completeOrder(order: Order) {
    const files = uploads[order.id];
    if (!files?.length) return;
    setBusyOrder(order.id);
    setRowMessages((current) => ({ ...current, [order.id]: "" }));
    try {
      const uploadedFiles = await uploadFiles(files);
      await Promise.all(uploadedFiles.map((file) => shareFileWithAdmins(file._id)));
      await updateOrder(order.id, { status: "Ready for Review" });
      setUploads((current) => { const next = { ...current }; delete next[order.id]; return next; });
      setRowMessages((current) => ({ ...current, [order.id]: `${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"} sent to admin.` }));
    } catch (error) {
      setRowMessages((current) => ({ ...current, [order.id]: error instanceof Error ? error.message : "Unable to send file to admin." }));
    } finally {
      setBusyOrder("");
    }
  }
  async function assignToDesigner(order: Order) {
    const designer = pendingAssignments[order.id] || order.designer;
    if (!designer) return;
    const recipient = designers.find((item) => item.name === designer);
    if (!recipient) return;
    setBusyOrder(order.id);
    setRowMessages((current) => ({ ...current, [order.id]: "" }));
    try {
      const fileIds = [...new Set([...(order.sourceFiles || []).map((file) => file.fileKey), order.fileKey || ""])]
        .filter((fileId) => /^[a-f\d]{24}$/i.test(fileId));
      await Promise.all(fileIds.map((fileId) => shareFileWithUser(fileId, recipient._id)));
      await assignOrder(order.id, recipient._id);
      setPendingAssignments((current) => ({ ...current, [order.id]: "" }));
      setRowMessages((current) => ({ ...current, [order.id]: `Source files sent to ${designer}.` }));
    } catch (error) {
      setRowMessages((current) => ({ ...current, [order.id]: error instanceof Error ? error.message : "Unable to assign source files." }));
    } finally {
      setBusyOrder("");
    }
  }
  return <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Design</th><th>Status</th><th>{compact ? "Designer" : "Workflow"}</th>{!compact && <th>Action</th>}</tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.id}</strong><small>{order.date}</small></td><td>{order.customer}</td><td><strong>{order.name}</strong><small>{order.format} {order.notes ? `· ${order.notes}` : ""}</small></td><td><StatusBadge status={order.status} /></td><td>{user.role === "admin" && !compact ? <div className="assignment-control"><select className="inline-select" value={pendingAssignments[order.id] ?? order.designer} onChange={(event) => setPendingAssignments((current) => ({ ...current, [order.id]: event.target.value }))}><option value="">{designers.length ? "Select designer" : "No designers found"}</option>{designers.map((designer) => <option key={designer._id} value={designer.name}>{designer.name}</option>)}</select><button className="text-button" disabled={busyOrder === order.id || (!pendingAssignments[order.id] && !order.designer)} onClick={() => void assignToDesigner(order)}>Send to designer</button>{rowMessages[order.id] && <small className={rowMessages[order.id].startsWith("Source files sent") ? "form-success" : "form-error"}>{rowMessages[order.id]}</small>}</div> : order.designer || <span className="muted">Waiting for assignment</span>}</td>{!compact && <td>{user.role === "admin" ? <div className="row-actions"><button className="text-button" onClick={() => updateOrder(order.id, { status: "Completed", sentToCustomer: order.customer })}>Complete</button><button className="text-button danger-text" onClick={() => removeOrder(order.id)}>Remove</button></div> : user.role === "designer" && order.status !== "Completed" ? <div className="row-actions"><input type="file" multiple onChange={(event) => setUploads((current) => ({ ...current, [order.id]: Array.from(event.target.files || []) }))} /><small>{uploads[order.id]?.length ? `${uploads[order.id].length} file${uploads[order.id].length === 1 ? "" : "s"} selected` : ""}</small><button className="text-button" disabled={busyOrder === order.id || !uploads[order.id]?.length} onClick={() => void completeOrder(order)}>{busyOrder === order.id ? "Sending..." : "Send files"}</button>{rowMessages[order.id] && <small className={rowMessages[order.id].includes("sent to admin") ? "form-success" : "form-error"}>{rowMessages[order.id]}</small>}</div> : <StatusBadge status={order.status} />}</td>}</tr>)}</tbody></table></div>;
}
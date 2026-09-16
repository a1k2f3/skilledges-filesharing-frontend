"use client";

import Link from "next/link";
import { useState } from "react";
import { saveFile } from "./file-store";
import { usePortal, type Order } from "./portal-context";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>;
}

export function StatusBadge({ status }: { status: string }) { return <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>; }

export function OrderTable({ orders, compact = false }: { orders: Order[]; compact?: boolean }) {
  const { user, updateOrder, removeOrder, addFile } = usePortal();
  const [uploads, setUploads] = useState<Record<string, File>>({});
  const [pendingAssignments, setPendingAssignments] = useState<Record<string, string>>({});
  const designers = ["UBAID", "HASEEB", "IBRAHIM", "JUTT", "TUFAIL", "ZESHAN", "SHAHBAZ JR"];
  if (!orders.length) return <div className="empty-state"><span className="empty-icon">∅</span><strong>No orders here yet</strong><p>New design requests will appear in this workspace.</p><Link href="/upload" className="button button-secondary">Upload a design</Link></div>;
  async function completeOrder(order: Order) { const file = uploads[order.id]; if (!file) return; const fileKey = await saveFile(file); addFile({ name: file.name, fileUrl: "", fileKey, format: order.format, order: `${order.id} (${order.name})`, customer: order.customer, designer: user.name, date: new Date().toLocaleString() }); updateOrder(order.id, { status: "Ready for Review" }); }
  function assignToDesigner(order: Order) {
    const designer = pendingAssignments[order.id] || order.designer;
    if (!designer) return;
    updateOrder(order.id, { designer, status: "In Design" });
    setPendingAssignments((current) => ({ ...current, [order.id]: "" }));
  }
  return <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Design</th><th>Status</th><th>{compact ? "Designer" : "Workflow"}</th>{!compact && <th>Action</th>}</tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.id}</strong><small>{order.date}</small></td><td>{order.customer}</td><td><strong>{order.name}</strong><small>{order.format} {order.notes ? `· ${order.notes}` : ""}</small></td><td><StatusBadge status={order.status} /></td><td>{user.role === "admin" && !compact ? <div className="assignment-control"><select className="inline-select" value={pendingAssignments[order.id] ?? order.designer} onChange={(event) => setPendingAssignments((current) => ({ ...current, [order.id]: event.target.value }))}><option value="">Select designer</option>{designers.map((designer) => <option key={designer}>{designer}</option>)}</select><button className="text-button" disabled={!pendingAssignments[order.id] && !order.designer} onClick={() => assignToDesigner(order)}>Send to designer</button></div> : order.designer || <span className="muted">Waiting for assignment</span>}</td>{!compact && <td>{user.role === "admin" ? <div className="row-actions"><button className="text-button" onClick={() => updateOrder(order.id, { status: "Completed", sentToCustomer: order.customer })}>Complete</button><button className="text-button danger-text" onClick={() => removeOrder(order.id)}>Remove</button></div> : user.role === "designer" && order.status !== "Completed" ? <div className="row-actions"><input type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) setUploads({ ...uploads, [order.id]: file }); }} /><button className="text-button" onClick={() => completeOrder(order)}>Send file</button></div> : <StatusBadge status={order.status} />}</td>}</tr>)}</tbody></table></div>;
}
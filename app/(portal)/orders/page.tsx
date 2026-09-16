"use client";

import Link from "next/link";
import { usePortal } from "@/components/portal-context";
import { OrderTable, PageHeader } from "@/components/portal-ui";

export default function OrdersPage() { const { user, orders } = usePortal(); const visible = user.role === "admin" ? orders : user.role === "customer" ? orders.filter((o) => o.customer === user.name) : orders.filter((o) => o.designer === user.name); return <><PageHeader eyebrow="Order management" title={user.role === "customer" ? "My designs" : "Design queue"} description="Track requests, assignments, and final production status." action={<Link href="/upload" className="button button-primary">＋ Upload design</Link>} /><section className="panel"><div className="panel-heading"><div><h2>{visible.length} active {visible.length === 1 ? "order" : "orders"}</h2><p className="muted">Updated from your local workspace</p></div></div><OrderTable orders={visible} /></section></>; }
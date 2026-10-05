"use client";

import Link from "next/link";
import { usePortal } from "@/components/portal-context";
import { OrderTable, PageHeader } from "@/components/portal-ui";

export default function OrdersPage() {
	const { user, orders } = usePortal();
	const isDesigner = user.role === "designer";
	const header = <PageHeader eyebrow="Order management" title={user.role === "designer" || user.role === "customer" ? "My designs" : "Design queue"} description="Track requests, assignments, and final production status." action={<Link href="/upload" className="button button-primary">＋ Upload design</Link>} />;
	if (isDesigner) return <>{header}<div className="designer-queue-heading"><strong>{orders.length} assigned {orders.length === 1 ? "order" : "orders"}</strong><span>Match each output to its source file before sending it to admin.</span></div><OrderTable orders={orders} /></>;
	return <>{header}<section className="panel"><div className="panel-heading"><div><h2>{orders.length} active {orders.length === 1 ? "order" : "orders"}</h2><p className="muted">Updated from your order workspace</p></div></div><OrderTable orders={orders} /></section></>;
}
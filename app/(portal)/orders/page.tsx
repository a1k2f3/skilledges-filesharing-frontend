"use client";

import Link from "next/link";
import { useState } from "react";
import { usePortal } from "@/components/portal-context";
import { OrderTable, PageHeader } from "@/components/portal-ui";

export default function OrdersPage() {
	const { user, orders } = usePortal();
	const isDesigner = user.role === "designer";
	const isAdmin = user.role === "admin";
	const [statusFilter, setStatusFilter] = useState("All");
	const header = <PageHeader eyebrow={isAdmin ? "Design workspace" : "Order management"} title={user.role === "designer" || user.role === "customer" || isAdmin ? "My designs" : "Design queue"} description={isAdmin ? "Review requests, assign designers, and track every delivery." : "Track requests, assignments, and final production status."} action={<Link href="/upload" className="button button-primary">＋ Upload design</Link>} />;
	if (isDesigner) return <>{header}<div className="designer-queue-heading"><strong>{orders.length} assigned {orders.length === 1 ? "order" : "orders"}</strong><span>Match each output to its source file before sending it to admin.</span></div><OrderTable orders={orders} /></>;
	if (isAdmin) {
		const statuses = ["All", ...new Set(orders.map((order) => order.status))];
		const filteredOrders = statusFilter === "All" ? orders : orders.filter((order) => order.status === statusFilter);
		const activeCount = orders.filter((order) => order.status !== "Completed").length;
		const unassignedCount = orders.filter((order) => !order.designer).length;
		const reviewCount = orders.filter((order) => order.status === "Ready for Review").length;
		return <>{header}<section className="admin-queue-summary" aria-label="Design queue summary"><div><span>Active orders</span><strong>{activeCount}</strong></div><div><span>Awaiting designer</span><strong>{unassignedCount}</strong></div><div><span>Ready for review</span><strong>{reviewCount}</strong></div></section><div className="admin-queue-toolbar"><strong>{filteredOrders.length} {statusFilter === "All" ? "orders" : statusFilter.toLowerCase() + " orders"}</strong><div className="admin-status-filters" role="group" aria-label="Filter orders by status">{statuses.map((status) => <button key={status} type="button" className={statusFilter === status ? "is-active" : ""} aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)}>{status}<span>{status === "All" ? orders.length : orders.filter((order) => order.status === status).length}</span></button>)}</div></div><OrderTable orders={filteredOrders} /></>;
	}
	return <>{header}<section className="panel"><div className="panel-heading"><div><h2>{orders.length} active {orders.length === 1 ? "order" : "orders"}</h2><p className="muted">Updated from your order workspace</p></div></div><OrderTable orders={orders} /></section></>;
}
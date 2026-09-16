"use client";

import Link from "next/link";
import { usePortal } from "@/components/portal-context";
import { OrderTable, PageHeader } from "@/components/portal-ui";

export default function DashboardPage() {
  const { user, orders } = usePortal();
  const visible = user.role === "admin" ? orders : user.role === "customer" ? orders.filter((order) => order.customer === user.name) : orders.filter((order) => order.designer === user.name);
  const stats = [{ label: "Total designs", value: visible.length, tone: "blue" }, { label: "Pending", value: visible.filter((o) => o.status === "Pending").length, tone: "amber" }, { label: "In design", value: visible.filter((o) => o.status === "In Design").length, tone: "violet" }, { label: "Completed", value: visible.filter((o) => o.status === "Completed").length, tone: "green" }];
  return <><PageHeader eyebrow={`Good to see you, ${user.name}`} title="Operations overview" description="Keep every stitch moving in the right direction." action={<Link href="/upload" className="button button-primary">＋ New design</Link>} /><div className="stat-grid">{stats.map((stat) => <div className="stat-card" key={stat.label}><div className={`stat-mark ${stat.tone}`}></div><span>{stat.label}</span><strong>{stat.value}</strong><small>Today</small></div>)}</div><section className="panel"><div className="panel-heading"><div><p className="eyebrow">Live queue</p><h2>Active orders</h2></div><Link href="/orders" className="text-button">View all →</Link></div><OrderTable orders={visible.slice(0, 6)} compact /></section></>;
}
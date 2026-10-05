"use client";

import Link from "next/link";
import { usePortal } from "@/components/portal-context";
import { OrderTable, PageHeader } from "@/components/portal-ui";

export default function DashboardPage() {
  const { user, orders } = usePortal();
  const visible = orders;
  const completed = visible.filter((order) => order.status === "Completed").length;
  const completion = visible.length ? Math.round((completed / visible.length) * 100) : 0;
  const stats = [
    { label: "Total designs", value: visible.length, tone: "blue" },
    { label: "Pending", value: visible.filter((order) => order.status === "Pending").length, tone: "amber" },
    { label: "In design", value: visible.filter((order) => order.status === "In Design").length, tone: "violet" },
    { label: "Completed", value: completed, tone: "green" }
  ];
  const fileProgress = visible.map((order) => {
    const sourceFiles = order.sourceFiles || [];
    const received = sourceFiles.filter((file) => file.deliverables?.length).length;
    const attachmentCount = sourceFiles.reduce((count, file) => count + (file.deliverables?.length || 0), 0);
    return { order, sourceFiles, received, attachmentCount };
  });

  return <>
    <PageHeader eyebrow={`Good to see you, ${user.name}`} title="Operations overview" description="Keep every stitch moving in the right direction." action={<Link href="/upload" className="button button-primary">＋ New design</Link>} />
    <div className="stat-grid">{stats.map((stat) => <div className="stat-card" key={stat.label}><div className={`stat-mark ${stat.tone}`}></div><span>{stat.label}</span><strong>{stat.value}</strong><small>Today</small></div>)}</div>
    <section className="completion-panel"><div><p className="eyebrow">Order completion</p><strong>{completed} of {visible.length} orders complete</strong></div><span>{completion}%</span><progress aria-label="Completed orders" max={visible.length || 1} value={completed} /></section>
    {user.role === "admin" && <section className="panel order-progress-panel">
      <div className="panel-heading"><div><p className="eyebrow">Designer deliveries</p><h2>File receipt by order</h2></div></div>
      {fileProgress.length ? <div className="order-progress-list">{fileProgress.map(({ order, sourceFiles, received, attachmentCount }) => <article className="order-progress-row" key={order.id}>
        <div className="order-progress-heading"><strong>{order.name}</strong><span>{order.priority} priority</span></div>
        <small>{received} of {sourceFiles.length} source files received · {attachmentCount} attachments · {order.id}</small>
        <progress aria-label={`${order.name} source file delivery progress`} max={sourceFiles.length || 1} value={received} />
      </article>)}</div> : <p className="muted">No orders yet.</p>}
    </section>}
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Live queue</p><h2>Active orders</h2></div><Link href="/orders" className="text-button">View all →</Link></div><OrderTable orders={visible.slice(0, 6)} compact /></section>
  </>;
}
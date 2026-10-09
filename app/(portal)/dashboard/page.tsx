"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDesignerDeliveryReport, type DesignerDeliveryReport } from "@/components/api";
import { usePortal } from "@/components/portal-context";
import { OrderTable, PageHeader } from "@/components/portal-ui";

type ReportPeriod = "daily" | "monthly" | "yearly";

function getReportRange(period: ReportPeriod) {
  const now = new Date();
  const start = new Date(now.getFullYear(), period === "yearly" ? 0 : period === "monthly" ? now.getMonth() : now.getMonth(), period === "daily" ? now.getDate() : 1);
  const end = period === "daily"
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    : period === "monthly"
      ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
      : new Date(now.getFullYear() + 1, 0, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function DashboardPage() {
  const { user, orders } = usePortal();
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("daily");
  const [reportResult, setReportResult] = useState<{ period: ReportPeriod; data?: DesignerDeliveryReport; error?: string } | null>(null);
  useEffect(() => {
    if (user.role !== "admin") return;
    let isCurrent = true;
    const range = getReportRange(reportPeriod);
    void getDesignerDeliveryReport(range.start, range.end)
      .then((data) => { if (isCurrent) setReportResult({ period: reportPeriod, data }); })
      .catch((error) => { if (isCurrent) setReportResult({ period: reportPeriod, error: error instanceof Error ? error.message : "Unable to load designer report." }); });
    return () => { isCurrent = false; };
  }, [user.role, reportPeriod]);
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
  const periodTitle = reportPeriod === "daily" ? "Daily report" : reportPeriod === "monthly" ? "Monthly report" : "Yearly report";
  const currentReport = reportResult?.period === reportPeriod ? reportResult.data : null;
  const reportError = reportResult?.period === reportPeriod ? reportResult.error : "";
  const reportLoading = reportResult?.period !== reportPeriod;
  const reportMax = Math.max(1, ...(currentReport?.designers.map((designer) => designer.logoCount) || []));

  return <>
    <PageHeader eyebrow={`Good to see you, ${user.name}`} title="Operations overview" description="Keep every stitch moving in the right direction." action={<Link href="/upload" className="button button-primary">＋ New design</Link>} />
    <div className="stat-grid">{stats.map((stat) => <div className="stat-card" key={stat.label}><div className={`stat-mark ${stat.tone}`}></div><span>{stat.label}</span><strong>{stat.value}</strong><small>Today</small></div>)}</div>
    <section className="completion-panel"><div><p className="eyebrow">Order completion</p><strong>{completed} of {visible.length} orders complete</strong></div><span>{completion}%</span><progress aria-label="Completed orders" max={visible.length || 1} value={completed} /></section>
    {user.role === "admin" && <section className="panel designer-report-panel">
      <div className="panel-heading"><div><p className="eyebrow">Designer output</p><h2>{periodTitle}</h2><p className="panel-subtitle">Logos received by the admin during this period.</p></div><div className="designer-report-total"><strong>{currentReport?.total ?? 0}</strong><span>logos received</span></div></div>
      <div className="designer-report-periods" role="group" aria-label="Designer report period">{(["daily", "monthly", "yearly"] as const).map((period) => <button key={period} type="button" className={reportPeriod === period ? "is-active" : ""} aria-pressed={reportPeriod === period} onClick={() => setReportPeriod(period)}>{period[0].toUpperCase() + period.slice(1)}</button>)}</div>
      {reportError ? <p className="form-error" role="alert">{reportError}</p> : reportLoading ? <p className="muted" role="status">Loading designer report...</p> : currentReport?.designers.length ? <div className="designer-report-list"><div className="designer-report-row designer-report-labels"><span>Designer</span><span>Logos received</span></div>{currentReport.designers.map((designer) => <div className="designer-report-row" key={designer.designerId}><strong>{designer.designerName}</strong><div className="designer-report-metric"><span>{designer.logoCount}</span><div className="designer-report-bar" role="progressbar" aria-label={`${designer.designerName} logos received`} aria-valuemin={0} aria-valuemax={reportMax} aria-valuenow={designer.logoCount}><span style={{ width: `${(designer.logoCount / reportMax) * 100}%` }} /></div></div></div>)}</div> : <p className="designer-report-empty">No designer logos were received during this period.</p>}
      <p className="designer-report-note">Counts are saved when designers submit outputs and remain available even if the files are deleted.</p>
    </section>}
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
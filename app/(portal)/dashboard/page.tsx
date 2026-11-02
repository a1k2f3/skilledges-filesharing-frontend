"use client";

import Link from "next/link";
import Chart from "chart.js/auto";
import { useEffect, useMemo, useRef, useState } from "react";
import { getLogoActivityReport, type LogoActivityReport } from "@/components/api";
import { usePortal } from "@/components/portal-context";
import { OrderTable, PageHeader } from "@/components/portal-ui";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultReportDates() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 13);
  return { start: toDateInputValue(start), end: toDateInputValue(end) };
}

export default function DashboardPage() {
  const { user, orders } = usePortal();
  const [reportDates, setReportDates] = useState(getDefaultReportDates);
  const [selectedReportDesigner, setSelectedReportDesigner] = useState("");
  const [reportResult, setReportResult] = useState<{ range: string; data?: LogoActivityReport; error?: string } | null>(null);
  const reportChartRef = useRef<HTMLCanvasElement>(null);
  const reportRange = `${reportDates.start}:${reportDates.end}`;
  const validReportRange = Boolean(reportDates.start && reportDates.end && reportDates.start <= reportDates.end);
  useEffect(() => {
    if (user.role !== "admin" && user.role !== "customer") return;
    if (!validReportRange) return;
    let isCurrent = true;
    void getLogoActivityReport(reportDates.start, reportDates.end)
      .then((data) => { if (isCurrent) setReportResult({ range: reportRange, data }); })
      .catch((error) => { if (isCurrent) setReportResult({ range: reportRange, error: error instanceof Error ? error.message : "Unable to load activity report." }); });
    return () => { isCurrent = false; };
  }, [user.role, reportDates.start, reportDates.end, reportRange, validReportRange]);
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
  const currentReport = reportResult?.range === reportRange ? reportResult.data : null;
  const reportError = validReportRange
    ? reportResult?.range === reportRange ? reportResult.error : ""
    : "Choose a valid date range.";
  const reportLoading = validReportRange && reportResult?.range !== reportRange;
  const reportRows = useMemo(() => (currentReport?.daily || []).map((day) => ({
    ...day,
    sent: user.role === "admin"
      ? selectedReportDesigner
        ? day.designers.find((designer) => designer.designerId === selectedReportDesigner)?.logoCount || 0
        : day.designerDeliveries
      : day.customerUploads,
    received: user.role === "admin" ? day.customerUploads : day.customerReceived
  })), [currentReport, selectedReportDesigner, user.role]);
  const reportTotals = useMemo(() => reportRows.reduce((totals, day) => ({
    sent: totals.sent + day.sent,
    received: totals.received + day.received
  }), { sent: 0, received: 0 }), [reportRows]);

  useEffect(() => {
    const canvas = reportChartRef.current;
    if (!canvas || !reportRows.length) return;

    const chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: reportRows.map((day) => new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })),
        datasets: [
          {
            label: user.role === "admin" ? "Designer logos sent" : "Your logos sent",
            data: reportRows.map((day) => day.sent),
            backgroundColor: "rgba(39, 100, 231, 0.82)",
            hoverBackgroundColor: "#1d4ed8",
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 28,
            categoryPercentage: 0.72,
            barPercentage: 0.86
          },
          {
            label: user.role === "admin" ? "Customer logos received" : "Designer logos received",
            data: reportRows.map((day) => day.received),
            backgroundColor: "rgba(25, 135, 84, 0.78)",
            hoverBackgroundColor: "#157347",
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 28,
            categoryPercentage: 0.72,
            barPercentage: 0.86
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        layout: { padding: { top: 8, right: 8 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#17212b",
            padding: 12,
            cornerRadius: 8,
            titleFont: { weight: "bold" },
            callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y ?? 0}` }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: "#71808f", maxRotation: 0, autoSkip: true, maxTicksLimit: 14, font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grace: "8%",
            border: { display: false, dash: [4, 4] },
            grid: { color: "#edf1f4" },
            ticks: { color: "#71808f", precision: 0, stepSize: 1, padding: 8, font: { size: 11 } }
          }
        }
      }
    });

    return () => chart.destroy();
  }, [reportRows, user.role]);

  return <>
    <PageHeader eyebrow={`Good to see you, ${user.name}`} title="Operations overview" description="Keep every stitch moving in the right direction." action={<Link href="/upload" className="button button-primary">＋ New design</Link>} />
    <div className="stat-grid">{stats.map((stat) => <div className="stat-card" key={stat.label}><div className={`stat-mark ${stat.tone}`}></div><span>{stat.label}</span><strong>{stat.value}</strong><small>Today</small></div>)}</div>
    <section className="completion-panel"><div><p className="eyebrow">Order completion</p><strong>{completed} of {visible.length} orders complete</strong></div><span>{completion}%</span><progress aria-label="Completed orders" max={visible.length || 1} value={completed} /></section>
    {(user.role === "admin" || user.role === "customer") && <section className="panel logo-activity-report">
      <div className="panel-heading"><div><p className="eyebrow">{user.role === "admin" ? "Designer and customer activity" : "Your design activity"}</p><h2>Daily logo report</h2><p className="panel-subtitle">{user.role === "admin" ? "Compare designer deliveries with customer uploads by date." : "See your submitted logos and designer deliveries by date."}</p></div></div>
      <div className="logo-report-filters">
        <label>From <input type="date" value={reportDates.start} max={reportDates.end || undefined} onChange={(event) => setReportDates((current) => ({ ...current, start: event.target.value }))} /></label>
        <label>To <input type="date" value={reportDates.end} min={reportDates.start || undefined} onChange={(event) => setReportDates((current) => ({ ...current, end: event.target.value }))} /></label>
        {user.role === "admin" && currentReport?.designers.length ? <label>Designer <select value={selectedReportDesigner} onChange={(event) => setSelectedReportDesigner(event.target.value)}><option value="">All designers</option>{currentReport.designers.map((designer) => <option key={designer.designerId} value={designer.designerId}>{designer.designerName}</option>)}</select></label> : null}
      </div>
      <div className="logo-report-legend"><span><i className="logo-report-swatch sent" />{user.role === "admin" ? "Designer logos sent" : "Your logos sent"}</span><span><i className="logo-report-swatch received" />{user.role === "admin" ? "Customer logos received" : "Designer logos received"}</span></div>
      {reportError ? <p className="form-error" role="alert">{reportError}</p> : reportLoading ? <p className="muted" role="status">Loading daily report...</p> : reportRows.length ? <div className="logo-report-chart"><canvas ref={reportChartRef} role="img" aria-label="Daily sent and received logo counts" /></div> : <p className="designer-report-empty">No logo activity in this date range.</p>}
      <p className="designer-report-note">{user.role === "admin" ? `${reportTotals.sent} designer logos sent · ${reportTotals.received} customer logos uploaded in this range.` : `${reportTotals.sent} logos uploaded · ${reportTotals.received} designer logos received in this range.`}</p>
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
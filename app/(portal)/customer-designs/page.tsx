"use client";

import Chart from "chart.js/auto";
import { useEffect, useMemo, useRef, useState } from "react";
import { bulkDeleteFiles, downloadFile, listFiles, type ApiFile } from "@/components/api";
import { FileImagePreview } from "@/components/file-image-preview";
import { usePortal } from "@/components/portal-context";
import { LoadingIndicator, PageHeader } from "@/components/portal-ui";

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

export default function CustomerDesignsPage() {
	const { user } = usePortal();
	const [files, setFiles] = useState<ApiFile[]>([]);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(user.role === "admin");
	const [downloadingFile, setDownloadingFile] = useState("");
	const [deletingCustomerFiles, setDeletingCustomerFiles] = useState(false);
	const [deletingCustomerId, setDeletingCustomerId] = useState("");
	const [deleteMessage, setDeleteMessage] = useState("");
	const [selectedCustomerId, setSelectedCustomerId] = useState("");
	const [reportDates, setReportDates] = useState(getDefaultReportDates);
	const reportChartRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (user.role !== "admin") return;
		void listFiles()
			.then((allFiles) => setFiles(allFiles.filter((file) => file.owner?.role === "user")))
			.catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load customer designs."))
			.finally(() => setLoading(false));
	}, [user.role]);

	const customerFolders = useMemo(() => {
		const folders = new Map<string, { customerName: string; username: string; files: ApiFile[] }>();
		for (const file of files) {
			const customerId = file.owner?._id || "unknown-customer";
			const folder = folders.get(customerId) || {
				customerName: file.owner?.name || "Unknown customer",
				username: file.owner?.username || "",
				files: []
			};
			folder.files.push(file);
			folders.set(customerId, folder);
		}
		return [...folders.entries()].sort((first, second) => first[1].customerName.localeCompare(second[1].customerName));
	}, [files]);

	const reportRows = useMemo(() => {
		const start = new Date(`${reportDates.start}T00:00:00`);
		const end = new Date(`${reportDates.end}T00:00:00`);
		if (!reportDates.start || !reportDates.end || start > end) return [];
		const dailyCounts = new Map<string, number>();
		for (const file of files) {
			if (file.owner?.role !== "user" || (selectedCustomerId && file.owner._id !== selectedCustomerId)) continue;
			const uploadDate = toDateInputValue(new Date(file.createdAt));
			if (uploadDate < reportDates.start || uploadDate > reportDates.end) continue;
			dailyCounts.set(uploadDate, (dailyCounts.get(uploadDate) || 0) + 1);
		}
		const rows: { date: string; count: number }[] = [];
		for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
			const date = toDateInputValue(day);
			rows.push({ date, count: dailyCounts.get(date) || 0 });
		}
		return rows;
	}, [files, reportDates.end, reportDates.start, selectedCustomerId]);

	useEffect(() => {
		const canvas = reportChartRef.current;
		if (!canvas || loading || error || !reportRows.length) return;
		const chart = new Chart(canvas, {
			type: "bar",
			data: {
				labels: reportRows.map((day) => new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })),
				datasets: [{
					label: "Customer designs sent",
					data: reportRows.map((day) => day.count),
					backgroundColor: "rgba(39, 100, 231, 0.82)",
					hoverBackgroundColor: "#1d4ed8",
					borderRadius: 6,
					borderSkipped: false,
					maxBarThickness: 32,
					categoryPercentage: 0.72,
					barPercentage: 0.86
				}]
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
						callbacks: { label: (context) => `Designs uploaded: ${context.parsed.y ?? 0}` }
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
	}, [error, loading, reportRows]);

	async function download(customerFile: ApiFile) {
		setDownloadingFile(customerFile._id);
		setError("");
		try {
			await downloadFile(customerFile._id, customerFile.originalName);
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : `Unable to download ${customerFile.originalName}.`);
		} finally {
			setDownloadingFile("");
		}
	}

	async function refreshCustomerFiles() {
		const allFiles = await listFiles();
		setFiles(allFiles.filter((file) => file.owner?.role === "user"));
	}

	async function deleteCustomerFolder(customerId: string, customerName: string, customerFiles: ApiFile[]) {
		if (!customerFiles.length || !window.confirm(`Delete all ${customerFiles.length} designs from ${customerName}'s folder? This cannot be undone.`)) return;
		setDeletingCustomerId(customerId);
		setDeleteMessage("");
		try {
			const result = await bulkDeleteFiles({ ownerId: customerId, deleteAll: true });
			await refreshCustomerFiles();
			setDeleteMessage(`${result.deletedCount} design${result.deletedCount === 1 ? "" : "s"} deleted from ${customerName}'s folder${result.failedCount ? `; ${result.failedCount} could not be removed` : ""}.`);
		} catch (requestError) {
			setDeleteMessage(requestError instanceof Error ? requestError.message : `Unable to delete designs from ${customerName}'s folder.`);
		} finally {
			setDeletingCustomerId("");
		}
	}

	async function deleteAllCustomerFiles() {
		const foldersToDelete = customerFolders.filter(([customerId, folder]) => customerId !== "unknown-customer" && folder.files.length > 0);
		const totalFiles = foldersToDelete.reduce((total, [, folder]) => total + folder.files.length, 0);
		if (!totalFiles || !window.confirm(`Delete all ${totalFiles} customer designs across ${foldersToDelete.length} folders? This cannot be undone.`)) return;
		setDeletingCustomerFiles(true);
		setDeleteMessage("");
		try {
			const results = await Promise.allSettled(foldersToDelete.map(async ([customerId]) => {
				const result = await bulkDeleteFiles({ ownerId: customerId, deleteAll: true });
				return result;
			}));
			await refreshCustomerFiles();
			const totals = results.reduce((summary, result, index) => {
				if (result.status === "fulfilled") {
					summary.deletedCount += result.value.deletedCount;
					summary.failedCount += result.value.failedCount;
				} else {
					summary.failedCount += foldersToDelete[index][1].files.length;
					summary.errors.push(result.reason instanceof Error ? result.reason.message : `Unable to delete ${foldersToDelete[index][1].customerName}'s designs.`);
				}
				return summary;
			}, { deletedCount: 0, failedCount: 0, errors: [] as string[] });
			setDeleteMessage(`${totals.deletedCount} designs deleted${totals.failedCount ? `; ${totals.failedCount} could not be removed` : ""}.${totals.errors.length ? ` ${totals.errors.join(" ")}` : ""}`);
		} catch (requestError) {
			setDeleteMessage(requestError instanceof Error ? requestError.message : "Unable to refresh customer designs after deletion.");
		} finally {
			setDeletingCustomerFiles(false);
		}
	}

	if (user.role !== "admin") {
		return <PageHeader eyebrow="Customer workspace" title="Customer designs" description="This page is only available to administrators." />;
	}

	return <>
		<PageHeader eyebrow="Customer artwork" title="Customer Designs" description="Browse customer-uploaded design files, grouped by customer." />
		{error && <p className="form-error" role="alert">{error}</p>}
		<section className="panel">
			<div className="panel-heading">
				<div><p className="eyebrow">Design library</p><h2>Customer folders</h2></div>
				<span className="team-count">{files.length} files · {customerFolders.length} customers</span>
			</div>
			<div className="file-bulk-actions customer-design-delete-actions">
				<button className="text-button danger-text" type="button" disabled={!files.length || loading || deletingCustomerFiles || Boolean(deletingCustomerId)} onClick={() => void deleteAllCustomerFiles()}>
					{deletingCustomerFiles ? "Deleting customer designs..." : `Delete all customer designs (${files.length})`}
				</button>
			</div>
			{deleteMessage && <p className={deleteMessage.includes("could not") || deleteMessage.startsWith("Unable") ? "form-error" : "form-success"} role="status">{deleteMessage}</p>}
			<div className="logo-report-filters customer-design-report-filters">
				<label>From <input type="date" value={reportDates.start} max={reportDates.end || undefined} onChange={(event) => setReportDates((current) => ({ ...current, start: event.target.value }))} /></label>
				<label>To <input type="date" value={reportDates.end} min={reportDates.start || undefined} onChange={(event) => setReportDates((current) => ({ ...current, end: event.target.value }))} /></label>
				<label>Customer
					<select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
						<option value="">All customers</option>
						{customerFolders.map(([customerId, folder]) => <option key={customerId} value={customerId}>{folder.customerName}</option>)}
					</select>
				</label>
				<strong className="customer-design-report-total">{reportRows.reduce((total, day) => total + day.count, 0)} designs uploaded</strong>
			</div>
			{reportDates.start && reportDates.end && reportDates.start <= reportDates.end && <div className="logo-report-chart"><canvas ref={reportChartRef} role="img" aria-label="Daily customer design uploads" /></div>}
			{loading ? <LoadingIndicator label="Loading customer designs..." /> : customerFolders.length ? (
				<div className="sender-folders">
					{customerFolders.map(([customerId, folder]) => (
						<details className="sender-folder" key={customerId} open>
							<summary>
								<strong>{folder.customerName}</strong>
								<span>{folder.username ? `@${folder.username} · ` : ""}{folder.files.length} {folder.files.length === 1 ? "design" : "designs"}</span>
							</summary>
							<div className="file-bulk-actions customer-design-folder-actions">
								<button className="text-button danger-text" type="button" disabled={!folder.files.length || deletingCustomerFiles || Boolean(deletingCustomerId)} onClick={() => void deleteCustomerFolder(customerId, folder.customerName, folder.files)}>
									{deletingCustomerId === customerId ? "Deleting folder..." : "Delete all designs in this folder"}
								</button>
							</div>
							<div className="file-list">
								{folder.files.map((customerFile) => (
									<div className="file-row" key={customerFile._id}>
										<div className="file-meta">
											<strong>{customerFile.originalName}</strong>
											<span>{customerFile.format || customerFile.mimeType} · {new Date(customerFile.createdAt).toLocaleString()}</span>
										</div>
										<div className="file-actions">
											<FileImagePreview fileId={customerFile._id} name={customerFile.originalName} mimeType={customerFile.mimeType} />
											<button className="button button-secondary" type="button" disabled={downloadingFile === customerFile._id} onClick={() => void download(customerFile)}>
												{downloadingFile === customerFile._id ? "Downloading..." : "Download file"}
											</button>
										</div>
									</div>
								))}
							</div>
						</details>
					))}
				</div>
			) : (
				<div className="empty-state"><strong>No customer designs yet</strong><p>Files uploaded by customers will appear here in customer folders.</p></div>
			)}
		</section>
	</>;
}

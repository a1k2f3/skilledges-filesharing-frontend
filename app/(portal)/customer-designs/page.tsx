"use client";

import { useEffect, useMemo, useState } from "react";
import { downloadFile, listFiles, type ApiFile } from "@/components/api";
import { usePortal } from "@/components/portal-context";
import { LoadingIndicator, PageHeader } from "@/components/portal-ui";

export default function CustomerDesignsPage() {
	const { user } = usePortal();
	const [files, setFiles] = useState<ApiFile[]>([]);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(user.role === "admin");
	const [downloadingFile, setDownloadingFile] = useState("");

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
			{loading ? <LoadingIndicator label="Loading customer designs..." /> : customerFolders.length ? (
				<div className="sender-folders">
					{customerFolders.map(([customerId, folder]) => (
						<details className="sender-folder" key={customerId} open>
							<summary>
								<strong>{folder.customerName}</strong>
								<span>{folder.username ? `@${folder.username} · ` : ""}{folder.files.length} {folder.files.length === 1 ? "design" : "designs"}</span>
							</summary>
							<div className="file-list">
								{folder.files.map((customerFile) => (
									<div className="file-row" key={customerFile._id}>
										<div className="file-meta">
											<strong>{customerFile.originalName}</strong>
											<span>{customerFile.format || customerFile.mimeType} · {new Date(customerFile.createdAt).toLocaleString()}</span>
										</div>
										<button className="button button-secondary" type="button" disabled={downloadingFile === customerFile._id} onClick={() => void download(customerFile)}>
											{downloadingFile === customerFile._id ? "Downloading..." : "Download file"}
										</button>
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

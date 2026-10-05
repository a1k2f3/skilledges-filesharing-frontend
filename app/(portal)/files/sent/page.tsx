"use client";

import { useEffect, useState } from "react";
import { downloadFile, listSentShares, type ApiFileShare } from "@/components/api";
import { FileImagePreview } from "@/components/file-image-preview";
import { PageHeader } from "@/components/portal-ui";
import { usePortal } from "@/components/portal-context";

export default function SentFilesPage() {
	const { user, orders } = usePortal();
	const [shares, setShares] = useState<ApiFileShare[]>([]);
	const [error, setError] = useState("");

	useEffect(() => {
		void listSentShares().then(setShares).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load sent files."));
	}, []);

	const orderFolders = user.role === "designer" ? orders.flatMap((order) => {
		const sourceFiles = (order.sourceFiles || []).filter((sourceFile) => sourceFile.deliverables?.length);
		const outputCount = sourceFiles.reduce((count, sourceFile) => count + (sourceFile.deliverables?.length || 0), 0);
		return outputCount ? [{ order, sourceFiles, outputCount }] : [];
	}) : [];
	const orderFileIds = new Set(orderFolders.flatMap(({ sourceFiles }) => sourceFiles.flatMap((sourceFile) => (sourceFile.deliverables || []).map((file) => file.fileKey))));
	const otherShares = shares.filter((share) => !orderFileIds.has(share.file._id));
	const sharesByFile = new Map<string, ApiFileShare[]>();
	for (const share of shares) {
		const existing = sharesByFile.get(share.file._id) || [];
		existing.push(share);
		sharesByFile.set(share.file._id, existing);
	}

	return <><PageHeader eyebrow="File library" title="Sent files" description="Order outputs are grouped with their matching source files." />
		{error && <p className="form-error">{error}</p>}
		<section className="panel"><div className="panel-heading"><div><p className="eyebrow">Designer deliveries</p><h2>Sent by order</h2></div><span className="team-count">{orderFolders.reduce((count, folder) => count + folder.outputCount, 0)} files</span></div><div className="sender-folders">{orderFolders.length ? orderFolders.map(({ order, sourceFiles, outputCount }) => {
			const receivedSources = sourceFiles.length;
			const expectedSources = order.sourceFiles?.length || 0;
			return <details className="sender-folder order-delivery-folder" key={order.id}><summary><strong>{order.name}</strong><span>{order.priority} priority · {receivedSources}/{expectedSources} source files · {outputCount} outputs</span></summary><div className="order-delivery-contents">{sourceFiles.map((sourceFile) => <div className="order-delivery-source" key={sourceFile.fileKey}><strong>For {sourceFile.name}</strong><div className="file-list">{sourceFile.deliverables?.map((file) => {
				const sentShares = sharesByFile.get(file.fileKey) || [];
				const sentTo = [...new Set(sentShares.map((share) => share.sharedWith?.name || "Admin"))];
				const mimeType = sentShares[0]?.file.mimeType;
				return <div className="file-row" key={file.fileKey}><div className="file-icon">↑</div><div className="file-meta"><strong>{file.name}</strong><span>To {sentTo.length ? sentTo.join(", ") : "admins"} · {order.id}</span></div><div className="file-actions"><FileImagePreview fileId={file.fileKey} name={file.name} mimeType={mimeType} /><button className="button button-secondary" type="button" onClick={() => void downloadFile(file.fileKey, file.name)}>Download file</button></div></div>;
			})}</div></div>)}</div></details>;
		}) : <div className="empty-state"><strong>No order files sent yet</strong><p>Files sent for review will appear here under their order and source file.</p></div>}</div></section>
		{otherShares.length > 0 && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Outgoing shares</p><h2>Other sent files</h2></div><span className="team-count">{otherShares.length} shares</span></div><div className="file-list">{otherShares.map((share) => <div className="file-row" key={share._id}><div className="file-icon">↑</div><div className="file-meta"><strong>{share.file.originalName}</strong><span>To {share.sharedWith?.name || "Unknown user"} · {new Date(share.createdAt).toLocaleDateString()}</span></div><div className="file-actions"><FileImagePreview fileId={share.file._id} name={share.file.originalName} mimeType={share.file.mimeType} /><button className="button button-secondary" type="button" onClick={() => void downloadFile(share.file._id, share.file.originalName)}>Download file</button></div></div>)}</div></section>}
	</>;
}

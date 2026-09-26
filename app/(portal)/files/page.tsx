"use client";

import { useEffect, useState } from "react";
import { downloadFile, listDesigners, listReceivedShares, shareFileWithUser, type ApiFileShare, type ApiUser } from "@/components/api";
import { getFileUrl } from "@/components/file-store";
import { usePortal } from "@/components/portal-context";
import { PageHeader } from "@/components/portal-ui";

function FileDownload({ fileKey, legacyUrl, name }: { fileKey?: string; legacyUrl?: string; name: string }) {
	const [url, setUrl] = useState(legacyUrl || "");
	const isApiFile = Boolean(fileKey && /^[a-f\d]{24}$/i.test(fileKey));

	useEffect(() => {
		let objectUrl = "";
		if (fileKey && !isApiFile) getFileUrl(fileKey).then((resolvedUrl) => { objectUrl = resolvedUrl; if (resolvedUrl) setUrl(resolvedUrl); });
		return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
	}, [fileKey, isApiFile]);

	if (isApiFile) return <button className="button button-secondary" type="button" onClick={() => void downloadFile(fileKey!, name)}>Download file</button>;
	return url ? <a className="button button-secondary" href={url} download={name}>Download</a> : <span className="muted">Preparing file...</span>;
}

export default function FilesPage() {
	const { user, files, orders } = usePortal();
	const [designers, setDesigners] = useState<ApiUser[]>([]);
	const [receivedShares, setReceivedShares] = useState<ApiFileShare[]>([]);
	const [selectedDesigners, setSelectedDesigners] = useState<Record<string, string>>({});
	const [sharingFile, setSharingFile] = useState("");
	const [shareMessages, setShareMessages] = useState<Record<string, string>>({});
	const [loadError, setLoadError] = useState("");
	const receivedFiles = user.role === "admin"
		? files.filter((file) => file.ownerId !== user.id && file.ownerRole !== "admin")
		: user.role === "customer" ? files : [];
	const assignedSourceFiles = user.role === "designer" ? orders.filter((order) => order.designer === user.name && (order.sourceFiles?.length || order.fileUrl)) : [];

	useEffect(() => {
		if (user.role === "admin") void listDesigners().then(setDesigners).catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to load designers."));
		if (user.role === "designer") void listReceivedShares().then(setReceivedShares).catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to load received files."));
	}, [user.role]);

	async function sendToDesigner(event: React.FormEvent<HTMLFormElement>, fileKey: string) {
		event.preventDefault();
		const designerId = selectedDesigners[fileKey];
		if (!designerId) return;
		setSharingFile(fileKey);
		setShareMessages((current) => ({ ...current, [fileKey]: "" }));
		try {
			await shareFileWithUser(fileKey, designerId);
			const designerName = designers.find((designer) => designer._id === designerId)?.name || "designer";
			setShareMessages((current) => ({ ...current, [fileKey]: `Shared with ${designerName}.` }));
		} catch (error) {
			setShareMessages((current) => ({ ...current, [fileKey]: error instanceof Error ? error.message : "Unable to share file." }));
		} finally {
			setSharingFile("");
		}
	}

	return <><PageHeader eyebrow="File library" title="Received files" description={user.role === "admin" ? "Files submitted by customers and designers." : "Files shared with you and files assigned to your work."} />
		{loadError && <p className="form-error">{loadError}</p>}
		{user.role === "designer" && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Shared by admin</p><h2>Received files</h2></div><span className="team-count">{receivedShares.length} files</span></div><div className="file-list">{receivedShares.length ? receivedShares.map((share) => <div className="file-row" key={share._id}><div className="file-icon">↓</div><div className="file-meta"><strong>{share.file.originalName}</strong><span>From {share.sharedBy?.name || "Admin"} · {new Date(share.createdAt).toLocaleDateString()}</span></div><FileDownload fileKey={share.file._id} name={share.file.originalName} /></div>) : <div className="empty-state"><strong>No files shared with you</strong><p>Files sent by admin will appear here.</p></div>}</div></section>}
		{user.role === "designer" && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Order handoff</p><h2>Assigned source files</h2></div><span className="team-count">{assignedSourceFiles.reduce((count, order) => count + (order.sourceFiles?.length || 1), 0)} files</span></div><div className="file-list">{assignedSourceFiles.length ? assignedSourceFiles.flatMap((order) => order.sourceFiles?.length ? order.sourceFiles.map((file) => <div className="file-row" key={`${order.id}-${file.fileKey}`}><div className="file-icon">↑</div><div className="file-meta"><strong>{file.name}</strong><span>{order.format} · {order.customer} · Order {order.id}</span></div><FileDownload fileKey={file.fileKey} name={file.name} /></div>) : [<div className="file-row" key={order.id}><div className="file-icon">↑</div><div className="file-meta"><strong>{order.downloadName || order.name}</strong><span>{order.format} · {order.customer} · Order {order.id}</span></div><FileDownload fileKey={order.fileKey} legacyUrl={order.fileUrl} name={order.downloadName || `${order.id}-${order.name}`} /></div>]) : <div className="empty-state"><strong>No source files assigned</strong><p>Files attached to your assigned orders will appear here.</p></div>}</div></section>}
		{(user.role === "admin" || user.role === "customer") && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Incoming uploads</p><h2>{user.role === "admin" ? "Files from users" : "Your uploaded files"}</h2></div><span className="team-count">{receivedFiles.length} files</span></div><div className="file-list">{receivedFiles.length ? receivedFiles.map((file) => <div className="file-row" key={file.fileKey || file.name}><div className="file-icon">↓</div><div className="file-meta"><strong>{file.name}</strong><span>{user.role === "admin" ? `From ${file.ownerName || "Unknown user"} · ` : ""}{file.format} · {new Date(file.date).toLocaleDateString()}</span></div>{user.role === "admin" && file.fileKey && <form className="file-share-control" onSubmit={(event) => void sendToDesigner(event, file.fileKey!)}><select aria-label={`Choose designer for ${file.name}`} required value={selectedDesigners[file.fileKey] || ""} onChange={(event) => setSelectedDesigners((current) => ({ ...current, [file.fileKey!]: event.target.value }))}><option value="">Share with designer</option>{designers.map((designer) => <option key={designer._id} value={designer._id}>{designer.name}</option>)}</select><button className="button button-primary" type="submit" disabled={sharingFile === file.fileKey || !designers.length}>{sharingFile === file.fileKey ? "Sharing..." : "Share"}</button>{shareMessages[file.fileKey] && <span className={shareMessages[file.fileKey].startsWith("Shared") ? "form-success" : "form-error"}>{shareMessages[file.fileKey]}</span>}</form>}{user.role !== "admin" && <FileDownload fileKey={file.fileKey} legacyUrl={file.fileUrl} name={file.name} />}</div>) : <div className="empty-state"><strong>No files received yet</strong><p>New uploads will appear here.</p></div>}</div></section>}
	</>;
}
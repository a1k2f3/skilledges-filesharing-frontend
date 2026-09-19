"use client";

import { useEffect, useState } from "react";
import { getFileUrl } from "@/components/file-store";
import { usePortal } from "@/components/portal-context";
import { PageHeader } from "@/components/portal-ui";

function FileDownload({ fileKey, legacyUrl, name }: { fileKey?: string; legacyUrl?: string; name: string }) {
	const [url, setUrl] = useState(legacyUrl || "");

	useEffect(() => {
		let objectUrl = "";
		if (fileKey) getFileUrl(fileKey).then((resolvedUrl) => { objectUrl = resolvedUrl; setUrl(resolvedUrl); });
		return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
	}, [fileKey]);

	return url ? <a className="button button-secondary" href={url} download={name}>Download ↓</a> : <span className="muted">Preparing file...</span>;
}

export default function FilesPage() {
	const { user, files, orders } = usePortal();
	const visible = user.role === "admin" ? files : files.filter((file) => user.role === "customer" ? file.customer === user.name : file.designer === user.name);
	const assignedSourceFiles = user.role === "designer" ? orders.filter((order) => order.designer === user.name && (order.sourceFiles?.length || order.fileUrl)) : [];

	return <><PageHeader eyebrow="File library" title="Production files" description="Download source artwork and completed digitized files." />
		{user.role === "designer" && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Admin handoff</p><h2>Assigned source files</h2></div><span className="team-count">{assignedSourceFiles.reduce((count, order) => count + (order.sourceFiles?.length || 1), 0)} files</span></div><div className="file-list">{assignedSourceFiles.length ? assignedSourceFiles.flatMap((order) => order.sourceFiles?.length ? order.sourceFiles.map((file) => <div className="file-row" key={`${order.id}-${file.fileKey}`}><div className="file-icon">↑</div><div className="file-meta"><strong>{file.name}</strong><span>{order.format} · {order.customer} · Order {order.id}</span></div><FileDownload fileKey={file.fileKey} name={file.name} /></div>) : [<div className="file-row" key={order.id}><div className="file-icon">↑</div><div className="file-meta"><strong>{order.downloadName || order.name}</strong><span>{order.format} · {order.customer} · Order {order.id}</span></div><FileDownload fileKey={order.fileKey} legacyUrl={order.fileUrl} name={order.downloadName || `${order.id}-${order.name}`} /></div>]) : <div className="empty-state"><span className="empty-icon">↑</span><strong>No source files assigned</strong><p>Files sent by admin will appear here.</p></div>}</div></section>}
		<section className="panel"><div className="panel-heading"><div><p className="eyebrow">Output library</p><h2>Completed files</h2></div></div><div className="file-list">{visible.length ? visible.map((file) => <div className="file-row" key={`${file.name}-${file.date}`}><div className="file-icon">▧</div><div className="file-meta"><strong>{file.name}</strong><span>{file.format} · {file.customer} · {file.date}</span></div><FileDownload fileKey={file.fileKey} legacyUrl={file.fileUrl} name={file.name} /></div>) : <div className="empty-state"><span className="empty-icon">▧</span><strong>No completed files yet</strong><p>Approved production files will be available here.</p></div>}</div></section></>;
}
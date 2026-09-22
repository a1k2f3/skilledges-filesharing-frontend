"use client";

import { useEffect, useState } from "react";
import { downloadFile, listTeams, shareFileWithTeam, type ApiTeam } from "@/components/api";
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
	return url ? <a className="button button-secondary" href={url} download={name}>Download ↓</a> : <span className="muted">Preparing file...</span>;
}

export default function FilesPage() {
	const { user, files, orders } = usePortal();
	const [teams, setTeams] = useState<ApiTeam[]>([]);
	const [selectedFile, setSelectedFile] = useState("");
	const [selectedTeam, setSelectedTeam] = useState("");
	const [sharing, setSharing] = useState(false);
	const [shareMessage, setShareMessage] = useState("");
	const visible = user.role === "admin" ? files : files.filter((file) => user.role === "customer" ? file.customer === user.name : file.designer === user.name);
	const assignedSourceFiles = user.role === "designer" ? orders.filter((order) => order.designer === user.name && (order.sourceFiles?.length || order.fileUrl)) : [];

	useEffect(() => {
		if (user.role === "admin") void listTeams().then(setTeams).catch((error) => setShareMessage(error instanceof Error ? error.message : "Unable to load teams."));
	}, [user.role]);

	async function sendToTeam(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedFile || !selectedTeam) return;
		setSharing(true);
		setShareMessage("");
		try {
			const result = await shareFileWithTeam(selectedFile, selectedTeam);
			setShareMessage(`${result.sharedCount} member${result.sharedCount === 1 ? "" : "s"} received the file${result.skippedCount ? `; ${result.skippedCount} already had access` : ""}.`);
		} catch (error) {
			setShareMessage(error instanceof Error ? error.message : "Unable to send file to team.");
		} finally {
			setSharing(false);
		}
	}

	return <><PageHeader eyebrow="File library" title="Production files" description="Download source artwork and completed digitized files." />
		{user.role === "admin" && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Team delivery</p><h2>Send a file to a team</h2></div></div><form className="form-grid" onSubmit={sendToTeam}><label>File<select required value={selectedFile} onChange={(event) => setSelectedFile(event.target.value)}><option value="">Select a file</option>{files.map((file) => <option key={file.fileKey || file.name} value={file.fileKey}>{file.name}</option>)}</select></label><label>Team<select required value={selectedTeam} onChange={(event) => setSelectedTeam(event.target.value)}><option value="">Select a team</option>{teams.map((team) => <option key={team._id} value={team._id}>{team.name} ({team.members.length} members)</option>)}</select></label><div className="form-footer"><button className="button button-primary" type="submit" disabled={sharing || !teams.length || !files.length}>{sharing ? "Sending..." : "Send to team"}</button></div>{shareMessage && <p className={shareMessage.includes("received") ? "form-success" : "form-error"}>{shareMessage}</p>}</form></section>}
		{user.role === "designer" && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Admin handoff</p><h2>Assigned source files</h2></div><span className="team-count">{assignedSourceFiles.reduce((count, order) => count + (order.sourceFiles?.length || 1), 0)} files</span></div><div className="file-list">{assignedSourceFiles.length ? assignedSourceFiles.flatMap((order) => order.sourceFiles?.length ? order.sourceFiles.map((file) => <div className="file-row" key={`${order.id}-${file.fileKey}`}><div className="file-icon">↑</div><div className="file-meta"><strong>{file.name}</strong><span>{order.format} · {order.customer} · Order {order.id}</span></div><FileDownload fileKey={file.fileKey} name={file.name} /></div>) : [<div className="file-row" key={order.id}><div className="file-icon">↑</div><div className="file-meta"><strong>{order.downloadName || order.name}</strong><span>{order.format} · {order.customer} · Order {order.id}</span></div><FileDownload fileKey={order.fileKey} legacyUrl={order.fileUrl} name={order.downloadName || `${order.id}-${order.name}`} /></div>]) : <div className="empty-state"><span className="empty-icon">↑</span><strong>No source files assigned</strong><p>Files sent by admin will appear here.</p></div>}</div></section>}
		<section className="panel"><div className="panel-heading"><div><p className="eyebrow">Output library</p><h2>Completed files</h2></div></div><div className="file-list">{visible.length ? visible.map((file) => <div className="file-row" key={`${file.name}-${file.date}`}><div className="file-icon">▧</div><div className="file-meta"><strong>{file.name}</strong><span>{file.format} · {file.customer} · {file.date}</span></div><FileDownload fileKey={file.fileKey} legacyUrl={file.fileUrl} name={file.name} /></div>) : <div className="empty-state"><span className="empty-icon">▧</span><strong>No completed files yet</strong><p>Approved production files will be available here.</p></div>}</div></section></>;
}
"use client";

import { useEffect, useState } from "react";
import { downloadFile, listSentShares, type ApiFileShare } from "@/components/api";
import { usePortal } from "@/components/portal-context";
import { PageHeader } from "@/components/portal-ui";

export default function SentFilesPage() {
	const { user, files } = usePortal();
	const [shares, setShares] = useState<ApiFileShare[]>([]);
	const [error, setError] = useState("");

	useEffect(() => {
		if (user.role === "admin") void listSentShares().then(setShares).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load sent files."));
	}, [user.role]);

	return <><PageHeader eyebrow="File library" title="Sent files" description={user.role === "admin" ? "Files you have shared directly with designers and other users." : "Files you have uploaded for admin review."} />
		{error && <p className="form-error">{error}</p>}
		{user.role === "admin" ? <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Shared files</p><h2>Sent to users</h2></div><span className="team-count">{shares.length} files</span></div><div className="file-list">{shares.length ? shares.map((share) => <div className="file-row" key={share._id}><div className="file-icon">↑</div><div className="file-meta"><strong>{share.file.originalName}</strong><span>To {share.sharedWith?.name || "Unknown user"} · {new Date(share.createdAt).toLocaleDateString()}</span></div><button className="button button-secondary" type="button" onClick={() => void downloadFile(share.file._id, share.file.originalName)}>Download file</button></div>) : <div className="empty-state"><strong>No files sent yet</strong><p>Files shared from Received files will appear here.</p></div>}</div></section> : <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Uploaded by you</p><h2>Files sent for review</h2></div><span className="team-count">{files.length} files</span></div><div className="file-list">{files.length ? files.map((file) => <div className="file-row" key={file.fileKey || file.name}><div className="file-icon">↑</div><div className="file-meta"><strong>{file.name}</strong><span>Sent for admin review · {new Date(file.date).toLocaleDateString()}</span></div>{file.fileKey && <button className="button button-secondary" type="button" onClick={() => void downloadFile(file.fileKey!, file.name)}>Download file</button>}</div>) : <div className="empty-state"><strong>No files sent yet</strong><p>Files you upload will appear here and in the admin received-files list.</p></div>}</div></section>}
	</>;
}

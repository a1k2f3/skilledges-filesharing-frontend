"use client";

import { useEffect, useState } from "react";
import { downloadFile, listSentShares, type ApiFileShare } from "@/components/api";
import { FileImagePreview } from "@/components/file-image-preview";
import { PageHeader } from "@/components/portal-ui";

export default function SentFilesPage() {
	const [shares, setShares] = useState<ApiFileShare[]>([]);
	const [error, setError] = useState("");

	useEffect(() => {
		void listSentShares().then(setShares).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load sent files."));
	}, []);

	return <><PageHeader eyebrow="File library" title="Sent files" description="Files you have sent to specific users." />
		{error && <p className="form-error">{error}</p>}
		<section className="panel"><div className="panel-heading"><div><p className="eyebrow">Outgoing shares</p><h2>Sent to users</h2></div><span className="team-count">{shares.length} files</span></div><div className="file-list">{shares.length ? shares.map((share) => <div className="file-row" key={share._id}><div className="file-icon">↑</div><div className="file-meta"><strong>{share.file.originalName}</strong><span>To {share.sharedWith?.name || "Unknown user"} · {new Date(share.createdAt).toLocaleDateString()}</span></div><div className="file-actions"><FileImagePreview fileId={share.file._id} name={share.file.originalName} mimeType={share.file.mimeType} /><button className="button button-secondary" type="button" onClick={() => void downloadFile(share.file._id, share.file.originalName)}>Download file</button></div></div>) : <div className="empty-state"><strong>No files sent yet</strong><p>Files you share directly will appear here with the recipient&apos;s name.</p></div>}</div></section>
	</>;
}

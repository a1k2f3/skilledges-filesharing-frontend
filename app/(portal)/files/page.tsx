"use client";

import { useEffect, useState } from "react";
import { bulkDeleteFiles, downloadFile, downloadFilesAsZip, listDesigners, shareFileWithUser, type ApiFileShare, type ApiUser } from "@/components/api";
import { getFileUrl } from "@/components/file-store";
import { FileImagePreview } from "@/components/file-image-preview";
import { usePortal, type CompletedFile } from "@/components/portal-context";
import { PageHeader } from "@/components/portal-ui";

function FileDownload({ fileKey, legacyUrl, name }: { fileKey?: string; legacyUrl?: string; name: string }) {
	const [url, setUrl] = useState(legacyUrl || "");
	const [downloadError, setDownloadError] = useState("");
	const [downloading, setDownloading] = useState(false);
	const isApiFile = Boolean(fileKey && /^[a-f\d]{24}$/i.test(fileKey));

	useEffect(() => {
		let objectUrl = "";
		if (fileKey && !isApiFile) getFileUrl(fileKey).then((resolvedUrl) => { objectUrl = resolvedUrl; if (resolvedUrl) setUrl(resolvedUrl); });
		return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
	}, [fileKey, isApiFile]);

	async function handleDownload() {
		if (!fileKey) return;
		setDownloading(true);
		setDownloadError("");
		try {
			await downloadFile(fileKey, name);
		} catch (error) {
			setDownloadError(error instanceof Error ? error.message : "Unable to download file.");
		} finally {
			setDownloading(false);
		}
	}

	return <div className="file-actions"><FileImagePreview fileId={isApiFile ? fileKey : undefined} name={name} legacyUrl={isApiFile ? undefined : url} />{isApiFile ? <button className="button button-secondary" type="button" disabled={downloading} onClick={() => void handleDownload()}>{downloading ? "Downloading..." : "Download file"}</button> : url ? <a className="button button-secondary" href={url} download={name}>Download</a> : <span className="muted">Preparing file...</span>}{downloadError && <span className="form-error" role="alert">{downloadError}</span>}</div>;
}

function ReceivedFileRow({ share, selected, onToggle }: { share: ApiFileShare; selected?: boolean; onToggle?: (shareId: string) => void }) {
	return <div className="file-row">{onToggle && <input type="checkbox" aria-label={`Select ${share.file.originalName}`} checked={Boolean(selected)} onChange={() => onToggle(share._id)} />}<div className="file-meta"><strong>{share.file.originalName}</strong><span>From {share.sharedBy?.name || "Unknown sender"} · {share.file.widthInches && share.file.heightInches ? `${share.file.widthInches} × ${share.file.heightInches} in${share.file.resolutionDpi ? ` @ ${share.file.resolutionDpi} DPI` : ""} · ` : ""}{new Date(share.createdAt).toLocaleString()}</span></div><FileDownload fileKey={share.file._id} name={share.file.originalName} /></div>;
}

export default function FilesPage() {
	const { user, files, receivedShares, refreshFiles } = usePortal();
	const [designers, setDesigners] = useState<ApiUser[]>([]);
	const [selectedDesigners, setSelectedDesigners] = useState<Record<string, string>>({});
	const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
	const [selectedReceivedShares, setSelectedReceivedShares] = useState<string[]>([]);
	const [deleteMessage, setDeleteMessage] = useState("");
	const [deletingFiles, setDeletingFiles] = useState(false);
	const [downloadMessage, setDownloadMessage] = useState("");
	const [downloadingFiles, setDownloadingFiles] = useState(false);
	const [sharingFile, setSharingFile] = useState("");
	const [shareMessages, setShareMessages] = useState<Record<string, string>>({});
	const [loadError, setLoadError] = useState("");
	const receivedFiles = user.role === "admin" || user.role === "customer" ? files : [];
	const uploadedFileFolders = Object.values(receivedFiles.reduce<Record<string, { name: string; files: CompletedFile[] }>>((folders, file) => {
		const senderId = file.ownerId || file.ownerName || "unknown-sender";
		const folder = folders[senderId] || { name: file.ownerName || "Unknown sender", files: [] };
		folder.files.push(file);
		folders[senderId] = folder;
		return folders;
	}, {}));
	const receivedFileFolders = Object.values(receivedShares.reduce<Record<string, { name: string; shares: ApiFileShare[] }>>((folders, share) => {
		const senderId = share.sharedBy?._id || "unknown-sender";
		const folder = folders[senderId] || { name: share.sharedBy?.name || "Unknown sender", shares: [] };
		folder.shares.push(share);
		folders[senderId] = folder;
		return folders;
	}, {}));

	useEffect(() => {
		if (user.role === "admin") void listDesigners().then(setDesigners).catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to load designers."));
		void refreshFiles().catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to refresh files."));
	}, [user.role, refreshFiles]);

	async function deleteSelectedFiles(deleteAll: boolean) {
		const count = deleteAll ? files.length : selectedFiles.length;
		if (!count || !window.confirm(deleteAll ? `Delete all ${count} uploaded files? This cannot be undone.` : `Delete ${count} selected file${count === 1 ? "" : "s"}? This cannot be undone.`)) return;
		setDeletingFiles(true);
		setDeleteMessage("");
		try {
			const result = await bulkDeleteFiles(deleteAll ? { deleteAll: true } : { fileIds: selectedFiles });
			setSelectedFiles([]);
			await refreshFiles();
			setDeleteMessage(`${result.deletedCount} file${result.deletedCount === 1 ? "" : "s"} deleted${result.failedCount ? `; ${result.failedCount} could not be removed` : ""}.`);
		} catch (error) {
			setDeleteMessage(error instanceof Error ? error.message : "Unable to delete files.");
		} finally {
			setDeletingFiles(false);
		}
	}

	async function downloadArchive(archiveFiles: { fileId: string; filename: string }[]) {
		const validFiles = archiveFiles.filter((file) => /^[a-f\d]{24}$/i.test(file.fileId));
		if (!validFiles.length) return;
		setDownloadingFiles(true);
		setDownloadMessage("");
		try {
			const date = new Date().toISOString().slice(0, 10);
			await downloadFilesAsZip(validFiles, `files-${date}.zip`);
			setDownloadMessage(`${validFiles.length} file${validFiles.length === 1 ? "" : "s"} added to the download.`);
		} catch (error) {
			setDownloadMessage(`Unable to download files: ${error instanceof Error ? error.message : "Unknown error"}`);
		} finally {
			setDownloadingFiles(false);
		}
	}

	function downloadUploadedFiles(fileIds: string[]) {
		const archiveFiles = receivedFiles.flatMap((file) => file.fileKey && fileIds.includes(file.fileKey) ? [{ fileId: file.fileKey, filename: file.name }] : []);
		return downloadArchive(archiveFiles);
	}

	function downloadSharedFiles(shareIds: string[]) {
		const archiveFiles = receivedShares.flatMap((share) => shareIds.includes(share._id) ? [{ fileId: share.file._id, filename: share.file.originalName }] : []);
		return downloadArchive(archiveFiles);
	}

	function toggleReceivedShare(shareId: string) {
		setSelectedReceivedShares((current) => current.includes(shareId) ? current.filter((id) => id !== shareId) : [...current, shareId]);
	}

	function toggleFile(fileKey: string) {
		setSelectedFiles((current) => current.includes(fileKey) ? current.filter((id) => id !== fileKey) : [...current, fileKey]);
	}

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

	function renderUploadedFile(file: CompletedFile) {
		return <div className="file-row" key={file.fileKey || file.name}>{user.role === "admin" && file.fileKey && <input type="checkbox" aria-label={`Select ${file.name}`} checked={selectedFiles.includes(file.fileKey)} onChange={() => toggleFile(file.fileKey!)} />}<div className="file-meta"><strong>{file.name}</strong><span>{user.role === "admin" ? `From ${file.ownerName || "Unknown sender"} · ` : ""}{file.format} · {new Date(file.date).toLocaleString()}</span></div>{user.role === "admin" && file.fileKey && <form className="file-share-control" onSubmit={(event) => void sendToDesigner(event, file.fileKey!)}><select aria-label={`Choose designer for ${file.name}`} required value={selectedDesigners[file.fileKey] || ""} onChange={(event) => setSelectedDesigners((current) => ({ ...current, [file.fileKey!]: event.target.value }))}><option value="">Share with designer</option>{designers.map((designer) => <option key={designer._id} value={designer._id}>{designer.name}</option>)}</select><button className="button button-primary" type="submit" disabled={sharingFile === file.fileKey || !designers.length}>{sharingFile === file.fileKey ? "Sharing..." : "Share"}</button>{shareMessages[file.fileKey] && <span className={shareMessages[file.fileKey].startsWith("Shared") ? "form-success" : "form-error"}>{shareMessages[file.fileKey]}</span>}</form>}<FileDownload fileKey={file.fileKey} legacyUrl={file.fileUrl} name={file.name} /></div>;
	}

	return <><PageHeader eyebrow="File library" title="Received files" description={user.role === "admin" ? "Files submitted by customers and designers." : "Files shared with you and files assigned to your work."} />
		{loadError && <p className="form-error">{loadError}</p>}
		<section className="panel"><div className="panel-heading"><div><p className="eyebrow">Shared with you</p><h2>Received files</h2></div><span className="team-count">{receivedShares.length} files</span></div>{receivedShares.length > 0 && <div className="file-bulk-actions"><label><input type="checkbox" checked={selectedReceivedShares.length === receivedShares.length} onChange={(event) => setSelectedReceivedShares(event.target.checked ? receivedShares.map((share) => share._id) : [])} /> Select all</label><button className="text-button" type="button" disabled={!selectedReceivedShares.length || downloadingFiles} onClick={() => void downloadSharedFiles(selectedReceivedShares)}>{downloadingFiles ? "Preparing ZIP..." : `Download selected (${selectedReceivedShares.length})`}</button><button className="text-button" type="button" disabled={downloadingFiles} onClick={() => void downloadSharedFiles(receivedShares.map((share) => share._id))}>{downloadingFiles ? "Preparing ZIP..." : "Download all files"}</button></div>}{downloadMessage && <p className={downloadMessage.startsWith("Unable") ? "form-error" : "form-success"}>{downloadMessage}</p>}<div className="sender-folders">{receivedShares.length ? user.role === "admin" ? receivedFileFolders.map((folder, index) => <details className="sender-folder" key={`${folder.name}-${index}`} open><summary><strong>{folder.name}</strong><span>{folder.shares.length} {folder.shares.length === 1 ? "file" : "files"}</span></summary><div className="file-list">{folder.shares.map((share) => <ReceivedFileRow key={share._id} share={share} selected={selectedReceivedShares.includes(share._id)} onToggle={toggleReceivedShare} />)}</div></details>) : receivedShares.map((share) => <ReceivedFileRow key={share._id} share={share} selected={selectedReceivedShares.includes(share._id)} onToggle={toggleReceivedShare} />) : <div className="empty-state"><strong>No files shared with you</strong><p>Files sent directly to your account will appear here.</p></div>}</div></section>
		{(user.role === "admin" || user.role === "customer") && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Incoming uploads</p><h2>{user.role === "admin" ? "All uploaded files" : "Your uploaded files"}</h2></div><span className="team-count">{receivedFiles.length} files</span></div>{user.role === "admin" && <div className="file-bulk-actions"><label><input type="checkbox" checked={Boolean(receivedFiles.length) && selectedFiles.length === receivedFiles.length} onChange={(event) => setSelectedFiles(event.target.checked ? receivedFiles.flatMap((file) => file.fileKey ? [file.fileKey] : []) : [])} /> Select all</label><button className="text-button" type="button" disabled={!selectedFiles.length || downloadingFiles} onClick={() => void downloadUploadedFiles(selectedFiles)}>{downloadingFiles ? "Preparing ZIP..." : `Download selected (${selectedFiles.length})`}</button><button className="text-button" type="button" disabled={!receivedFiles.length || downloadingFiles} onClick={() => void downloadUploadedFiles(receivedFiles.flatMap((file) => file.fileKey ? [file.fileKey] : []))}>{downloadingFiles ? "Preparing ZIP..." : "Download all files"}</button><button className="text-button danger-text" type="button" disabled={!selectedFiles.length || deletingFiles} onClick={() => void deleteSelectedFiles(false)}>Delete selected ({selectedFiles.length})</button><button className="text-button danger-text" type="button" disabled={!receivedFiles.length || deletingFiles} onClick={() => void deleteSelectedFiles(true)}>Delete all files</button></div>}{deleteMessage && <p className={deleteMessage.includes("could not") || deleteMessage.includes("Unable") ? "form-error" : "form-success"}>{deleteMessage}</p>}<div className="file-list">{receivedFiles.length ? user.role === "admin" ? uploadedFileFolders.map((folder, index) => <details className="sender-folder" key={`${folder.name}-${index}`} open><summary><strong>{folder.name}</strong><span>{folder.files.length} {folder.files.length === 1 ? "file" : "files"}</span></summary><div className="file-list">{folder.files.map(renderUploadedFile)}</div></details>) : receivedFiles.map(renderUploadedFile) : <div className="empty-state"><strong>No files received yet</strong><p>New uploads will appear here.</p></div>}</div></section>}
	</>;
}
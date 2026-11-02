"use client";

import { useEffect, useState } from "react";
import { bulkDeleteFiles, deleteReceivedShare, downloadFile, downloadFilesAsZip, listDesigners, listUsers, markReceivedSharesSeen, shareFileWithUser, type ApiFileShare, type ApiUser } from "@/components/api";
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

function ReceivedFileRow({ share, selected, onToggle, onDelete, deleting }: { share: ApiFileShare; selected?: boolean; onToggle?: (shareId: string) => void; onDelete?: (shareId: string) => void; deleting?: boolean }) {
	return <div className="file-row">{onToggle && <input type="checkbox" aria-label={`Select ${share.file.originalName}`} checked={Boolean(selected)} onChange={() => onToggle(share._id)} />}<div className="file-meta"><strong>{share.file.originalName}</strong><span>From {share.sharedBy?.name || "Unknown sender"} · {share.file.widthInches && share.file.heightInches ? `${share.file.widthInches} × ${share.file.heightInches} in${share.file.resolutionDpi ? ` @ ${share.file.resolutionDpi} DPI` : ""} · ` : ""}{new Date(share.createdAt).toLocaleString()}</span></div><div className="file-actions"><FileDownload fileKey={share.file._id} name={share.file.originalName} />{onDelete && <button className="text-button danger-text" type="button" disabled={deleting} onClick={() => onDelete(share._id)}>{deleting ? "Removing..." : "Delete"}</button>}</div></div>;
}

export default function FilesPage() {
	const { user, files, receivedShares, refreshFiles, refreshReceivedShares } = usePortal();
	const [designers, setDesigners] = useState<ApiUser[]>([]);
	const [customers, setCustomers] = useState<ApiUser[]>([]);
	const [selectedDesigners, setSelectedDesigners] = useState<Record<string, string>>({});
	const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
	const [selectedReceivedShares, setSelectedReceivedShares] = useState<string[]>([]);
	const [deleteMessage, setDeleteMessage] = useState("");
	const [receivedDeleteMessage, setReceivedDeleteMessage] = useState("");
	const [deletingReceivedShare, setDeletingReceivedShare] = useState("");
	const [deletingFiles, setDeletingFiles] = useState(false);
	const [downloadMessage, setDownloadMessage] = useState("");
	const [downloadingFiles, setDownloadingFiles] = useState(false);
	const [sharingFile, setSharingFile] = useState("");
	const [shareMessages, setShareMessages] = useState<Record<string, string>>({});
	const [loadError, setLoadError] = useState("");
	const receivedFiles = user.role === "admin"
		? files.filter((file) => file.ownerRole === "designer" || file.ownerRole === "user")
		: user.role === "customer" ? files : [];
	const uploadFolders: { ownerId?: string; name: string; files: CompletedFile[] }[] = user.role === "admin"
		? [...designers, ...customers].map((account) => ({
			ownerId: account._id,
			name: account.username || account.name,
			files: receivedFiles.filter((file) => file.ownerId === account._id)
		}))
		: [{ name: user.name, files: receivedFiles }];

	useEffect(() => {
		if (user.role === "admin") {
			void listDesigners(true).then(setDesigners).catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to load designers."));
			void listUsers("user", true).then(setCustomers).catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to load customers."));
		}
		void refreshFiles().catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to refresh files."));
	}, [user.role, refreshFiles]);

	useEffect(() => {
		const unseenShareIds = receivedShares.filter((share) => !share.seenAt).map((share) => share._id);
		if (!unseenShareIds.length) return;
		void markReceivedSharesSeen(unseenShareIds)
			.then(() => refreshReceivedShares())
			.catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to mark received files as seen."));
	}, [receivedShares, refreshReceivedShares]);

	async function deleteSelectedFiles(ownerId: string, ownerName: string, ownerFiles: CompletedFile[], fileIds: string[], deleteAll: boolean) {
		if (!ownerId) return;
		const deleteCount = deleteAll ? ownerFiles.length : fileIds.length;
		if (!deleteCount || !window.confirm(deleteAll ? `Delete all ${deleteCount} files belonging to ${ownerName}? This cannot be undone.` : `Delete ${deleteCount} selected file${deleteCount === 1 ? "" : "s"} belonging to ${ownerName}? This cannot be undone.`)) return;
		setDeletingFiles(true);
		setDeleteMessage("");
		try {
			const result = await bulkDeleteFiles(deleteAll ? { ownerId, deleteAll: true } : { ownerId, fileIds });
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

	async function removeReceivedFile(shareId: string) {
		const share = receivedShares.find((item) => item._id === shareId);
		if (!share || !window.confirm(`Remove "${share.file.originalName}" from your received files?`)) return;
		setDeletingReceivedShare(shareId);
		setReceivedDeleteMessage("");
		try {
			await deleteReceivedShare(shareId);
			setSelectedReceivedShares((current) => current.filter((id) => id !== shareId));
			await refreshReceivedShares();
			setReceivedDeleteMessage("File removed from your received list.");
		} catch (error) {
			setReceivedDeleteMessage(error instanceof Error ? error.message : "Unable to remove received file.");
		} finally {
			setDeletingReceivedShare("");
		}
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

	return <>
		<PageHeader eyebrow="File library" title="Received files" description="Browse shared files and uploads in one place." />
		{loadError && <p className="form-error">{loadError}</p>}
		<section className="panel">
			<div className="panel-heading">
				<div><p className="eyebrow">Your file library</p><h2>Received files</h2></div>
				<span className="team-count">{user.role === "admin" ? receivedFiles.length : receivedShares.length + receivedFiles.length} files</span>
			</div>

			{user.role !== "admin" && receivedShares.length > 0 && <section className="received-file-group">
				<div className="received-file-group-heading"><h3>Shared with you</h3><span>{receivedShares.length}</span></div>
				<div className="file-bulk-actions">
					<label><input type="checkbox" checked={selectedReceivedShares.length === receivedShares.length} onChange={(event) => setSelectedReceivedShares(event.target.checked ? receivedShares.map((share) => share._id) : [])} /> Select all</label>
					<button className="text-button" type="button" disabled={!selectedReceivedShares.length || downloadingFiles} onClick={() => void downloadSharedFiles(selectedReceivedShares)}>{downloadingFiles ? "Preparing ZIP..." : `Download selected (${selectedReceivedShares.length})`}</button>
					<button className="text-button" type="button" disabled={downloadingFiles} onClick={() => void downloadSharedFiles(receivedShares.map((share) => share._id))}>{downloadingFiles ? "Preparing ZIP..." : "Download all"}</button>
				</div>
				<div className="file-list">{receivedShares.map((share) => <ReceivedFileRow
					key={share._id}
					share={share}
					selected={selectedReceivedShares.includes(share._id)}
					onToggle={toggleReceivedShare}
					onDelete={user.role === "designer" ? removeReceivedFile : undefined}
					deleting={deletingReceivedShare === share._id}
				/>)}</div>
				{receivedDeleteMessage && <p className={receivedDeleteMessage.startsWith("Unable") ? "form-error" : "form-success"} role="status">{receivedDeleteMessage}</p>}
			</section>}

			{(user.role === "admin" || user.role === "customer") && <section className="received-file-group">
				<div className="received-file-group-heading">
					<h3>{user.role === "admin" ? "User uploads" : "Your uploads"}</h3>
					<span>{receivedFiles.length}</span>
				</div>
				{deleteMessage && <p className={deleteMessage.includes("could not") || deleteMessage.includes("Unable") ? "form-error" : "form-success"} role="status">{deleteMessage}</p>}
				{uploadFolders.length ? uploadFolders.map((folder) => {
					const folderFileIds = folder.files.flatMap((file) => file.fileKey ? [file.fileKey] : []);
					const selectedFolderFileIds = selectedFiles.filter((fileId) => folderFileIds.includes(fileId));
					return <details className="sender-folder received-upload-folder" key={folder.ownerId || folder.name} open>
						<summary><strong>{folder.name}</strong><span>{folder.files.length} {folder.files.length === 1 ? "file" : "files"}</span></summary>
						{user.role === "admin" && folder.ownerId && <div className="file-bulk-actions">
							<label><input type="checkbox" checked={Boolean(folderFileIds.length) && selectedFolderFileIds.length === folderFileIds.length} onChange={(event) => setSelectedFiles((current) => event.target.checked ? [...new Set([...current, ...folderFileIds])] : current.filter((fileId) => !folderFileIds.includes(fileId)))} /> Select all</label>
							<button className="text-button" type="button" disabled={!selectedFolderFileIds.length || downloadingFiles} onClick={() => void downloadUploadedFiles(selectedFolderFileIds)}>{downloadingFiles ? "Preparing ZIP..." : `Download selected (${selectedFolderFileIds.length})`}</button>
							<button className="text-button" type="button" disabled={!folderFileIds.length || downloadingFiles} onClick={() => void downloadUploadedFiles(folderFileIds)}>{downloadingFiles ? "Preparing ZIP..." : "Download all"}</button>
							<button className="text-button danger-text" type="button" disabled={!selectedFolderFileIds.length || deletingFiles} onClick={() => void deleteSelectedFiles(folder.ownerId!, folder.name, folder.files, selectedFolderFileIds, false)}>Delete selected ({selectedFolderFileIds.length})</button>
							<button className="text-button danger-text" type="button" aria-label={`Delete all files in ${folder.name}'s folder`} disabled={!folder.files.length || deletingFiles} onClick={() => void deleteSelectedFiles(folder.ownerId!, folder.name, folder.files, [], true)}>Delete all files in this folder</button>
						</div>}
						<div className="file-list">{folder.files.map(renderUploadedFile)}</div>
					</details>;
				}) : <div className="empty-state"><strong>{user.role === "admin" ? "No designer folders found" : "No uploads found"}</strong></div>}
			</section>}
			{receivedShares.length === 0 && receivedFiles.length === 0 && user.role === "designer" && <div className="empty-state"><strong>No received files yet</strong><p>Files shared with you will appear here.</p></div>}
		</section>
		{downloadMessage && <p className={downloadMessage.startsWith("Unable") ? "form-error" : "form-success"} role="status">{downloadMessage}</p>}
	</>;
}
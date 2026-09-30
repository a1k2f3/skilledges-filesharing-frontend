"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getFilePreviewUrl } from "./api";

const imageExtension = /\.(avif|bmp|gif|jpe?g|png|svg|tiff?|webp)$/i;

export function FileImagePreview({ fileId, name, mimeType, legacyUrl }: {
	fileId?: string;
	name: string;
	mimeType?: string;
	legacyUrl?: string;
}) {
	const [preview, setPreview] = useState<{ key: string; url: string } | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [previewError, setPreviewError] = useState<{ key: string; message: string } | null>(null);
	const isImage = mimeType?.startsWith("image/") || imageExtension.test(name);
	const previewKey = fileId || legacyUrl || name;
	const previewUrl = preview?.key === previewKey ? preview.url : "";
	const error = previewError?.key === previewKey ? previewError.message : "";

	useEffect(() => {
		if (!isImage) return;
		let cancelled = false;
		let loadedUrl = "";
		const loadPreview = async () => {
			try {
				const url = legacyUrl || (fileId ? await getFilePreviewUrl(fileId) : "");
				if (!url) throw new Error("Preview is unavailable for this file");
				loadedUrl = url;
				if (cancelled) {
					if (url.startsWith("blob:")) URL.revokeObjectURL(url);
					return;
				}
				setPreview({ key: previewKey, url });
			} catch (previewError) {
				if (!cancelled) setPreviewError({ key: previewKey, message: previewError instanceof Error ? previewError.message : "Unable to preview image." });
			}
		};
		void loadPreview();
		return () => {
			cancelled = true;
			if (loadedUrl.startsWith("blob:")) URL.revokeObjectURL(loadedUrl);
		};
	}, [fileId, isImage, legacyUrl, previewKey]);

	if (!isImage) return <div className="file-icon">↓</div>;

	async function openPreview() {
		if (previewUrl) {
			setIsOpen(true);
			return;
		}
		try {
			const url = legacyUrl || (fileId ? await getFilePreviewUrl(fileId) : "");
			if (!url) throw new Error("Preview is unavailable for this file");
			setPreview({ key: previewKey, url });
			setIsOpen(true);
		} catch (previewError) {
			setPreviewError({ key: previewKey, message: previewError instanceof Error ? previewError.message : "Unable to preview image." });
		}
	}

	return <>
		<button className="preview-thumbnail" type="button" onClick={() => void openPreview()} disabled={!previewUrl} aria-label={`Preview ${name}`} title={error || `Preview ${name}`}>
			{previewUrl ? <Image src={previewUrl} alt={name} width={160} height={120} unoptimized /> : <span>{error ? "!" : "…"}</span>}
		</button>
		{error && <span className="form-error preview-error">{error}</span>}
		{isOpen && <div className="file-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
			<section className="file-preview-dialog" role="dialog" aria-modal="true" aria-label={`Image preview: ${name}`}>
				<div className="file-preview-heading"><strong>{name}</strong><button className="text-button" type="button" onClick={() => setIsOpen(false)} aria-label="Close image preview">Close</button></div>
				<Image src={previewUrl} alt={name} width={1600} height={1200} unoptimized />
			</section>
		</div>}
	</>;
}
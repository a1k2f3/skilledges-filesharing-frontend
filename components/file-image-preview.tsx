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
	const [previewUrl, setPreviewUrl] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [error, setError] = useState("");
	const isImage = mimeType?.startsWith("image/") || imageExtension.test(name);

	useEffect(() => () => {
		if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
	}, [previewUrl]);

	if (!isImage) return null;

	async function openPreview() {
		setError("");
		if (previewUrl) {
			setIsOpen(true);
			return;
		}
		try {
			const url = legacyUrl || (fileId ? await getFilePreviewUrl(fileId) : "");
			if (!url) throw new Error("Preview is unavailable for this file");
			setPreviewUrl(url);
			setIsOpen(true);
		} catch (previewError) {
			setError(previewError instanceof Error ? previewError.message : "Unable to preview image.");
		}
	}

	return <>
		<button className="text-button preview-trigger" type="button" onClick={() => void openPreview()}>Preview image</button>
		{error && <span className="form-error preview-error">{error}</span>}
		{isOpen && <div className="file-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
			<section className="file-preview-dialog" role="dialog" aria-modal="true" aria-label={`Image preview: ${name}`}>
				<div className="file-preview-heading"><strong>{name}</strong><button className="text-button" type="button" onClick={() => setIsOpen(false)} aria-label="Close image preview">Close</button></div>
				<Image src={previewUrl} alt={name} width={1600} height={1200} unoptimized />
			</section>
		</div>}
	</>;
}
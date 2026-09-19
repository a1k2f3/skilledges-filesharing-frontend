"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveFile } from "@/components/file-store";
import { usePortal, type Order } from "@/components/portal-context";
import { PageHeader } from "@/components/portal-ui";

export default function UploadPage() {
  const { user, addOrder } = usePortal(); const router = useRouter();
  const [customer, setCustomer] = useState(user.role === "customer" ? user.name : "Wilcom"); const [name, setName] = useState(""); const [format, setFormat] = useState("DST"); const [notes, setNotes] = useState(""); const [files, setFiles] = useState<File[]>([]); const [error, setError] = useState("");
  async function submit() {
    if (!name.trim()) { setError("Add a design name before sending the order."); return; }
    const sourceFiles = await Promise.all(files.map(async (file) => ({ fileKey: await saveFile(file), name: file.name })));
    const order: Order = { id: `SE-${Date.now().toString().slice(-6)}`, customer, name: name.trim(), format, status: "Pending", designer: "", date: new Date().toLocaleString(), notes, fileUrl: "", fileKey: sourceFiles[0]?.fileKey, downloadName: files[0]?.name || "", sourceFiles, sentToCustomer: "" };
    addOrder(order); router.push("/orders");
  }
  return <><PageHeader eyebrow="Production intake" title="Upload a new design" description="Send artwork and stitch requirements to the digitizing team." /><section className="panel form-panel"><div className="form-grid"><div>{user.role === "admin" && <label>Customer<select value={customer} onChange={(event) => setCustomer(event.target.value)}><option>Wilcom</option><option>WingsXP</option></select></label>}<label>Design name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Back logo - 10 inch" /></label><label>Required format<select value={format} onChange={(event) => setFormat(event.target.value)}><option>DST</option><option>EMB</option><option>NGS</option><option>JPG + DST + EMB</option></select></label></div><div><label>Source artwork</label><label className="dropzone"><span className="upload-icon">↑</span><strong>{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : "Choose files to upload"}</strong><small>{files.length ? files.map((file) => file.name).join(", ") : "JPG, PNG, PDF, DST, EMB or NGS"}</small><input type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.dst,.emb,.ngs" onChange={(event) => setFiles(Array.from(event.target.files || []))} /></label><label>Production notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Stitch density, dimensions, thread colors..." /></label></div></div>{error && <p className="form-error">{error}</p>}<div className="form-footer"><span className="muted">Orders are visible to the assigned production team.</span><button className="button button-primary" onClick={submit}>Send order <span>→</span></button></div></section></>;
}
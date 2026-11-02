"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePortal, type Order } from "@/components/portal-context";
import { shareFileWithAdmins, uploadFiles } from "@/components/api";
import { PageHeader } from "@/components/portal-ui";

export default function UploadPage() {
  const { user, addOrder, refreshFiles } = usePortal();
  const router = useRouter();
  const [customer, setCustomer] = useState(user.role === "customer" ? user.name : "Wilcom");
  const [software, setSoftware] = useState<"Wilcom" | "WingsXP">("Wilcom");
  const [name, setName] = useState("");
  const format = "DST";
  const [priority, setPriority] = useState<Order["priority"]>("Normal");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    if (!name.trim()) { setError("Add a design name before sending the order."); return; }
    setSubmitting(true);
    try {
      const uploadedFiles = files.length ? await uploadFiles(files) : [];
      if (user.role !== "admin") await Promise.all(uploadedFiles.map((file) => shareFileWithAdmins(file._id)));
      if (uploadedFiles.length) await refreshFiles();
      const sourceFiles = uploadedFiles.map((file) => ({ fileKey: file._id, name: file.originalName }));
      const order: Order = {
        id: `SE-${Date.now().toString().slice(-6)}`,
        customer,
        software,
        name: name.trim(),
        format,
        status: "Pending",
        priority,
        designer: "",
        date: new Date().toLocaleString(),
        notes,
        productionNotes: notes,
        fileUrl: "",
        fileKey: sourceFiles[0]?.fileKey,
        downloadName: files[0]?.name || "",
        sourceFiles,
        sentToCustomer: ""
      };
      await addOrder(order);
      router.push("/orders");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to upload files.");
    } finally {
      setSubmitting(false);
    }
  }

  return <>
    <PageHeader eyebrow="Production intake" title="Upload a new design" description="Send artwork and stitch requirements to the digitizing team." />
    <section className="panel form-panel">
      <div className="form-grid">
        <div>
          {user.role === "admin" ? <label>Software<select value={customer} onChange={(event) => { setCustomer(event.target.value); setSoftware(event.target.value as "Wilcom" | "WingsXP"); }}><option>Wilcom</option><option>WingsXP</option></select></label> : user.role === "customer" && <label>Software<select value={software} onChange={(event) => setSoftware(event.target.value as "Wilcom" | "WingsXP")}><option value="Wilcom">Wilcom</option><option value="WingsXP">WingsXP</option></select></label>}
          <label>Design name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Back logo - 10 inch" /></label>
          <label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as Order["priority"])}><option>Normal</option><option>Urgent</option></select></label>
        </div>
        <div>
          <label>Source artwork</label>
          <label className="dropzone"><span className="upload-icon">↑</span><strong>{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : "Choose files to upload"}</strong><small>{files.length ? files.map((file) => file.name).join(", ") : "JPG, PNG, PDF, DST, EMB, NGS, EXP, PES, JEF, VP3 or HUS"}</small><input type="file" multiple accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.svg,.pdf,.dst,.emb,.exp,.pes,.jef,.vp3,.xxx,.hus,.ngs" onChange={(event) => setFiles(Array.from(event.target.files || []))} /></label>
          <label>Production notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Stitch density, thread colors, placement..." /></label>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-footer"><span className="muted">Orders are visible to the assigned production team.</span><button className="button button-primary" disabled={submitting} onClick={() => void submit()}>{submitting ? <><span className="loading-spinner" aria-hidden="true" />Sending order...</> : <>Send order <span>→</span></>}</button></div>
    </section>
  </>;
}
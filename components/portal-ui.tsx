"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FileImagePreview } from "./file-image-preview";
import { downloadFilesAsZip, listDesigners, shareFileWithAdmins, shareFileWithUser, uploadFiles, type ApiUser } from "./api";
import { usePortal, type Order } from "./portal-context";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>;
}

export function LoadingIndicator({ label }: { label: string }) {
  return <div className="loading-indicator" role="status" aria-live="polite"><span className="loading-spinner" aria-hidden="true" />{label}</div>;
}

export function StatusBadge({ status }: { status: string }) { return <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>; }

function SelectedFilePreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const isImage = file.type.startsWith("image/") || /\.(avif|bmp|gif|jpe?g|png|svg|tiff?|webp)$/i.test(file.name);
  const fileType = file.name.split(".").pop()?.toUpperCase() || "FILE";

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  function openPreview() {
    if (!isImage) return;
    if (!previewUrl) setPreviewUrl(URL.createObjectURL(file));
    setIsOpen(true);
  }

  return <>
    <div className="designer-output-file">
      {isImage ? <button className="preview-thumbnail" type="button" onClick={openPreview} aria-label={`Preview ${file.name}`} title={`Preview ${file.name}`}><span>{fileType}</span></button> : <span className="designer-file-type" aria-hidden="true">{fileType}</span>}
      <span title={file.name}>{file.name}</span>
    </div>
    {isOpen && previewUrl && <div className="file-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
      <section className="file-preview-dialog" role="dialog" aria-modal="true" aria-label={`Image preview: ${file.name}`}>
        <div className="file-preview-heading"><strong>{file.name}</strong><button className="text-button" type="button" onClick={() => setIsOpen(false)} aria-label="Close image preview">Close</button></div>
        <Image src={previewUrl} alt={file.name} width={1600} height={1200} unoptimized />
      </section>
    </div>}
  </>;
}

export function OrderTable({ orders, compact = false }: { orders: Order[]; compact?: boolean }) {
  const { user, updateOrder, assignOrder, attachOrderDeliverables, removeOrder } = usePortal();
  const [uploads, setUploads] = useState<Record<string, File[]>>({});
  const [pendingAssignments, setPendingAssignments] = useState<Record<string, string>>({});
  const [rowMessages, setRowMessages] = useState<Record<string, string>>({});
  const [busyOrder, setBusyOrder] = useState("");
  const [downloadingOrder, setDownloadingOrder] = useState("");
  const [designers, setDesigners] = useState<ApiUser[]>([]);
  useEffect(() => {
    if (user.role !== "admin") return;
    void listDesigners().then(setDesigners).catch(() => setDesigners([]));
  }, [user.role]);
  if (!orders.length) return <div className="empty-state"><span className="empty-icon">∅</span><strong>No orders here yet</strong><p>New design requests will appear in this workspace.</p><Link href="/upload" className="button button-secondary">Upload a design</Link></div>;
  async function sendSourceFiles(order: Order, sources: NonNullable<Order["sourceFiles"]>) {
    const pending = sources.flatMap((sourceFile) => {
      const uploadKey = `${order.id}:${sourceFile.fileKey}`;
      const files = uploads[uploadKey] || [];
      return files.length ? [{ sourceFile, uploadKey, files }] : [];
    });
    if (!pending.length) return;
    const messageKey = pending.length === 1 ? pending[0].uploadKey : `${order.id}:all`;
    const busyKey = order.id;
    setBusyOrder(busyKey);
    setRowMessages((current) => ({ ...current, [messageKey]: "" }));
    try {
      const uploadedFiles = await uploadFiles(pending.flatMap((item) => item.files));
      await Promise.all(uploadedFiles.map((file) => shareFileWithAdmins(file._id)));
      let fileIndex = 0;
      for (const item of pending) {
        const sourceDeliverables = uploadedFiles.slice(fileIndex, fileIndex + item.files.length);
        fileIndex += item.files.length;
        await attachOrderDeliverables(order.id, item.sourceFile.fileKey, sourceDeliverables.map((file) => ({ fileKey: file._id, name: file.originalName })));
      }
      setUploads((current) => {
        const next = { ...current };
        pending.forEach((item) => delete next[item.uploadKey]);
        return next;
      });
      setRowMessages((current) => ({ ...current, [messageKey]: `${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"} sent to admin for ${pending.length === 1 ? pending[0].sourceFile.name : `${pending.length} source files`}.` }));
    } catch (error) {
      setRowMessages((current) => ({ ...current, [messageKey]: error instanceof Error ? error.message : "Unable to send files to admin." }));
    } finally {
      setBusyOrder("");
    }
  }

  async function completeOrder(order: Order, sourceFile: NonNullable<Order["sourceFiles"]>[number]) {
    return sendSourceFiles(order, [sourceFile]);
  }
  async function downloadOrderFiles(order: Order) {
    const files = (order.sourceFiles || []).flatMap((sourceFile) => [
      { fileId: sourceFile.fileKey, filename: sourceFile.name },
      ...(sourceFile.deliverables || []).map((file) => ({ fileId: file.fileKey, filename: file.name }))
    ]);
    const uniqueFiles = [...new Map(files.map((file) => [file.fileId, file])).values()];
    if (!uniqueFiles.length) return;
    setDownloadingOrder(order.id);
    setRowMessages((current) => ({ ...current, [`${order.id}:download`]: "" }));
    try {
      await downloadFilesAsZip(uniqueFiles, `${order.id}-files.zip`);
    } catch (error) {
      setRowMessages((current) => ({ ...current, [`${order.id}:download`]: error instanceof Error ? error.message : "Unable to download order files." }));
    } finally {
      setDownloadingOrder("");
    }
  }
  async function assignToDesigner(order: Order) {
    const designer = pendingAssignments[order.id] || order.designer;
    if (!designer) return;
    const recipient = designers.find((item) => item.name === designer);
    if (!recipient) return;
    setBusyOrder(order.id);
    setRowMessages((current) => ({ ...current, [order.id]: "" }));
    try {
      const fileIds = [...new Set([...(order.sourceFiles || []).map((file) => file.fileKey), order.fileKey || ""])]
        .filter((fileId) => /^[a-f\d]{24}$/i.test(fileId));
      await Promise.all(fileIds.map((fileId) => shareFileWithUser(fileId, recipient._id)));
      await assignOrder(order.id, recipient._id);
      setPendingAssignments((current) => ({ ...current, [order.id]: "" }));
      setRowMessages((current) => ({ ...current, [order.id]: `Source files sent to ${designer}.` }));
    } catch (error) {
      setRowMessages((current) => ({ ...current, [order.id]: error instanceof Error ? error.message : "Unable to assign source files." }));
    } finally {
      setBusyOrder("");
    }
  }
  function renderDesignerFiles(order: Order) {
    const sourceFiles = order.sourceFiles || [];
    if (!sourceFiles.length) return <span className="muted">No source files to match.</span>;
    const selectedCount = sourceFiles.reduce((count, sourceFile) => count + (uploads[`${order.id}:${sourceFile.fileKey}`]?.length || 0), 0);
    return <div className="designer-delivery-list">
      <div className="designer-delivery-bulk"><span>{selectedCount ? `${selectedCount} output${selectedCount === 1 ? "" : "s"} ready across this order` : "Choose outputs for each source file"}</span><button className="designer-send-button" type="button" disabled={busyOrder === order.id || !selectedCount} onClick={() => void sendSourceFiles(order, sourceFiles)}>{busyOrder === order.id ? "Sending all..." : `Send all${selectedCount ? ` (${selectedCount})` : ""} to admin`}</button></div>
      {sourceFiles.map((sourceFile) => {
      const uploadKey = `${order.id}:${sourceFile.fileKey}`;
      const selectedFiles = uploads[uploadKey] || [];
      const sending = busyOrder === order.id;
      const fileType = sourceFile.name.split(".").pop()?.toUpperCase() || "FILE";
      return <div className="designer-delivery-item" key={sourceFile.fileKey}>
        <div className="designer-delivery-heading">
          <div className="designer-source-preview"><FileImagePreview fileId={sourceFile.fileKey} name={sourceFile.name} /><span className="designer-file-type designer-file-type-label" aria-hidden="true">{fileType}</span></div>
          <div className="designer-source-meta"><span>Source file</span><strong title={sourceFile.name}>{sourceFile.name}</strong></div>
          <span className={`designer-delivery-state${sourceFile.deliverables?.length ? " is-sent" : ""}`}>{sourceFile.deliverables?.length ? `${sourceFile.deliverables.length} sent` : "Waiting"}</span>
        </div>
        {sourceFile.deliverables?.length ? <div className="designer-sent-files">{sourceFile.deliverables.map((file) => <div className="designer-sent-file" key={file.fileKey}><span aria-hidden="true">✓</span><FileImagePreview fileId={file.fileKey} name={file.name} /><strong title={file.name}>{file.name}</strong></div>)}</div> : null}
        <div className="designer-delivery-actions">
          <label className="designer-file-picker"><span aria-hidden="true">＋</span> Choose output files<input key={`${uploadKey}-${sourceFile.deliverables?.length || 0}`} type="file" multiple onChange={(event) => setUploads((current) => ({ ...current, [uploadKey]: Array.from(event.target.files || []) }))} /></label>
          <button className="designer-send-button" type="button" disabled={sending || !selectedFiles.length} onClick={() => void completeOrder(order, sourceFile)}>{sending ? "Sending..." : selectedFiles.length ? `Send ${selectedFiles.length} to admin` : "Send to admin"}</button>
        </div>
        {selectedFiles.length > 0 && <div className="designer-output-previews" aria-label="Selected output files">{selectedFiles.map((file, index) => <SelectedFilePreview key={`${file.name}:${file.size}:${index}`} file={file} />)}</div>}
        {rowMessages[uploadKey] && <small className={rowMessages[uploadKey].includes("sent to admin") ? "form-success" : "form-error"}>{rowMessages[uploadKey]}</small>}
      </div>;
    })}
      {rowMessages[`${order.id}:all`] && <small className={rowMessages[`${order.id}:all`].includes("sent to admin") ? "form-success" : "form-error"}>{rowMessages[`${order.id}:all`]}</small>}
    </div>;
  }
  if (user.role === "designer" && !compact) {
    return <div className="designer-order-list">{orders.map((order) => {
      const sourceFiles = order.sourceFiles || [];
      const sentSources = sourceFiles.filter((sourceFile) => sourceFile.deliverables?.length).length;
      const sentOutputs = sourceFiles.reduce((count, sourceFile) => count + (sourceFile.deliverables?.length || 0), 0);
      const orderFileCount = sourceFiles.length + sentOutputs;
      const priority = order.priority.toLowerCase();
      return <details className="designer-order" key={order.id} open>
        <summary className="designer-order-header">
          <div className="designer-order-title"><span>{order.id} · {order.customer}</span><h2>{order.name}</h2><small>{[order.software, order.format, order.notes].filter(Boolean).join(" · ")}</small></div>
          <div className="designer-order-badges"><span className={`designer-priority priority-${priority}`}>{order.priority} priority</span><StatusBadge status={order.status} /><span className="designer-order-count">{sourceFiles.length} source {sourceFiles.length === 1 ? "file" : "files"}</span><span className="designer-order-toggle" aria-hidden="true" /></div>
        </summary>
        <div className="designer-order-body">
          <div className="designer-order-tools"><div className="designer-order-progress"><div><strong>Files for this order</strong><span>{sourceFiles.length} source{sourceFiles.length === 1 ? "" : "s"} · {sentOutputs} output{sentOutputs === 1 ? "" : "s"} sent</span></div><strong>{sentSources}/{sourceFiles.length}</strong><progress aria-label={`${sentSources} of ${sourceFiles.length} source files sent`} max={sourceFiles.length || 1} value={sentSources} /></div><button className="button button-secondary designer-download-order" type="button" disabled={!orderFileCount || downloadingOrder === order.id} onClick={() => void downloadOrderFiles(order)}>{downloadingOrder === order.id ? "Preparing ZIP..." : `Download all (${orderFileCount})`}</button></div>
          {rowMessages[`${order.id}:download`] && <p className="form-error" role="alert">{rowMessages[`${order.id}:download`]}</p>}
          {renderDesignerFiles(order)}
        </div>
      </details>;
    })}</div>;
  }
  if (user.role === "admin" && !compact) {
    return <div className="designer-order-list admin-order-list">{orders.map((order) => {
      const sourceFiles = order.sourceFiles || [];
      const sentSources = sourceFiles.filter((sourceFile) => sourceFile.deliverables?.length).length;
      const sentOutputs = sourceFiles.reduce((count, sourceFile) => count + (sourceFile.deliverables?.length || 0), 0);
      const fileCount = sourceFiles.length + sentOutputs;
      const priority = order.priority.toLowerCase();
      return <details className="designer-order admin-order" key={order.id} open>
        <summary className="designer-order-header">
          <div className="designer-order-title"><span>{order.id} · {order.customer} · {order.date}</span><h2>{order.name}</h2><small>{[order.software, order.format, order.notes].filter(Boolean).join(" · ")}</small></div>
          <div className="designer-order-badges"><span className={`designer-priority priority-${priority}`}>{order.priority} priority</span><StatusBadge status={order.status} /><span className="designer-order-count">{sourceFiles.length} source {sourceFiles.length === 1 ? "file" : "files"}</span><span className="designer-order-toggle" aria-hidden="true" /></div>
        </summary>
        <div className="designer-order-body">
          <div className="designer-order-tools"><div className="designer-order-progress"><div><strong>Designer delivery progress</strong><span>{sourceFiles.length} source{sourceFiles.length === 1 ? "" : "s"} · {sentOutputs} output{sentOutputs === 1 ? "" : "s"} received</span></div><strong>{sentSources}/{sourceFiles.length}</strong><progress aria-label={`${sentSources} of ${sourceFiles.length} source files have deliverables`} max={sourceFiles.length || 1} value={sentSources} /></div><button className="button button-secondary designer-download-order" type="button" disabled={!fileCount || downloadingOrder === order.id} onClick={() => void downloadOrderFiles(order)}>{downloadingOrder === order.id ? "Preparing ZIP..." : `Download all (${fileCount})`}</button></div>
          {rowMessages[`${order.id}:download`] && <p className="form-error" role="alert">{rowMessages[`${order.id}:download`]}</p>}
          <section className="admin-order-assignment" aria-label={`Designer assignment for ${order.id}`}>
            <div><span className="eyebrow">Assigned designer</span><strong>{order.designer || "Awaiting assignment"}</strong></div>
            <div className="admin-assignment-controls"><select className="inline-select" aria-label={`Select designer for ${order.id}`} value={pendingAssignments[order.id] ?? order.designer} onChange={(event) => setPendingAssignments((current) => ({ ...current, [order.id]: event.target.value }))}><option value="">{designers.length ? "Select designer" : "No designers found"}</option>{designers.map((designer) => <option key={designer._id} value={designer.name}>{designer.name}</option>)}</select><button className="button button-secondary" type="button" disabled={busyOrder === order.id || (!pendingAssignments[order.id] && !order.designer)} onClick={() => void assignToDesigner(order)}>{busyOrder === order.id ? "Sending..." : "Send to designer"}</button></div>
            {rowMessages[order.id] && <small className={rowMessages[order.id].startsWith("Source files sent") ? "form-success" : "form-error"}>{rowMessages[order.id]}</small>}
          </section>
          <div className="admin-order-files"><div className="admin-order-files-heading"><strong>Source files and designer outputs</strong><span>{sentSources} of {sourceFiles.length} files returned</span></div>
            {sourceFiles.length ? sourceFiles.map((sourceFile) => <div className="admin-order-file" key={sourceFile.fileKey}>
              <div className="designer-delivery-heading"><div className="designer-source-preview"><FileImagePreview fileId={sourceFile.fileKey} name={sourceFile.name} /><span className="designer-file-type designer-file-type-label" aria-hidden="true">{sourceFile.name.split(".").pop()?.toUpperCase() || "FILE"}</span></div><div className="designer-source-meta"><span>Source file</span><strong title={sourceFile.name}>{sourceFile.name}</strong></div><span className={`designer-delivery-state${sourceFile.deliverables?.length ? " is-sent" : ""}`}>{sourceFile.deliverables?.length ? `${sourceFile.deliverables.length} received` : "Waiting"}</span></div>
              {sourceFile.deliverables?.length ? <div className="designer-sent-files">{sourceFile.deliverables.map((file) => <div className="designer-sent-file" key={file.fileKey}><span aria-hidden="true">✓</span><FileImagePreview fileId={file.fileKey} name={file.name} /><strong title={file.name}>{file.name}</strong></div>)}</div> : <p className="admin-order-file-empty">No output received for this source yet.</p>}
            </div>) : <p className="admin-order-file-empty">No source files attached to this order.</p>}
          </div>
          <div className="admin-order-actions"><button className="button button-primary" type="button" disabled={order.status === "Completed"} onClick={() => updateOrder(order.id, { status: "Completed", sentToCustomer: order.customer })}>{order.status === "Completed" ? "Completed" : "Mark complete"}</button><button className="text-button danger-text" type="button" onClick={() => removeOrder(order.id)}>Remove order</button></div>
        </div>
      </details>;
    })}</div>;
  }
  return <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Design</th><th>Status</th><th>{compact ? "Designer" : "Workflow"}</th>{!compact && <th>Action</th>}</tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.id}</strong><small>{order.date}</small></td><td>{order.customer}</td><td><strong>{order.name}</strong><small>{[order.software, order.format, order.notes].filter(Boolean).join(" · ")}</small></td><td><StatusBadge status={order.status} /></td><td>{user.role === "admin" && !compact ? <div className="assignment-control"><select className="inline-select" value={pendingAssignments[order.id] ?? order.designer} onChange={(event) => setPendingAssignments((current) => ({ ...current, [order.id]: event.target.value }))}><option value="">{designers.length ? "Select designer" : "No designers found"}</option>{designers.map((designer) => <option key={designer._id} value={designer.name}>{designer.name}</option>)}</select><button className="text-button" disabled={busyOrder === order.id || (!pendingAssignments[order.id] && !order.designer)} onClick={() => void assignToDesigner(order)}>Send to designer</button>{rowMessages[order.id] && <small className={rowMessages[order.id].startsWith("Source files sent") ? "form-success" : "form-error"}>{rowMessages[order.id]}</small>}</div> : order.designer || <span className="muted">Waiting for assignment</span>}</td>{!compact && <td>{user.role === "admin" ? <div className="row-actions"><button className="text-button" onClick={() => updateOrder(order.id, { status: "Completed", sentToCustomer: order.customer })}>Complete</button><button className="text-button danger-text" onClick={() => removeOrder(order.id)}>Remove</button></div> : user.role === "designer" && order.status !== "Completed" ? renderDesignerFiles(order) : <StatusBadge status={order.status} />}</td>}</tr>)}</tbody></table></div>;
}
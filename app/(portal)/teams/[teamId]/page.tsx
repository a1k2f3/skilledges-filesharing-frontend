"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { getTeam, listFiles, shareFileWithTeam, type ApiFile, type ApiTeam } from "@/components/api";
import { usePortal } from "@/components/portal-context";
import { PageHeader } from "@/components/portal-ui";

export default function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { user } = usePortal();
  const { teamId } = use(params);
  const [team, setTeam] = useState<ApiTeam | null>(null);
  const [files, setFiles] = useState<ApiFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (user.role !== "admin") return;
    void Promise.all([getTeam(teamId), listFiles()]).then(([nextTeam, nextFiles]) => {
      setTeam({ ...nextTeam, owner: nextTeam.owner || { _id: "", name: "Unknown owner", email: "", role: "user" }, members: nextTeam.members.filter(Boolean) });
      setFiles(nextFiles);
      setSelectedFileId(nextFiles[0]?._id || "");
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load team."))
      .finally(() => setLoading(false));
  }, [teamId, user.role]);

  async function sendFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamId || !selectedFileId) return;
    setSharing(true);
    setMessage("");
    try {
      const result = await shareFileWithTeam(selectedFileId, teamId);
      setMessage(`${result.sharedCount} member${result.sharedCount === 1 ? "" : "s"} received the file${result.skippedCount ? `; ${result.skippedCount} already had access` : ""}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send file to team.");
    } finally {
      setSharing(false);
    }
  }

  if (user.role !== "admin") return <PageHeader eyebrow="Workspace access" title="Team details" description="Only administrators can view team details." />;
  if (loading) return <><PageHeader eyebrow="Workspace structure" title="Team details" /><p className="muted">Loading team...</p></>;
  if (!team) return <><PageHeader eyebrow="Workspace structure" title="Team not found" description={message || "This team is no longer available."} /><Link className="button button-secondary" href="/teams">Back to teams</Link></>;

  return <>
    <PageHeader eyebrow="Workspace structure" title={team.name} description="Review membership and send production files to this team." action={<Link className="button button-secondary" href="/teams">Back to teams</Link>} />
    <div className="detail-grid">
      <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Team roster</p><h2>{team.members.length} members</h2></div></div><div className="member-directory">{team.members.map((member) => <div className="member-row" key={member._id}><span className="avatar">{member.name.slice(0, 1).toUpperCase()}</span><span><strong>{member.name}</strong><small>{member.email}</small></span><span className="role-label">{member._id === team.owner._id ? "Owner" : member.role}</span></div>)}</div></section>
      <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Team delivery</p><h2>Send a file</h2><p className="panel-subtitle">Every active member will receive access.</p></div></div><form onSubmit={sendFile}><label>Production file<select required value={selectedFileId} onChange={(event) => setSelectedFileId(event.target.value)}><option value="">Select a file</option>{files.map((file) => <option key={file._id} value={file._id}>{file.originalName}</option>)}</select></label>{message && <p className={message.includes("received") ? "form-success" : "form-error"}>{message}</p>}<button className="button button-primary" type="submit" disabled={sharing || !files.length}>{sharing ? "Sending..." : `Send to ${team.name}`}</button>{!files.length && <p className="muted">Upload a file before sending it to this team.</p>}</form></section>
    </div>
  </>;
}
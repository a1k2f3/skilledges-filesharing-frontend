"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createTeam, listUsers, type ApiUser } from "@/components/api";
import { usePortal } from "@/components/portal-context";
import { PageHeader } from "@/components/portal-ui";

export default function AddTeamPage() {
  const { user } = usePortal();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (user.role !== "admin") return;
    void listUsers().then((nextUsers) => setUsers(nextUsers.filter((candidate) => candidate.isActive))).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load users."));
  }, [user.role]);

  function toggleMember(userId: string) {
    setMemberIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await createTeam(name.trim(), memberIds);
      setName("");
      setMemberIds([]);
      setMessage("Team created successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create team.");
    } finally {
      setSaving(false);
    }
  }

  if (user.role !== "admin") return <PageHeader eyebrow="Workspace access" title="Create team" description="Only administrators can create teams." />;

  return <><PageHeader eyebrow="Workspace structure" title="Create team" description="Create a team and assign active users at the same time." /><section className="panel narrow-panel"><div className="panel-heading"><div><p className="eyebrow">New team</p><h2>Team details</h2></div></div><form onSubmit={submit}><label>Team name<input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Production team" /></label><fieldset className="member-picker"><legend>Team users</legend>{users.length === 0 ? <p className="muted">No active users available.</p> : users.map((candidate) => <label className="member-option" key={candidate._id}><input type="checkbox" checked={memberIds.includes(candidate._id)} onChange={() => toggleMember(candidate._id)} /><span><strong>{candidate.name}</strong><small>{candidate.email}</small></span></label>)}</fieldset>{message && <p className={message.includes("successfully") ? "form-success" : "form-error"}>{message}</p>}<div className="form-footer"><button className="button button-primary" type="submit" disabled={saving}>{saving ? "Creating..." : "Create team"}</button><Link className="button button-secondary" href="/teams">Cancel</Link></div></form></section></>;
}
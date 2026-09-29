"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addTeamMember,
  deleteTeam,
  listTeams,
  listUsers,
  removeTeamMember,
  type ApiTeam,
  type ApiTeamUser,
  type ApiUser
} from "@/components/api";
import { usePortal } from "@/components/portal-context";
import { PageHeader } from "@/components/portal-ui";

export default function TeamsPage() {
  const { user } = usePortal();
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadTeams() {
    setLoading(true);
    try {
      const [nextTeams, nextUsers] = await Promise.all([listTeams(), listUsers()]);
      setTeams(nextTeams);
      setUsers(nextUsers.filter((candidate) => candidate.isActive));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load teams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user.role === "admin") void loadTeams();
  }, [user.role]);

  async function removeTeam(team: ApiTeam) {
    if (!window.confirm(`Delete ${team.name}?`)) return;
    try {
      await deleteTeam(team._id);
      await loadTeams();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete team.");
    }
  }

  async function removeMember(team: ApiTeam, member: ApiTeamUser) {
    try {
      const updated = await removeTeamMember(team._id, member._id);
      setTeams((current) => current.map((item) => item._id === updated._id ? updated : item));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove team member.");
    }
  }

  async function addMember(team: ApiTeam, memberId: string) {
    try {
      const updated = await addTeamMember(team._id, memberId);
      setTeams((current) => current.map((item) => item._id === updated._id ? updated : item));
      setMessage("Team member added successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add team member.");
    }
  }

  if (user.role !== "admin") return <PageHeader eyebrow="Workspace access" title="Teams" description="Only administrators can manage teams." />;

  return <>
    <PageHeader eyebrow="Workspace structure" title="Teams" description="Keep membership up to date across your production teams." />
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Active groups</p><h2>Team directory</h2></div><div className="row-actions"><Link className="button button-primary" href="/teams/addteam">Create team</Link><span className="team-count">{teams.length} teams</span></div></div>{message && <p className={message.includes("successfully") ? "form-success" : "form-error"}>{message}</p>}{loading ? <p className="muted">Loading teams...</p> : teams.length === 0 ? <div className="empty-state"><strong>No teams yet</strong><p>Create a team and assign users from the form.</p></div> : <div className="team-list">{teams.map((team) => { const availableUsers = users.filter((candidate) => !team.members.some((member) => member._id === candidate._id)); return <article className="team-card" key={team._id}><div className="team-card-header"><div><h3>{team.name}</h3><p className="muted">Owner: {team.owner.name}</p></div><button className="text-button danger-text" onClick={() => removeTeam(team)}>Delete</button></div><div className="team-members">{team.members.map((member) => <span className="member-chip" key={member._id}>{member.name}{member._id !== team.owner._id && <button type="button" aria-label={`Remove ${member.name}`} onClick={() => removeMember(team, member)}>x</button>}</span>)}</div>{availableUsers.length > 0 && <div className="team-add-member"><select defaultValue="" aria-label={`Add member to ${team.name}`} onChange={(event) => { const memberId = event.target.value; if (memberId) { void addMember(team, memberId); event.target.value = ""; } }}><option value="">Add a member...</option>{availableUsers.map((candidate) => <option key={candidate._id} value={candidate._id}>{candidate.name} ({candidate.email})</option>)}</select></div>}</article>; })}</div>}</section>
  </>;
}
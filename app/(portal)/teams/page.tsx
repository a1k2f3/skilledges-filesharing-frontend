"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addTeamMember,
  deleteTeam,
  listMyTeams,
  listTeams,
  listUsers,
  removeTeamMember,
  type ApiTeam,
  type ApiTeamUser,
  type ApiUser
} from "@/components/api";
import { usePortal } from "@/components/portal-context";
import { PageHeader } from "@/components/portal-ui";

function MyTeamsPage() {
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void listMyTeams().then((nextTeams) => setTeams(nextTeams.map((team) => ({ ...team, owner: team.owner || { _id: "", name: "Unknown owner", email: "", role: "user" }, members: team.members.filter(Boolean) })))).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load your teams.")).finally(() => setLoading(false));
  }, []);

  return <>
    <PageHeader eyebrow="Your workspace" title="My teams" description="See the teams you belong to and the people you work with." />
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Team membership</p><h2>Your teams</h2></div><span className="team-count">{teams.length} team{teams.length === 1 ? "" : "s"}</span></div>{message && <p className="form-error">{message}</p>}{loading ? <p className="muted">Loading your teams...</p> : teams.length === 0 ? <div className="empty-state"><strong>You are not in a team yet</strong><p>An administrator will add you to a team when one is ready.</p></div> : <div className="team-list">{teams.map((team) => <article className="team-card" key={team._id}><div className="team-card-header"><div><span className="team-label">Production team</span><h3>{team.name}</h3><p className="muted">Owned by {team.owner.name}</p></div></div><div className="team-card-stats"><strong>{team.members.length}</strong><span>members</span></div><div className="team-members">{team.members.map((member) => <span className="member-chip" key={member._id}>{member.name}</span>)}</div></article>)}</div>}</section>
  </>;
}

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
      setTeams(nextTeams.map((team) => ({ ...team, owner: team.owner || { _id: "", name: "Unknown owner", email: "", role: "user" }, members: team.members.filter(Boolean) })));
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

  if (user.role !== "admin") return <MyTeamsPage />;

  return <>
    <PageHeader eyebrow="Workspace structure" title="Teams" description="Organize production members and deliver files to the right group." action={<Link className="button button-primary" href="/teams/addteam">Create team</Link>} />
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Active groups</p><h2>Team directory</h2><p className="panel-subtitle">{teams.length} active team{teams.length === 1 ? "" : "s"} · {users.length} available users</p></div></div>{message && <p className={message.includes("successfully") ? "form-success" : "form-error"}>{message}</p>}{loading ? <p className="muted">Loading teams...</p> : teams.length === 0 ? <div className="empty-state"><strong>No teams yet</strong><p>Create a team and assign users from the form.</p></div> : <div className="team-list">{teams.map((team) => { const availableUsers = users.filter((candidate) => !team.members.some((member) => member._id === candidate._id)); return <article className="team-card" key={team._id}><div className="team-card-header"><div><span className="team-label">Production team</span><h3>{team.name}</h3><p className="muted">Owned by {team.owner.name}</p></div><button className="text-button danger-text" type="button" onClick={() => removeTeam(team)}>Delete</button></div><div className="team-card-stats"><strong>{team.members.length}</strong><span>members</span></div><div className="team-members">{team.members.map((member) => <span className="member-chip" key={member._id}>{member.name}{member._id !== team.owner._id && <button type="button" aria-label={`Remove ${member.name}`} onClick={() => removeMember(team, member)}>x</button>}</span>)}</div>{availableUsers.length > 0 && <div className="team-add-member"><select defaultValue="" aria-label={`Add member to ${team.name}`} onChange={(event) => { const memberId = event.target.value; if (memberId) { void addMember(team, memberId); event.target.value = ""; } }}><option value="">Add a member...</option>{availableUsers.map((candidate) => <option key={candidate._id} value={candidate._id}>{candidate.name} ({candidate.email})</option>)}</select></div>}<div className="team-card-footer"><Link className="button button-secondary" href={`/teams/${team._id}`}>Open team and send file</Link></div></article>; })}</div>}</section>
  </>;
}
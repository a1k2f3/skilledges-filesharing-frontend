"use client";

import { useState } from "react";
import { createUser } from "@/components/api";
import { usePortal } from "@/components/portal-context";
import { PageHeader } from "@/components/portal-ui";

export default function SettingsPage() {
	const { user, updatePassword } = usePortal();
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [message, setMessage] = useState("");
	const [newUserName, setNewUserName] = useState("");
	const [newUserEmail, setNewUserEmail] = useState("");
	const [newUserPassword, setNewUserPassword] = useState("");
	const [userMessage, setUserMessage] = useState("");
	const [creatingUser, setCreatingUser] = useState(false);

	function save() {
		if (oldPassword !== user.password) return setMessage("Current password is incorrect.");
		if (newPassword.length < 4) return setMessage("New password must be at least 4 characters.");
		if (newPassword !== confirm) return setMessage("Passwords do not match.");
		updatePassword(newPassword); setOldPassword(""); setNewPassword(""); setConfirm(""); setMessage("Password updated successfully.");
	}

	async function addUser(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault(); setUserMessage(""); setCreatingUser(true);
		try {
			await createUser(newUserName.trim(), newUserEmail.trim(), newUserPassword);
			setNewUserName(""); setNewUserEmail(""); setNewUserPassword(""); setUserMessage("User created successfully.");
		} catch (error) {
			setUserMessage(error instanceof Error ? error.message : "Unable to create user.");
		} finally { setCreatingUser(false); }
	}

	return <><PageHeader eyebrow="Workspace preferences" title="Settings" description="Manage your account access and workspace profile." /><section className="panel narrow-panel"><div className="settings-profile"><div className="avatar avatar-large">{user.name.slice(0, 1)}</div><div><h2>{user.name}</h2><p>{user.username} · {user.role}</p></div></div><hr /><h2>Change password</h2><label>Current password<input type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} /></label><label>New password<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><label>Confirm new password<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>{message && <p className={message.includes("success") ? "form-success" : "form-error"}>{message}</p>}<button className="button button-primary" onClick={save}>Update password</button></section>{user.role === "admin" && <section className="panel narrow-panel"><h2>Add user</h2><p className="muted">Create a standard workspace account.</p><form onSubmit={addUser}><label>Full name<input required minLength={2} maxLength={100} value={newUserName} onChange={(event) => setNewUserName(event.target.value)} /></label><label>Email<input required type="email" value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} /></label><label>Temporary password<input required minLength={6} type="password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} /></label>{userMessage && <p className={userMessage.includes("success") ? "form-success" : "form-error"}>{userMessage}</p>}<button className="button button-primary" type="submit" disabled={creatingUser}>{creatingUser ? "Creating user..." : "Create user"}</button></form></section>}</>;
}
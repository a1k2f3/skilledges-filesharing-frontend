"use client";

import { useState } from "react";
import { createCustomer } from "@/components/api";
import { usePortal } from "@/components/portal-context";
import { PageHeader } from "@/components/portal-ui";

export default function SettingsPage() {
	const { user, updatePassword, updateProfile } = usePortal();
	const [profileName, setProfileName] = useState(user.name);
	const [profileEmail, setProfileEmail] = useState(user.email || "");
	const [profileWhatsappNumber, setProfileWhatsappNumber] = useState(user.whatsappNumber || "");
	const [profileMessage, setProfileMessage] = useState("");
	const [savingProfile, setSavingProfile] = useState(false);
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [message, setMessage] = useState("");
	const [newCustomerUsername, setNewCustomerUsername] = useState("");
	const [newUserPassword, setNewUserPassword] = useState("");
	const [userMessage, setUserMessage] = useState("");
	const [creatingUser, setCreatingUser] = useState(false);

	async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setProfileMessage("");
		setSavingProfile(true);
		try {
			await updateProfile({
				name: profileName.trim(),
				email: profileEmail.trim() || null,
				whatsappNumber: profileWhatsappNumber.trim() || null
			});
			setProfileMessage("Profile updated successfully.");
		} catch (error) {
			setProfileMessage(error instanceof Error ? error.message : "Unable to update profile.");
		} finally {
			setSavingProfile(false);
		}
	}

	function save() {
		if (oldPassword !== user.password) return setMessage("Current password is incorrect.");
		if (newPassword.length < 4) return setMessage("New password must be at least 4 characters.");
		if (newPassword !== confirm) return setMessage("Passwords do not match.");
		updatePassword(newPassword); setOldPassword(""); setNewPassword(""); setConfirm(""); setMessage("Password updated successfully.");
	}

	async function addUser(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault(); setUserMessage(""); setCreatingUser(true);
		try {
			await createCustomer(newCustomerUsername.trim(), newUserPassword);
			setNewCustomerUsername(""); setNewUserPassword(""); setUserMessage("Customer account created successfully.");
		} catch (error) {
			setUserMessage(error instanceof Error ? error.message : "Unable to create user.");
		} finally { setCreatingUser(false); }
	}

	return <><PageHeader eyebrow="Workspace preferences" title="Settings" description="Manage your account access and workspace profile." /><section className="panel narrow-panel"><div className="settings-profile"><div className="avatar avatar-large">{user.name.slice(0, 1)}</div><div><h2>{user.name}</h2><p>{user.username} · {user.role}</p></div></div><form onSubmit={saveProfile}><h2>Edit profile</h2><label>Full name<input required minLength={2} maxLength={100} value={profileName} onChange={(event) => setProfileName(event.target.value)} /></label><label>Email<input type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} /></label><label>WhatsApp number<input type="tel" value={profileWhatsappNumber} onChange={(event) => setProfileWhatsappNumber(event.target.value)} placeholder="+1 234 567 8900" /></label>{profileMessage && <p className={profileMessage.includes("success") ? "form-success" : "form-error"}>{profileMessage}</p>}<button className="button button-primary" type="submit" disabled={savingProfile}>{savingProfile ? "Saving profile..." : "Save profile"}</button></form><hr /><h2>Change password</h2><label>Current password<input type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} /></label><label>New password<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><label>Confirm new password<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>{message && <p className={message.includes("success") ? "form-success" : "form-error"}>{message}</p>}<button className="button button-primary" onClick={save}>Update password</button></section>{user.role === "admin" && <section className="panel narrow-panel"><h2>Add customer</h2><p className="muted">Create a customer account with a username and password.</p><form onSubmit={addUser}><label>Username<input required minLength={2} maxLength={50} autoComplete="off" value={newCustomerUsername} onChange={(event) => setNewCustomerUsername(event.target.value)} /></label><label>Password<input required minLength={6} type="password" autoComplete="new-password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} /></label>{userMessage && <p className={userMessage.includes("success") ? "form-success" : "form-error"}>{userMessage}</p>}<button className="button button-primary" type="submit" disabled={creatingUser}>{creatingUser ? "Creating customer..." : "Create customer"}</button></form></section>}</>;
}
"use client";

import Link from "next/link";
import { useState } from "react";
import { createDesigner } from "@/components/api";
import { PageHeader } from "@/components/portal-ui";

export default function AddDesignerPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setCreating(true);
    try {
      await createDesigner(username.trim(), password);
      setUsername("");
      setPassword("");
      setMessage("Designer created successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create designer.");
    } finally {
      setCreating(false);
    }
  }

  return <><PageHeader eyebrow="Production team" title="Add designer" description="Create a username and password for the designer." /><section className="panel narrow-panel"><form onSubmit={submit}><label>Username<input required minLength={2} maxLength={50} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label><label>Password<input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{message && <p className={message.includes("successfully") ? "form-success" : "form-error"}>{message}</p>}<div className="form-footer"><Link href="/designers" className="button button-secondary">Cancel</Link><button className="button button-primary" type="submit" disabled={creating}>{creating ? "Creating designer..." : "Create designer"}</button></div></form></section></>;
}
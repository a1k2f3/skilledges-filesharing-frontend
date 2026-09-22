"use client";

import Link from "next/link";
import { useState } from "react";
import { createUser } from "@/components/api";
import { PageHeader } from "@/components/portal-ui";

export default function AddDesignerPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setCreating(true);
    try {
      await createUser(name.trim(), email.trim(), password, "designer");
      setName("");
      setEmail("");
      setPassword("");
      setMessage("Designer created successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create designer.");
    } finally {
      setCreating(false);
    }
  }

  return <><PageHeader eyebrow="Production team" title="Add designer" description="Create a designer account for the workspace." /><section className="panel narrow-panel"><form onSubmit={submit}><label>Full name<input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Temporary password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{message && <p className={message.includes("successfully") ? "form-success" : "form-error"}>{message}</p>}<div className="form-footer"><Link href="/designers" className="button button-secondary">Cancel</Link><button className="button button-primary" type="submit" disabled={creating}>{creating ? "Creating designer..." : "Create designer"}</button></div></form></section></>;
}
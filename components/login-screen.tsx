"use client";

import { useEffect, useState } from "react";
import { defaultUsers, type User } from "./portal-context";

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("skillsEdgeCurrentSession")) window.location.href = "/dashboard";
    setChecking(false);
  }, []);

  function login() {
    const users = JSON.parse(localStorage.getItem("skillsEdgeUsers") || "null") || defaultUsers;
    const user: User | undefined = users[username.trim().toLowerCase()];
    if (!user || user.password !== password) { setError("Invalid username or password"); return; }
    localStorage.setItem("skillsEdgeCurrentSession", JSON.stringify(user));
    window.location.href = "/dashboard";
  }

  if (checking) return null;
  return <main className="login-page"><div className="login-panel">
    <div className="brand brand-dark">SKILLS <span>EDGE</span></div>
    <p className="eyebrow">Embroidery operations portal</p>
    <h1>Welcome back</h1><p className="login-copy">Sign in to manage digitizing orders and production files.</p>
    <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin / wilcom / designer" /></label>
    <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && login()} placeholder="Enter your password" /></label>
    {error && <p className="form-error">{error}</p>}
    <button className="button button-primary full-width" onClick={login}>Sign in <span aria-hidden="true">→</span></button>
  </div><div className="login-aside"><span className="aside-mark">SE</span><p>Precision work, from first stitch to final file.</p></div></main>;
}
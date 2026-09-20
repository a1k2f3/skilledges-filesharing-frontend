"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login as apiLogin } from "./api";
import Link from "next/link";

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("skillsEdgeCurrentSession")) router.push("/dashboard");
  }, [router]);

  async function login() {
    setError("");
    try {
      const result = await apiLogin(username.trim(), password);
      localStorage.setItem("skillsEdgeToken", result.token);
      localStorage.setItem("skillsEdgeCurrentSession", JSON.stringify(result.data));
      router.push("/dashboard");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Invalid email or password");
    }
  }

  return <main className="login-page"><div className="login-panel">
    <div className="brand brand-dark">SKILLS <span>EDGE</span></div>
    <p className="eyebrow">Embroidery operations portal</p>
    <h1>Welcome back</h1><p className="login-copy">Sign in to manage digitizing orders and production files.</p>
    <label>Email<input type="email" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="you@example.com" /></label>
    <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && login()} placeholder="Enter your password" /></label>
    {error && <p className="form-error">{error}</p>}
    <button className="button button-primary full-width" onClick={login}>Sign in <span aria-hidden="true">→</span></button>
    <p className="login-copy">Need an account? <Link href="/signup">Create one</Link></p>
  </div><div className="login-aside"><span className="aside-mark">SE</span><p>Precision work, from first stitch to final file.</p></div></main>;
}
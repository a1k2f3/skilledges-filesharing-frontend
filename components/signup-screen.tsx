"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signup as apiSignup } from "./api";

export function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) return setError("Passwords do not match");

    setSubmitting(true);
    try {
      const result = await apiSignup(name.trim(), email.trim(), password);
      localStorage.setItem("skillsEdgeToken", result.token);
      localStorage.setItem("skillsEdgeCurrentSession", JSON.stringify(result.data));
      router.push("/dashboard");
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Unable to create account");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="login-page"><div className="login-panel">
    <div className="brand brand-dark">SKILLS <span>EDGE</span></div>
    <p className="eyebrow">Embroidery operations portal</p>
    <h1>Create your account</h1>
    <p className="login-copy">Join the workspace to send designs and manage production files.</p>
    <form onSubmit={submit}>
      <label>Full name<input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>
      <label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
      <label>Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>
      <label>Confirm password<input required minLength={6} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="button button-primary full-width" type="submit" disabled={submitting}>{submitting ? "Creating account..." : <>Create account <span aria-hidden="true">→</span></>}</button>
    </form>
    <p className="login-copy">Already have an account? <Link href="/">Sign in</Link></p>
  </div><div className="login-aside"><span className="aside-mark">SE</span><p>Precision work, from first stitch to final file.</p></div></main>;
}
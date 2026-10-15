"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../lib/api";
import { useStore } from "../../components/store-provider";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      setUser(result.user);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn’t sign you in. Please try again.");
    } finally { setLoading(false); }
  }
  return <main className="auth-wrap"><section className="auth-card">
    <span className="eyebrow">Welcome back</span><h1>Sign in.</h1><p>Your Apple Store account, all in one place.</p>
    <form onSubmit={handleSubmit}>
      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="form-field"><label htmlFor="email">Email address</label><input className="form-input" id="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></div>
      <div className="form-field"><label htmlFor="password">Password</label><input className="form-input" id="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></div>
      <button className="pill" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
    </form>
    <p className="auth-switch">New to Apple Store? <Link href="/signup">Create an account</Link></p>
  </section></main>;
}

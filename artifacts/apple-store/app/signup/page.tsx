"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signup } from "../../lib/api";
import { useStore } from "../../components/store-provider";

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signup(name.trim(), email.trim(), password);
      setUser(result.user);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn’t create your account. Please try again.");
    } finally { setLoading(false); }
  }
  return <main className="auth-wrap"><section className="auth-card">
    <span className="eyebrow">A good place to start</span><h1>Create an account.</h1><p>Keep your details and orders together.</p>
    <form onSubmit={handleSubmit}>
      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="form-field"><label htmlFor="name">Your name</label><input className="form-input" id="name" autoComplete="name" required minLength={2} value={name} onChange={event => setName(event.target.value)} /></div>
      <div className="form-field"><label htmlFor="email">Email address</label><input className="form-input" id="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></div>
      <div className="form-field"><label htmlFor="password">Password</label><input className="form-input" id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} /><small>Use at least 8 characters.</small></div>
      <button className="pill" type="submit" disabled={loading}>{loading ? "Creating your account…" : "Create account"}</button>
    </form>
    <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
  </section></main>;
}

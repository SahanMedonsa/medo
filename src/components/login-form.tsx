"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";

export default function LoginForm({ onSignedIn }: { onSignedIn?: () => Promise<void> }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username: form.get("username"), password: form.get("password") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 503 ? "Sign-in is not available yet. Please contact the site administrator." : data.error || "Unable to sign in. Please try again.");
      if (onSignedIn) await onSignedIn();
      else router.replace("/admin");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
      setBusy(false);
    }
  }

  return <main className="signin-page">
    <section className="signin-card" aria-labelledby="signin-title">
      <Link href="/" className="signin-logo" aria-label="Sahan Medonsa home"><Image src="/logo.png" alt="Sahan Medonsa" width={1175} height={344} unoptimized /></Link>
      <h1 id="signin-title">Admin login</h1>
      <p className="signin-intro">Sign in to manage your lessons.</p>
      <form onSubmit={signIn} className="signin-form">
        <label htmlFor="username">Username</label>
        <div className="signin-input"><UserRound size={19} aria-hidden="true" /><input id="username" name="username" type="text" autoComplete="username" placeholder="Username or email" required maxLength={254} disabled={busy} autoCapitalize="none" spellCheck={false} /></div>
        <label htmlFor="password">Password</label>
        <div className="signin-input"><LockKeyhole size={19} aria-hidden="true" /><input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required maxLength={1000} disabled={busy} /><button className="password-toggle" type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
        {error && <p className="signin-error" role="alert">{error}</p>}
        <button className="purchase-button signin-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <Link href="/" className="signin-back">← Back to lessons</Link>
    </section>
  </main>;
}

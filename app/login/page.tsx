"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_VERSION } from "@/lib/modules";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    params.get("error") ? { kind: "err", text: "Sign-in link was invalid or expired." } : null
  );
  const supabase = createClient();

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMsg({ kind: "err", text: error.message });
    router.replace(next);
    router.refresh();
  }

  async function magicLink() {
    if (!email) return setMsg({ kind: "err", text: "Enter your email first." });
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // invite-only
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    setMsg(error ? { kind: "err", text: error.message } : { kind: "ok", text: "Check your email for the sign-in link." });
  }

  return (
    <form className="login-card" onSubmit={signIn}>
      <div className="brand"><img src="/icons/logo.svg" alt="" className="logo" width={40} height={40} /> CEMP <span className="ver">{APP_VERSION}</span></div>
      <p className="login-about"><b>Construction Estimating and Management Platform.</b> Quantity estimates and project BOMs, design checks with step-by-step working, site practice cards and an engineering reference library, in one place.</p>
      <h1>Sign in</h1>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn" disabled={busy || !password}>{busy ? "Signing in…" : "Sign in"}</button>
      <button type="button" className="btn ghost" disabled={busy} onClick={magicLink}>Email me a sign-in link</button>
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
      <p className="fine">Invite-only. Ask the admin for access.</p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="login">
      <Suspense><LoginForm /></Suspense>
      <footer className="login-foot">Powered by <a href="https://darkwizlab.com" target="_blank" rel="noopener">Darkwiz Lab</a></footer>
    </main>
  );
}

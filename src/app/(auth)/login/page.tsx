"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import PasswordInput from "@/components/ui/PasswordInput";
import Alert from "@/components/ui/Alert";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const message = await signIn(email, password);
    if (message) {
      setError(message);
      setBusy(false);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    const target =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/marketplace";
    // Full navigation: sends the fresh auth cookie so middleware renders the
    // signed-in page on the first request (no manual refresh needed).
    window.location.assign(target);
  }

  return (
    <div className="card w-full max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-600">
        Sign in to keep trading skills with your peers.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Institutional email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <PasswordInput
            id="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <Alert>{error}</Alert>}

        <button type="submit" className="btn-primary w-full" disabled={busy} aria-busy={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-teal-800 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

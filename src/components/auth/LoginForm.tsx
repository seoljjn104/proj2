"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import PasswordInput from "@/components/ui/PasswordInput";
import Alert from "@/components/ui/Alert";

interface Props {
  /** Where to send the user after signing in (fallback: /marketplace). */
  next?: string;
  onSwitch?: () => void;
}

export default function LoginForm({ next, onSwitch }: Props) {
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
    const target =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/marketplace";
    // Full navigation: sends the fresh auth cookie so middleware renders the
    // signed-in page on the first request (no manual refresh needed).
    window.location.assign(target);
  }

  return (
    <div>
      <h2 className="text-balance text-2xl font-semibold tracking-tight text-slate-900">
        Welcome back
      </h2>
      <p className="mt-1.5 text-sm text-slate-600">
        Sign in to keep trading skills with your peers.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Institutional email
          </label>
          <input
            id="email"
            data-autofocus
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
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
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

      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold text-teal-700 hover:text-teal-800 hover:underline"
        >
          Create your account
        </button>
      </p>
    </div>
  );
}
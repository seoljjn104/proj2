"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/ui/PasswordInput";
import Alert from "@/components/ui/Alert";

interface Props {
  /** Where to send the user after signing in (fallback: /marketplace). */
  next?: string;
  onSwitch?: () => void;
}

type View = "login" | "reset";

export default function LoginForm({ next, onSwitch }: Props) {
  const { signIn } = useAuth();
  const [view, setView] = useState<View>("login");
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

  if (view === "reset") {
    return <ResetForm email={email} onBack={() => setView("login")} />;
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
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <button
              type="button"
              onClick={() => setView("reset")}
              className="-my-1.5 py-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
            >
              Forgot password?
            </button>
          </div>
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

function ResetForm({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const [resetEmail, setResetEmail] = useState(email);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const client = createClient();
      const { error: sendError } = await client.auth.resetPasswordForEmail(
        resetEmail,
        { redirectTo: `${window.location.origin}/auth/callback` },
      );
      if (sendError) {
        setError(friendlyAuthError(sendError.message));
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong sending the reset link. Please try again.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div>
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-slate-900">
          Check your inbox
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          If an account exists for{" "}
          <strong className="break-all">{resetEmail}</strong>, we sent a link to
          reset your password. It expires in about an hour.
        </p>
        <form onSubmit={(ev) => (ev.preventDefault(), onBack())} className="mt-6">
          <button type="submit" className="btn-primary w-full">
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-balance text-2xl font-semibold tracking-tight text-slate-900">
        Reset your password
      </h2>
      <p className="mt-1.5 text-sm text-slate-600">
        Enter your institutional email and we&apos;ll send a secure reset link.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Institutional email
          </label>
          <input
            id="reset-email"
            data-autofocus
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="you@university.edu"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
          />
        </div>

        {error && <Alert>{error}</Alert>}

        <button type="submit" className="btn-primary w-full" disabled={busy} aria-busy={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Remembered it?{" "}
        <button
          type="button"
          onClick={onBack}
          className="font-semibold text-teal-700 hover:text-teal-800 hover:underline"
        >
          Back to sign in
        </button>
      </p>
    </div>
  );
}

function friendlyAuthError(message: string): string {
  if (message.includes("rate limit") || message.includes("Request rate"))
    return "Too many requests. Wait a few minutes and try again.";
  return "Could not send the reset link. Please try again.";
}
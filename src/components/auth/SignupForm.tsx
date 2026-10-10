"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { allowedDomainsHint } from "@/lib/email-domains";
import PasswordInput from "@/components/ui/PasswordInput";
import Alert from "@/components/ui/Alert";

interface Props {
  onSwitch?: () => void;
  /** Closes the popup entirely (used from the verification-done state). */
  onClose?: () => void;
}

export default function SignupForm({ onSwitch, onClose }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const domainsHint = allowedDomainsHint();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const result = await signUp(name, email, password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setDone(true);
      return;
    }
    // Full navigation so middleware sees the new session immediately.
    window.location.assign("/marketplace");
  }

  if (done) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Check your inbox
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          We sent a verification link to <strong>{email}</strong>. Click it to
          activate your SkillGRID account, then sign in.
        </p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Close
          </button>
          <button type="button" onClick={onSwitch} className="btn-primary flex-1">
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-balance text-2xl font-semibold tracking-tight text-slate-900">
        Create your account
      </h2>
      <p className="mt-1.5 text-sm text-slate-600">
        Offer what you know. Ask for what you want to learn.
      </p>
      {domainsHint && (
        <p className="mt-4 rounded-lg bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-800">
          Signups are restricted to: {domainsHint}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            id="name"
            data-autofocus
            type="text"
            required
            minLength={2}
            autoComplete="name"
            className="input"
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
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
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
            Password
          </label>
          <PasswordInput
            id="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <PasswordInput
            id="confirm"
            required
            autoComplete="new-password"
            placeholder="Repeat password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && <Alert>{error}</Alert>}

        <button type="submit" className="btn-primary w-full" disabled={busy} aria-busy={busy}>
          {busy ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold text-teal-700 hover:text-teal-800 hover:underline"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
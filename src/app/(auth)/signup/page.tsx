"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { allowedDomainsHint } from "@/lib/email-domains";
import PasswordInput from "@/components/ui/PasswordInput";

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
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
    router.push("/marketplace");
    router.refresh();
  }

  if (done) {
    return (
      <div className="card w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Check your inbox
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          We sent a verification link to <strong>{email}</strong>. Click it to
          activate your SkillGRID account, then sign in.
        </p>
        <Link href="/login" className="btn-primary mt-6 inline-flex">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Offer what you know. Ask for what you want to learn.
      </p>
      {domainsHint && (
        <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
          Signups are restricted to: {domainsHint}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Full name
          </label>
          <input
            id="name"
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
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm font-medium">
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

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-teal-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

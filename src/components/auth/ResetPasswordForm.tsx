"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PasswordInput from "@/components/ui/PasswordInput";
import Alert from "@/components/ui/Alert";

/**
 * Where the password-recovery email lands. The callback has already verified
 * the recovery token and set a session cookie, so this page just collects the
 * new password.
 */
export default function ResetPasswordForm() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const resolvedRef = useRef(false);
  const [state, setState] = useState<"form" | "done" | "link-expired">("form");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A signed-in user found this by hand — let them stay. A sessionless visit
  // means an expired or invalid link, which the form state below explains.
  useEffect(() => {
    if (loading || resolvedRef.current) return;
    resolvedRef.current = true;
    if (!user) setState("link-expired");
  }, [user, loading]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const client = createClient();
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) {
        setError(friendlyUpdateError(updateError.message));
        setBusy(false);
        return;
      }
      setState("done");
    } catch {
      setError("Something went wrong updating your password. Please try again.");
      setBusy(false);
    }
  }

  if (state === "link-expired") {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Link invalid or expired
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          This password-reset link is no longer valid. Request a new one from
          the sign-in screen.
        </p>
        <button type="button" onClick={() => router.replace("/?auth=login")} className="btn-primary mt-6 w-full">
          Back to sign in
        </button>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Password updated
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Your password has been changed. You&apos;re signed in.
        </p>
        <button type="button" onClick={() => router.replace("/marketplace")} className="btn-primary mt-6 w-full">
          Go to marketplace
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-balance text-2xl font-semibold tracking-tight text-slate-900">
        Choose a new password
      </h2>
      <p className="mt-1.5 text-sm text-slate-600">
        Use at least 8 characters, something you haven&apos;t used here before.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-700">
            New password
          </label>
          <PasswordInput
            id="new-password"
            data-autofocus
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">
            Confirm new password
          </label>
          <PasswordInput
            id="confirm-password"
            required
            autoComplete="new-password"
            placeholder="Repeat password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && <Alert>{error}</Alert>}

        <button type="submit" className="btn-primary w-full" disabled={busy} aria-busy={busy}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

function friendlyUpdateError(message: string): string {
  if (message.includes("same as") || message.includes("previously"))
    return "Choose a password you haven't used before on this account.";
  return "Could not update your password. Please try again.";
}
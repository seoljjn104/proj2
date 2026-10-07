"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Minimal target shape: works for marketplace cards and match cards. */
export interface ProposeTarget {
  profile_id: string;
  name: string | null;
}

interface Props {
  provider: ProposeTarget;
  onClose: () => void;
}

/**
 * Proposes a PENDING 1:1 session slot. Overlap prevention is
 * enforced by the sessions_no_overlap trigger; we surface its
 * 23514 error message directly.
 */
export default function ProposeSessionModal({ provider, onClose }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useAuth();
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (!when) {
      setError("Pick a date and time.");
      return;
    }
    const scheduledAt = new Date(when);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      setError("The proposed time must be in the future.");
      return;
    }

    setBusy(true);
    const { data, error: insertError } = await supabase
      .from("sessions")
      .insert({
        requester_id: user.id,
        provider_id: provider.profile_id,
        status: "PENDING",
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: duration,
      })
      .select("id")
      .single();
    setBusy(false);

    if (insertError) {
      setError(
        insertError.code === "23514" || insertError.code === "23505"
          ? insertError.message.replace(/^.*:\s*/, "")
          : `Could not propose the session: ${insertError.message}`,
      );
      return;
    }

    onClose();
    router.push(`/sessions/${data.id}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-label="Propose a session"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Propose a 1:1 session</h2>
        <p className="mt-1 text-sm text-slate-500">
          With <strong>{provider.name ?? "this user"}</strong>. They can accept
          or decline — you&apos;ll chat in the session room either way.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="when" className="mb-1 block text-sm font-medium">
              Date &amp; time
            </label>
            <input
              id="when"
              type="datetime-local"
              required
              className="input"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="duration" className="mb-1 block text-sm font-medium">
              Duration
            </label>
            <select
              id="duration"
              className="input"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={120}>120 minutes</option>
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={busy}>
              {busy ? "Sending…" : "Send proposal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import Alert from "@/components/ui/Alert";

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
 * enforced by the sessions_no_overlap trigger; its error is mapped
 * to plain language by friendlyDbError().
 */
export default function ProposeSessionModal({ provider, onClose }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useAuth();
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Lock scroll, move focus in, trap Tab, restore focus on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const list = Array.from(focusables);
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
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
      setError(friendlyDbError(insertError.message));
      return;
    }

    onClose();
    router.push(`/sessions/${data.id}`);
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="flex min-h-full items-center justify-center">
        <div
          ref={panelRef}
          className="card modal-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Propose a session"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-semibold">Propose a 1:1 session</h2>
          <p className="mt-1 text-sm text-slate-600">
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
                ref={firstFieldRef}
                type="datetime-local"
                required
                className="input"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                aria-describedby="when-help"
              />
              <p id="when-help" className="mt-1 text-xs text-slate-500">
                Shown in your local time.
              </p>
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

            {error && <Alert>{error}</Alert>}

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={busy} aria-busy={busy}>
                {busy ? "Sending…" : "Send proposal"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

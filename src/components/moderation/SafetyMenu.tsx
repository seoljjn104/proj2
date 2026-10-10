"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import Alert from "@/components/ui/Alert";

interface Props {
  targetId: string;
  targetName: string;
  sessionId?: string;
}

/**
 * Report or block another member. Blocking removes them from each
 * other's discovery feeds; reporting routes to the admin queue.
 */
export default function SafetyMenu({ targetId, targetName, sessionId }: Props) {
  const supabase = createClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "report" | "block">("menu");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!user || user.id === targetId) return null;

  async function submitReport() {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError("Please describe the issue in a few words.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase.from("reports").insert({
      reporter_id: user!.id,
      reported_id: targetId,
      reason: trimmed,
      session_id: sessionId ?? null,
    });
    setBusy(false);
    if (insertError) {
      setError(friendlyDbError(insertError.message));
      return;
    }
    setDone("Report submitted. An administrator will review it.");
    setMode("menu");
    setReason("");
  }

  async function submitBlock() {
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase.from("blocks").insert({
      blocker_id: user!.id,
      blocked_id: targetId,
    });
    setBusy(false);
    if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
      setError(friendlyDbError(insertError.message));
      return;
    }
    setDone(`You blocked ${targetName}. They will no longer appear in your feeds.`);
    setMode("menu");
  }

  function close() {
    setOpen(false);
    setMode("menu");
    setError(null);
    setDone(null);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="btn-secondary"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        Safety
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Safety options for ${targetName}`}
          className="card absolute right-0 z-10 mt-2 w-80 shadow-lg"
        >
          {mode === "menu" && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">
                {targetName}
              </p>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => {
                  setError(null);
                  setMode("report");
                }}
              >
                Report a problem
              </button>
              <button
                type="button"
                className="btn-danger w-full"
                onClick={() => {
                  setError(null);
                  setMode("block");
                }}
              >
                Block this member
              </button>
              <button type="button" className="btn-secondary w-full" onClick={close}>
                Close
              </button>
            </div>
          )}

          {mode === "report" && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submitReport();
              }}
            >
              <label htmlFor="report-reason" className="block text-sm font-medium">
                What happened?
              </label>
              <textarea
                id="report-reason"
                className="input min-h-[84px]"
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="No-shows, abuse, spam…"
              />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" disabled={busy}>
                  {busy ? "Sending…" : "Submit report"}
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  disabled={busy}
                  onClick={() => setMode("menu")}
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {mode === "block" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                Block <strong>{targetName}</strong>? You won&apos;t see each
                other in the Marketplace or Matches. You can undo this later.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-danger flex-1"
                  disabled={busy}
                  onClick={() => void submitBlock()}
                >
                  {busy ? "Blocking…" : "Block"}
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  disabled={busy}
                  onClick={() => setMode("menu")}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && <Alert>{error}</Alert>}
          {done && (
            <p
              role="status"
              className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
            >
              {done}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

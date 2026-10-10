"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError, friendlyFunctionError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import type { Session } from "@/types/database";
import Alert from "@/components/ui/Alert";

interface Props {
  session: Session;
  onUpdate: (session: Session) => void;
}

/**
 * Session lifecycle controls:
 *   provider  : ACCEPT / DECLINE a proposal
 *   anyone    : CANCEL, COMPLETE (when allowed)
 *   on accept : create the embedded Jitsi room (retryable)
 */
export default function SessionActions({ session, onUpdate }: Props) {
  const supabase = createClient();
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!user) return null;
  const isProvider = user.id === session.provider_id;
  const isRequester = user.id === session.requester_id;
  if (!isProvider && !isRequester) return null;

  async function patch(update: Partial<Session>, label: string): Promise<Session | null> {
    setBusy(label);
    setError(null);
    const { data, error: updateError } = await supabase
      .from("sessions")
      .update(update)
      .eq("id", session.id)
      .select("*")
      .single();
    setBusy(null);
    if (updateError) {
      setError(friendlyDbError(updateError.message));
      return null;
    }
    const next = data as Session;
    onUpdate(next);
    return next;
  }

  async function generateLink(target: Session = session) {
    setBusy("link");
    setError(null);
    setInfo(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "generate-meeting-link",
        { body: { session_id: target.id } },
      );
      if (fnError) {
        setError(await friendlyFunctionError(fnError));
        return;
      }
      const link = (data as { meeting_link?: string })?.meeting_link;
      if (link) {
        onUpdate({ ...target, meeting_link: link });
        setInfo("Meeting room is ready.");
      }
    } catch (err) {
      setError(await friendlyFunctionError(err));
    } finally {
      setBusy(null);
    }
  }

  async function accept() {
    const next = await patch({ status: "ACCEPTED" }, "accept");
    if (next) await generateLink(next);
  }

  const terminal = session.status === "COMPLETED" || session.status === "CANCELLED";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {session.status === "PENDING" && isProvider && (
          <>
            <button
              type="button"
              className="btn-primary"
              disabled={busy !== null}
              aria-busy={busy === "accept"}
              onClick={() => void accept()}
            >
              {busy === "accept" ? "Accepting…" : "Accept & create room"}
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={busy !== null}
              onClick={() => void patch({ status: "CANCELLED" }, "decline")}
            >
              {busy === "decline" ? "Declining…" : "Decline"}
            </button>
          </>
        )}

        {session.status === "PENDING" && isRequester && (
          <button
            type="button"
            className="btn-danger"
            disabled={busy !== null}
            onClick={() => void patch({ status: "CANCELLED" }, "cancel")}
          >
            {busy === "cancel" ? "Cancelling…" : "Cancel proposal"}
          </button>
        )}

        {session.status === "ACCEPTED" && (
          <>
            {!session.meeting_link && (
              <button
                type="button"
                className="btn-primary"
                disabled={busy !== null}
                aria-busy={busy === "link"}
                onClick={() => void generateLink()}
              >
                {busy === "link" ? "Creating…" : "Create meeting room"}
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              disabled={busy !== null}
              onClick={() => void patch({ status: "COMPLETED" }, "complete")}
            >
              {busy === "complete" ? "Completing…" : "Mark completed"}
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={busy !== null}
              onClick={() => void patch({ status: "CANCELLED" }, "cancel")}
            >
              Cancel session
            </button>
          </>
        )}

        {terminal && (
          <span className="text-sm text-slate-600">
            This session is closed.
          </span>
        )}
      </div>

      {session.status === "ACCEPTED" && session.meeting_link && (
        <a
          href={session.meeting_link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-flex"
        >
          Open in a new tab
        </a>
      )}

      {error && <Alert>{error}</Alert>}
      {info && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {info}
        </p>
      )}
    </div>
  );
}

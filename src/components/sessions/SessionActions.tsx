"use client";

import { useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Session } from "@/types/database";

interface Props {
  session: Session;
  onUpdate: (session: Session) => void;
}

async function friendlyFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      // fall through to generic message
    }
  }
  if (error instanceof Error) return error.message;
  return "The meeting service returned an error.";
}

function friendlyDbError(message: string): string {
  if (message.includes("overlaps an existing")) {
    return "That time slot overlaps another session for one of you.";
  }
  if (message.includes("scheduled time is required")) {
    return "This session has no scheduled time.";
  }
  if (message.includes("Only the provider can accept")) {
    return "Only the provider can accept this proposal.";
  }
  if (message.includes("terminal") || message.includes("cannot change status")) {
    return "This session is already closed.";
  }
  return message;
}

/**
 * Session lifecycle controls:
 *   provider  : ACCEPT / DECLINE a proposal
 *   anyone    : CANCEL, COMPLETE (when allowed)
 *   on accept : serverless Zoom link generation (retryable)
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
        setInfo("Meeting link ready.");
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
              onClick={() => void accept()}
            >
              {busy === "accept" ? "Accepting…" : "Accept & generate link"}
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
                onClick={() => void generateLink()}
              >
                {busy === "link"
                  ? "Generating…"
                  : "Generate 1:1 meeting link"}
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
          <span className="text-sm text-slate-500">
            This session is closed.
          </span>
        )}
      </div>

      {session.status === "ACCEPTED" && session.meeting_link && (
        <a
          href={session.meeting_link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex"
        >
          Join 1:1 call
        </a>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {info}
        </p>
      )}
    </div>
  );
}

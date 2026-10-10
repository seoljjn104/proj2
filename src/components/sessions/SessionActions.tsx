"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError, friendlyFunctionError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import {
  actorFor,
  canCancel,
  canComplete,
  canRespond,
  isTerminal,
} from "@/lib/session";
import type { Session } from "@/types/database";
import Alert from "@/components/ui/Alert";

interface Props {
  session: Session;
  onUpdate: (session: Session) => void;
  onDeleted?: () => void;
}

/**
 * Session lifecycle controls, backed by the SECURITY DEFINER RPCs so the
 * transition rules live in one place (SQL) and cannot be bypassed:
 *   provider  : accept or decline a pending proposal
 *   both      : cancel pending/accepted, complete accepted
 *   on accept : create the embedded Jitsi room (retryable)
 */
export default function SessionActions({ session, onUpdate, onDeleted }: Props) {
  const supabase = createClient();
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  if (!user) return null;
  const actor = actorFor(user.id, session.requester_id, session.provider_id);
  if (actor === "OBSERVER") return null;

  async function reloadRow(): Promise<Session | null> {
    const { data, error: readError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", session.id)
      .single();
    if (readError) {
      setError(friendlyDbError(readError.message));
      return null;
    }
    const next = data as Session;
    onUpdate(next);
    return next;
  }

  async function callRpc(
    fn: string,
    args: Record<string, unknown>,
    label: string,
  ): Promise<boolean> {
    setBusy(label);
    setError(null);
    setInfo(null);
    const { error: rpcError } = await supabase.rpc(fn, args);
    setBusy(null);
    if (rpcError) {
      setError(friendlyDbError(rpcError.message));
      return false;
    }
    await reloadRow();
    return true;
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
    const ok = await callRpc(
      "respond_session",
      { p_session_id: session.id, p_accept: true, p_reason: null },
      "accept",
    );
    if (ok) {
      const fresh = await reloadRow();
      await generateLink(fresh ?? session);
    }
  }

  async function decline() {
    const reason = declineReason.trim();
    const ok = await callRpc(
      "respond_session",
      {
        p_session_id: session.id,
        p_accept: false,
        p_reason: reason.length > 0 ? reason : null,
      },
      "decline",
    );
    if (ok) setShowDecline(false);
  }

  async function cancel() {
    await callRpc("cancel_session", { p_session_id: session.id }, "cancel");
  }

  async function complete() {
    await callRpc("complete_session", { p_session_id: session.id }, "complete");
  }

  async function remove() {
    setBusy("remove");
    setError(null);
    const { error: rpcError } = await supabase.rpc("delete_session", {
      p_session_id: session.id,
    });
    setBusy(null);
    if (rpcError) {
      setError(friendlyDbError(rpcError.message));
      return;
    }
    onDeleted?.();
  }

  const busyAny = busy !== null;
  const canAcceptDecline = canRespond(session.status, actor);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canAcceptDecline && !showDecline && (
          <>
            <button
              type="button"
              className="btn-primary"
              disabled={busyAny}
              aria-busy={busy === "accept"}
              onClick={() => void accept()}
            >
              {busy === "accept" ? "Accepting…" : "Accept & create room"}
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={busyAny}
              onClick={() => {
                setError(null);
                setShowDecline(true);
              }}
            >
              Decline
            </button>
          </>
        )}

        {canCancel(session.status, actor) && (
          <button
            type="button"
            className="btn-danger"
            disabled={busyAny}
            aria-busy={busy === "cancel"}
            onClick={() => void cancel()}
          >
            {busy === "cancel"
              ? "Cancelling…"
              : session.status === "PENDING"
                ? "Withdraw proposal"
                : "Cancel session"}
          </button>
        )}

        {canComplete(session.status, actor) && (
          <button
            type="button"
            className="btn-secondary"
            disabled={busyAny}
            aria-busy={busy === "complete"}
            onClick={() => void complete()}
          >
            {busy === "complete" ? "Completing…" : "Mark completed"}
          </button>
        )}

        {session.status === "ACCEPTED" && !session.meeting_link && (
          <button
            type="button"
            className="btn-primary"
            disabled={busyAny}
            aria-busy={busy === "link"}
            onClick={() => void generateLink()}
          >
            {busy === "link" ? "Creating…" : "Create meeting room"}
          </button>
        )}

        {isTerminal(session.status) && onDeleted && (
          <button
            type="button"
            className="btn-secondary"
            disabled={busyAny}
            aria-busy={busy === "remove"}
            onClick={() => void remove()}
          >
            {busy === "remove" ? "Removing…" : "Remove from history"}
          </button>
        )}
      </div>

      {showDecline && (
        <form
          className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void decline();
          }}
        >
          <label
            htmlFor="decline-reason"
            className="block text-sm font-medium text-slate-700"
          >
            Reason (optional)
          </label>
          <textarea
            id="decline-reason"
            className="input min-h-[72px] w-full"
            maxLength={240}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Let them know why, so they can try another time."
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-danger" disabled={busyAny}>
              {busy === "decline" ? "Declining…" : "Confirm decline"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={busyAny}
              onClick={() => {
                setShowDecline(false);
                setDeclineReason("");
              }}
            >
              Keep proposal
            </button>
          </div>
        </form>
      )}

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

      {session.status === "DECLINED" && session.decline_reason && (
        <p className="text-sm text-slate-600">
          Reason given: {session.decline_reason}
        </p>
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

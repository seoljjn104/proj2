"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import SessionActions from "@/components/sessions/SessionActions";
import SessionStatusBadge from "@/components/sessions/SessionStatusBadge";
import ReviewSection from "@/components/sessions/ReviewSection";
import SessionTodoList from "@/components/sessions/SessionTodoList";
import { useSessionRoom } from "@/components/sessions/useSessionRoom";
import { useSessionMessages } from "@/components/chat/useSessionMessages";
import SafetyMenu from "@/components/moderation/SafetyMenu";
import Alert from "@/components/ui/Alert";
import Avatar from "@/components/ui/Avatar";
import { VideoIcon } from "@/components/layout/icons";

interface Props {
  sessionId: string;
}

function formatSlot(iso: string | null): string {
  if (!iso) return "No time scheduled";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Active Session view: header + lifecycle actions + shared to-do + realtime
 * chat. The session, the partner, the swapped skills and the live status all
 * come from `useSessionRoom`, so the call routes read the same rows.
 */
export default function SessionChat({ sessionId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { session, partner, teachSkill, learnSkill, loading, missing, updateSession } =
    useSessionRoom(sessionId);
  const { messages, error: chatError, sending, send } =
    useSessionMessages(sessionId);

  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottomRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
    });
  }, [messages]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const ok = await send(text);
    if (ok) setText("");
  }

  if (loading) {
    return <div className="skeleton h-96" aria-busy="true" />;
  }

  if (missing || !session || !user) {
    return (
      <div className="card text-center">
        <h1 className="text-lg font-semibold">Session not found</h1>
        <p className="mt-1 text-sm text-slate-600">
          It may have been removed, or it isn&apos;t yours to view.
        </p>
        <Link href="/sessions" className="btn-secondary mt-4 inline-flex">
          Back to sessions
        </Link>
      </div>
    );
  }

  const isRequester = session.requester_id === user.id;
  const partnerName = partner?.name ?? "The other participant";
  const partnerId = isRequester ? session.provider_id : session.requester_id;
  const swapTitle =
    teachSkill && learnSkill ? `${teachSkill} ⇄ ${learnSkill}` : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1 text-sm font-medium text-teal-800 hover:text-teal-900"
        >
          <span aria-hidden="true">←</span> All sessions
        </Link>
        <div className="card mt-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              {swapTitle && (
                <p className="mb-1 text-[11px] font-bold tracking-[0.09em] text-teal-800 uppercase">
                  The swap
                </p>
              )}
              <h1 className="display text-xl text-ink sm:text-2xl">
                {swapTitle ?? `Session with ${partnerName}`}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Avatar name={partnerName} src={partner?.avatar_url} size="sm" />
                <span className="text-sm font-medium text-slate-700">
                  With {partnerName}
                </span>
                <SessionStatusBadge status={session.status} />
              </div>
              <p className="mt-1.5 text-sm text-slate-600">
                <span className="font-medium text-slate-700">
                  {formatSlot(session.scheduled_at)}
                </span>
                <span aria-hidden className="mx-1.5 text-slate-300">
                  ·
                </span>
                {session.duration_minutes} min
                <span aria-hidden className="mx-1.5 text-slate-300">
                  ·
                </span>
                {isRequester ? "you proposed" : "they proposed"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                You are the {isRequester ? "requester" : "provider"}.
              </p>
            </div>
            <SafetyMenu
              targetId={partnerId}
              targetName={partnerName}
              sessionId={session.id}
            />
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <SessionActions
              session={session}
              onUpdate={updateSession}
              onDeleted={() => router.push("/sessions")}
            />
          </div>
        </div>
      </div>

      {/* Join the call — dedicated full-screen room, ink in both themes */}
      {session.status === "ACCEPTED" && (
        <div className="card flex flex-wrap items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <VideoIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="section-title">1:1 video with {partnerName}</h2>
            <p className="mt-1 text-sm text-ink2">
              Check your camera and mic first, then join. The room opens full
              screen and stays dark in both themes.
            </p>
          </div>
          <Link
            href={`/sessions/${session.id}/precall`}
            className="btn-primary shrink-0"
          >
            Prepare and join
          </Link>
        </div>
      )}

      {/* To do — shared with the other participant, live over Realtime */}
      <SessionTodoList sessionId={session.id} partnerName={partnerName} />

      {/* Chat */}
      <div className="card flex h-[65dvh] min-h-[24rem] flex-col p-0 sm:h-[34rem] lg:h-[38rem]">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="section-title">Session chat</h2>
        </div>

        <div
          role="log"
          aria-live="polite"
          aria-label="Session chat messages"
          className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
        >
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No messages yet. Say hi and confirm what you&apos;ll exchange.
            </p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    mine
                      ? "bg-teal-700 text-onbrand"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={`mt-1 text-[11px] ${
                      mine ? "text-teal-50" : "text-slate-600"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={onSend}
          className="flex gap-2 border-t border-slate-100 p-3"
        >
          <input
            className="input flex-1"
            placeholder="Write a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            aria-label="Message"
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={sending || !text.trim()}
            aria-busy={sending}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
        {chatError && (
          <div className="p-3 pt-0">
            <Alert>{chatError}</Alert>
          </div>
        )}
      </div>

      {/* Reviews (unlocked once COMPLETED) */}
      <ReviewSection session={session} />
    </div>
  );
}

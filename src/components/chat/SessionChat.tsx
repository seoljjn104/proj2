"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Message, ProfileDirectory, Session } from "@/types/database";
import SessionActions from "@/components/sessions/SessionActions";
import SessionStatusBadge from "@/components/sessions/SessionStatusBadge";
import ReviewSection from "@/components/sessions/ReviewSection";

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
 * Active Session view: header + lifecycle actions + realtime chat.
 * Subscribes to public.messages (new messages) and public.sessions
 * (status / meeting_link changes) over Supabase Realtime.
 */
export default function SessionChat({ sessionId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [partner, setPartner] = useState<ProfileDirectory | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const seenIds = useRef<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [sessionResult, messagesResult] = await Promise.all([
      supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle(),
      supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);

    const loaded = sessionResult.data as Session | null;
    if (!loaded) {
      setMissing(true);
      setLoading(false);
      return;
    }
    setSession(loaded);

    const loadedMessages = (messagesResult.data as Message[]) ?? [];
    setMessages(loadedMessages);
    seenIds.current = new Set(loadedMessages.map((m) => m.id));

    const partnerId =
      loaded.requester_id === user.id
        ? loaded.provider_id
        : loaded.requester_id;
    const { data: dirRows } = await supabase.rpc("get_profile_directory", {
      p_ids: [partnerId],
    });
    const partnerRow = ((dirRows as ProfileDirectory[] | null) ?? [])[0] ?? null;
    setPartner(partnerRow);

    setLoading(false);
  }, [supabase, user, sessionId]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  // Realtime: new chat messages + live session status changes.
  useEffect(() => {
    if (authLoading || !user) return;

    const messageChannel = supabase.channel(`session-messages-${sessionId}`);
    messageChannel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        const incoming = payload.new as Message;
        if (seenIds.current.has(incoming.id)) return;
        seenIds.current.add(incoming.id);
        setMessages((prev) => [...prev, incoming]);
      },
    );
    messageChannel.subscribe();

    const sessionChannel = supabase.channel(`session-status-${sessionId}`);
    sessionChannel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "sessions",
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        setSession((prev) => ({ ...(payload.new as Session), id: prev?.id ?? sessionId }));
      },
    );
    sessionChannel.subscribe();

    return () => {
      void supabase.removeChannel(messageChannel);
      void supabase.removeChannel(sessionChannel);
    };
  }, [supabase, user, authLoading, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!user || !session) return;
    const content = text.trim();
    if (!content) return;

    setSending(true);
    setSendError(null);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        session_id: session.id,
        sender_id: user.id,
        content,
      })
      .select("*")
      .single();
    setSending(false);

    if (error) {
      setSendError(error.message);
      return;
    }
    const inserted = data as Message;
    if (!seenIds.current.has(inserted.id)) {
      seenIds.current.add(inserted.id);
      setMessages((prev) => [...prev, inserted]);
    }
    setText("");
  }

  if (authLoading || loading) {
    return (
      <div className="card h-96 animate-pulse bg-slate-100" aria-busy="true" />
    );
  }

  if (missing || !session || !user) {
    return (
      <div className="card text-center">
        <h1 className="text-lg font-semibold">Session not found</h1>
        <p className="mt-1 text-sm text-slate-500">
          It may have been removed, or it isn&apos;t yours to view.
        </p>
      </div>
    );
  }

  const isRequester = session.requester_id === user.id;
  const partnerName = partner?.name ?? "The other participant";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight">
                {partnerName}
              </h1>
              <SessionStatusBadge status={session.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {isRequester ? "You proposed" : `${partnerName} proposed`} ·{" "}
              {formatSlot(session.scheduled_at)} ·{" "}
              {session.duration_minutes} min
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              You are the <strong>{isRequester ? "requester" : "provider"}</strong>{" "}
              of this 1:1 exchange.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <SessionActions session={session} onUpdate={setSession} />
        </div>
      </div>

      {/* Chat */}
      <div className="card flex h-[32rem] flex-col p-0">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Session chat
          </h2>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              No messages yet — say hi and confirm what you&apos;ll exchange.
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
                      ? "bg-teal-600 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      mine ? "text-teal-100" : "text-slate-400"
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
          >
            {sending ? "…" : "Send"}
          </button>
        </form>
        {sendError && (
          <p className="bg-red-50 px-4 py-2 text-xs text-red-700">
            {sendError}
          </p>
        )}
      </div>

      {/* Reviews (unlocked once COMPLETED) */}
      <ReviewSection session={session} />
    </div>
  );
}

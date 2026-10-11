"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import type { Message } from "@/types/database";

export interface SessionMessages {
  messages: Message[];
  loading: boolean;
  /** Loading or sending failure, already mapped to friendly copy. */
  error: string | null;
  sending: boolean;
  send: (content: string) => Promise<boolean>;
}

/**
 * The chat for one session, live over Realtime. RLS restricts rows to the two
 * participants, so this never filters by hand.
 *
 * One data layer for both presentations: the paper card on the session page and
 * the ink sheet inside the call (R17: "same data as the desktop — nothing
 * forks").
 */
export function useSessionMessages(sessionId: string): SessionMessages {
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const seenIds = useRef<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error: loadError } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (loadError) {
      setError(friendlyDbError(loadError.message));
      setLoading(false);
      return;
    }
    const rows = (data as Message[]) ?? [];
    setMessages(rows);
    seenIds.current = new Set(rows.map((m) => m.id));
    setLoading(false);
  }, [supabase, user, sessionId]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  useEffect(() => {
    if (authLoading || !user) return;

    const channel = supabase.channel(`session-messages-${sessionId}`);
    channel.on(
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
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user, authLoading, sessionId]);

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!user || !trimmed) return false;

      setSending(true);
      setError(null);
      const { data, error: sendErr } = await supabase
        .from("messages")
        .insert({ session_id: sessionId, sender_id: user.id, content: trimmed })
        .select("*")
        .single();
      setSending(false);

      if (sendErr) {
        setError(friendlyDbError(sendErr.message));
        return false;
      }
      const inserted = data as Message;
      if (!seenIds.current.has(inserted.id)) {
        seenIds.current.add(inserted.id);
        setMessages((prev) => [...prev, inserted]);
      }
      return true;
    },
    [supabase, user, sessionId],
  );

  return { messages, loading: authLoading || loading, error, sending, send };
}

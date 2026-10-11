"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import type { SessionTodo } from "@/types/database";

export const MAX_TODO_LEN = 200;

export interface SessionTodos {
  todos: SessionTodo[];
  loading: boolean;
  error: string | null;
  /** The row currently being written, so it can disable itself. */
  busyId: string | null;
  doneCount: number;
  /** The next item still to do — what the call rail calls "Now". */
  current: SessionTodo | null;
  add: (body: string) => Promise<boolean>;
  toggle: (todo: SessionTodo) => Promise<void>;
  remove: (todo: SessionTodo) => Promise<void>;
}

/**
 * The shared to-do list for one session, so the two participants agree what the
 * swap will cover. RLS restricts every row to the two participants (mirroring
 * `messages`), so this never filters by hand; changes arrive live over Realtime.
 *
 * One data layer for both presentations: the paper card on the session page and
 * the ink sheet inside the call.
 */
export function useSessionTodos(sessionId: string): SessionTodos {
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();

  const [todos, setTodos] = useState<SessionTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error: loadError } = await supabase
      .from("session_todos")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (loadError) {
      setError(friendlyDbError(loadError.message));
      setLoading(false);
      return;
    }
    setTodos((data as SessionTodo[]) ?? []);
    setLoading(false);
  }, [supabase, user, sessionId]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  // Realtime: the other participant's edits land as they happen.
  useEffect(() => {
    if (authLoading || !user) return;

    const upsert = (row: SessionTodo) =>
      setTodos((prev) =>
        prev.some((t) => t.id === row.id)
          ? prev.map((t) => (t.id === row.id ? row : t))
          : [...prev, row],
      );

    const channel = supabase.channel(`session-todos-${sessionId}`);
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "session_todos",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => upsert(payload.new as SessionTodo),
    );
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "session_todos",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => upsert(payload.new as SessionTodo),
    );
    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "session_todos",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        const gone = (payload.old as { id?: string }).id;
        if (gone) setTodos((prev) => prev.filter((t) => t.id !== gone));
      },
    );
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user, authLoading, sessionId]);

  const add = useCallback(
    async (body: string) => {
      if (!user) return false;
      const trimmed = body.trim();
      if (!trimmed) return false;

      setError(null);
      const { data, error: insertError } = await supabase
        .from("session_todos")
        .insert({ session_id: sessionId, created_by: user.id, body: trimmed })
        .select("*")
        .single();
      if (insertError) {
        setError(friendlyDbError(insertError.message));
        return false;
      }
      const row = data as SessionTodo;
      setTodos((prev) =>
        prev.some((t) => t.id === row.id) ? prev : [...prev, row],
      );
      return true;
    },
    [supabase, user, sessionId],
  );

  const toggle = useCallback(
    async (todo: SessionTodo) => {
      const next = !todo.done;
      setError(null);
      // Optimistic: a controlled checkbox must not snap back while the write is
      // in flight, and the other participant is watching this row live.
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, done: next } : t)),
      );
      setBusyId(todo.id);
      const { error: updateError } = await supabase
        .from("session_todos")
        .update({ done: next })
        .eq("id", todo.id);
      setBusyId(null);
      if (updateError) {
        setError(friendlyDbError(updateError.message));
        setTodos((prev) =>
          prev.map((t) => (t.id === todo.id ? { ...t, done: !next } : t)),
        );
      }
    },
    [supabase],
  );

  const remove = useCallback(
    async (todo: SessionTodo) => {
      setBusyId(todo.id);
      setError(null);
      const { error: deleteError } = await supabase
        .from("session_todos")
        .delete()
        .eq("id", todo.id);
      setBusyId(null);
      if (deleteError) {
        setError(friendlyDbError(deleteError.message));
        return;
      }
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    },
    [supabase],
  );

  const doneCount = todos.filter((t) => t.done).length;
  const current = todos.find((t) => !t.done) ?? null;

  return {
    todos,
    loading: authLoading || loading,
    error,
    busyId,
    doneCount,
    current,
    add,
    toggle,
    remove,
  };
}

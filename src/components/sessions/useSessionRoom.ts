"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ProfileDirectory, Session } from "@/types/database";

export interface SessionRoomData {
  session: Session | null;
  partner: ProfileDirectory | null;
  /**
   * The skill the requester teaches (`teach_tag_id`) and the skill the provider
   * teaches (`learn_tag_id`). `propose_session` validates each against the
   * matching participant's OFFERED list, so this pairing is the swap itself.
   */
  teachSkill: string | null;
  learnSkill: string | null;
  /** What the other participant teaches — the call's role chip. */
  partnerTeaches: string | null;
  /** Apply a lifecycle change locally so the UI doesn't wait on Realtime. */
  updateSession: (next: Session) => void;
  loading: boolean;
  missing: boolean;
}

/**
 * Loads the session, the other participant, and the two skills being swapped.
 * The pre-call route, the in-call route and the session page all need the same
 * things, so they share one query — and one live subscription, so a cancellation
 * mid-call lands everywhere.
 */
export function useSessionRoom(sessionId: string): SessionRoomData {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [partner, setPartner] = useState<ProfileDirectory | null>(null);
  const [teachSkill, setTeachSkill] = useState<string | null>(null);
  const [learnSkill, setLearnSkill] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    const loaded = data as Session | null;
    if (!loaded) {
      setMissing(true);
      setLoading(false);
      return;
    }
    setSession(loaded);

    const partnerId =
      loaded.requester_id === user.id ? loaded.provider_id : loaded.requester_id;
    const [dirResult, tagsResult] = await Promise.all([
      supabase.rpc("get_profile_directory", { p_ids: [partnerId] }),
      loaded.teach_tag_id || loaded.learn_tag_id
        ? supabase
            .from("skill_tags")
            .select("id, name")
            .in(
              "id",
              [loaded.teach_tag_id, loaded.learn_tag_id].filter(
                (id): id is number => typeof id === "number",
              ),
            )
        : Promise.resolve({ data: [] as { id: number; name: string }[] }),
    ]);

    setPartner(((dirResult.data as ProfileDirectory[] | null) ?? [])[0] ?? null);

    const names = new Map(
      ((tagsResult.data as { id: number; name: string }[] | null) ?? []).map(
        (row) => [Number(row.id), row.name],
      ),
    );
    setTeachSkill(
      loaded.teach_tag_id ? (names.get(Number(loaded.teach_tag_id)) ?? null) : null,
    );
    setLearnSkill(
      loaded.learn_tag_id ? (names.get(Number(loaded.learn_tag_id)) ?? null) : null,
    );

    setLoading(false);
  }, [supabase, user, sessionId]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  useEffect(() => {
    if (authLoading || !user) return;

    const channel = supabase.channel(`session-status-${sessionId}`);
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "sessions",
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        setSession((prev) => ({
          ...(payload.new as Session),
          id: prev?.id ?? sessionId,
        }));
      },
    );
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user, authLoading, sessionId]);

  const partnerTeaches =
    session && user
      ? session.requester_id === user.id
        ? learnSkill
        : teachSkill
      : null;

  return {
    session,
    partner,
    teachSkill,
    learnSkill,
    partnerTeaches,
    updateSession: setSession,
    loading: authLoading || loading,
    missing,
  };
}

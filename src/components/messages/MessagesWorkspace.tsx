"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import type { Message, ProfileDirectory, Session, SessionStatus } from "@/types/database";
import { statusLabel } from "@/lib/session";
import SessionChat from "@/components/chat/SessionChat";
import Avatar from "@/components/ui/Avatar";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";

interface Thread {
  sessionId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  preview: string;
  fromMe: boolean;
  at: string;
  needsYou: boolean;
  /** Which exchange this thread belongs to, so two threads with the same
   * person don't read as the same row. */
  skill: string | null;
  status: SessionStatus;
  scheduledAt: string | null;
}

function contextLine(t: Thread): string {
  const skill = t.skill ?? "Skill exchange";
  const when = t.scheduledAt
    ? new Date(t.scheduledAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;
  return [skill, when, statusLabel(t.status)].filter(Boolean).join(" · ");
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "1d" : `${days}d`;
}

/**
 * Three columns in all: the shell supplies the nav, then threads, then the
 * open conversation. On phones only the thread list shows and a tap opens the
 * session page.
 */
export default function MessagesWorkspace() {
  const supabase = createClient();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: msgError } = await supabase
      .from("messages")
      .select("session_id, sender_id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (msgError) {
      setError(friendlyDbError(msgError.message));
      setThreads([]);
      setLoading(false);
      return;
    }

    const latest = new Map<string, Message>();
    for (const m of (data as Message[]) ?? []) {
      if (!latest.has(m.session_id)) latest.set(m.session_id, m);
    }
    const sessionIds = [...latest.keys()];
    if (sessionIds.length === 0) {
      setThreads([]);
      setLoading(false);
      return;
    }

    const { data: sessRows } = await supabase
      .from("sessions")
      .select(
        "id, requester_id, provider_id, status, scheduled_at, teach_tag_id, learn_tag_id",
      )
      .in("id", sessionIds);
    const sessions = (sessRows as Session[]) ?? [];
    const sessionById = new Map<string, Session>();
    const partnerBySession = new Map<string, string>();
    const partnerIds = new Set<string>();
    const tagIds = new Set<number>();
    for (const s of sessions) {
      const partnerId = s.requester_id === user.id ? s.provider_id : s.requester_id;
      sessionById.set(s.id, s);
      partnerBySession.set(s.id, partnerId);
      partnerIds.add(partnerId);
      if (typeof s.teach_tag_id === "number") tagIds.add(s.teach_tag_id);
      if (typeof s.learn_tag_id === "number") tagIds.add(s.learn_tag_id);
    }

    const skillNames = new Map<number, string>();
    if (tagIds.size > 0) {
      const { data: tagRows } = await supabase
        .from("skill_tags")
        .select("id, name")
        .in("id", [...tagIds]);
      for (const row of (tagRows as { id: number; name: string }[] | null) ?? []) {
        skillNames.set(Number(row.id), row.name);
      }
    }

    const people: Record<string, { name: string; avatar: string | null }> = {};
    if (partnerIds.size > 0) {
      const { data: dir } = await supabase.rpc("get_profile_directory", {
        p_ids: [...partnerIds],
      });
      for (const row of (dir as ProfileDirectory[]) ?? []) {
        people[row.id] = {
          name: row.name ?? "Member",
          avatar: row.avatar_url ?? null,
        };
      }
    }

    setThreads(
      sessionIds
        .map((id) => {
          const m = latest.get(id)!;
          const s = sessionById.get(id);
          const partnerId = partnerBySession.get(id) ?? "";
          const fromMe = m.sender_id === user.id;
          return {
            sessionId: id,
            partnerId,
            partnerName: people[partnerId]?.name ?? "Member",
            partnerAvatar: people[partnerId]?.avatar ?? null,
            preview: m.content,
            fromMe,
            at: m.created_at,
            needsYou: !fromMe && m.read_at == null,
            skill: s?.teach_tag_id
              ? (skillNames.get(Number(s.teach_tag_id)) ?? null)
              : null,
            status: s?.status ?? "PENDING",
            scheduledAt: s?.scheduled_at ?? null,
          };
        })
        .filter((t) => t.partnerId),
    );
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  function pick(id: string) {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setSelected(id);
    } else {
      router.push(`/sessions/${id}`);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col lg:h-[calc(100dvh-4rem)] lg:flex-row">
      {/* Threads */}
      <section
        aria-label="Conversations"
        className="w-full shrink-0 border-line lg:w-[360px] lg:overflow-y-auto lg:border-r"
      >
        <div className="border-b border-line px-5 py-4">
          <h1 className="display text-[24px] text-ink">Messages</h1>
          <p className="mt-0.5 text-xs text-ink3">
            Conversations from your exchanges
          </p>
        </div>

        {loading ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-16" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4">
            <Alert>{error}</Alert>
            <button
              type="button"
              className="btn-secondary mt-3"
              onClick={() => void load()}
            >
              Try again
            </button>
          </div>
        ) : threads.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No conversations yet"
              body="Messages appear here once you and a partner start talking on a session."
            />
          </div>
        ) : (
          <ul className="p-2">
            {threads.map((t) => {
              const active = selected === t.sessionId;
              return (
                <li key={t.sessionId}>
                  <button
                    type="button"
                    onClick={() => pick(t.sessionId)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      active ? "bg-surface shadow-[var(--shadow-card)]" : "hover:bg-surface/70"
                    }`}
                  >
                    <Avatar name={t.partnerName} src={t.partnerAvatar} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-ink">
                          {t.partnerName}
                        </span>
                        {t.needsYou && (
                          <span
                            aria-label="Awaiting your reply"
                            className="h-2 w-2 shrink-0 rounded-full bg-teal-600"
                          />
                        )}
                        <span className="ml-auto shrink-0 text-[11px] text-ink3">
                          {relTime(t.at)}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] font-medium text-ink3">
                        {contextLine(t)}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-ink2">
                        {t.fromMe && <span className="text-ink3">You: </span>}
                        {t.preview}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Conversation (desktop only) */}
      <section
        aria-label="Conversation"
        className="hidden min-w-0 flex-1 lg:block lg:overflow-y-auto"
      >
        {selected ? (
          <div className="p-6">
            <SessionChat sessionId={selected} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <p className="max-w-xs text-center text-sm text-ink3">
              Pick a conversation to read it here. Your chats stay attached to
              each session.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import { actorFor, bucketFor, type SessionBucket } from "@/lib/session";
import type { ProfileDirectory, Session } from "@/types/database";
import SessionStatusBadge from "./SessionStatusBadge";
import Avatar from "@/components/ui/Avatar";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";

interface Enriched {
  session: Session;
  partnerName: string;
  partnerAvatar: string | null;
  partnerId: string;
}

function formatSlot(iso: string | null): string {
  if (!iso) return "No time chosen yet";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** One glanceable summary of your pipeline: who is waiting on you. */
function StatsStrip({
  incoming,
  upcoming,
  completed,
}: {
  incoming: number;
  upcoming: number;
  completed: number;
}) {
  const stats = [
    { label: "Awaiting you", value: incoming, dot: "bg-amber-500" },
    { label: "Upcoming", value: upcoming, dot: "bg-teal-500" },
    { label: "Completed", value: completed, dot: "bg-sky-500" },
  ];
  return (
    <div className="card grid grid-cols-3 divide-x divide-slate-100 overflow-hidden p-0">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col items-center gap-1.5 px-3 py-4"
        >
          <span className="text-2xl font-semibold leading-none tabular-nums text-slate-900">
            {s.value}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SessionList() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false });
    if (queryError) {
      setError(friendlyDbError(queryError.message));
      setRows([]);
      setLoading(false);
      return;
    }
    const sessions = (data as Session[]) ?? [];

    const partnerIds = [
      ...new Set(
        sessions.map((s) =>
          s.requester_id === user.id ? s.provider_id : s.requester_id,
        ),
      ),
    ];
    const people: Record<string, { name: string; avatar: string | null }> = {};
    if (partnerIds.length > 0) {
      const { data: dirRows } = await supabase.rpc("get_profile_directory", {
        p_ids: partnerIds,
      });
      for (const row of (dirRows as ProfileDirectory[]) ?? []) {
        people[row.id] = {
          name: row.name ?? "Member",
          avatar: row.avatar_url ?? null,
        };
      }
    }

    setRows(
      sessions.map((s) => {
        const partnerId =
          s.requester_id === user.id ? s.provider_id : s.requester_id;
        const person = people[partnerId];
        return {
          session: s,
          partnerId,
          partnerName: person?.name ?? "Member",
          partnerAvatar: person?.avatar ?? null,
        };
      }),
    );
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  if (authLoading || loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
    );
  }

  const buckets: Record<SessionBucket, Enriched[]> = {
    incoming: [],
    outgoing: [],
    upcoming: [],
    history: [],
  };
  if (user) {
    for (const row of rows) {
      const actor = actorFor(
        user.id,
        row.session.requester_id,
        row.session.provider_id,
      );
      buckets[bucketFor(row.session.status, actor)].push(row);
    }
  }

  const byNewest = (a: Enriched, b: Enriched) =>
    b.session.created_at.localeCompare(a.session.created_at);
  const bySlot = (a: Enriched, b: Enriched) =>
    (a.session.scheduled_at ?? "").localeCompare(
      b.session.scheduled_at ?? "",
    );
  buckets.incoming.sort(byNewest);
  buckets.outgoing.sort(byNewest);
  buckets.upcoming.sort(bySlot);
  buckets.history.sort(byNewest);

  const completedCount = buckets.history.filter(
    ({ session }) => session.status === "COMPLETED",
  ).length;

  function section(
    title: string,
    items: Enriched[],
    dotClass: string,
    hint?: string,
  ) {
    if (items.length === 0) return null;
    return (
      <section className="mt-8 first:mt-0">
        <h2 className="section-title flex flex-wrap items-center gap-2">
          <span aria-hidden className={`h-2 w-2 rounded-full ${dotClass}`} />
          {title}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
            {items.length}
          </span>
        </h2>
        {hint && <p className="mb-3 mt-1 text-sm text-slate-500">{hint}</p>}
        <ul className={hint ? "space-y-3" : "mt-3 space-y-3"}>
          {items.map(({ session, partnerName, partnerAvatar, partnerId }) => (
            <li key={session.id}>
              <Link
                href={`/sessions/${session.id}`}
                className="card card-interactive group flex flex-wrap items-center gap-3 sm:gap-4"
              >
                <Avatar name={partnerName} src={partnerAvatar} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{partnerName}</p>
                    {session.meeting_link && session.status === "ACCEPTED" && (
                      <span className="chip-teal">
                        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                          <path
                            d="M1 4.5h8.5a1 1 0 011 1v3a1 1 0 01-1 1H4M6.5 4.5L7.5 8M2.5 8.5l1 1a1 1 0 001-1V5.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Link ready
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">
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
                    {session.requester_id === partnerId
                      ? "they proposed"
                      : "you proposed"}
                  </p>
                  {session.status === "PENDING" &&
                    session.proposal_message && (
                      <p className="mt-1.5 line-clamp-1 text-sm text-slate-500">
                        {session.proposal_message}
                      </p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                  <SessionStatusBadge status={session.status} />
                  <svg
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M6 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (error) {
    return (
      <div>
        <Alert>{error}</Alert>
        <button
          type="button"
          className="btn-secondary mt-3"
          onClick={() => void load()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No sessions yet"
        body="Propose a 1:1 slot from the Marketplace or Matching Hub."
        action={
          <Link href="/marketplace" className="btn-primary inline-flex">
            Browse marketplace
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <StatsStrip
        incoming={buckets.incoming.length}
        upcoming={buckets.upcoming.length}
        completed={completedCount}
      />

      {section(
        "Awaiting your response",
        buckets.incoming,
        "bg-amber-500",
        "People who want to learn from you.",
      )}
      {section("Proposals you sent", buckets.outgoing, "bg-sky-500")}
      {section("Upcoming", buckets.upcoming, "bg-teal-500")}
      {section("History", buckets.history, "bg-slate-400")}
    </div>
  );
}
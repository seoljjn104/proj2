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
    const nameMap: Record<string, string> = {};
    if (partnerIds.length > 0) {
      const { data: dirRows } = await supabase.rpc("get_profile_directory", {
        p_ids: partnerIds,
      });
      for (const row of (dirRows as Pick<ProfileDirectory, "id" | "name">[]) ??
        []) {
        nameMap[row.id] = row.name ?? "Member";
      }
    }

    setRows(
      sessions.map((s) => {
        const partnerId =
          s.requester_id === user.id ? s.provider_id : s.requester_id;
        return {
          session: s,
          partnerId,
          partnerName: nameMap[partnerId] ?? "Member",
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

  function section(title: string, items: Enriched[], hint?: string) {
    if (items.length === 0) return null;
    return (
      <section className="mt-8 first:mt-0">
        <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {title}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] tabular-nums text-slate-600">
            {items.length}
          </span>
        </h2>
        {hint && <p className="mb-2 text-sm text-slate-500">{hint}</p>}
        <ul className="space-y-3">
          {items.map(({ session, partnerName, partnerId }) => (
            <li key={session.id}>
              <Link
                href={`/sessions/${session.id}`}
                className="card card-interactive flex flex-wrap items-center gap-4"
              >
                <Avatar name={partnerName} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{partnerName}</p>
                  <p className="text-sm text-slate-600">
                    {formatSlot(session.scheduled_at)} ·{" "}
                    {session.duration_minutes} min ·{" "}
                    {session.requester_id === partnerId
                      ? "they proposed"
                      : "you proposed"}
                  </p>
                  {session.status === "PENDING" &&
                    session.proposal_message && (
                      <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                        “{session.proposal_message}”
                      </p>
                    )}
                </div>
                <SessionStatusBadge status={session.status} />
                {session.status === "ACCEPTED" && session.meeting_link && (
                  <span className="badge-direct">Link ready</span>
                )}
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
      {section(
        "Awaiting your response",
        buckets.incoming,
        "People who want to learn from you.",
      )}
      {section("Proposals you sent", buckets.outgoing)}
      {section("Upcoming", buckets.upcoming)}
      {section("History", buckets.history)}
    </div>
  );
}

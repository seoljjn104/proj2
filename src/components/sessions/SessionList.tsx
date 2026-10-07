"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ProfileDirectory, Session } from "@/types/database";
import SessionStatusBadge from "./SessionStatusBadge";

interface Enriched {
  session: Session;
  partnerName: string;
  partnerId: string;
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

export default function SessionList() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("scheduled_at", { ascending: false });
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
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card h-20 animate-pulse bg-slate-100" />
        ))}
      </div>
    );
  }

  const active = rows
    .filter(
      (r) =>
        (r.session.status === "PENDING" || r.session.status === "ACCEPTED") &&
        r.session.scheduled_at !== null,
    )
    .sort((a, b) =>
      (a.session.scheduled_at ?? "").localeCompare(b.session.scheduled_at ?? ""),
    );
  const past = rows.filter((r) => !active.includes(r));

  function section(title: string, items: Enriched[]) {
    if (items.length === 0) return null;
    return (
      <section className="mt-8 first:mt-0">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        <ul className="space-y-3">
          {items.map(({ session, partnerName, partnerId }) => (
            <li key={session.id}>
              <Link
                href={`/sessions/${session.id}`}
                className="card flex flex-wrap items-center gap-4 transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800">
                  {(partnerName[0] ?? "?").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{partnerName}</p>
                  <p className="text-sm text-slate-500">
                    {formatSlot(session.scheduled_at)} ·{" "}
                    {session.duration_minutes} min ·{" "}
                    {session.requester_id === partnerId
                      ? "they proposed"
                      : "you proposed"}
                  </p>
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

  if (rows.length === 0) {
    return (
      <div className="card text-center">
        <p className="font-medium text-slate-700">No sessions yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Propose a 1:1 slot from the Marketplace or Matching Hub.
        </p>
        <Link href="/marketplace" className="btn-primary mt-4 inline-flex">
          Browse marketplace
        </Link>
      </div>
    );
  }

  return (
    <div>
      {section("Upcoming", active)}
      {section("History", past)}
    </div>
  );
}

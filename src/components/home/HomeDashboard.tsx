"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import { skillKey } from "@/lib/skills";
import type {
  MarketplaceProfile,
  Notification,
  NotificationKind,
  ProfileDirectory,
  ReciprocalMatch,
  Session,
} from "@/types/database";
import PageShell from "@/components/layout/PageShell";
import Avatar from "@/components/ui/Avatar";
import Alert from "@/components/ui/Alert";
import ProposeSessionModal, {
  type ProposeTarget,
} from "@/components/marketplace/ProposeSessionModal";
import {
  CheckCircleIcon,
  SparkIcon,
  TrendIcon,
} from "@/components/layout/icons";

interface Enriched {
  session: Session;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
}

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function longDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function slotParts(iso: string | null) {
  if (!iso) return { day: "TBD", num: "?", full: "No time chosen yet" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase(),
    num: String(d.getDate()),
    full: d.toLocaleString(undefined, {
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

const KIND_ICON: Record<NotificationKind, string> = {
  SESSION_PROPOSED: "am",
  SESSION_ACCEPTED: "em",
  SESSION_DECLINED: "sk",
  SESSION_CANCELLED: "sk",
  SESSION_COMPLETED: "em",
  REVIEW_RECEIVED: "am",
};

function SectionLabel({
  dot,
  children,
  action,
}: {
  dot?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink3">
      {dot && <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${dot}`} />}
      {children}
      {action && <span className="ml-auto">{action}</span>}
    </p>
  );
}

function SkillChip({ tone, children }: { tone: "em" | "sk"; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[12.5px] font-semibold ${
        tone === "em"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-sky-50 text-sky-700"
      }`}
    >
      {children}
    </span>
  );
}

export default function HomeDashboard() {
  const supabase = createClient();
  const { user, profile, loading: authLoading } = useAuth();

  const [offered, setOffered] = useState<string[]>([]);
  const [wanted, setWanted] = useState<string[]>([]);
  const [sessions, setSessions] = useState<Enriched[]>([]);
  const [matches, setMatches] = useState<ReciprocalMatch[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [demand, setDemand] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposing, setProposing] = useState<ProposeTarget | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [skillsRes, sessionsRes, matchesRes, notifsRes, feedRes] =
        await Promise.all([
          supabase.from("user_skills").select("type, tag_id").eq("user_id", user.id),
          supabase.from("sessions").select("*").order("created_at", { ascending: false }),
          supabase.rpc("get_reciprocal_matches", { p_user_id: user.id }),
          supabase
            .from("notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(3),
          supabase.rpc("get_marketplace_feed", { p_limit: 200 }),
        ]);

      if (skillsRes.error) throw skillsRes.error;
      if (sessionsRes.error) throw sessionsRes.error;

      const skillRows = (skillsRes.data as { type: string; tag_id: number }[]) ?? [];
      const tagIds = [...new Set(skillRows.map((r) => r.tag_id))];
      const nameById: Record<number, string> = {};
      if (tagIds.length > 0) {
        const { data: tags } = await supabase
          .from("skill_tags")
          .select("id, name")
          .in("id", tagIds);
        for (const t of (tags as { id: number; name: string }[]) ?? []) {
          nameById[t.id] = t.name;
        }
      }
      const myOffered = skillRows
        .filter((r) => r.type === "OFFERED")
        .map((r) => nameById[r.tag_id])
        .filter(Boolean);
      const myWanted = skillRows
        .filter((r) => r.type === "WANTED")
        .map((r) => nameById[r.tag_id])
        .filter(Boolean);
      setOffered(myOffered);
      setWanted(myWanted);

      const sess = (sessionsRes.data as Session[]) ?? [];
      const partnerIds = [
        ...new Set(
          sess.map((s) => (s.requester_id === user.id ? s.provider_id : s.requester_id)),
        ),
      ];
      const people: Record<string, { name: string; avatar: string | null }> = {};
      if (partnerIds.length > 0) {
        const { data: dir } = await supabase.rpc("get_profile_directory", {
          p_ids: partnerIds,
        });
        for (const row of (dir as ProfileDirectory[]) ?? []) {
          people[row.id] = {
            name: row.name ?? "Member",
            avatar: row.avatar_url ?? null,
          };
        }
      }
      setSessions(
        sess.map((s) => {
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

      setMatches((matchesRes.data as ReciprocalMatch[]) ?? []);
      setNotifs((notifsRes.data as Notification[]) ?? []);

      if (!feedRes.error) {
        const feed = (feedRes.data as MarketplaceProfile[]) ?? [];
        // Demand = members who want something *you* teach, which is what the
        // nudge claims. (Counting their offers would answer a different
        // question than the sentence asks.)
        const offeredKeys = new Set(myOffered.map(skillKey));
        const count = feed.filter((p) =>
          p.wanted.some((s) => offeredKeys.has(skillKey(s))),
        ).length;
        setDemand(count);
      }
    } catch (e) {
      setError(friendlyDbError(e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  const incoming = useMemo(
    () =>
      sessions
        .filter((s) => s.session.provider_id === user?.id && s.session.status === "PENDING")
        .sort((a, b) => b.session.created_at.localeCompare(a.session.created_at)),
    [sessions, user],
  );

  const nextSession = useMemo(() => {
    const now = Date.now();
    return sessions
      .filter(
        (s) =>
          s.session.status === "ACCEPTED" &&
          s.session.scheduled_at &&
          new Date(s.session.scheduled_at).getTime() >= now - 3600_000,
      )
      .sort((a, b) =>
        (a.session.scheduled_at ?? "").localeCompare(b.session.scheduled_at ?? ""),
      )[0];
  }, [sessions]);

  const completedCount = useMemo(
    () => sessions.filter((s) => s.session.status === "COMPLETED").length,
    [sessions],
  );

  const freshMatches = useMemo(() => matches.slice(0, 3), [matches]);

  const firstName = (profile?.name ?? "").trim().split(/\s+/)[0] || "there";

  if (authLoading || (loading && !error)) {
    return (
      <PageShell
        rail={
          <div className="space-y-4" aria-busy="true">
            <div className="skeleton h-40" />
            <div className="skeleton h-52" />
          </div>
        }
      >
        <div className="space-y-4" aria-busy="true">
          <div className="skeleton h-20 w-2/3" />
          <div className="skeleton h-44" />
          <div className="skeleton h-20" />
          <div className="skeleton h-40" />
        </div>
      </PageShell>
    );
  }

  const rail = (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-surface p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink3">
          Your swap
        </p>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
          You teach
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {offered.length ? (
            offered.map((s) => (
              <SkillChip key={s} tone="em">
                {s}
              </SkillChip>
            ))
          ) : (
            <span className="text-xs text-ink3">Nothing listed yet</span>
          )}
        </div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-sky-700">
          You want to learn
        </p>
        <div className="flex flex-wrap gap-2">
          {wanted.length ? (
            wanted.map((s) => (
              <SkillChip key={s} tone="sk">
                {s}
              </SkillChip>
            ))
          ) : (
            <span className="text-xs text-ink3">Nothing listed yet</span>
          )}
        </div>
        <div className="mt-4">
          <Link href="/profile" className="text-[13px] font-semibold text-teal-700 hover:text-teal-800">
            Edit your skills
          </Link>
        </div>
      </div>

      {notifs.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink3">
            Lately
          </p>
          <ul className="space-y-1">
            {notifs.map((n) => {
              const tone = KIND_ICON[n.kind];
              const toneClass =
                tone === "am"
                  ? "bg-amber-50 text-amber-700"
                  : tone === "em"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-sky-50 text-sky-700";
              const body = (
                <>
                  <span
                    aria-hidden
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toneClass}`}
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">
                      {n.title}
                    </span>
                    <span className="block text-xs text-ink3">
                      {n.body ?? relTime(n.created_at)}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={n.id}>
                  {n.session_id ? (
                    <Link
                      href={`/sessions/${n.session_id}`}
                      className="flex items-start gap-3 rounded-lg py-2 transition-colors hover:bg-slate-50"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 py-2">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface p-5 text-center">
        <p className="mb-2 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-ink3">
          Your exchange
        </p>
        <p className="display text-[34px] text-ink">{completedCount}</p>
        <p className="text-[13px] text-ink2">
          swap{completedCount === 1 ? "" : "s"} completed
        </p>
      </div>
    </div>
  );

  return (
    <PageShell rail={rail}>
      {error && (
        <div className="mb-6">
          <Alert>{error}</Alert>
          <button type="button" className="btn-secondary mt-3" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {/* Greeting */}
      <header className="mb-7">
        <p className="eyebrow">{longDate()}</p>
        <h1 className="display mt-2 text-[32px] text-ink sm:text-[38px]">
          {greetingWord()}, {firstName}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-ink2">
          {incoming.length > 0
            ? `${incoming.length} proposal${incoming.length === 1 ? "" : "s"} waiting on you`
            : freshMatches.length > 0
              ? `${freshMatches.length} new match${freshMatches.length === 1 ? "" : "es"} to look at`
              : "Nothing needs you right now"}
          {nextSession?.session.scheduled_at
            ? `, and your next session is ${slotParts(nextSession.session.scheduled_at).full}.`
            : "."}
        </p>
      </header>

      {/* Waiting on you */}
      {incoming.length > 0 && (
        <section className="mb-8">
          <SectionLabel dot="bg-amber-500">Waiting on you</SectionLabel>
          <div className="space-y-3">
            {incoming.slice(0, 2).map(({ session, partnerName, partnerAvatar }) => (
              <article
                key={session.id}
                className="rounded-xl border border-line border-l-[3px] border-l-amber-500 bg-surface p-5 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={partnerName} src={partnerAvatar} size="lg" />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {partnerName} wants to swap
                    </p>
                    <p className="text-xs text-ink3">
                      Asked {relTime(session.created_at)}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
                    Needs an answer
                  </span>
                </div>
                {session.proposal_message && (
                  <p className="mt-3 text-[13.5px] italic leading-relaxed text-ink2">
                    “{session.proposal_message}”
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Link href={`/sessions/${session.id}`} className="btn-primary">
                    Review and respond
                  </Link>
                  <Link href={`/sessions/${session.id}`} className="btn-secondary">
                    Message
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Up next */}
      {nextSession && (
        <section className="mb-8">
          <SectionLabel dot="bg-teal-500">Up next</SectionLabel>
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-5">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-paper">
              <span className="text-[10.5px] font-bold tracking-[0.1em] text-teal-700">
                {slotParts(nextSession.session.scheduled_at).day}
              </span>
              <span className="display text-[23px] leading-none text-ink">
                {slotParts(nextSession.session.scheduled_at).num}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                Session with {nextSession.partnerName}
              </p>
              <p className="text-[12.5px] text-ink3">
                {slotParts(nextSession.session.scheduled_at).full} ·{" "}
                {nextSession.session.duration_minutes} minutes
              </p>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
              <Link
                href={`/sessions/${nextSession.session.id}`}
                className="btn-secondary"
              >
                Open
              </Link>
              {nextSession.session.status === "ACCEPTED" && (
                <Link
                  href={`/sessions/${nextSession.session.id}/precall`}
                  className="btn-primary"
                >
                  Prepare and join
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* New matches */}
      <section className="mb-8">
        <SectionLabel
          dot="bg-emerald-500"
          action={
            matches.length > 3 ? (
              <Link href="/matches" className="font-semibold normal-case tracking-normal text-teal-700">
                See all {matches.length}
              </Link>
            ) : undefined
          }
        >
          New matches
        </SectionLabel>
        {freshMatches.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-6 text-sm text-ink2">
            No direct matches yet. Add OFFERED and WANTED skills so the grid can pair
            you.{" "}
            <Link href="/profile" className="font-semibold text-teal-700">
              Edit your skills
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {freshMatches.map((m) => (
              <article key={m.partner_id} className="flex flex-col rounded-xl border border-line bg-surface p-4">
                <Avatar name={m.partner_name} src={m.partner_avatar_url} size="lg" className="mb-3" />
                <p className="font-semibold text-ink">
                  {m.partner_name ?? "Member"}
                </p>
                <div className="mt-3 flex flex-col gap-1.5">
                  <SkillChip tone="em">
                    You teach {m.skills_you_teach?.[0] ?? "a skill"}
                  </SkillChip>
                  <SkillChip tone="sk">
                    You learn {m.skills_you_gain?.[0] ?? "a skill"}
                  </SkillChip>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProposing({ profile_id: m.partner_id, name: m.partner_name })
                  }
                  className="btn-secondary mt-3 w-full"
                >
                  Propose a session
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Demand nudge — only when there is no match card already saying it */}
      {demand !== null &&
        offered.length > 0 &&
        demand > 0 &&
        freshMatches.length === 0 && (
        <section className="flex flex-wrap items-center gap-4 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-paper p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <TrendIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">
              {offered[0]} is in demand this week
            </p>
            <p className="mt-0.5 text-[13.5px] text-ink2">
              {demand} {demand === 1 ? "person wants" : "people want"} to learn
              something you can teach.
            </p>
          </div>
          <Link href="/marketplace" className="btn-primary shrink-0">
            Browse the grid
          </Link>
        </section>
      )}

      {/* Quiet empty state */}
      {incoming.length === 0 && !nextSession && freshMatches.length === 0 && (
        <div className="rounded-xl border border-line bg-surface p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <SparkIcon className="h-6 w-6" />
          </span>
          <p className="mt-4 font-semibold text-ink">Your grid is quiet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink2">
            Add your skills, then browse the marketplace to find someone to swap
            with.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/marketplace" className="btn-primary">
              Browse the grid
            </Link>
            <Link href="/profile" className="btn-secondary">
              Edit your skills
            </Link>
          </div>
        </div>
      )}

      {proposing && (
        <ProposeSessionModal
          provider={proposing}
          onClose={() => setProposing(null)}
        />
      )}
    </PageShell>
  );
}

"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import type { Notification, NotificationKind } from "@/types/database";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** Icon colour carries the meaning of the event, using the locked palette. */
const KIND_STYLE: Record<NotificationKind, string> = {
  SESSION_PROPOSED: "bg-amber-50 text-amber-700",
  SESSION_ACCEPTED: "bg-emerald-50 text-emerald-700",
  SESSION_DECLINED: "bg-red-50 text-red-600",
  SESSION_CANCELLED: "bg-slate-100 text-slate-600",
  SESSION_COMPLETED: "bg-teal-50 text-teal-700",
  REVIEW_RECEIVED: "bg-amber-50 text-amber-600",
};

function KindIcon({ kind }: { kind: NotificationKind }) {
  const paths: Record<NotificationKind, ReactNode> = {
    SESSION_PROPOSED: (
      <path
        d="M8 2.5a3.5 3.5 0 00-3.5 3.5v3l-1 1.5h9l-1-1.5V6A3.5 3.5 0 008 2.5zM6 12.5a2 2 0 004 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    SESSION_ACCEPTED: (
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    SESSION_DECLINED: (
      <path
        d="M4.5 4.5l7 7M11.5 4.5l-7 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    ),
    SESSION_CANCELLED: (
      <path
        d="M4 8h8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    ),
    SESSION_COMPLETED: (
      <path
        d="M2.5 8.5l3 3 8-8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    REVIEW_RECEIVED: (
      <path
        d="M8 2.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6L8 10.7l-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z"
        fill="currentColor"
      />
    ),
  };
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      {paths[kind]}
    </svg>
  );
}

/**
 * In-app notifications. Rows are created by SECURITY DEFINER triggers
 * on sessions/reviews; the recipient can only read, mark read, or
 * delete their own.
 */
export default function NotificationList() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (queryError) {
      setError(friendlyDbError(queryError.message));
      setItems([]);
    } else {
      setItems((data as Notification[]) ?? []);
    }
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  async function markRead(id: number) {
    setItems((prev) =>
      prev.map((n) => (n.id === id && !n.read_at
        ? { ...n, read_at: new Date().toISOString() }
        : n)),
    );
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .is("read_at", null);
  }

  async function markAllRead() {
    if (!user) return;
    setBusy(true);
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null);
    setBusy(false);
    if (updateError) {
      setError(friendlyDbError(updateError.message));
      return;
    }
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-16" />
        ))}
      </div>
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

  if (items.length === 0) {
    return (
      <EmptyState
        title="No notifications"
        body="Proposals, responses, and completed sessions show up here."
      />
    );
  }

  const unreadItems = items.filter((n) => !n.read_at);
  const readItems = items.filter((n) => n.read_at);

  function renderRow(n: Notification) {
    const unreadNow = !n.read_at;
    const row = (
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${KIND_STYLE[n.kind]}`}
        >
          <KindIcon kind={n.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm ${
              unreadNow
                ? "font-semibold text-slate-900"
                : "font-medium text-slate-600"
            }`}
          >
            {n.title}
          </p>
          {n.body && (
            <p
              className={`mt-0.5 text-sm ${unreadNow ? "text-slate-700" : "text-slate-600"}`}
            >
              {n.body}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            {relativeTime(n.created_at)}
          </p>
        </div>
        {n.session_id && (
          <svg
            aria-hidden
            className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5"
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
        )}
      </div>
    );
    return (
      <li
        key={n.id}
        className={`card group transition-colors ${
          unreadNow ? "border-l-[3px] border-l-teal-500" : ""
        } ${n.session_id ? "hover:bg-slate-50" : ""}`}
      >
        {n.session_id ? (
          <Link
            href={`/sessions/${n.session_id}`}
            className="block"
            onClick={() => void markRead(n.id)}
          >
            {row}
          </Link>
        ) : (
          <div>{row}</div>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-6">
      {unreadItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <span aria-hidden className="h-2 w-2 rounded-full bg-teal-500" />
            <span className="font-semibold text-slate-700">
              {unreadItems.length}
            </span>
            unread
          </p>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => void markAllRead()}
          >
            {busy ? "Updating…" : "Mark all as read"}
          </button>
        </div>
      )}

      {unreadItems.length > 0 && (
        <section>
          <h2 className="section-title mb-3">Unread</h2>
          <ul className="space-y-3">{unreadItems.map(renderRow)}</ul>
        </section>
      )}

      {readItems.length > 0 && (
        <section>
          <h2 className="section-title mb-3">Earlier</h2>
          <ul className="space-y-3">{readItems.map(renderRow)}</ul>
        </section>
      )}
    </div>
  );
}
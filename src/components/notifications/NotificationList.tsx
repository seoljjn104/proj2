"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import type { Notification } from "@/types/database";
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

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-4">
      {unread > 0 && (
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full bg-teal-500"
            />
            <span className="font-semibold text-slate-700">{unread}</span>
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

      <ul className="space-y-3">
        {items.map((n) => {
          const unreadNow = !n.read_at;
          const body = (
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  unreadNow
                    ? "bg-teal-50 text-teal-700"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                  <path
                    d="M8 2.5a3.5 3.5 0 00-3.5 3.5v3l-1 1.5h9l-1-1.5V6A3.5 3.5 0 008 2.5zM6 12.5a2 2 0 004 0"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm ${
                      unreadNow
                        ? "font-semibold text-slate-900"
                        : "font-medium text-slate-600"
                    }`}
                  >
                    {n.title}
                  </p>
                  {unreadNow && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                      New
                    </span>
                  )}
                </div>
                {n.body && (
                  <p className={`mt-0.5 text-sm ${unreadNow ? "text-slate-700" : "text-slate-600"}`}>
                    {n.body}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {relativeTime(n.created_at)}
                </p>
              </div>
            </div>
          );
          return (
            <li
              key={n.id}
              className={`card relative overflow-hidden ${
                unreadNow ? "border-l-[3px] border-l-teal-500" : ""
              }`}
            >
              {n.session_id ? (
                <Link
                  href={`/sessions/${n.session_id}`}
                  className="block"
                  onClick={() => void markRead(n.id)}
                >
                  {body}
                </Link>
              ) : (
                <div>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
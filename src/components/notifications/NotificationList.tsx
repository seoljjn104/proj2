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
          <p className="text-sm text-slate-500">
            {unread} unread
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

      <ul className="space-y-2">
        {items.map((n) => {
          const body = (
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                  n.read_at ? "bg-slate-200" : "bg-teal-600"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${
                    n.read_at
                      ? "font-medium text-slate-600"
                      : "font-semibold text-slate-900"
                  }`}
                >
                  {n.title}
                </p>
                {n.body && (
                  <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {relativeTime(n.created_at)}
                  {!n.read_at && (
                    <span className="sr-only"> — unread</span>
                  )}
                </p>
              </div>
            </div>
          );
          return (
            <li key={n.id} className={`card ${!n.read_at ? "ring-1 ring-teal-100" : ""}`}>
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

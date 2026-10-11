"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Notification, NotificationKind } from "@/types/database";
import { CheckCircleIcon, NotificationsIcon } from "./icons";

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

const KIND_STYLE: Record<NotificationKind, string> = {
  SESSION_PROPOSED: "bg-amber-50 text-amber-700",
  SESSION_ACCEPTED: "bg-emerald-50 text-emerald-700",
  SESSION_DECLINED: "bg-slate-100 text-ink2",
  SESSION_CANCELLED: "bg-slate-100 text-ink2",
  SESSION_COMPLETED: "bg-emerald-50 text-emerald-700",
  REVIEW_RECEIVED: "bg-teal-50 text-teal-700",
};

/**
 * Top-bar bell. Shows the unread count and opens a compact panel of the latest
 * events. The full list lives at /notifications; this is the glance.
 */
export default function NotificationsMenu() {
  const supabase = createClient();
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    if (!user) {
      setUnread(0);
      return;
    }
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .is("read_at", null);
    setUnread(count ?? 0);
  }, [supabase, user]);

  const loadItems = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6);
    setItems((data as Notification[]) ?? []);
  }, [supabase, user]);

  useEffect(() => {
    if (loading) return;
    void refreshCount();
  }, [loading, refreshCount, pathname]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => void refreshCount(), 60000);
    return () => window.clearInterval(id);
  }, [user, refreshCount]);

  useEffect(() => {
    if (!open) return;
    void loadItems();
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loadItems]);

  async function markAllRead() {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    setUnread(0);
    setItems((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
    );
  }

  if (loading || !user) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        title="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink2 transition-colors hover:border-slate-300 hover:text-ink"
      >
        <NotificationsIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold tabular-nums text-onbrand ring-2 ring-paper">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between border-b border-line2 px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink3">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {items.map((n) => {
                const body = (
                  <>
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${KIND_STYLE[n.kind]}`}
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink2">
                        {n.body}
                      </span>
                      <span className="mt-1 block text-[11px] text-ink3">
                        {relTime(n.created_at)}
                      </span>
                    </span>
                    {!n.read_at && (
                      <span
                        aria-hidden
                        className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500"
                      />
                    )}
                  </>
                );
                return (
                  <li key={n.id}>
                    {n.session_id ? (
                      <Link
                        href={`/sessions/${n.session_id}`}
                        onClick={() => setOpen(false)}
                        className="flex gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="flex gap-3 px-4 py-2.5">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-line2 p-1.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-center text-[13px] font-semibold text-teal-700 transition-colors hover:bg-slate-50"
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

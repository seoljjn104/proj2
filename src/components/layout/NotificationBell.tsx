"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Nav link to /notifications with an unread count. Polls on mount and
 * whenever the route changes (notifications use polling, not Realtime).
 */
export default function NotificationBell() {
  const supabase = createClient();
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
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

  useEffect(() => {
    if (loading) return;
    void refresh();
  }, [loading, refresh, pathname]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => void refresh(), 60000);
    return () => window.clearInterval(id);
  }, [user, refresh]);

  const active = pathname === "/notifications";

  return (
    <Link
      href="/notifications"
      aria-current={active ? "page" : undefined}
      aria-label={
        unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
      }
      className={`relative shrink-0 rounded-lg px-3 py-1.5 font-medium transition-colors ${
        active
          ? "bg-teal-50 text-teal-800"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      Notifications
      {unread > 0 && (
        <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-teal-700 px-1.5 text-[11px] font-semibold tabular-nums text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

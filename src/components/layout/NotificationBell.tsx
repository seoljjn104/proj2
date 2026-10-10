"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import NavItem from "./NavItem";
import { NotificationsIcon } from "./icons";

interface Props {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * Navigation row for /notifications with an unread count. Polls on mount and
 * whenever the route changes (notifications are polled, not realtime).
 */
export default function NotificationBell({ collapsed = false, onNavigate }: Props) {
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

  const badge =
    unread > 0 ? (
      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-teal-700 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
        {unread > 99 ? "99+" : unread}
      </span>
    ) : null;

  return (
    <NavItem
      href="/notifications"
      label="Notifications"
      icon={NotificationsIcon}
      active={pathname === "/notifications"}
      collapsed={collapsed}
      ariaLabel={
        unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
      }
      badge={badge}
      onClick={onNavigate}
    />
  );
}

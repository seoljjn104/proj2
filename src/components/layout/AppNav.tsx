"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import BrandMark from "@/components/ui/BrandMark";
import NavItem from "@/components/layout/NavItem";
import {
  AdminIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
  MarketplaceIcon,
  MatchesIcon,
  MessagesIcon,
  SessionsIcon,
} from "@/components/layout/icons";

const MAIN_LINKS = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/marketplace", label: "Marketplace", icon: MarketplaceIcon },
  { href: "/matches", label: "Matches", icon: MatchesIcon },
  { href: "/sessions", label: "Sessions", icon: SessionsIcon },
  { href: "/messages", label: "Messages", icon: MessagesIcon },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Wordmark() {
  return (
    <span className="display flex items-center gap-2 text-[19px] text-ink">
      <BrandMark />
      <span>
        Skill<span className="text-teal-700">GRID</span>
      </span>
    </span>
  );
}

/**
 * Desktop sidebar. Collapsible, with the primary destinations at the top and
 * the collapse control pinned to the footer. Screens below lg get the top bar
 * and the bottom tab bar instead (see TopBar / MobileTabBar). The account menu
 * lives on the top-bar avatar only — it used to be duplicated down here, where
 * its panel overflowed the sidebar and was clipped.
 */
export default function AppNav() {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [collapsed, setCollapsed] = useState(false);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setMatchCount(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.rpc("get_reciprocal_matches", {
        p_user_id: user.id,
      });
      if (!cancelled) setMatchCount(((data as unknown[] | null) ?? []).length);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  return (
    <aside
      className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-line bg-side motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out lg:flex ${
        collapsed ? "w-[76px]" : "w-[236px]"
      }`}
    >
      <div
        className={`flex h-16 shrink-0 items-center border-b border-line ${
          collapsed ? "justify-center px-2" : "px-4"
        }`}
      >
        <Link href="/home" aria-label="SkillGRID home" className="rounded-lg">
          {collapsed ? <BrandMark /> : <Wordmark />}
        </Link>
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {MAIN_LINKS.map((l) => (
          <NavItem
            key={l.href}
            href={l.href}
            label={l.label}
            icon={l.icon}
            active={isActive(pathname, l.href)}
            collapsed={collapsed}
            badge={
              l.href === "/matches" && matchCount > 0 ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-emerald-700">
                  {matchCount}
                </span>
              ) : undefined
            }
          />
        ))}
        {isAdmin && (
          <NavItem
            href="/admin"
            label="Admin"
            icon={AdminIcon}
            tone="amber"
            active={isActive(pathname, "/admin")}
            collapsed={collapsed}
          />
        )}
      </nav>

      <div className="border-t border-line p-3">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-9 w-full items-center justify-center rounded-xl text-ink3 transition-colors hover:bg-surface hover:text-ink"
        >
          {collapsed ? (
            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <>
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              <span className="ml-1 text-xs font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

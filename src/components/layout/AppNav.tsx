"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/ui/Avatar";
import BrandMark from "@/components/ui/BrandMark";
import NotificationBell from "@/components/layout/NotificationBell";

const LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/matches", label: "Matches" },
  { href: "/sessions", label: "Sessions" },
  { href: "/profile", label: "Profile" },
];

export default function AppNav() {
  const pathname = usePathname();
  const { user, profile, isAdmin, signOut, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link
          href="/marketplace"
          className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-slate-900"
        >
          <BrandMark />
          Skill<span className="text-teal-700">GRID</span>
        </Link>

        <nav
          aria-label="Primary"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm [scrollbar-width:none]"
        >
          {LINKS.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  active
                    ? "bg-teal-50 text-teal-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          {!loading && user && <NotificationBell />}
          {isAdmin && (
            <Link
              href="/admin"
              aria-current={pathname.startsWith("/admin") ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-amber-50 text-amber-800"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        {!loading && user && (
          <div className="flex shrink-0 items-center gap-3 text-sm">
            <span className="hidden items-center gap-2 text-slate-600 sm:flex">
              <Avatar name={profile?.name ?? user.email} size="sm" />
              <span className="max-w-40 truncate">
                {profile?.name ?? user.email}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="btn-secondary"
              disabled={signingOut}
              aria-busy={signingOut}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

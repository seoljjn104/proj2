"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/matches", label: "Matching Hub" },
  { href: "/sessions", label: "Sessions" },
  { href: "/profile", label: "My Profile" },
];

export default function AppNav() {
  const pathname = usePathname();
  const { user, profile, isAdmin, signOut, loading } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link
          href="/marketplace"
          className="text-lg font-semibold tracking-tight text-slate-900"
        >
          Skill<span className="text-teal-700">GRID</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  active
                    ? "bg-teal-50 text-teal-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-amber-50 text-amber-800"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {!loading && user && (
            <>
              <span className="hidden items-center gap-2 text-slate-500 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800">
                  {(profile?.name ?? user.email ?? "?").trim().charAt(0).toUpperCase()}
                </span>
                {profile?.name ?? user.email}
              </span>
              <button onClick={() => void signOut()} className="btn-secondary">
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

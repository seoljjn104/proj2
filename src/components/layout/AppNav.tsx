"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/ui/Avatar";
import BrandMark from "@/components/ui/BrandMark";
import NavItem from "@/components/layout/NavItem";
import NotificationBell from "@/components/layout/NotificationBell";
import {
  AdminIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  LogOutIcon,
  MarketplaceIcon,
  MatchesIcon,
  MenuIcon,
  ProfileIcon,
  SessionsIcon,
} from "@/components/layout/icons";

const MAIN_LINKS = [
  { href: "/marketplace", label: "Marketplace", icon: MarketplaceIcon },
  { href: "/matches", label: "Matches", icon: MatchesIcon },
  { href: "/sessions", label: "Sessions", icon: SessionsIcon },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
      <BrandMark />
      <span>
        Skill<span className="text-teal-700">GRID</span>
      </span>
    </span>
  );
}

/**
 * App shell navigation. A collapsible left sidebar on desktop and a slide-in
 * drawer behind a top bar on small screens. Both render the same `NavItem`
 * rows so the two stay visually identical.
 */
export default function AppNav() {
  const pathname = usePathname();
  const { user, profile, isAdmin, signOut, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.name ?? user?.email ?? "";
  const secondary = profile?.name ? user?.email ?? "" : "";

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // A route change always means the tapped link was followed.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock scroll, trap focus and wire Escape while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        ) ?? [],
      );

    focusables()[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  function navLinks(onNavigate?: () => void) {
    const isCollapsed = collapsed && !onNavigate;
    return (
      <nav aria-label="Primary" className="flex flex-col gap-1">
        {MAIN_LINKS.map((l) => (
          <NavItem
            key={l.href}
            href={l.href}
            label={l.label}
            icon={l.icon}
            active={isActive(pathname, l.href)}
            collapsed={isCollapsed}
            onClick={onNavigate}
          />
        ))}
        {!loading && user && (
          <NotificationBell collapsed={isCollapsed} onNavigate={onNavigate} />
        )}
        {!loading && user && (
          <NavItem
            href="/profile"
            label="Profile"
            icon={ProfileIcon}
            active={isActive(pathname, "/profile")}
            collapsed={isCollapsed}
            onClick={onNavigate}
          />
        )}
        {isAdmin && (
          <NavItem
            href="/admin"
            label="Admin"
            icon={AdminIcon}
            tone="amber"
            active={isActive(pathname, "/admin")}
            collapsed={isCollapsed}
            onClick={onNavigate}
          />
        )}
      </nav>
    );
  }

  function accountBlock(onNavigate?: () => void) {
    if (loading || !user) return null;
    return (
      <div>
        <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-1.5">
          <Avatar name={displayName} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-slate-900">
              {displayName}
            </span>
            {secondary && (
              <span className="block truncate text-xs text-slate-500">
                {secondary}
              </span>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            void handleSignOut();
          }}
          className="btn-secondary w-full"
          disabled={signingOut}
          aria-busy={signingOut}
        >
          <LogOutIcon className="h-4 w-4" aria-hidden="true" />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav"
          className="-ml-1 flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <MenuIcon className="h-6 w-6" aria-hidden="true" />
        </button>
        <Link href="/marketplace" aria-label="SkillGRID home">
          <Wordmark />
        </Link>
        {!loading && user && (
          <span className="ml-auto">
            <Avatar name={displayName} size="sm" />
          </span>
        )}
      </header>

      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out lg:flex ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div
          className={`flex h-16 shrink-0 items-center border-b border-slate-200 ${
            collapsed ? "justify-center px-2" : "px-4"
          }`}
        >
          <Link
            href="/marketplace"
            aria-label="SkillGRID home"
            className="rounded-lg"
          >
            {collapsed ? <BrandMark /> : <Wordmark />}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">{navLinks()}</div>

        <div className="border-t border-slate-200 p-3">
          {!loading && user && (
            <div className="mb-2">
              {collapsed ? (
                <span
                  className="flex justify-center py-1.5"
                  title={displayName}
                >
                  <Avatar name={displayName} size="sm" />
                </span>
              ) : (
                <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                  <Avatar name={displayName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {displayName}
                    </span>
                    {secondary && (
                      <span className="block truncate text-xs text-slate-500">
                        {secondary}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
          {!loading && user && (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              aria-label="Sign out"
              title={collapsed ? "Sign out" : undefined}
              className={
                collapsed
                  ? "flex h-11 w-full items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  : "btn-secondary w-full"
              }
              disabled={signingOut}
              aria-busy={signingOut}
            >
              <LogOutIcon className="h-4 w-4" aria-hidden="true" />
              {!collapsed && (signingOut ? "Signing out…" : "Sign out")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="mt-2 flex h-9 w-full items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col border-r border-slate-200 bg-white shadow-[var(--shadow-panel)] motion-safe:animate-[drawer-in_220ms_cubic-bezier(0.22,1,0.36,1)]"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 pl-4 pr-2">
              <Link
                href="/marketplace"
                aria-label="SkillGRID home"
                onClick={closeDrawer}
                className="rounded-lg"
              >
                <Wordmark />
              </Link>
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  menuButtonRef.current?.focus();
                }}
                aria-label="Close navigation"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <CloseIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {navLinks(closeDrawer)}
            </div>
            <div className="border-t border-slate-200 p-3">
              {accountBlock(closeDrawer)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

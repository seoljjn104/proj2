"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AccountMenu from "./AccountMenu";
import NotificationsMenu from "./NotificationsMenu";
import ThemeToggle from "@/components/ui/ThemeToggle";
import BrandMark from "@/components/ui/BrandMark";
import { SearchIcon } from "./icons";

/**
 * The app's chrome. On desktop the search field sits centred on the bar with
 * the account controls to the right; on mobile the wordmark takes the left and
 * search collapses to an icon that jumps to the marketplace.
 */
export default function TopBar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/marketplace?q=${encodeURIComponent(term)}` : "/marketplace");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line surface-blur">
      {/* Mobile */}
      <div className="flex items-center gap-2 px-3 py-2.5 min-[360px]:px-4 lg:hidden">
        <Link
          href="/home"
          aria-label="SkillGRID home"
          className="display flex min-w-0 items-center gap-2 text-lg text-ink"
        >
          <BrandMark />
          <span className="truncate">
            Skill<span className="text-teal-700">GRID</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/marketplace"
            aria-label="Search skills"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink2 transition-colors hover:text-ink"
          >
            <SearchIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          </Link>
          <NotificationsMenu />
          <ThemeToggle className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink2 transition-colors hover:border-slate-300 hover:text-ink" />
          <AccountMenu compact placement="bottom" align="right" />
        </div>
      </div>

      {/* Desktop: centred search */}
      <div className="hidden items-center px-6 py-3 lg:grid lg:grid-cols-[1fr_minmax(0,440px)_1fr] lg:gap-4">
        <span aria-hidden="true" />
        <form role="search" onSubmit={onSubmit} className="w-full">
          <label htmlFor="global-search" className="sr-only">
            Search skills, people, sessions
          </label>
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3"
              aria-hidden="true"
            />
            <input
              id="global-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skills, people, sessions…"
              className="w-full rounded-full border border-line bg-surface py-2.5 pl-11 pr-4 text-sm text-ink shadow-[var(--shadow-card)] outline-none transition-colors placeholder:text-ink3 focus:border-teal-400"
            />
          </div>
        </form>
        <div className="flex items-center justify-end gap-2">
          <NotificationsMenu />
          <ThemeToggle className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink2 transition-colors hover:border-slate-300 hover:text-ink" />
          <AccountMenu compact placement="bottom" align="right" />
        </div>
      </div>
    </header>
  );
}

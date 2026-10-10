import type { ReactNode } from "react";
import Link from "next/link";
import SkipLink from "@/components/ui/SkipLink";
import BrandMark from "@/components/ui/BrandMark";

/**
 * Auth shell — a deliberate one-per-page inversion: a deep "ink" brand panel
 * (desktop only) selling the exchange, and a clean light form column that
 * keeps the layout stable between login and signup.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh">
      <SkipLink />

      {/* Brand panel — desktop only; the form column carries the story on mobile. */}
      <aside className="brand-panel relative hidden w-1/2 flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div aria-hidden className="brand-panel-grid pointer-events-none absolute inset-0" />

        <Link
          href="/"
          className="relative flex w-fit items-center gap-2 text-lg font-semibold tracking-tight text-white"
        >
          <BrandMark />
          Skill<span className="text-teal-300">GRID</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            One teacher, one learner, one session.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
            SkillGRID pairs you with someone whose wants match your offers, then
            gets you face to face.
          </p>

          <div className="mt-8 rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/10">
            <span className="badge-direct">Direct match</span>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-200">You teach</span>
                <span className="chip-offered">Python</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-200">You learn</span>
                <span className="chip-wanted">Spanish</span>
              </div>
            </div>
            <div className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">
              Then you swap — one 1:1 session, no credits.
            </div>
          </div>
        </div>

        <p className="relative text-xs text-slate-400">
          Peer-to-peer skill exchange · two people, one session at a time
        </p>
      </aside>

      {/* Form column */}
      <main
        id="main"
        className="auth-bg relative flex w-full flex-1 flex-col items-center justify-center px-5 py-12"
      >
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 lg:hidden"
        >
          <BrandMark />
          Skill<span className="text-teal-700">GRID</span>
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
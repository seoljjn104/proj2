import type { ReactNode } from "react";
import Link from "next/link";
import SkipLink from "@/components/ui/SkipLink";
import BrandMark from "@/components/ui/BrandMark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-bg flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <SkipLink />
      <Link
        href="/"
        className="mb-6 flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 transition-colors hover:text-teal-800"
      >
        <BrandMark />
        Skill<span className="text-teal-700">GRID</span>
      </Link>
      <main id="main" className="w-full">
        {children}
      </main>
      <p className="mt-8 text-xs text-slate-500">
        Peer-to-peer skill exchange · two people, one session at a time
      </p>
    </div>
  );
}

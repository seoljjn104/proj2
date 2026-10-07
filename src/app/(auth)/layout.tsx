import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-bg flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-6 text-lg font-semibold tracking-tight text-teal-700 transition-colors hover:text-teal-800"
      >
        Skill<span className="text-slate-900">GRID</span>
      </Link>
      {children}
      <p className="mt-8 text-xs text-slate-400">
        Peer-to-peer skill exchange · two people, one session at a time
      </p>
    </main>
  );
}

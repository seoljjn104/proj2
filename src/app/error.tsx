"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="auth-bg relative flex min-h-dvh flex-col items-center justify-center overflow-x-clip px-4 py-12 text-center">
      <div aria-hidden className="grid-motif pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <p className="relative text-sm font-semibold text-red-600">Something went wrong</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        We couldn&apos;t load this page
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
        A temporary problem stopped this page from loading. Try again, and if it
        keeps happening, come back in a bit.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/marketplace" className="btn-secondary">
          Go to marketplace
        </Link>
      </div>
    </div>
  );
}

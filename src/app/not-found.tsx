import Link from "next/link";

export default function NotFound() {
  return (
    <div className="auth-bg relative flex min-h-dvh flex-col items-center justify-center overflow-x-clip px-4 py-12 text-center">
      <div aria-hidden className="grid-motif pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <p className="relative text-sm font-semibold tabular-nums text-teal-700">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        This page doesn&apos;t exist
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
        The link may be broken, or the page may have moved. Head back to the
        marketplace to keep swapping skills.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/marketplace" className="btn-primary">
          Go to marketplace
        </Link>
        <Link href="/" className="btn-secondary">
          Back home
        </Link>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

/**
 * Branded empty state: a faint blueprint grid behind a small motif icon,
 * then the message and optional action. Reused across lists so "nothing
 * here" never looks like an afterthought.
 */
export default function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card relative overflow-hidden text-center">
      <div aria-hidden className="grid-motif pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative px-6 py-10">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <svg viewBox="0 0 20 20" className="h-6 w-6" aria-hidden="true">
            <rect x="4" y="4" width="5" height="5" rx="1" fill="currentColor" />
            <rect x="11" y="4" width="5" height="5" rx="1" fill="currentColor" opacity="0.35" />
            <rect x="4" y="11" width="5" height="5" rx="1" fill="currentColor" opacity="0.35" />
            <rect x="11" y="11" width="5" height="5" rx="1" fill="currentColor" />
          </svg>
        </span>
        <p className="mt-4 font-semibold text-slate-900">{title}</p>
        {body && (
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-600">
            {body}
          </p>
        )}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
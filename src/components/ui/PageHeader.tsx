import type { ReactNode } from "react";

/**
 * Consistent page header for every authenticated surface. Title + optional
 * subtitle on the left; optional count chip and actions on the right. One
 * rhythm across Marketplace, Matches, Sessions, Profile and Admin.
 */
export default function PageHeader({
  title,
  subtitle,
  count,
  action,
}: {
  title: string;
  subtitle?: string;
  count?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="max-w-2xl">
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {count && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tabular-nums text-slate-600">
            {count}
          </span>
        )}
        {action}
      </div>
    </div>
  );
}
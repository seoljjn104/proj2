import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  count?: string;
  action?: ReactNode;
}

/**
 * Consistent page header for every authenticated surface. Eyebrow + title +
 * optional subtitle on the left; optional count chip and actions on the right.
 * One rhythm across Marketplace, Matches, Sessions, Profile and Admin.
 */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  count,
  action,
}: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 animate-fade-up">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
      {(count || action) && (
        <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">
          {count && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tabular-nums text-slate-600">
              {count}
            </span>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
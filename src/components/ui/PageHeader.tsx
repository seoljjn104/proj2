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
 * The title carries the Fraunces display voice; one rhythm across Marketplace,
 * Matches, Sessions, Messages and Profile.
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
        <h1 className="display mt-2 text-balance text-[26px] text-ink sm:text-[30px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-ink2">{subtitle}</p>
        )}
      </div>
      {(count || action) && (
        <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">
          {count && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tabular-nums text-ink2">
              {count}
            </span>
          )}
          {action}
        </div>
      )}
    </div>
  );
}

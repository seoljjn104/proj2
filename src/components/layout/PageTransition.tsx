"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * A short entrance on every route change, so navigating reads as a change of
 * place rather than a hard cut. Keyed on the pathname so React remounts the
 * wrapper and replays the animation; search-only changes (e.g. the marketplace
 * query) do not re-trigger it.
 *
 * Disabled entirely under `prefers-reduced-motion` (see globals.css).
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-enter flex min-w-0 flex-1 flex-col">
      {children}
    </div>
  );
}

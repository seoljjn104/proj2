import type { ReactNode } from "react";

/**
 * Option A page frame: content capped at 1400px and centred, with an optional
 * detail rail on the right at lg and up. Below lg the rail is dropped and the
 * content runs single-column.
 * 
 * The rail stays pinned to the right edge of the viewport (not the centred
 * content), so collapsing the left sidebar doesn't shift it.
 */
export default function PageShell({
  children,
  rail,
}: {
  children: ReactNode;
  rail?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-1 flex-col lg:flex-row">
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 lg:max-w-[1400px] lg:mx-auto">
        {children}
      </div>
      {rail ? (
        <aside className="hidden w-[384px] shrink-0 border-l border-line bg-surface2 px-6 py-7 lg:block lg:sticky lg:top-16 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
          {rail}
        </aside>
      ) : null}
    </div>
  );
}

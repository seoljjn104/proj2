import type { ReactNode } from "react";

/**
 * Option A page frame: content capped at 1400px and centred, with an optional
 * detail rail on the right at lg and up. Below lg the rail is dropped and the
 * content runs single-column.
 */
export default function PageShell({
  children,
  rail,
}: {
  children: ReactNode;
  rail?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col lg:flex-row">
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </div>
      {rail ? (
        <aside className="hidden w-[384px] shrink-0 border-l border-line bg-surface2 px-6 py-7 lg:block">
          {rail}
        </aside>
      ) : null}
    </div>
  );
}

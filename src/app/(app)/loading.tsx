import BrandMark from "@/components/ui/BrandMark";

/**
 * Full-route skeleton shown while the app shell mounts on navigation.
 * Mirrors the real shell (sidebar + top bar + content) so the swap feels
 * instant.
 */
export default function AppLoading() {
  return (
    <div aria-busy="true" className="flex min-h-screen">
      <aside className="hidden w-[236px] shrink-0 flex-col border-r border-line bg-side p-4 lg:flex">
        <span className="mb-6 flex items-center gap-2 opacity-50">
          <BrandMark />
          <span className="display text-[19px] text-ink">
            Skill<span className="text-teal-700">GRID</span>
          </span>
        </span>
        <div className="space-y-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="skeleton block h-11 rounded-[10px]" />
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-line surface-blur">
          <div className="grid grid-cols-[1fr_minmax(0,440px)_1fr] items-center gap-4 px-6 py-3">
            <span aria-hidden />
            <span className="skeleton h-10 rounded-full" />
            <div className="flex justify-end gap-2">
              <span className="skeleton h-10 w-10 rounded-full" />
              <span className="skeleton h-10 w-10 rounded-full" />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <span className="skeleton h-8 w-52 rounded-full" />
          <span className="skeleton mt-3 h-4 w-80 rounded-full" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card">
                <span className="skeleton h-10 w-10 rounded-full" />
                <span className="skeleton mt-4 h-4 w-3/4 rounded-full" />
                <span className="skeleton mt-2 h-4 w-1/2 rounded-full" />
                <div className="mt-4 flex gap-1.5">
                  <span className="skeleton h-6 w-16 rounded-full" />
                  <span className="skeleton h-6 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

import BrandMark from "@/components/ui/BrandMark";

/**
 * Full-route skeleton shown while the app shell mounts on navigation.
 * Mirrors the real layout (header + page) so the swap feels instant.
 */
export default function AppLoading() {
  return (
    <div aria-busy="true" className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <span className="flex shrink-0 items-center gap-2 opacity-40">
            <BrandMark />
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              Skill<span className="text-teal-700">GRID</span>
            </span>
          </span>

          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="skeleton h-8 w-20 shrink-0 rounded-lg" />
            ))}
            <span className="skeleton ml-auto h-8 w-24 shrink-0 rounded-lg" />
          </div>

          <span className="skeleton hidden h-7 w-7 shrink-0 rounded-full sm:block" />
          <span className="skeleton h-8 w-24 shrink-0 rounded-lg" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="max-w-2xl">
          <span className="skeleton h-7 w-44 rounded-full" />
          <span className="skeleton mt-3 h-4 w-72 rounded-full" />
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
  );
}
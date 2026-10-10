import { LandingActions } from "@/components/LandingActions";
import SkipLink from "@/components/ui/SkipLink";

const FEATURES = [
  {
    title: "Direct 1:1 only",
    body: "Two people, one exchange. No groups, no loops, no audiences.",
  },
  {
    title: "Reciprocal matching",
    body: "You teach Python, they teach Spanish — the grid finds the pair where both sides gain.",
  },
  {
    title: "No credits, no coins",
    body: "Knowledge is the currency. Schedule a session, hop on a 1:1 call, swap skills.",
  },
];

export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <SkipLink />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 h-96 bg-[radial-gradient(800px_400px_at_50%_0%,rgb(13_148_136/0.12),transparent_65%)]"
      />

      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">
          Skill<span className="text-teal-700">GRID</span>
        </span>
        <span className="text-sm text-slate-500">Peer-to-peer skill exchange</span>
      </header>

      <main id="main" className="relative mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-10 sm:pt-16">
        <section className="max-w-3xl">
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
            Teach what you know.{" "}
            <span className="text-teal-700">Learn what you need.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            SkillGRID connects people who want to trade knowledge directly — one
            teacher, one learner, one session at a time.
          </p>
          <LandingActions />
        </section>

        <section className="mt-20 grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="card card-interactive">
              <span className="text-xs font-semibold tabular-nums text-teal-700">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-3 font-semibold text-slate-900">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {f.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative mx-auto w-full max-w-5xl px-6 pb-10 pt-4 text-center text-xs text-slate-500">
        SkillGRID — direct 1:1 skill exchange. No credits, no crowds.
      </footer>
    </div>
  );
}

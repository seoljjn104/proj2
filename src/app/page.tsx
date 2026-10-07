import { LandingActions } from "@/components/LandingActions";

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
    <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 h-96 bg-[radial-gradient(800px_400px_at_50%_0%,rgb(13_148_136/0.12),transparent_65%)]"
      />

      <header className="relative flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">
          Skill<span className="text-teal-700">GRID</span>
        </span>
        <span className="text-sm text-slate-500">Peer-to-peer skill exchange</span>
      </header>

      <section className="relative mt-24 max-w-3xl">
        <h1 className="text-5xl font-semibold tracking-tight text-slate-900">
          Teach what you know.
          <br />
          <span className="text-teal-700">Learn what you need.</span>
        </h1>
        <p className="mt-5 text-lg text-slate-600">
          SkillGRID connects people who want to trade knowledge directly — one
          teacher, one learner, one session at a time.
        </p>
        <LandingActions />
      </section>

      <section className="relative mt-20 grid gap-6 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card transition-shadow hover:shadow-md">
            <h2 className="font-semibold text-slate-900">{f.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="relative mt-auto pt-16 text-center text-xs text-slate-400">
        SkillGRID — direct 1:1 skill exchange. No credits, no crowds.
      </footer>
    </main>
  );
}

import Avatar from "@/components/ui/Avatar";
import BrandMark from "@/components/ui/BrandMark";
import SkipLink from "@/components/ui/SkipLink";
import { LandingActions } from "@/components/LandingActions";

const STEPS = [
  {
    title: "Set your grid",
    body: "List skills you can teach (OFFERED) and skills you want to learn (WANTED).",
  },
  {
    title: "Find your counterpart",
    body: "The Matching Hub surfaces people where you teach what they want and they teach what you need.",
  },
  {
    title: "Swap live",
    body: "Propose a slot, get accepted, then meet 1:1 in an embedded video call with chat.",
  },
];

function StepIcon({ step }: { step: number }) {
  if (step === 1) {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
        <rect x="3" y="3" width="6" height="6" rx="1" fill="currentColor" />
        <rect x="11" y="3" width="6" height="6" rx="1" fill="currentColor" opacity="0.4" />
        <rect x="3" y="11" width="6" height="6" rx="1" fill="currentColor" opacity="0.4" />
        <rect x="11" y="11" width="6" height="6" rx="1" fill="currentColor" />
      </svg>
    );
  }
  if (step === 2) {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
        <circle cx="6.5" cy="10" r="3.5" fill="currentColor" />
        <circle cx="13.5" cy="10" r="3.5" fill="currentColor" opacity="0.4" />
        <path d="M5 7.5c3-2 7-2 10 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 12.5c3 2 7 2 10 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
      <rect x="3.5" y="4" width="9" height="12" rx="1.5" fill="currentColor" opacity="0.35" />
      <path d="M8.5 7.5l4 2.5-4 2.5z" fill="currentColor" />
    </svg>
  );
}

function MatchPreview() {
  return (
    <div className="animate-fade-up relative motion-safe:[animation-delay:140ms]">
      <div
        aria-hidden
        className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-teal-100/70 via-slate-50 to-amber-100/60"
      />
      <div className="card relative p-6 shadow-[var(--shadow-lift)]">
        <div className="flex items-center justify-between">
          <span className="badge-direct">
            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
              <path
                d="M2 6.5l2.5 2.5L10 3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Direct match
          </span>
          <span className="text-xs font-medium text-slate-500">teach ↔ learn</span>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Avatar name="Maya Okafor" size="lg" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">Maya Okafor</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="chip-offered">Python</span>
              <span className="chip-wanted">Spanish</span>
            </div>
          </div>
        </div>

        <div aria-hidden className="relative my-3">
          <div className="h-px w-full bg-slate-200" />
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 text-xs font-semibold text-teal-700">
            ⇄
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Avatar name="Diego Vidal" size="lg" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">Diego Vidal</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="chip-offered">Spanish</span>
              <span className="chip-wanted">Python</span>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-slate-50 px-3 py-2.5 text-center text-sm font-medium text-slate-700">
          Propose a 1:1 session
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <SkipLink />

      {/* Faint blueprint grid behind the hero */}
      <div aria-hidden className="grid-motif pointer-events-none absolute inset-x-0 top-0 h-[560px]" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
          <BrandMark />
          Skill<span className="text-teal-700">GRID</span>
        </span>
        <a
          href="/login"
          className="text-sm font-medium text-slate-600 transition-colors hover:text-teal-800"
        >
          Sign in
        </a>
      </header>

      <main
        id="main"
        className="relative mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-10 sm:px-6 sm:pt-14"
      >
        <section className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-up max-w-xl">
            <p className="eyebrow">Peer-to-peer skill exchange</p>
            <h1 className="mt-3 text-balance text-4xl font-semibold leading-[1.04] tracking-tight text-slate-900 sm:text-6xl">
              Teach what you know.{" "}
              <span className="text-teal-700">Learn what you need.</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              SkillGRID connects two people who want to trade knowledge directly —
              one teacher, one learner, one session at a time. No credits, no
              coins.
            </p>
            <LandingActions />
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              <li>Direct 1:1 only</li>
              <li>Reciprocal matches</li>
              <li>In-app video + chat</li>
            </ul>
          </div>

          <MatchPreview />
        </section>

        <section className="mt-24 sm:mt-28">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Set your grid, find your counterpart, swap live.
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card relative">
                <span className="absolute right-5 top-4 text-sm font-semibold tabular-nums text-slate-300">
                  0{i + 1}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <StepIcon step={i + 1} />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="relative mx-auto w-full max-w-6xl px-6 pb-10 pt-4 text-center text-xs text-slate-500">
        SkillGRID — direct 1:1 skill exchange. No credits, no crowds.
      </footer>
    </div>
  );
}
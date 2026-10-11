"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import BrandMark from "@/components/ui/BrandMark";
import SkipLink from "@/components/ui/SkipLink";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/auth/AuthModal";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";

type AuthMode = "login" | "signup" | null;

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

function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
      <BrandMark />
      <span>
        Skill<span className="text-teal-700">GRID</span>
      </span>
    </span>
  );
}

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
        className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-teal-100/80 via-slate-50 to-amber-100/70 blur-sm"
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
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-surface px-2 text-xs font-semibold text-teal-700">
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

interface Props {
  initialAuth?: AuthMode;
  next?: string;
}

/**
 * Redesigned landing page. The whole surface is a client component so the
 * sign-in / create-account actions can open as popups over a blurred backdrop
 * instead of separate pages.
 */
export default function LandingContent({ initialAuth = null, next }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialAuth);
  const [revoked, setRevoked] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/marketplace");
  }, [loading, user, router]);

  useEffect(() => {
    if (initialAuth) setMode(initialAuth);
  }, [initialAuth]);

  // Check for revoked session flag in URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("revoked") === "1") {
      setRevoked(true);
      setMode("login");
      params.delete("revoked");
      window.history.replaceState(null, "", `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    }
  }, []);

  const close = useCallback(() => {
    setMode(null);
    // Tidy the deep-link flags off the URL without a full navigation.
    const url = new URL(window.location.href);
    if (url.searchParams.has("auth") || url.searchParams.has("next")) {
      url.searchParams.delete("auth");
      url.searchParams.delete("next");
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const open = useCallback((m: Exclude<AuthMode, null>) => {
    setMode(m);
  }, []);

  const meta = mode === "signup" ? "Create your account" : "Sign in";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <SkipLink />

      {/* Faint blueprint grid behind the hero */}
      <div aria-hidden className="grid-motif pointer-events-none absolute inset-x-0 top-0 h-[620px]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-gradient-to-b from-teal-50/60 via-transparent to-transparent"
      />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-5">
        <Link href="/" aria-label="SkillGRID home" className="inline-flex">
          <Wordmark />
        </Link>
      </header>

      <main id="main" className="relative mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-8 sm:px-6 sm:pt-12">
        {/* Hero */}
        <section className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-xl">
            <p className="eyebrow motion-safe:animate-fade-up">
              Peer-to-peer skill exchange
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.04] tracking-tight text-slate-900 motion-safe:animate-fade-up sm:text-6xl">
              Teach what you know.{" "}
              <span className="text-teal-700">Learn what you need.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600 motion-safe:animate-fade-up">
              SkillGRID pairs two people who want to trade knowledge directly —
              one teacher, one learner, one session at a time.
            </p>

            <div className="motion-safe:animate-fade-up">
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => open("signup")}
                  className="btn-primary px-6 py-3 text-base"
                >
                  Create your account
                </button>
                <button
                  type="button"
                  onClick={() => open("login")}
                  className="btn-secondary px-6 py-3 text-base"
                >
                  Sign in
                </button>
              </div>
              <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-600" aria-hidden />
                  No credits
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                  Direct 1:1 sessions
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                  Live video + chat
                </li>
              </ul>
            </div>
          </div>

          <MatchPreview />
        </section>

        {/* How it works */}
        <section className="mt-24 sm:mt-28" aria-labelledby="how-heading">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2
              id="how-heading"
              className="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
            >
              Set your grid, find your counterpart, swap live.
            </h2>
          </div>

          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => {
              const amber = i === 1;
              return (
                <li
                  key={s.title}
                  className={`card card-interactive relative p-6 ${amber ? "border-amber-200" : ""}`}
                >
                  <span
                    aria-hidden
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm ${
                      amber ? "bg-amber-500" : "bg-teal-700"
                    }`}
                  >
                    <StepIcon step={i + 1} />
                  </span>
                  <span
                    aria-hidden
                    className="absolute right-5 top-6 text-sm font-bold tabular-nums text-slate-300"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Dark invitation band */}
        <section className="brand-panel relative mt-24 overflow-hidden rounded-3xl px-6 py-14 sm:px-12 sm:py-16">
          <div aria-hidden className="brand-panel-grid pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">
              One teacher, one learner, one session
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Knowledge is better when it moves in both directions.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
              Put your grid on the board. SkillGRID finds the person whose wants
              match your offers and gets you face to face.
            </p>
            <p className="mt-6 inline-flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-300">
              No credits
              <span aria-hidden className="h-1 w-1 rounded-full bg-teal-400" />
              Direct 1:1
              <span aria-hidden className="h-1 w-1 rounded-full bg-amber-400" />
              Live sessions
            </p>
          </div>
        </section>
      </main>

      <footer className="relative mx-auto w-full max-w-6xl px-6 pb-10 pt-4 text-center text-xs text-slate-500">
        SkillGRID — direct 1:1 skill exchange. No credits, no crowds.
      </footer>

      {mode && (
        <AuthModal key={mode} label={meta} onClose={close}>
          {mode === "login" ? (
            <>
              {revoked && (
                <div
                  className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"
                  role="alert"
                >
                  You were signed out because this account was used to sign in on another device.
                </div>
              )}
              <LoginForm next={next} onSwitch={() => open("signup")} />
            </>
          ) : (
            <SignupForm onSwitch={() => open("login")} onClose={close} />
          )}
        </AuthModal>
      )}
    </div>
  );
}
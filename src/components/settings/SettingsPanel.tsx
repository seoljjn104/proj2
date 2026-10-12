"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, type Theme } from "@/components/theme/ThemeProvider";
import Avatar from "@/components/ui/Avatar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const MODES: { value: Theme; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Warm paper" },
  { value: "dark", label: "Dark", hint: "Ink" },
];

/**
 * Settings: appearance and account. Two theme modes and nothing else — the
 * app no longer follows the operating system.
 */
export default function SettingsPanel() {
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="mb-5 border-b border-line2 pb-4">
          <h2 className="section-title">Appearance</h2>
          <p className="mt-1 text-sm text-ink2">
            The whole app follows this. The session room stays ink in both modes.
          </p>
        </div>

        <div
          role="group"
          aria-label="Appearance"
          className="grid gap-3 sm:max-w-md sm:grid-cols-2"
        >
          {MODES.map((mode) => {
            const on = theme === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => setTheme(mode.value)}
                aria-pressed={on}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                  on
                    ? "border-teal-400 bg-teal-50 text-ink"
                    : "border-line bg-surface text-ink2 hover:border-slate-300 hover:text-ink"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold">{mode.label}</span>
                  <span className="block text-xs text-ink2">{mode.hint}</span>
                </span>
                {on && (
                  <span
                    aria-hidden
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-700"
                  >
                    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 text-onbrand">
                      <path
                        d="M2 6.5l2.5 2.5L10 3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="mb-5 border-b border-line2 pb-4">
          <h2 className="section-title">Account</h2>
          <p className="mt-1 text-sm text-ink2">
            Who you signed in as, and your way out.
          </p>
        </div>

        <dl className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={profile?.name} src={profile?.avatar_url} size="lg" />
            <div className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink3">
                Signed in as
              </dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-ink">
                {user?.email ?? "—"}
              </dd>
            </div>
            <Link href="/profile" className="btn-secondary ml-auto text-sm">
              Edit profile
            </Link>
          </div>
        </dl>

        <div className="mt-6 border-t border-line2 pt-5">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setConfirmOpen(true)}
          >
            Sign out
          </button>
        </div>
      </section>

      {confirmOpen && (
        <ConfirmDialog
          title="Sign out"
          message="Are you sure you want to sign out of SkillGRID? You can sign back in anytime."
          confirmLabel="Sign out"
          busyLabel="Signing out…"
          busy={signingOut}
          onConfirm={() => void handleSignOut()}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}

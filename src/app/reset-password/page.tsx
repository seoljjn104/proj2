import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "@/components/ui/BrandMark";
import SkipLink from "@/components/ui/SkipLink";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your SkillGRID account.",
};

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <SkipLink />
      <div aria-hidden className="grid-motif pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-5">
        <Link href="/" aria-label="SkillGRID home" className="inline-flex">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
            <BrandMark />
            <span>
              Skill<span className="text-teal-700">GRID</span>
            </span>
          </span>
        </Link>
      </header>

      <main id="main" className="relative mx-auto w-full max-w-md flex-1 px-6 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-panel)] sm:p-8">
          <ResetPasswordForm />
        </div>
      </main>
    </div>
  );
}
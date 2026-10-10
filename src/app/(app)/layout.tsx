import type { ReactNode } from "react";
import AppNav from "@/components/layout/AppNav";
import SkipLink from "@/components/ui/SkipLink";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SkipLink />
      <AppNav />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

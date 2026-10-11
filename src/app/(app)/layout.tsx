import type { ReactNode } from "react";
import AppNav from "@/components/layout/AppNav";
import TopBar from "@/components/layout/TopBar";
import MobileTabBar from "@/components/layout/MobileTabBar";
import PageTransition from "@/components/layout/PageTransition";
import SkipLink from "@/components/ui/SkipLink";
import SessionGuard from "@/components/layout/SessionGuard";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <SkipLink />
      <SessionGuard />
      <AppNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}

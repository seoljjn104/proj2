import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppNav from "@/components/layout/AppNav";

export const metadata: Metadata = { title: "SkillGRID" };

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

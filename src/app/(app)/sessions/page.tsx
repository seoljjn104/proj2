import type { Metadata } from "next";
import SessionList from "@/components/sessions/SessionList";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Sessions" };

export default function SessionsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Sessions"
        subtitle="Proposals waiting on you, upcoming slots, and history across your exchanges."
      />
      <div className="mt-6">
        <SessionList />
      </div>
    </PageShell>
  );
}

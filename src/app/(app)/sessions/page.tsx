import type { Metadata } from "next";
import SessionList from "@/components/sessions/SessionList";
import PageHeader from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Sessions" };

export default function SessionsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="1:1 exchanges"
        title="Sessions"
        subtitle="Proposals waiting on you, upcoming slots, and history across your exchanges."
      />
      <div className="mt-6">
        <SessionList />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import MatchingHub from "@/components/matches/MatchingHub";
import PageShell from "@/components/layout/PageShell";

export const metadata: Metadata = { title: "Matches" };

export default function MatchesPage() {
  return (
    <PageShell>
      <MatchingHub />
    </PageShell>
  );
}

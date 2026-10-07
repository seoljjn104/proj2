import type { Metadata } from "next";
import MatchingHub from "@/components/matches/MatchingHub";

export const metadata: Metadata = { title: "Matching Hub" };

export default function MatchesPage() {
  return <MatchingHub />;
}

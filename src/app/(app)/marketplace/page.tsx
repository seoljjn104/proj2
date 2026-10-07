import type { Metadata } from "next";
import MarketplaceFeed from "@/components/marketplace/MarketplaceFeed";

export const metadata: Metadata = { title: "Marketplace" };

export default function MarketplacePage() {
  return <MarketplaceFeed />;
}

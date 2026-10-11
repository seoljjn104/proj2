import type { Metadata } from "next";
import { Suspense } from "react";
import MarketplaceFeed from "@/components/marketplace/MarketplaceFeed";

export const metadata: Metadata = { title: "Marketplace" };

export default function MarketplacePage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceFeed />
    </Suspense>
  );
}

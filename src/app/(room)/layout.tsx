import type { ReactNode } from "react";
import SkipLink from "@/components/ui/SkipLink";

/**
 * Standalone layout for the pre-call and in-call routes. Deliberately outside
 * the (app) shell — no sidebar, no top bar — and pinned to the room's ink so a
 * call never flips between light and dark mid-session.
 */
export default function RoomLayout({ children }: { children: ReactNode }) {
  return (
    <div
      id="main"
      className="min-h-[100dvh] bg-[#12100b] text-[#EDE7DB] antialiased"
    >
      <SkipLink />
      {children}
    </div>
  );
}

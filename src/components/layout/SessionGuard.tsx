"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Guards against the back/forward cache after sign-out. If the browser restores
 * a protected page from bfcache (the persisted flag is set even with Cache
 * Control no-store in some edge cases), re-run the server check — middleware
 * then bounces a sessionless request back to the landing auth popup.
 */
export default function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    function onPageshow(e: PageTransitionEvent) {
      if (e.persisted) router.refresh();
    }
    window.addEventListener("pageshow", onPageshow);
    return () => window.removeEventListener("pageshow", onPageshow);
  }, [router]);

  return null;
}
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function LandingActions() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/marketplace");
  }, [loading, user, router]);

  if (loading) return null;

  if (user) return null;

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Link href="/signup" className="btn-primary px-6 py-3 text-base">
        Create your account
      </Link>
      <Link href="/login" className="btn-secondary px-6 py-3 text-base">
        Sign in
      </Link>
    </div>
  );
}

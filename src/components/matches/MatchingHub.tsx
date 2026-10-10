"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import type { ReciprocalMatch } from "@/types/database";
import MatchCard from "./MatchCard";
import ProposeSessionModal, {
  type ProposeTarget,
} from "@/components/marketplace/ProposeSessionModal";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";

/**
 * Matching Hub — reciprocal 1:1 fits only:
 *   A.OFFERED = B.WANTED  AND  A.WANTED = B.OFFERED
 * Powered by the get_reciprocal_matches() RPC.
 */
export default function MatchingHub() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<ReciprocalMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposing, setProposing] = useState<ProposeTarget | null>(null);
  const [hasSkills, setHasSkills] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const [result, skillsResult] = await Promise.all([
      supabase.rpc("get_reciprocal_matches", { p_user_id: user.id }),
      supabase
        .from("user_skills")
        .select("id", { count: "exact", head: true }),
    ]);
    setHasSkills((skillsResult.count ?? 0) > 0);
    if (result.error) {
      setError(friendlyDbError(result.error.message));
      setMatches([]);
    } else {
      setMatches((result.data as ReciprocalMatch[]) ?? []);
    }
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matching Hub</h1>
          <p className="mt-1 text-sm text-slate-600">
            People where you can teach something they want{" "}
            <em>and</em> learn something they offer — a true two-way exchange.
          </p>
        </div>
        <Link href="/profile" className="btn-secondary">
          Update my skills
        </Link>
      </div>

      {error && (
        <div className="mt-6">
          <Alert>{error}</Alert>
          <button type="button" className="btn-secondary mt-3" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {loading || authLoading ? (
        <div
          className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-64" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No direct matches yet"
            body={
              hasSkills
                ? "Keep your OFFERED and WANTED skills sharp — new matches appear as soon as someone complements your grid."
                : "Add OFFERED and WANTED skills to your profile so we can pair you."
            }
            action={
              <Link href="/profile" className="btn-primary inline-flex">
                Manage my skills
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <MatchCard key={m.partner_id} match={m} onPropose={setProposing} />
          ))}
        </div>
      )}

      {proposing && (
        <ProposeSessionModal
          provider={proposing}
          onClose={() => setProposing(null)}
        />
      )}
    </div>
  );
}

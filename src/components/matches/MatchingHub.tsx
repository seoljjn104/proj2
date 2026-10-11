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
import PageHeader from "@/components/ui/PageHeader";
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
      <PageHeader
        eyebrow="Two-way exchange"
        title="Matches"
        subtitle="People who want to learn what you teach, and can teach what you want to learn."
        count={
          !loading && !error && matches.length > 0
            ? `${matches.length} match${matches.length === 1 ? "" : "es"}`
            : undefined
        }
        action={
          <Link href="/profile" className="btn-secondary">
            Manage my skills
          </Link>
        }
      />

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
          className="mt-8 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
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
                ? "New matches appear here as soon as someone's skills line up with yours."
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
        <div className="mt-8 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
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
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import type { MarketplaceProfile } from "@/types/database";
import ProfileCard from "./ProfileCard";
import ProposeSessionModal from "./ProposeSessionModal";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";

/**
 * Marketplace Feed — renders public profile cards from the
 * get_marketplace_feed() RPC, with the Direct Match badge for
 * reciprocal fits against the current user.
 */
export default function MarketplaceFeed() {
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<MarketplaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyDirect, setOnlyDirect] = useState(false);
  const [proposing, setProposing] = useState<MarketplaceProfile | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc(
        "get_marketplace_feed",
        { p_search: q || null, p_limit: 60 },
      );
      if (rpcError) {
        setError(friendlyDbError(rpcError.message));
        setProfiles([]);
      } else {
        setProfiles((data as MarketplaceProfile[]) ?? []);
      }
      setLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    void load("");
  }, [load]);

  function onSearch(value: string) {
    setSearch(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(value), 300);
  }

  const visible = onlyDirect
    ? profiles.filter((p) => p.is_direct_match)
    : profiles;
  const directCount = profiles.filter((p) => p.is_direct_match).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="max-w-2xl">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-900">
            Marketplace
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Who fits your grid — members whose skills complement yours.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div className="relative w-full sm:w-64">
            <svg
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 16 16"
            >
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              className="input pl-9"
              placeholder="Search skills or names"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              aria-label="Search marketplace"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyDirect((v) => !v)}
            aria-pressed={onlyDirect}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              onlyDirect
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${
                onlyDirect ? "bg-amber-500" : "bg-slate-300"
              }`}
            />
            Direct matches
            {directCount > 0 && (
              <span className="tabular-nums font-semibold">{directCount}</span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <Alert>{error}</Alert>
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={() => void load(search)}
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div
          className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-56" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={
              search
                ? `No profiles match “${search}”`
                : "No profiles yet — be the first to add your skills"
            }
            body={
              search
                ? undefined
                : "Head to your profile to list OFFERED and WANTED skills so the grid can pair you."
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <ProfileCard
              key={p.profile_id}
              profile={p}
              onPropose={setProposing}
            />
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

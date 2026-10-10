"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import type { MarketplaceProfile } from "@/types/database";
import ProfileCard from "./ProfileCard";
import ProposeSessionModal from "./ProposeSessionModal";
import Alert from "@/components/ui/Alert";

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
          <p className="mt-1 text-sm text-slate-600">
            Browse members and see who fits your skill grid.
            {directCount > 0 && (
              <span className="ml-1 font-medium text-amber-700">
                {directCount} direct match{directCount === 1 ? "" : "es"}.
              </span>
            )}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <input
            type="search"
            className="input sm:w-64"
            placeholder="Search skills or names…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            aria-label="Search marketplace"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={onlyDirect}
              onChange={(e) => setOnlyDirect(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-teal-700"
            />
            Direct matches only
          </label>
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
        <div className="card mt-8 text-center">
          <p className="font-medium text-slate-700">
            {search
              ? `No profiles match “${search}”.`
              : "No profiles yet — be the first to add your skills."}
          </p>
          {!search && (
            <p className="mt-1 text-sm text-slate-600">
              Head to your profile to list OFFERED and WANTED skills.
            </p>
          )}
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

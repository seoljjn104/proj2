"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import type { MarketplaceProfile, SessionFormat } from "@/types/database";
import ProfileCard from "./ProfileCard";
import ProposeSessionModal from "./ProposeSessionModal";
import PageHeader from "@/components/ui/PageHeader";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";

interface Filters {
  search: string;
  offered: string;
  wanted: string;
  format: SessionFormat | "";
}

const EMPTY_FILTERS: Filters = {
  search: "",
  offered: "",
  wanted: "",
  format: "",
};

/**
 * Marketplace Feed — renders public profile cards from the
 * block-aware, filterable get_marketplace_feed() RPC. The Direct Match
 * filter runs on the client so its count stays accurate while other
 * filters are applied.
 */
export default function MarketplaceFeed() {
  const supabase = createClient();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [profiles, setProfiles] = useState<MarketplaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyDirect, setOnlyDirect] = useState(false);
  const [proposing, setProposing] = useState<MarketplaceProfile | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (f: Filters) => {
      setLoading(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc(
        "get_marketplace_feed",
        {
          p_search: f.search || null,
          p_offered: f.offered || null,
          p_wanted: f.wanted || null,
          p_format: f.format || null,
          p_limit: 60,
        },
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
    void load(EMPTY_FILTERS);
  }, [load]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "search") {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => void load(next), 300);
      } else {
        void load(next);
      }
      return next;
    });
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setOnlyDirect(false);
    void load(EMPTY_FILTERS);
  }

  const visible = onlyDirect
    ? profiles.filter((p) => p.is_direct_match)
    : profiles;
  const directCount = profiles.filter((p) => p.is_direct_match).length;
  const hasFilters =
    filters.search !== "" ||
    filters.offered !== "" ||
    filters.wanted !== "" ||
    filters.format !== "" ||
    onlyDirect;

  return (
    <div>
      <PageHeader
        eyebrow="Skill exchange"
        title="Marketplace"
        subtitle="Who fits your grid — members whose skills complement yours."
        action={
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
              <span className="font-semibold tabular-nums">{directCount}</span>
            )}
          </button>
        }
      />

      <form
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)]"
        onSubmit={(e) => e.preventDefault()}
        role="search"
        aria-label="Filter marketplace"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative w-full sm:w-72">
            <svg
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 16 16"
            >
              <circle
                cx="7"
                cy="7"
                r="4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M10.5 10.5 14 14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              className="input pl-9"
              placeholder="Search skills or names"
              value={filters.search}
              onChange={(e) => update("search", e.target.value)}
              aria-label="Search marketplace"
            />
          </div>

          <div>
            <label
              htmlFor="filter-offered"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              They teach
            </label>
            <input
              id="filter-offered"
              type="text"
              className="input w-40"
              placeholder="e.g. Guitar"
              value={filters.offered}
              onChange={(e) => update("offered", e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="filter-wanted"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              They want
            </label>
            <input
              id="filter-wanted"
              type="text"
              className="input w-40"
              placeholder="e.g. Spanish"
              value={filters.wanted}
              onChange={(e) => update("wanted", e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="filter-format"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              Format
            </label>
            <select
              id="filter-format"
              className="input w-36"
              value={filters.format}
              onChange={(e) =>
                update("format", e.target.value as Filters["format"])
              }
            >
              <option value="">Any</option>
              <option value="ONLINE">Online</option>
              <option value="IN_PERSON">In person</option>
              <option value="EITHER">Either</option>
            </select>
          </div>

          {hasFilters && (
            <button type="button" className="btn-secondary" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-6">
          <Alert>{error}</Alert>
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={() => void load(filters)}
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
              hasFilters
                ? "No profiles match these filters"
                : "No profiles yet — be the first to add your skills"
            }
            body={
              hasFilters
                ? "Try removing a filter or searching for a different skill."
                : "Head to your profile to list OFFERED and WANTED skills so the grid can pair you."
            }
            action={
              hasFilters ? (
                <button type="button" className="btn-secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : undefined
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
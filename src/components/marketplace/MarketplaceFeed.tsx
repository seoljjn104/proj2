"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import type { MarketplaceProfile, SessionFormat } from "@/types/database";
import ProfileCard from "./ProfileCard";
import ProposeSessionModal from "./ProposeSessionModal";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/ui/PageHeader";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";

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

/** Right-rail detail panel for a marketplace profile. */
function ProfileDetailPanel({
  profile,
  onClose,
}: {
  profile: MarketplaceProfile | null;
  onClose: () => void;
}) {
  if (!profile) return null;

  const FORMAT_LABEL: Record<SessionFormat, string> = {
    ONLINE: "Online",
    IN_PERSON: "In person",
    EITHER: "Online or in person",
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Profile details</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close details"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <Avatar name={profile.name} src={profile.avatar_url} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 truncate">{profile.name ?? "Unnamed user"}</h3>
          {profile.headline && (
            <p className="mt-0.5 line-clamp-1 text-sm font-medium text-slate-600 truncate">{profile.headline}</p>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            {FORMAT_LABEL[profile.session_format]}
          </p>
        </div>
      </div>

      {profile.bio && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm leading-relaxed text-slate-700">{profile.bio}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Teaches
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.offered.length === 0 ? (
              <span className="text-xs text-slate-400">Nothing listed</span>
            ) : (
              profile.offered.map((s) => (
                <span key={s} className="chip-offered">{s}</span>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Wants to learn
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.wanted.length === 0 ? (
              <span className="text-xs text-slate-400">Nothing listed</span>
            ) : (
              profile.wanted.map((s) => (
                <span key={s} className="chip-wanted">{s}</span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-line">
        <p className="mb-3 text-sm text-slate-600">
          <span className="font-medium text-amber-700">⚡ Viewing their grid</span> &mdash; You&apos;re seeing
          {profile.name ?? "this person"}&apos;s skills.
        </p>
        {profile.offered.length > 0 && (
          <button
            type="button"
            onClick={() => {}}
            className="btn-primary w-full"
          >
            Propose a session
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Marketplace Feed — renders public profile cards from the
 * block-aware, filterable get_marketplace_feed() RPC. The Direct Match
 * filter runs on the client so its count stays accurate while other
 * filters are applied.
 */
export default function MarketplaceFeed() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") ?? "";
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [profiles, setProfiles] = useState<MarketplaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyDirect, setOnlyDirect] = useState(false);
  const [proposing, setProposing] = useState<MarketplaceProfile | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<MarketplaceProfile | null>(null);
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

  // The top-bar search drives ?q=. Re-run whenever it changes (and on mount).
  useEffect(() => {
    const next = { ...EMPTY_FILTERS, search: qParam };
    setFilters(next);
    setOnlyDirect(false);
    void load(next);
  }, [qParam, load]);

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
    <PageShell rail={selectedProfile ? <ProfileDetailPanel profile={selectedProfile} onClose={() => setSelectedProfile(null)} /> : undefined}>
      <PageHeader
        eyebrow="Skill exchange"
        title="Marketplace"
        subtitle="Members whose skills complement yours."
        action={
          <button
            type="button"
            onClick={() => setOnlyDirect((v) => !v)}
            aria-pressed={onlyDirect}
            className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors sm:w-auto ${
              onlyDirect
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-slate-300 bg-surface text-slate-600 hover:border-slate-400 hover:bg-slate-50"
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
        className="mt-6 rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"
        onSubmit={(e) => e.preventDefault()}
        role="search"
        aria-label="Filter marketplace"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
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

          <div className="w-full sm:w-auto">
            <label
              htmlFor="filter-offered"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              They teach
            </label>
            <input
              id="filter-offered"
              type="text"
              className="input w-full sm:w-40"
              placeholder="e.g. Guitar"
              value={filters.offered}
              onChange={(e) => update("offered", e.target.value)}
            />
          </div>

          <div className="w-full sm:w-auto">
            <label
              htmlFor="filter-wanted"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              They want
            </label>
            <input
              id="filter-wanted"
              type="text"
              className="input w-full sm:w-40"
              placeholder="e.g. Spanish"
              value={filters.wanted}
              onChange={(e) => update("wanted", e.target.value)}
            />
          </div>

          <div className="w-full sm:w-auto">
            <label
              htmlFor="filter-format"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              Format
            </label>
            <select
              id="filter-format"
              className="input w-full sm:w-36"
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
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              onClick={clearFilters}
            >
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
          className="mt-8 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
          aria-busy="true"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-64" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={
              hasFilters
                ? "No profiles match these filters"
                : "No profiles yet"
            }
            body={
              hasFilters
                ? "Try removing a filter or searching for a different skill."
                : "Add OFFERED and WANTED skills to your profile so the grid can pair you."
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
        <div className="mt-8 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {visible.map((p) => (
            <ProfileCard
              key={p.profile_id}
              profile={p}
              onPropose={setProposing}
              onClick={() => setSelectedProfile(p)}
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
    </PageShell>
  );
}
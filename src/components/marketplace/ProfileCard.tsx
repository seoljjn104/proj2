"use client";

import type { MarketplaceProfile } from "@/types/database";

interface Props {
  profile: MarketplaceProfile;
  onPropose: (profile: MarketplaceProfile) => void;
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export default function ProfileCard({ profile, onPropose }: Props) {
  return (
    <div className="card relative flex flex-col gap-4">
      {profile.is_direct_match && (
        <span className="badge-direct absolute -top-2.5 right-4">
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
            <path
              d="M2 6.5l2.5 2.5L10 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Direct Match
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800">
          {initials(profile.name)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">
            {profile.name ?? "Unnamed user"}
          </h3>
          <p className="line-clamp-3 text-sm text-slate-600">
            {profile.bio || "No bio yet."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Teaches
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.offered.length === 0 && (
              <span className="text-xs text-slate-400">Nothing listed</span>
            )}
            {profile.offered.map((s) => (
              <span key={s} className="chip-offered">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Wants to learn
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.wanted.length === 0 && (
              <span className="text-xs text-slate-400">Nothing listed</span>
            )}
            {profile.wanted.map((s) => (
              <span key={s} className="chip-wanted">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPropose(profile)}
        className="btn-secondary mt-auto w-full"
      >
        Propose 1:1 Session
      </button>
    </div>
  );
}

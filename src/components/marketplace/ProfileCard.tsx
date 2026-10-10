"use client";

import type { MarketplaceProfile } from "@/types/database";
import Avatar from "@/components/ui/Avatar";

interface Props {
  profile: MarketplaceProfile;
  onPropose: (profile: MarketplaceProfile) => void;
}

export default function ProfileCard({ profile, onPropose }: Props) {
  return (
    <div className="card card-interactive relative flex flex-col gap-4">
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
          Direct match
        </span>
      )}

      <div className="flex items-start gap-3">
        <Avatar name={profile.name} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-slate-900">
            {profile.name ?? "Unnamed user"}
          </h2>
          <p className="line-clamp-3 text-sm text-slate-600">
            {profile.bio || "No bio yet."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Teaches
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.offered.length === 0 && (
              <span className="text-xs text-slate-500">Nothing listed</span>
            )}
            {profile.offered.map((s) => (
              <span key={s} className="chip-offered">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Wants to learn
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.wanted.length === 0 && (
              <span className="text-xs text-slate-500">Nothing listed</span>
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
        Propose a 1:1 session
      </button>
    </div>
  );
}

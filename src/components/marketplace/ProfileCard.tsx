"use client";

import type { MarketplaceProfile } from "@/types/database";
import Avatar from "@/components/ui/Avatar";

interface Props {
  profile: MarketplaceProfile;
  onPropose: (profile: MarketplaceProfile) => void;
}

const FORMAT_LABEL: Record<MarketplaceProfile["session_format"], string> = {
  ONLINE: "Online",
  IN_PERSON: "In person",
  EITHER: "Online or in person",
};

function SkillRow({
  label,
  tone,
  skills,
}: {
  label: string;
  tone: "offered" | "wanted";
  skills: string[];
}) {
  const dots = {
    offered: "bg-emerald-500",
    wanted: "bg-sky-500",
  } as const;
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {skills.length === 0 ? (
          <span className="text-xs text-slate-400">Nothing listed</span>
        ) : (
          skills.map((s) => (
            <span key={s} className={tone === "offered" ? "chip-offered" : "chip-wanted"}>
              {s}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export default function ProfileCard({ profile, onPropose }: Props) {
  return (
    <div className="card card-interactive relative flex flex-col gap-4 overflow-hidden">
      {profile.is_direct_match && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300"
        />
      )}

      <div className="flex items-center gap-3">
        <Avatar name={profile.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-slate-900">
            {profile.name ?? "Unnamed user"}
          </h2>
          {profile.headline ? (
            <p className="mt-0.5 line-clamp-2 text-sm font-medium text-slate-600">
              {profile.headline}
            </p>
          ) : null}
        </div>
        {profile.is_direct_match && (
          <span className="badge-direct shrink-0">
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
            Match
          </span>
        )}
      </div>

      <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
        {profile.bio || "No bio yet."}
      </p>

      <div className="space-y-3 rounded-xl bg-slate-50 p-3.5">
        <SkillRow label="Teaches" tone="offered" skills={profile.offered} />
        <SkillRow label="Wants to learn" tone="wanted" skills={profile.wanted} />
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          {FORMAT_LABEL[profile.session_format]}
        </p>
        <button
          type="button"
          onClick={() => onPropose(profile)}
          className="btn-primary"
        >
          Propose a session
        </button>
      </div>
    </div>
  );
}
"use client";

import type { ReciprocalMatch } from "@/types/database";
import type { ProposeTarget } from "@/components/marketplace/ProposeSessionModal";

interface Props {
  match: ReciprocalMatch;
  onPropose: (target: ProposeTarget) => void;
}

export default function MatchCard({ match, onPropose }: Props) {
  const teach = match.skills_you_teach ?? [];
  const gain = match.skills_you_gain ?? [];

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
          {(match.partner_name ?? "?")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]!.toUpperCase())
            .join("")}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">
            {match.partner_name ?? "Unnamed user"}
          </h3>
          <span className="badge-direct">Direct Match</span>
        </div>
      </div>

      <p className="text-sm text-slate-600">
        {match.partner_bio || "No bio yet."}
      </p>

      <div className="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            You teach them
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {teach.length === 0 ? (
              <span className="text-xs text-slate-400">—</span>
            ) : (
              teach.map((s) => (
                <span key={s} className="chip-offered">
                  {s}
                </span>
              ))
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
            You learn
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {gain.length === 0 ? (
              <span className="text-xs text-slate-400">—</span>
            ) : (
              gain.map((s) => (
                <span key={s} className="chip-wanted">
                  {s}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn-primary mt-auto w-full"
        onClick={() =>
          onPropose({
            profile_id: match.partner_id,
            name: match.partner_name,
          })
        }
      >
        Propose 1:1 Session
      </button>
    </div>
  );
}

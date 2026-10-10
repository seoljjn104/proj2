"use client";

import type { ReciprocalMatch } from "@/types/database";
import type { ProposeTarget } from "@/components/marketplace/ProposeSessionModal";
import Avatar from "@/components/ui/Avatar";

interface Props {
  match: ReciprocalMatch;
  onPropose: (target: ProposeTarget) => void;
}

function ExchangeRow({
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
    <div className="min-w-0">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold capitalize text-slate-500">
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

/**
 * A reciprocal match framed as the two-way exchange it is: what you give
 * versus what you get. Both rows render inside a shared panel so the swap
 * reads as one unit.
 */
export default function MatchCard({ match, onPropose }: Props) {
  const teach = match.skills_you_teach ?? [];
  const gain = match.skills_you_gain ?? [];

  return (
    <div className="card card-interactive relative flex flex-col gap-4 overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-teal-500/80" />

      <div className="flex items-center gap-3">
        <Avatar name={match.partner_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-slate-900">
            {match.partner_name ?? "Unnamed user"}
          </h2>
          <p className="truncate text-xs font-medium text-slate-500">
            Add them to your grid
          </p>
        </div>
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
      </div>

      <div className="space-y-2.5 rounded-xl bg-slate-50 p-3.5">
        <ExchangeRow label="You teach them" tone="offered" skills={teach} />
        <div aria-hidden className="flex items-center gap-2">
          <span className="h-px flex-1 bg-slate-200" />
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-emerald-600" fill="none">
            <path
              d="M2.5 8h11M11 5l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="h-px flex-1 bg-sky-300" />
        </div>
        <ExchangeRow label="You learn from them" tone="wanted" skills={gain} />
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
        Propose a session
      </button>
    </div>
  );
}
import type { SessionStatus } from "@/types/database";

const STYLES: Record<SessionStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  ACCEPTED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  COMPLETED: "bg-slate-100 text-slate-700 ring-slate-200",
  CANCELLED: "bg-red-50 text-red-700 ring-red-200",
};

const LABELS: Record<SessionStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function SessionStatusBadge({
  status,
}: {
  status: SessionStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}

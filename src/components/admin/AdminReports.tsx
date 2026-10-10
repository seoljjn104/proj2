"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import type { ReportRow } from "@/types/database";
import Alert from "@/components/ui/Alert";

const STATUS_STYLES: Record<ReportRow["status"], string> = {
  OPEN: "bg-amber-100 text-amber-800",
  REVIEWED: "bg-emerald-100 text-emerald-700",
  DISMISSED: "bg-slate-100 text-slate-600",
};

/**
 * Member reports queue. Reads through the admin-only get_reports()
 * RPC and resolves through resolve_report(); both re-check is_admin
 * server-side. Non-admins see nothing here.
 */
export default function AdminReports() {
  const supabase = createClient();
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc("get_reports");
    if (rpcError) {
      setError(friendlyDbError(rpcError.message));
    } else {
      setRows((data as ReportRow[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!authLoading && isAdmin) void load();
    if (!authLoading && !isAdmin) setLoading(false);
  }, [authLoading, isAdmin, load]);

  async function resolve(id: number, status: ReportRow["status"]) {
    setBusy(id);
    setError(null);
    const { error: rpcError } = await supabase.rpc("resolve_report", {
      p_report_id: id,
      p_status: status,
    });
    setBusy(null);
    if (rpcError) {
      setError(friendlyDbError(rpcError.message));
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
  }

  if (authLoading || loading) {
    return <div className="skeleton h-32" aria-busy="true" />;
  }

  if (!isAdmin) return null;

  const visible = showResolved
    ? rows
    : rows.filter((r) => r.status === "OPEN");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {rows.filter((r) => r.status === "OPEN").length} open
        </p>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Show resolved
        </label>
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          No reports to review.
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => (
            <li key={r.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-900">
                    <strong>{r.reporter_name ?? "A member"}</strong> reported{" "}
                    <strong>{r.reported_name ?? "a member"}</strong>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{r.reason}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleString()}
                    {r.session_id ? " · from a session" : ""}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.status]}`}
                >
                  {r.status}
                </span>
              </div>
              {r.status === "OPEN" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy === r.id}
                    onClick={() => void resolve(r.id, "REVIEWED")}
                  >
                    Mark reviewed
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy === r.id}
                    onClick={() => void resolve(r.id, "DISMISSED")}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

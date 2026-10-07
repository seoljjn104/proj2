"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AdminFlagRow } from "@/types/database";

/**
 * Admin moderation board (public.get_admin_flags() RPC).
 * Non-admins receive zero rows from the RPC; we also gate the
 * UI on is_admin. Flagging goes through flag_user()/unflag_user()
 * which re-check the caller server-side.
 */
export default function AdminFlagTable() {
  const supabase = createClient();
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<AdminFlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc("get_admin_flags");
    if (rpcError) {
      setError(rpcError.message);
    } else {
      const sorted = (((data as AdminFlagRow[]) ?? [])).slice().sort(
        (a, b) =>
          Number(b.flagged) - Number(a.flagged) ||
          b.created_at.localeCompare(a.created_at),
      );
      setRows(sorted);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!authLoading && isAdmin) void load();
    if (!authLoading && !isAdmin) setLoading(false);
  }, [authLoading, isAdmin, load]);

  if (authLoading || loading) {
    return <div className="card h-40 animate-pulse bg-slate-100" />;
  }

  if (!isAdmin) {
    return (
      <div className="card text-center">
        <p className="font-medium text-slate-700">Administrators only.</p>
        <p className="mt-1 text-sm text-slate-500">
          This board flags accounts for moderation review.
        </p>
      </div>
    );
  }

  async function flag(id: string) {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("flag_user", {
      p_user_id: id,
      p_reason: reason,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setFlaggingId(null);
    setReason("");
    await load();
  }

  async function unflag(id: string) {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("unflag_user", {
      p_user_id: id,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await load();
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Reviews</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No members found.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={r.flagged ? "bg-red-50/50" : undefined}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">
                    {r.name ?? "Unnamed"}
                  </p>
                  <p className="text-xs text-slate-500">{r.email}</p>
                  {r.flagged && r.flag_reason && (
                    <p className="mt-1 text-xs text-red-600">
                      Reason: {r.flag_reason}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-amber-500">
                    {"★".repeat(Math.round(r.avg_rating))}
                    <span className="text-slate-300">
                      {"★".repeat(5 - Math.round(r.avg_rating))}
                    </span>
                  </span>{" "}
                  <span className="text-xs text-slate-500">
                    {Number(r.avg_rating).toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.review_count}</td>
                <td className="px-4 py-3">
                  {r.flagged ? (
                    <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      FLAGGED
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      OK
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {flaggingId === r.id ? (
                      <>
                        <input
                          className="input w-40 py-1 text-xs"
                          placeholder="Reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          maxLength={200}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn-danger px-2 py-1 text-xs"
                          disabled={busy}
                          onClick={() => void flag(r.id)}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="btn-secondary px-2 py-1 text-xs"
                          onClick={() => {
                            setFlaggingId(null);
                            setReason("");
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : r.flagged ? (
                      <button
                        type="button"
                        className="btn-secondary px-3 py-1 text-xs"
                        disabled={busy}
                        onClick={() => void unflag(r.id)}
                      >
                        Unflag
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-danger px-3 py-1 text-xs"
                        disabled={busy}
                        onClick={() => setFlaggingId(r.id)}
                      >
                        Flag
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

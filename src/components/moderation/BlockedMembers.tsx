"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import type { Block, ProfileDirectory } from "@/types/database";
import Alert from "@/components/ui/Alert";
import Avatar from "@/components/ui/Avatar";

/**
 * Manage the members you have blocked. RLS only ever returns your own
 * rows; names come from the safe directory RPC.
 */
export default function BlockedMembers() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<
    { id: string; name: string; avatar: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("blocks")
      .select("blocked_id")
      .order("created_at", { ascending: false });
    if (queryError) {
      setError(friendlyDbError(queryError.message));
      setLoading(false);
      return;
    }
    const ids = ((data as Pick<Block, "blocked_id">[]) ?? []).map(
      (r) => r.blocked_id,
    );
    let people: Record<string, { name: string; avatar: string | null }> = {};
    if (ids.length > 0) {
      const { data: dirRows } = await supabase.rpc("get_profile_directory", {
        p_ids: ids,
      });
      people = Object.fromEntries(
        ((dirRows as ProfileDirectory[]) ?? []).map((d) => [
          d.id,
          { name: d.name ?? "Member", avatar: d.avatar_url ?? null },
        ]),
      );
    }
    setRows(
      ids.map((id) => ({
        id,
        name: people[id]?.name ?? "Member",
        avatar: people[id]?.avatar ?? null,
      })),
    );
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  async function unblock(id: string) {
    if (!user) return;
    setBusy(id);
    setError(null);
    const { error: deleteError } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", id);
    setBusy(null);
    if (deleteError) {
      setError(friendlyDbError(deleteError.message));
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  if (authLoading || loading) {
    return <div className="skeleton h-16" aria-busy="true" />;
  }

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">
          You haven&apos;t blocked anyone.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 py-2">
              <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                <Avatar name={r.name} src={r.avatar} size="sm" />
                <span className="truncate">{r.name}</span>
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy === r.id}
                onClick={() => void unblock(r.id)}
              >
                {busy === r.id ? "Unblocking…" : "Unblock"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

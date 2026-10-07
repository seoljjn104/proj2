"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ProfileDirectory, Review, Session } from "@/types/database";

interface Props {
  session: Session;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-500" aria-label={`${value} out of 5 stars`}>
      {"★".repeat(value)}
      <span className="text-slate-300">{"★".repeat(5 - value)}</span>
    </span>
  );
}

/**
 * Post-session ratings (public.reviews). Unlocks when the
 * session reaches COMPLETED; one review per reviewer per session.
 */
export default function ReviewSection({ session }: Props) {
  const supabase = createClient();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: reviewRows } = await supabase
      .from("reviews")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    const loaded = (reviewRows as Review[]) ?? [];
    setReviews(loaded);

    const reviewerIds = [...new Set(loaded.map((r) => r.reviewer_id))];
    if (reviewerIds.length > 0) {
      const { data: dirRows } = await supabase.rpc("get_profile_directory", {
        p_ids: reviewerIds,
      });
      const map: Record<string, string> = {};
      for (const row of (dirRows as Pick<ProfileDirectory, "id" | "name">[]) ?? []) {
        map[row.id] = row.name ?? "Member";
      }
      setNames(map);
    }
  }, [supabase, session.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  const myReview = reviews.find((r) => r.reviewer_id === user.id);
  const completed = session.status === "COMPLETED";
  const revieweeId =
    session.requester_id === user.id
      ? session.provider_id
      : session.requester_id;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase.from("reviews").insert({
      session_id: session.id,
      reviewer_id: user!.id,
      reviewee_id: revieweeId,
      rating,
      comment: comment.trim() || null,
    });
    setBusy(false);
    if (insertError) {
      setError(
        insertError.code === "23514" || insertError.code === "23503"
          ? insertError.message.replace(/^.*:\s*/, "")
          : insertError.message,
      );
      return;
    }
    setComment("");
    await load();
  }

  return (
    <div className="card">
      <h2 className="font-semibold text-slate-900">Ratings &amp; reviews</h2>

      {!completed && (
        <p className="mt-2 text-sm text-slate-500">
          Reviews unlock once this session is marked completed.
        </p>
      )}

      {completed && !myReview && (
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Your rating:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`text-2xl leading-none transition-colors ${
                    n <= rating ? "text-amber-500" : "text-slate-300"
                  }`}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <textarea
            className="input min-h-20"
            placeholder="How did the exchange go? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
          />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Submitting…" : "Submit review"}
          </button>
        </form>
      )}

      {completed && myReview && (
        <p className="mt-2 text-sm text-emerald-700">
          You rated this session {myReview.rating}/5. Thanks!
        </p>
      )}

      {reviews.length > 0 && (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {names[r.reviewer_id] ?? "Member"}
                </span>
                <Stars value={r.rating} />
              </div>
              {r.comment && (
                <p className="mt-1 text-sm text-slate-600">{r.comment}</p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                {new Date(r.created_at).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

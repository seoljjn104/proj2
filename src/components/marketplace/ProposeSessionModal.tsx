"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import Alert from "@/components/ui/Alert";

/** Minimal target shape: works for marketplace cards and match cards. */
export interface ProposeTarget {
  profile_id: string;
  name: string | null;
}

interface SkillOption {
  id: number;
  name: string;
}

interface Props {
  provider: ProposeTarget;
  onClose: () => void;
}

/**
 * OFFERED skills for a member as id+name options. Goes through the
 * get_member_offered_skills RPC because user_skills is own-row RLS and
 * cannot be read for the other participant directly.
 */
async function loadOfferedSkills(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<SkillOption[]> {
  const { data } = await supabase.rpc("get_member_offered_skills", {
    p_user_id: userId,
  });
  return (data as SkillOption[]) ?? [];
}

/**
 * Proposes a PENDING 1:1 session slot through the propose_session RPC,
 * which owns validation and the state machine. The agreed teach/learn
 * skills are optional; when set they are validated against both members'
 * skill lists on the server.
 */
export default function ProposeSessionModal({ provider, onClose }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useAuth();
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState(60);
  const [message, setMessage] = useState("");
  const [mySkills, setMySkills] = useState<SkillOption[]>([]);
  const [theirSkills, setTheirSkills] = useState<SkillOption[]>([]);
  const [teachId, setTeachId] = useState("");
  const [learnId, setLearnId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const list = Array.from(focusables);
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [mine, theirs] = await Promise.all([
        loadOfferedSkills(supabase, user.id),
        loadOfferedSkills(supabase, provider.profile_id),
      ]);
      setMySkills(mine);
      setTheirSkills(theirs);
    })();
  }, [supabase, user, provider.profile_id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (!when) {
      setError("Pick a date and time.");
      return;
    }
    const scheduledAt = new Date(when);
    if (
      Number.isNaN(scheduledAt.getTime()) ||
      scheduledAt.getTime() <= Date.now()
    ) {
      setError("The proposed time must be in the future.");
      return;
    }

    setBusy(true);
    const { data, error: rpcError } = await supabase.rpc("propose_session", {
      p_provider: provider.profile_id,
      p_scheduled_at: scheduledAt.toISOString(),
      p_duration_minutes: duration,
      p_teach_tag_id: teachId ? Number(teachId) : null,
      p_learn_tag_id: learnId ? Number(learnId) : null,
      p_message: message.trim() ? message.trim() : null,
    });
    setBusy(false);

    if (rpcError) {
      setError(friendlyDbError(rpcError.message));
      return;
    }

    onClose();
    router.push(`/sessions/${data as string}`);
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="flex min-h-full items-center justify-center">
        <div
          ref={panelRef}
          className="card modal-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Propose a session"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-semibold">Propose a 1:1 session</h2>
          <p className="mt-1 text-sm text-slate-600">
            With <strong>{provider.name ?? "this user"}</strong>. They can accept
            or decline. You&apos;ll get an update either way.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="when" className="mb-1 block text-sm font-medium">
                Date &amp; time
              </label>
              <input
                id="when"
                ref={firstFieldRef}
                type="datetime-local"
                required
                className="input"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                aria-describedby="when-help"
              />
              <p id="when-help" className="mt-1 text-xs text-slate-500">
                Shown in your local time.
              </p>
            </div>

            <div>
              <label htmlFor="duration" className="mb-1 block text-sm font-medium">
                Duration
              </label>
              <select
                id="duration"
                className="input"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
            </div>

            {mySkills.length > 0 && (
              <div>
                <label
                  htmlFor="teach"
                  className="mb-1 block text-sm font-medium"
                >
                  You&apos;ll teach (optional)
                </label>
                <select
                  id="teach"
                  className="input"
                  value={teachId}
                  onChange={(e) => setTeachId(e.target.value)}
                >
                  <option value="">Not specified</option>
                  {mySkills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {theirSkills.length > 0 && (
              <div>
                <label
                  htmlFor="learn"
                  className="mb-1 block text-sm font-medium"
                >
                  They&apos;ll teach you (optional)
                </label>
                <select
                  id="learn"
                  className="input"
                  value={learnId}
                  onChange={(e) => setLearnId(e.target.value)}
                >
                  <option value="">Not specified</option>
                  {theirSkills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="message"
                className="mb-1 block text-sm font-medium"
              >
                Message (optional)
              </label>
              <textarea
                id="message"
                className="input min-h-[72px]"
                maxLength={300}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say hello and share what you'd like to work on."
              />
            </div>

            {error && <Alert>{error}</Alert>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? "Sending…" : "Send proposal"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

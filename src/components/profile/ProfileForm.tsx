"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import { isValidHeadline } from "@/lib/skills";
import type { SessionFormat } from "@/types/database";
import Alert from "@/components/ui/Alert";

const FORMATS: { value: SessionFormat; label: string }[] = [
  { value: "ONLINE", label: "Online" },
  { value: "IN_PERSON", label: "In person" },
  { value: "EITHER", label: "Online or in person" },
];

/** Common IANA zones for the datalist (best-effort; free text still allowed). */
function useTimezoneOptions(): string[] {
  return useMemo(() => {
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (key: string) => string[];
    };
    const guess = intl.DateTimeFormat().resolvedOptions().timeZone;
    const all =
      typeof intl.supportedValuesOf === "function"
        ? intl.supportedValuesOf("timeZone")
        : [];
    return guess && !all.includes(guess) ? [guess, ...all] : all;
  }, []);
}

export default function ProfileForm() {
  const supabase = createClient();
  const { profile, user, refreshProfile, loading } = useAuth();
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("");
  const [format, setFormat] = useState<SessionFormat>("ONLINE");
  const [availability, setAvailability] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const timezones = useTimezoneOptions();

  useEffect(() => {
    setName(profile?.name ?? "");
    setHeadline(profile?.headline ?? "");
    setBio(profile?.bio ?? "");
    setTimezone(profile?.timezone ?? "");
    setFormat(profile?.session_format ?? "ONLINE");
    setAvailability(profile?.availability ?? "");
  }, [profile]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!isValidHeadline(headline)) {
      setError("Keep your headline to 120 characters or fewer.");
      return;
    }
    setStatus("saving");
    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        name: name.trim() || null,
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        timezone: timezone.trim() || null,
        session_format: format,
        availability: availability.trim() || null,
      })
      .eq("id", user.id);
    if (updateError) {
      setStatus("idle");
      setError(friendlyDbError(updateError.message));
      return;
    }
    await refreshProfile();
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-slate-700">
          Display name
        </label>
        {loading ? (
          <div className="skeleton h-10" />
        ) : (
          <input
            id="profile-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Your name"
          />
        )}
      </div>

      <div>
        <label
          htmlFor="profile-headline"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Headline
        </label>
        {loading ? (
          <div className="skeleton h-10" />
        ) : (
          <>
            <input
              id="profile-headline"
              className="input"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={120}
              placeholder="Backend engineer who plays jazz guitar"
              aria-describedby="profile-headline-help"
            />
            <p id="profile-headline-help" className="mt-1 text-xs text-slate-500">
              A short one-liner shown at the top of your card. Max 120 characters.
            </p>
          </>
        )}
      </div>

      <div>
        <label htmlFor="profile-bio" className="mb-1 block text-sm font-medium text-slate-700">
          Bio
        </label>
        {loading ? (
          <div className="skeleton h-24" />
        ) : (
          <textarea
            id="profile-bio"
            className="input min-h-24"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            placeholder="What do you love teaching? What are you trying to learn?"
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="profile-timezone"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Timezone
          </label>
          <input
            id="profile-timezone"
            className="input"
            list="timezone-options"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Europe/London"
            autoComplete="off"
          />
          <datalist id="timezone-options">
            {timezones.map((tz) => (
              <option key={tz} value={tz} />
            ))}
          </datalist>
        </div>

        <div>
          <label
            htmlFor="profile-format"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Preferred format
          </label>
          <select
            id="profile-format"
            className="input"
            value={format}
            onChange={(e) => setFormat(e.target.value as SessionFormat)}
          >
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="profile-availability"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Availability
        </label>
        <input
          id="profile-availability"
          className="input"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          maxLength={160}
          placeholder="Weekday evenings, weekend mornings"
        />
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="btn-primary w-full sm:w-auto"
          disabled={status === "saving" || loading}
          aria-busy={status === "saving"}
        >
          {status === "saving" ? "Saving…" : "Save profile"}
        </button>
        {status === "saved" && (
          <span role="status" className="text-sm text-emerald-700">
            Saved.
          </span>
        )}
      </div>
    </form>
  );
}

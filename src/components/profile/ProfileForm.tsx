"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileForm() {
  const supabase = createClient();
  const { profile, user, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(profile?.name ?? "");
    setBio(profile?.bio ?? "");
  }, [profile]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setStatus("saving");
    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ name: name.trim() || null, bio: bio.trim() || null })
      .eq("id", user.id);
    if (updateError) {
      setStatus("idle");
      setError(updateError.message);
      return;
    }
    await refreshProfile();
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="profile-name" className="mb-1 block text-sm font-medium">
          Display name
        </label>
        <input
          id="profile-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="profile-bio" className="mb-1 block text-sm font-medium">
          Bio
        </label>
        <textarea
          id="profile-bio"
          className="input min-h-24"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          placeholder="What do you love teaching? What are you trying to learn?"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save profile"}
        </button>
        {status === "saved" && (
          <span className="text-sm text-emerald-700">Saved.</span>
        )}
      </div>
    </form>
  );
}

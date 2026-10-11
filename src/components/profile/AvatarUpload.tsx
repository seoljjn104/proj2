"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/ui/Avatar";
import Alert from "@/components/ui/Alert";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** The object path behind a public `avatars` URL, if it is one of ours. */
export function avatarPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const at = url.indexOf(marker);
  return at === -1 ? null : decodeURIComponent(url.slice(at + marker.length));
}

/** Storage failures in plain language — never the raw stack text. */
function friendlyStorageError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("maximum allowed size") || m.includes("too large")) {
    return "That image is larger than 2 MB. Try a smaller one.";
  }
  if (m.includes("mime type")) {
    return "Choose a PNG, JPEG, WebP or GIF image.";
  }
  if (m.includes("row-level security") || m.includes("violates")) {
    return "You can only change your own picture. Try signing in again.";
  }
  return "We couldn't save that picture. Please try again.";
}

/**
 * Profile picture: upload, replace, remove. Writes to
 * `avatars/<user id>/avatar-<timestamp>.<ext>` so each replacement gets a fresh
 * URL, then points `profiles.avatar_url` at it.
 */
export default function AvatarUpload() {
  const supabase = createClient();
  const { profile, user, refreshProfile, loading } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so picking the same file twice still fires a change event.
    e.target.value = "";
    if (!file || !user) return;

    if (!ALLOWED.includes(file.type)) {
      setError("Choose a PNG, JPEG, WebP or GIF image.");
      setNote(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is larger than 2 MB. Try a smaller one.");
      setNote(null);
      return;
    }

    setBusy("upload");
    setError(null);
    setNote(null);

    const rawExt = (file.name.split(".").pop() ?? "").toLowerCase();
    const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "3600" });

    if (uploadError) {
      setBusy(null);
      setError(friendlyStorageError(uploadError.message));
      return;
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ avatar_url: pub.publicUrl })
      .eq("id", user.id);

    if (dbError) {
      // Don't leave an orphaned object behind.
      await supabase.storage.from(BUCKET).remove([path]);
      setBusy(null);
      setError(friendlyDbError(dbError.message));
      return;
    }

    const previous = avatarPathFromUrl(profile?.avatar_url);
    if (previous && previous !== path) {
      await supabase.storage.from(BUCKET).remove([previous]);
    }

    await refreshProfile();
    setBusy(null);
    setNote("Profile picture updated.");
  }

  async function onRemove() {
    if (!user) return;
    setBusy("remove");
    setError(null);
    setNote(null);

    const previous = avatarPathFromUrl(profile?.avatar_url);
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (dbError) {
      setBusy(null);
      setError(friendlyDbError(dbError.message));
      return;
    }

    if (previous) await supabase.storage.from(BUCKET).remove([previous]);
    await refreshProfile();
    setBusy(null);
    setNote("Profile picture removed.");
  }

  return (
    <div className="flex flex-wrap items-start gap-5">
      <Avatar name={profile?.name} src={profile?.avatar_url} size="lg" className="h-20 w-20 text-xl" />

      <div className="min-w-[13rem] flex-1 space-y-3">
        <div>
          <p className="text-sm font-medium text-ink">Profile picture</p>
          <p className="mt-0.5 text-xs text-ink2">
            PNG, JPEG, WebP or GIF, up to 2 MB. Shown next to your name across
            the marketplace, matches and sessions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => inputRef.current?.click()}
            disabled={busy !== null || loading}
          >
            {busy === "upload"
              ? "Uploading…"
              : profile?.avatar_url
                ? "Replace photo"
                : "Upload photo"}
          </button>
          {profile?.avatar_url && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void onRemove()}
              disabled={busy !== null}
            >
              {busy === "remove" ? "Removing…" : "Remove"}
            </button>
          )}
        </div>

        <label htmlFor="avatar-file" className="sr-only">
          Choose a profile picture
        </label>
        <input
          ref={inputRef}
          id="avatar-file"
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => void onPick(e)}
        />

        <div aria-live="polite">
          {error && <Alert>{error}</Alert>}
          {!error && note && <p className="text-xs text-ink2">{note}</p>}
        </div>
      </div>
    </div>
  );
}

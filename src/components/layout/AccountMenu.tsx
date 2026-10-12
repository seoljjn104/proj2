"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/ui/Avatar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  ChevronDownIcon,
  HelpIcon,
  LogOutIcon,
  NotificationsIcon,
  ProfileIcon,
  SettingsIcon,
} from "./icons";

interface Props {
  /** Avatar-only trigger for the top bar, vs. the full row in the sidebar. */
  compact?: boolean;
  /** Which way the panel opens from the trigger. */
  placement?: "top" | "bottom";
  align?: "left" | "right";
  onNavigate?: () => void;
}

/**
 * The single home for everything that used to be nav rows or missing:
 * profile, notifications, settings, help and sign out. Reachable from the
 * top-bar avatar on every breakpoint.
 */
export default function AccountMenu({
  compact = false,
  placement = "bottom",
  align = "right",
  onNavigate,
}: Props) {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const displayName = profile?.name ?? user.email ?? "You";
  const email = user.email ?? "";

  function close() {
    setOpen(false);
    onNavigate?.();
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  const panelPos =
    placement === "top"
      ? "bottom-full mb-2"
      : "top-full mt-2";
  const panelAlign = align === "left" ? "left-0" : "right-0";

  return (
    <>
      <div ref={wrapRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={compact ? `${displayName}, account and settings` : undefined}
          title={compact ? displayName : undefined}
          className={
            compact
              ? "flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-line transition-colors hover:ring-2 hover:ring-teal-300"
              : "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-surface"
          }
        >
          <Avatar name={displayName} src={profile?.avatar_url} size={compact ? "md" : "sm"} />
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {displayName}
                </span>
                <span className="block truncate text-xs text-ink3">
                  Account & settings
                </span>
              </span>
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 text-ink3 transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </>
          )}
        </button>

        {open && (
          <div
            role="menu"
            aria-label="Account"
            className={`absolute z-50 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-panel)] ${panelPos} ${panelAlign}`}
          >
            <div className="flex items-center gap-3 border-b border-line2 px-3.5 py-3">
              <Avatar name={displayName} src={profile?.avatar_url} size="md" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">
                  {displayName}
                </span>
                {email && (
                  <span className="block truncate text-xs text-ink3">{email}</span>
                )}
              </span>
            </div>

            <div className="p-1.5">
              <Link
                href="/profile"
                role="menuitem"
                onClick={close}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink2 transition-colors hover:bg-slate-50 hover:text-ink"
              >
                <ProfileIcon className="h-[18px] w-[18px] text-ink3" aria-hidden="true" />
                Your profile
              </Link>
              <Link
                href="/notifications"
                role="menuitem"
                onClick={close}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink2 transition-colors hover:bg-slate-50 hover:text-ink"
              >
                <NotificationsIcon className="h-[18px] w-[18px] text-ink3" aria-hidden="true" />
                Notifications
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                onClick={close}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink2 transition-colors hover:bg-slate-50 hover:text-ink"
              >
                <SettingsIcon className="h-[18px] w-[18px] text-ink3" aria-hidden="true" />
                Settings
              </Link>
              <Link
                href="/help"
                role="menuitem"
                onClick={close}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink2 transition-colors hover:bg-slate-50 hover:text-ink"
              >
                <HelpIcon className="h-[18px] w-[18px] text-ink3" aria-hidden="true" />
                Help
              </Link>
            </div>

            <div className="border-t border-line2 p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setConfirmOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink2 transition-colors hover:bg-slate-50 hover:text-ink"
              >
                <LogOutIcon className="h-[18px] w-[18px] text-ink3" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title="Sign out"
          message="Are you sure you want to sign out of SkillGRID? You can sign back in anytime."
          confirmLabel="Sign out"
          busyLabel="Signing out…"
          busy={signingOut}
          onConfirm={() => void handleSignOut()}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}
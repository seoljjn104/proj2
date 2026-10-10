"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "@/components/layout/icons";

interface Props {
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Auth popup. Shares the app's modal treatment (focus trap, Escape, scroll
 * lock, restore focus on close) with a blurred backdrop and an X button in the
 * top-right so the user can always back out.
 */
export default function AuthModal({ label, onClose, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  return (
    <div
      className="auth-backdrop fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-panel)] motion-safe:animate-[modal-in_180ms_ease-out] sm:p-8"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${label}`}
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="pr-9">{children}</div>
        </div>
      </div>
    </div>
  );
}
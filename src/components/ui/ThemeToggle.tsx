"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

/**
 * Quick appearance control: one press flips light ⇄ dark and remembers the
 * choice. The labelled Light/Dark switch lives in Settings; this is the
 * shortcut that sits in the chrome, on both desktop and mobile.
 */
export default function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "Light" : "Dark";
  const label = `Appearance: ${theme === "dark" ? "Dark" : "Light"}. Switch to ${next.toLowerCase()}.`;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={
        className ??
        "flex h-11 w-11 items-center justify-center rounded-lg text-ink2 transition-colors hover:bg-slate-100 hover:text-ink"
      }
    >
      {theme === "dark" ? (
        <MoonIcon className="h-5 w-5" />
      ) : (
        <SunIcon className="h-5 w-5" />
      )}
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {theme === "dark" ? "Dark" : "Light"}
        </span>
      )}
    </button>
  );
}

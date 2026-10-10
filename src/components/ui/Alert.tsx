import type { ReactNode } from "react";

/**
 * Inline error box. Carries role="alert" so screen readers announce it —
 * every error surface in the app goes through this component.
 */
export default function Alert({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={`rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 ${className}`}
    >
      {children}
    </p>
  );
}

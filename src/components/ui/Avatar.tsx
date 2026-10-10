const SIZES = {
  sm: "h-7 w-7 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-11 w-11 text-base",
} as const;

export function initials(name: string | null | undefined): string {
  const label = (name ?? "").trim();
  if (!label) return "?";
  const parts = label.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/**
 * Initials avatar. One consistent treatment for every member surface —
 * decorative, so it is aria-hidden; the name is always rendered as text
 * next to it.
 */
export default function Avatar({
  name,
  size = "md",
  className = "",
}: {
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-800 ${SIZES[size]} ${className}`}
    >
      {initials(name)}
    </span>
  );
}

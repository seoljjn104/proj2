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
 * Member avatar. Shows their uploaded picture when there is one and falls back
 * to initials otherwise. One consistent treatment for every member surface —
 * decorative, so it is aria-hidden; the name is always rendered as text next
 * to it.
 */
export default function Avatar({
  name,
  src,
  size = "md",
  className = "",
}: {
  name?: string | null;
  /** Public URL from profiles.avatar_url. Falls back to initials when absent. */
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const shape = `${SIZES[size]} ${className}`;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Storage URL, no loader needed
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className={`shrink-0 rounded-full border border-line object-cover ${shape}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-800 ${shape}`}
    >
      {initials(name)}
    </span>
  );
}

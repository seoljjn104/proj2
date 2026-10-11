/**
 * SkillGRID brand mark — a 3×3 grid where the diagonal reads
 * teal → amber → teal (two members, a direct match between them).
 * Decorative, so it is aria-hidden; always paired with the wordmark.
 *
 * Colours are drawn from the Exchange tokens so the mark keeps its
 * meaning in both light and dark mode.
 */
export default function BrandMark({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  const faint = "var(--gg-line-strong)";
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <rect x="1.75" y="1.75" width="4.4" height="4.4" rx="1.1" fill="var(--gg-brand)" />
      <rect x="7.8" y="1.75" width="4.4" height="4.4" rx="1.1" fill={faint} />
      <rect x="13.85" y="1.75" width="4.4" height="4.4" rx="1.1" fill={faint} />
      <rect x="1.75" y="7.8" width="4.4" height="4.4" rx="1.1" fill={faint} />
      <rect x="7.8" y="7.8" width="4.4" height="4.4" rx="1.1" fill="var(--gg-amber)" />
      <rect x="13.85" y="7.8" width="4.4" height="4.4" rx="1.1" fill={faint} />
      <rect x="1.75" y="13.85" width="4.4" height="4.4" rx="1.1" fill={faint} />
      <rect x="7.8" y="13.85" width="4.4" height="4.4" rx="1.1" fill={faint} />
      <rect x="13.85" y="13.85" width="4.4" height="4.4" rx="1.1" fill="var(--gg-brand-strong)" />
    </svg>
  );
}

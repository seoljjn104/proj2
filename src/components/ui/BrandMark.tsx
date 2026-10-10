/**
 * SkillGRID brand mark — a 3×3 grid where the diagonal reads
 * teal → amber → teal (two members, a direct match between them).
 * Decorative, so it is aria-hidden; always paired with the wordmark.
 */
export default function BrandMark({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <rect x="1.75" y="1.75" width="4.4" height="4.4" rx="1.1" fill="#0d9488" />
      <rect x="7.8" y="1.75" width="4.4" height="4.4" rx="1.1" fill="#e2e8f0" />
      <rect x="13.85" y="1.75" width="4.4" height="4.4" rx="1.1" fill="#e2e8f0" />
      <rect x="1.75" y="7.8" width="4.4" height="4.4" rx="1.1" fill="#e2e8f0" />
      <rect x="7.8" y="7.8" width="4.4" height="4.4" rx="1.1" fill="#f59e0b" />
      <rect x="13.85" y="7.8" width="4.4" height="4.4" rx="1.1" fill="#e2e8f0" />
      <rect x="1.75" y="13.85" width="4.4" height="4.4" rx="1.1" fill="#e2e8f0" />
      <rect x="7.8" y="13.85" width="4.4" height="4.4" rx="1.1" fill="#e2e8f0" />
      <rect x="13.85" y="13.85" width="4.4" height="4.4" rx="1.1" fill="#0f766e" />
    </svg>
  );
}
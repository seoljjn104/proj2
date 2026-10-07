/**
 * Institutional email domain allowlist.
 *
 * NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS is a comma separated list,
 * e.g. "university.edu, college.edu".
 * An empty/unset value allows every domain (development default).
 *
 * The same rule is enforced authoritatively in the database by
 * public.enforce_email_domain() (migration 000003).
 */
export function isAllowedEmailDomain(email: string): boolean {
  const raw = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS ?? "";
  const allowed = raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) return true;

  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return allowed.includes(domain);
}

export function allowedDomainsHint(): string | null {
  const raw = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS ?? "";
  const allowed = raw
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  if (allowed.length === 0) return null;
  return allowed.join(", ");
}

/**
 * Skill name normalization — the single source of truth for how a
 * typed skill name becomes a canonical, comparable value.
 *
 * The database enforces the same rules in public.add_skill_tag()
 * (case-insensitive uniqueness via `idx_skill_tags_name_lower`), so a
 * canonical name created here will not duplicate an existing tag.
 *
 * Kept dependency-free and type-erasable so it can be unit tested with
 * Node's built-in test runner (see skills.test.ts).
 */

/** Trim and collapse internal whitespace: "  Data   Analysis " -> "Data Analysis". */
export function normalizeSkillName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Comparable key for a skill name (case- and whitespace-insensitive). */
export function skillKey(raw: string): string {
  return normalizeSkillName(raw).toLowerCase();
}

/** Skill names must be 2-60 characters after normalization. */
export function isValidSkillName(raw: string): boolean {
  const name = normalizeSkillName(raw);
  return name.length >= 2 && name.length <= 60;
}

/** Optional headline: at most 120 characters. Empty is allowed (clears it). */
export function isValidHeadline(raw: string): boolean {
  return raw.trim().length <= 120;
}

import { skillKey } from "./skills.ts";

/**
 * Reciprocal matching — the app's core rule, mirrored from
 * public.get_reciprocal_matches() in SQL.
 *
 * A match is reciprocal when two people can each teach the other:
 *   youTeach = my OFFERED  ∩ their WANTED
 *   youLearn = their OFFERED ∩ my WANTED
 * and a match exists only when BOTH are non-empty.
 *
 * Matching is exact on the canonical key (case/whitespace-insensitive),
 * never substring or fuzzy.
 *
 * Kept dependency-free so it can be unit tested with Node's built-in
 * test runner (see matching.test.ts).
 */

export interface SkillProfile {
  offered: readonly string[];
  wanted: readonly string[];
}

export interface ReciprocalMatch {
  isReciprocal: boolean;
  /** My offered skills that they want to learn (display names from `mine`). */
  youTeach: string[];
  /** Their offered skills that I want to learn (display names from `theirs`). */
  youLearn: string[];
}

/** Canonical key set from a list of display names. */
export function skillKeySet(names: readonly string[]): Set<string> {
  const set = new Set<string>();
  for (const name of names) {
    const key = skillKey(name);
    if (key) set.add(key);
  }
  return set;
}

/** Unique display names, preserving first-seen order, keyed by skillKey. */
function dedupeByKey(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = skillKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name.trim().replace(/\s+/g, " "));
  }
  return out;
}

function intersection(display: readonly string[], otherKeys: Set<string>): string[] {
  return dedupeByKey(display).filter((name) => otherKeys.has(skillKey(name)));
}

/**
 * Compute the reciprocal match between two people. Pure and total —
 * safe to call with empty lists.
 */
export function reciprocalMatch(mine: SkillProfile, theirs: SkillProfile): ReciprocalMatch {
  const mineWanted = skillKeySet(mine.wanted);
  const theirsWanted = skillKeySet(theirs.wanted);

  const youTeach = intersection(mine.offered, theirsWanted);
  const youLearn = intersection(theirs.offered, mineWanted);

  return {
    isReciprocal: youTeach.length > 0 && youLearn.length > 0,
    youTeach,
    youLearn,
  };
}

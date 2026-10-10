import { FunctionsHttpError } from "@supabase/supabase-js";

const DB_MESSAGES: [(message: string) => boolean, string][] = [
  [
    (m) => m.includes("overlaps an existing"),
    "That time slot overlaps another session for one of you.",
  ],
  [
    (m) => m.includes("scheduled time is required"),
    "This session has no scheduled time.",
  ],
  [
    (m) => m.includes("Only the provider can accept"),
    "Only the provider can accept this proposal.",
  ],
  [
    (m) => m.includes("Only the provider can decline"),
    "Only the provider can respond to this proposal.",
  ],
  [
    (m) => m.includes("no longer awaiting your response"),
    "This proposal was already answered or withdrawn.",
  ],
  [
    (m) => m.includes("can no longer be cancelled"),
    "This session can no longer be cancelled.",
  ],
  [
    (m) => m.includes("not ready to be completed"),
    "Only an accepted session can be marked complete.",
  ],
  [
    (m) => m.includes("Choose a time in the future"),
    "Pick a time in the future.",
  ],
  [
    (m) => m.includes("Duration must be between"),
    "Pick a duration between 15 and 480 minutes.",
  ],
  [
    (m) => m.includes("cannot propose a session with this member"),
    "You can't propose a session with this member.",
  ],
  [
    (m) => m.includes("not available for proposals"),
    "That member isn't available for new proposals.",
  ],
  [
    (m) => m.includes("You can only offer to teach"),
    "Pick a skill from your own teaching list.",
  ],
  [
    (m) => m.includes("does not offer that skill"),
    "Your partner doesn't offer that skill.",
  ],
  [
    (m) => m.includes("Choose another member"),
    "Pick another member to propose to.",
  ],
  [
    (m) => m.includes("closed sessions can be removed") ||
      m.includes("can be removed"),
    "Only closed sessions can be removed.",
  ],
  [
    (m) => m.includes("terminal") || m.includes("cannot change status"),
    "This session is already closed.",
  ],
  [
    (m) => m.includes("duplicate key") || m.includes("already"),
    "That is already on the list.",
  ],
];

/**
 * Maps a raw Postgres/PostgREST error message to plain language.
 * Never surfaces the raw database text to users.
 */
export function friendlyDbError(message: string): string {
  for (const [matches, friendly] of DB_MESSAGES) {
    if (matches(message)) return friendly;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Maps an edge-function failure (supabase.functions.invoke) to plain language,
 * preferring the function's own friendly `error` field when present.
 */
export async function friendlyFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      // fall through to the generic message
    }
  }
  if (error instanceof Error) {
    return "The meeting service is unavailable right now. Please try again.";
  }
  return "The meeting service returned an error.";
}

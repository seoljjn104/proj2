import type { SessionStatus } from "../types/database";

/**
 * Session lifecycle rules — mirrored from the SQL state machine in
 * public.propose_session / respond_session / cancel_session /
 * complete_session and the guard_session_transition trigger.
 *
 *   PENDING  -> ACCEPTED | DECLINED | CANCELLED   (terminal: DECLINED, CANCELLED)
 *   ACCEPTED -> COMPLETED | CANCELLED             (terminal: COMPLETED, CANCELLED)
 *
 * Kept dependency-free (types are erased at runtime) so it can be unit
 * tested with Node's built-in test runner (see session.test.ts).
 */

export type Actor = "REQUESTER" | "PROVIDER" | "OBSERVER";

/** Where a session belongs in the Sessions screen. */
export type SessionBucket = "incoming" | "outgoing" | "upcoming" | "history";

export const TERMINAL_STATUSES: readonly SessionStatus[] = [
  "DECLINED",
  "COMPLETED",
  "CANCELLED",
];

export function isTerminal(status: SessionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Which side of the session the current user is on. */
export function actorFor(
  userId: string,
  requesterId: string,
  providerId: string,
): Actor {
  if (userId === requesterId) return "REQUESTER";
  if (userId === providerId) return "PROVIDER";
  return "OBSERVER";
}

/** Only the provider can accept or decline a pending proposal. */
export function canRespond(status: SessionStatus, actor: Actor): boolean {
  return status === "PENDING" && actor === "PROVIDER";
}

/** Either participant can cancel a pending or accepted session. */
export function canCancel(status: SessionStatus, actor: Actor): boolean {
  if (actor !== "REQUESTER" && actor !== "PROVIDER") return false;
  return status === "PENDING" || status === "ACCEPTED";
}

/** Either participant can mark an accepted session complete. */
export function canComplete(status: SessionStatus, actor: Actor): boolean {
  if (actor !== "REQUESTER" && actor !== "PROVIDER") return false;
  return status === "ACCEPTED";
}

/**
 * A session is joinable only while it is ACCEPTED. Pending, declined,
 * cancelled and completed sessions have no room to join, so the pre-call
 * screen must not offer a way in.
 */
export function canJoin(status: SessionStatus): boolean {
  return status === "ACCEPTED";
}

/**
 * Bucket a session for the current actor:
 * - incoming: pending proposals awaiting the provider
 * - outgoing: pending proposals awaiting the requester's partner
 * - upcoming: accepted sessions
 * - history:  every terminal status
 */
export function bucketFor(status: SessionStatus, actor: Actor): SessionBucket {
  if (status === "PENDING") return actor === "PROVIDER" ? "incoming" : "outgoing";
  if (status === "ACCEPTED") return "upcoming";
  return "history";
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Scheduled",
  DECLINED: "Declined",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function statusLabel(status: SessionStatus): string {
  return STATUS_LABELS[status];
}

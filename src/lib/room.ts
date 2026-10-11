/**
 * The Jitsi deployment we embed.
 *
 * Two things must both be true of the host — and it is easy to check only one
 * of them:
 *
 * 1. **It must be framable.** If it answers with `X-Frame-Options`, or with a
 *    `Content-Security-Policy: frame-ancestors` list that does not include us,
 *    the browser refuses to load the iframe and the room renders as an empty
 *    box with a console error. (`meet.ffmuc.net` fails here: it sends
 *    `X-Frame-Options: SAMEORIGIN`, plus a frame-ancestors list of its own
 *    domains.)
 * 2. **It must let the first participant become moderator anonymously.** Some
 *    hosts insist on an *authenticated* moderator before a room will start, and
 *    both people then stare at "The conference has not yet started, because no
 *    moderators have yet arrived". No `configOverwrite` can lift that — it is
 *    server-side policy. (`meet.jit.si` fails here.)
 *
 * `jitsi.riot.im` passes both. Verified with two participants: the first is
 * granted the moderator role, the second joins and can see them — no waiting
 * screen on either side. Override with `NEXT_PUBLIC_JITSI_DOMAIN`, and set the
 * matching `JITSI_DOMAIN` secret for the `generate-meeting-link` edge function
 * to the *same* host (a self-hosted `meet.example.org`, say).
 */
export const JITSI_DOMAIN = (
  (process.env.NEXT_PUBLIC_JITSI_DOMAIN ?? "").trim() || "jitsi.riot.im"
)
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");

/**
 * Derives a Jitsi room name from the session's meeting link. The link may be
 * missing or malformed, so this always returns something usable rather than
 * throwing.
 */
export function roomNameFromLink(link: string): string {
  try {
    return new URL(link).pathname.replace(/^\//, "").slice(0, 200) || "session";
  } catch {
    return `skillgrid-session-${link.slice(-36)}`;
  }
}

/**
 * The public URL for a room on the configured instance. Deriving this from the
 * room name (rather than echoing `sessions.meeting_link`) keeps the "open in a
 * new tab" fallback on the same host we embed, even if the link was minted
 * before the domain changed.
 */
export function roomUrl(roomName: string): string {
  return `https://${JITSI_DOMAIN}/${roomName}`;
}

/** The room name for a session, resilient to a missing meeting link. */
export function roomNameForSession(
  sessionId: string,
  meetingLink: string | null | undefined,
): string {
  return meetingLink ? roomNameFromLink(meetingLink) : `skillgrid-${sessionId}`;
}

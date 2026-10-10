// ============================================================
// SkillGRID — generate-meeting-link
//
// Invoked by the client right after a session is ACCEPTED.
// Creates a private Jitsi Meet room and stores its URL in
// public.sessions.meeting_link so the 1:1 video call can be
// embedded in-app (Jitsi Meet IFrame API — no download, no
// separate app).
//
// No secrets required. Each room name carries a random suffix,
// so only the two participants — who see the link inside the
// app — can join.
//
// Runs with the caller's JWT: RLS guarantees only a session
// participant can read/update the session row.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json().catch(() => ({}) as { session_id?: string });
    if (!session_id) {
      return json({ error: "session_id is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // RLS: only participants can read the session row.
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, status, meeting_link, requester_id, provider_id")
      .eq("id", session_id)
      .maybeSingle();

    if (sessionError) {
      console.error("Session lookup failed:", sessionError.message);
      return json({ error: "Could not load session" }, 500);
    }
    if (!session) {
      return json({ error: "Session not found or not visible to you" }, 404);
    }
    if (session.requester_id !== user.id && session.provider_id !== user.id) {
      return json({ error: "Only session participants can generate a meeting link" }, 403);
    }
    if (session.status !== "ACCEPTED") {
      return json({ error: "Session must be ACCEPTED before a meeting link exists" }, 409);
    }

    // Idempotent: reuse the link we already stored.
    if (session.meeting_link) {
      return json({ meeting_link: session.meeting_link, reused: true });
    }

    // Unguessable room: session id + random suffix. The meeting itself is
    // not scheduled — the room exists the moment a participant joins.
    const roomName = `skillgrid-${session.id}-${crypto.randomUUID().slice(0, 8)}`;
    const meeting_link = `https://meet.jit.si/${roomName}`;

    const { data: updated, error: updateError } = await supabase
      .from("sessions")
      .update({ meeting_link })
      .eq("id", session.id)
      .select("meeting_link")
      .single();

    if (updateError || !updated) {
      console.error("Failed to store meeting link:", updateError?.message);
      return json({ error: "Meeting room created but could not be stored" }, 500);
    }

    return json({ meeting_link: updated.meeting_link });
  } catch (err) {
    console.error("generate-meeting-link failed:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
// ============================================================
// SkillGRID — generate-meeting-link
//
// Invoked by the client right after a session is ACCEPTED.
// Creates a 1:1 Zoom meeting (Server-to-Server OAuth) and
// stores join_url in public.sessions.meeting_link.
//
// Required secrets:
//   supabase secrets set \
//     ZOOM_ACCOUNT_ID=... ZOOM_CLIENT_ID=... ZOOM_CLIENT_SECRET=...
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

interface ZoomMeeting {
  id: number;
  join_url: string;
  start_url: string;
}

async function getZoomAccessToken(): Promise<string> {
  const accountId = Deno.env.get("ZOOM_ACCOUNT_ID");
  const clientId = Deno.env.get("ZOOM_CLIENT_ID");
  const clientSecret = Deno.env.get("ZOOM_CLIENT_SECRET");

  if (!accountId || !clientId || !clientSecret) {
    throw new Error(
      "Zoom is not configured. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET " +
        "with `supabase secrets set`.",
    );
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    console.error("Zoom OAuth failed:", res.status, detail);
    throw new Error(`Zoom OAuth failed (${res.status}).`);
  }

  const data = await res.json();
  return data.access_token as string;
}

async function createZoomMeeting(
  token: string,
  topic: string,
  startTime: string,
  durationMinutes: number,
): Promise<ZoomMeeting> {
  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      type: 2, // scheduled meeting
      start_time: startTime,
      duration: durationMinutes,
      timezone: "UTC",
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        waiting_room: true,
        approval_type: 0, // automatically approve
        audio: "both",
        allow_multiple_devices: false,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Zoom meeting creation failed:", res.status, detail);
    throw new Error(`Zoom meeting creation failed (${res.status}).`);
  }

  return (await res.json()) as ZoomMeeting;
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
      .select("id, status, scheduled_at, duration_minutes, meeting_link, requester_id, provider_id")
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
    if (!session.scheduled_at) {
      return json({ error: "Session has no scheduled time" }, 409);
    }

    const token = await getZoomAccessToken();

    const startTime =
      new Date(session.scheduled_at).toISOString().slice(0, 19) + "Z";
    const meeting = await createZoomMeeting(
      token,
      "SkillGRID 1:1 Session",
      startTime,
      session.duration_minutes ?? 60,
    );

    const { data: updated, error: updateError } = await supabase
      .from("sessions")
      .update({ meeting_link: meeting.join_url })
      .eq("id", session.id)
      .select("meeting_link")
      .single();

    if (updateError || !updated) {
      console.error("Failed to store meeting link:", updateError?.message);
      return json({ error: "Meeting created but could not be stored" }, 500);
    }

    return json({ meeting_link: updated.meeting_link });
  } catch (err) {
    console.error("generate-meeting-link failed:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});

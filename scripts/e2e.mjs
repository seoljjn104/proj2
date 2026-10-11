#!/usr/bin/env node
/**
 * SkillGRID end-to-end smoke test.
 *
 * Drives the real stack over HTTP: Next.js app pages (SSR + middleware),
 * Supabase auth/REST/RPC (RLS, triggers), and the Jitsi room edge function
 * (no secrets required — rooms are created in-app).
 *
 * Usage:
 *   node scripts/e2e.mjs                      # local defaults
 *   APP_URL=http://localhost:3000 \
 *   SUPABASE_URL=http://127.0.0.1:54321 \
 *   SUPABASE_ANON_KEY=... \
 *   node scripts/e2e.mjs
 *
 * Test accounts (local, created by the harness if missing):
 *   alice@skillgrid.test   (admin after promote)
 *   bob@skillgrid.test
 *   carol@skillgrid.test
 * Password comes from E2E_PASSWORD (env) or .env.local — never committed.
 */

import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const SUPA = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

function envLocal(name) {
  try {
    const m = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`, "m"));
    if (!m) return undefined;
    return m[1].trim().replace(/^["']|["']$/g, "") || undefined;
  } catch {
    return undefined;
  }
}

const PASSWORD = process.env.E2E_PASSWORD ?? envLocal("E2E_PASSWORD");
if (!PASSWORD) {
  console.error(
    "E2E_PASSWORD missing — set it in the environment or in .env.local (gitignored).",
  );
  process.exit(1);
}

const ALICE = "alice@skillgrid.test";
const BOB = "bob@skillgrid.test";
const CAROL = "carol@skillgrid.test";

let passed = 0;
const failures = [];

function check(name, ok, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push({ name, detail });
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function restBase() {
  return `${SUPA}/rest/v1`;
}

async function api(token, method, path, body, extraHeaders = {}) {
  const res = await fetch(`${SUPA}${path}`, {
    method,
    headers: {
      apikey: ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data, text };
}

async function signUp(email, name) {
  return api(null, "POST", "/auth/v1/signup", {
    email,
    password: PASSWORD,
    data: { name },
  });
}

async function signIn(email) {
  const r = await api(null, "POST", "/auth/v1/token?grant_type=password", {
    email,
    password: PASSWORD,
  });
  if (!r.ok) throw new Error(`sign-in failed for ${email}: ${r.text}`);
  return r.data;
}

async function rpc(token, fn, params) {
  return api(token, "POST", `/rest/v1/rpc/${fn}`, params ?? {});
}

async function appGet(path, { cookie, redirect = "manual" } = {}) {
  const res = await fetch(`${APP}${path}`, {
    redirect,
    headers: cookie ? { cookie } : {},
  });
  const body = await res.text();
  return { status: res.status, location: res.headers.get("location"), body };
}

/** Sign in through @supabase/ssr with a cookie jar, return Cookie header. */
async function appSessionCookie(email) {
  const jar = new Map();
  const client = createServerClient(SUPA, ANON, {
    cookies: {
      getAll() {
        return [...jar.entries()].map(([name, value]) => ({ name, value }));
      },
      setAll(cookies) {
        cookies.forEach(({ name, value }) => jar.set(name, value));
      },
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw new Error(`cookie session failed for ${email}: ${error.message}`);
  return [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");
}

function iso(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * 3600_000).toISOString();
}

async function ensureUser(email, name) {
  const r = await signUp(email, name);
  if (r.ok && r.data?.access_token) return r.data;
  const s = await signIn(email).catch(() => null);
  if (s) return s;
  throw new Error(
    `cannot establish session for ${email} (${r.text}). ` +
      "On hosted Supabase, confirm the user's email first.",
  );
}

async function main() {
  console.log(`SkillGRID E2E — app=${APP} supabase=${SUPA}\n`);

  // ---- 1. Unauthenticated app routes -------------------------------------
  console.log("app (unauthenticated)");
  {
    const home = await appGet("/");
    check("GET / -> 200", home.status === 200, `got ${home.status}`);
    const login = await appGet("/login");
    check(
      "GET /login redirects to the sign-in popup on home",
      [302, 303, 307, 308].includes(login.status) &&
        (login.location ?? "").includes("/") &&
        (login.location ?? "").includes("auth=login"),
      `got ${login.status} -> ${login.location}`,
    );
    const signup = await appGet("/signup");
    check(
      "GET /signup redirects to the create-account popup on home",
      [302, 303, 307, 308].includes(signup.status) &&
        (signup.location ?? "").includes("/") &&
        (signup.location ?? "").includes("auth=signup"),
      `got ${signup.status} -> ${signup.location}`,
    );

    const mp = await appGet("/marketplace");
    check(
      "GET /marketplace redirects to home sign-in popup",
      [302, 303, 307, 308].includes(mp.status) &&
        (mp.location ?? "").includes("/") &&
        (mp.location ?? "").includes("auth=login"),
      `got ${mp.status} -> ${mp.location}`,
    );
    const admin = await appGet("/admin");
    check(
      "GET /admin redirects to home popup with next=/admin",
      [302, 303, 307, 308].includes(admin.status) &&
        (admin.location ?? "").includes("auth=login") &&
        (admin.location ?? "").includes("next") &&
        (admin.location ?? "").includes("admin"),
      `got ${admin.status} -> ${admin.location}`,
    );
    const prof = await appGet("/profile");
    check(
      "GET /profile redirects to home popup with next",
      [302, 303, 307, 308].includes(prof.status) &&
        (prof.location ?? "").includes("auth=login") &&
        (prof.location ?? "").includes("next"),
      `got ${prof.status} -> ${prof.location}`,
    );
  }

  // ---- 2. Users -----------------------------------------------------------
  console.log("\nauth");
  const alice = await ensureUser(ALICE, "Alice Admin");
  const bob = await ensureUser(BOB, "Bob Builder");
  const carol = await ensureUser(CAROL, "Carol Carol");
  check("sessions established for alice/bob/carol", true);
  const A = alice.access_token;
  const B = bob.access_token;
  const C = carol.access_token;

  // Re-run friendliness: cancel any active sessions left by a previous run
  // (the overlap trigger would otherwise reject this run's slots).
  {
    const active = await api(A, "GET",
      "/rest/v1/sessions?status=in.(PENDING,ACCEPTED)&select=id");
    for (const s of Array.isArray(active.data) ? active.data : []) {
      await api(A, "PATCH", `/rest/v1/sessions?id=eq.${s.id}`,
        { status: "CANCELLED" });
    }
  }

  // ---- 3. Discovery -------------------------------------------------------
  console.log("\ndiscovery (RPC + RLS)");
  {
    const feed = await rpc(A, "get_marketplace_feed", {});
    const rows = feed.ok && Array.isArray(feed.data) ? feed.data : [];
    const bobRow = rows.find((r) => r.profile_id === bob.user.id);
    check("marketplace feed returns rows", rows.length > 0, feed.text);
    check("feed includes bob with is_direct_match", bobRow?.is_direct_match === true,
      JSON.stringify(bobRow));
    check(
      "feed rows expose no email",
      rows.every((r) => !("email" in r)),
      `keys: ${Object.keys(rows[0] ?? {}).join(",")}`,
    );

    const matches = await rpc(A, "get_reciprocal_matches", {
      p_user_id: alice.user.id,
    });
    const mrows = matches.ok && Array.isArray(matches.data) ? matches.data : [];
    check(
      "reciprocal matches contain bob",
      mrows.some((r) => (r.partner_id ?? r.profile_id ?? r.id) === bob.user.id),
      matches.text,
    );

    const cMatches = await rpc(C, "get_reciprocal_matches", {
      p_user_id: carol.user.id,
    });
    const cm = cMatches.ok && Array.isArray(cMatches.data) ? cMatches.data : [];
    check("carol (no skills) has zero matches", cm.length === 0, cMatches.text);

    const dir = await rpc(A, "get_profile_directory", {});
    const dirRows = dir.ok && Array.isArray(dir.data) ? dir.data : [];
    check(
      "get_profile_directory visible with no email column",
      dirRows.some((r) => r.id === bob.user.id) &&
        dirRows.every((r) => !("email" in r)),
      dir.text,
    );

    const other = await api(
      A,
      "GET",
      `/rest/v1/profiles?id=eq.${bob.user.id}&select=*`,
    );
    check(
      "direct read of another profile returns 0 rows (RLS)",
      other.ok && Array.isArray(other.data) && other.data.length === 0,
      other.text,
    );

    const adminViewAsBob = await rpc(B, "get_admin_flags", {});
    check(
      "get_admin_flags empty for non-admin",
      adminViewAsBob.ok && Array.isArray(adminViewAsBob.data) && adminViewAsBob.data.length === 0,
      adminViewAsBob.text,
    );
  }

  // ---- 4. Session lifecycle ---------------------------------------------
  console.log("\nsession lifecycle");
  let sessionId;
  let pendingId;
  {
    const slot = iso(24);
    const created = await rpc(A, "propose_session", {
      p_provider: bob.user.id,
      p_scheduled_at: slot,
      p_duration_minutes: 60,
    });
    check("requester proposes PENDING session (RPC)",
      created.ok && typeof created.data === "string", created.text);
    sessionId = created.ok ? created.data : undefined;

    const directInsert = await api(A, "POST", "/rest/v1/sessions", {
      requester_id: alice.user.id,
      provider_id: bob.user.id,
      scheduled_at: iso(25),
      duration_minutes: 60,
    });
    check("direct session INSERT is no longer allowed",
      !directInsert.ok, directInsert.text);

    const overlap = await rpc(A, "propose_session", {
      p_provider: bob.user.id,
      p_scheduled_at: slot,
      p_duration_minutes: 60,
    });
    check("overlapping slot rejected (23514)",
      !overlap.ok && JSON.stringify(overlap.data ?? overlap.text).includes("23514"),
      overlap.text);

    const badAccept = await api(A, "PATCH", `/rest/v1/sessions?id=eq.${sessionId}`,
      { status: "ACCEPTED" });
    check("requester (non-provider) cannot accept", !badAccept.ok, badAccept.text);

    const badLink = await api(A, "PATCH", `/rest/v1/sessions?id=eq.${sessionId}`,
      { meeting_link: "https://meet.jit.si/not-yours" });
    check("meeting_link not writable while PENDING", !badLink.ok, badLink.text);

    const accepted = await api(B, "PATCH", `/rest/v1/sessions?id=eq.${sessionId}`,
      { status: "ACCEPTED" }, { Prefer: "return=representation" });
    check("provider accepts -> ACCEPTED",
      accepted.ok && accepted.data?.[0]?.status === "ACCEPTED", accepted.text);
  }

  // ---- 5. Edge function ---------------------------------------------------
  console.log("\nedge function (generate-meeting-link)");
  {
    const noBody = await api(A, "POST", "/functions/v1/generate-meeting-link", {});
    check("missing session_id -> 400", noBody.status === 400, noBody.text);

    const outsider = await api(C, "POST", "/functions/v1/generate-meeting-link",
      { session_id: sessionId });
    check("non-participant rejected", [401, 403, 404].includes(outsider.status),
      outsider.text);

    const room = await api(A, "POST", "/functions/v1/generate-meeting-link",
      { session_id: sessionId });
    const roomLink = room.ok && typeof room.data === "object" && room.data
      ? room.data.meeting_link
      : null;
    check(
      "participant gets a Jitsi room link",
      typeof roomLink === "string" && roomLink.startsWith("https://meet.jit.si/"),
      `${room.status}: ${room.text}`,
    );

    const stored = await api(A, "GET",
      `/rest/v1/sessions?id=eq.${sessionId}&select=meeting_link`);
    check("meeting_link persisted on session",
      stored.ok && stored.data?.[0]?.meeting_link === roomLink, stored.text);

    const again = await api(A, "POST", "/functions/v1/generate-meeting-link",
      { session_id: sessionId });
    check("idempotent — same room returned on re-invoke",
      again.ok && again.data?.reused === true &&
        again.data?.meeting_link === roomLink,
      again.text);
  }

  // ---- 6. Chat ------------------------------------------------------------
  console.log("\nmessages");
  {
    const m1 = await api(A, "POST", "/rest/v1/messages", {
      session_id: sessionId, sender_id: alice.user.id, content: "Hi Bob!",
    });
    check("participant alice can post", m1.ok, m1.text);
    const m2 = await api(B, "POST", "/rest/v1/messages", {
      session_id: sessionId, sender_id: bob.user.id, content: "Hi Alice!",
    });
    check("participant bob can post", m2.ok, m2.text);
    const m3 = await api(C, "POST", "/rest/v1/messages", {
      session_id: sessionId, sender_id: carol.user.id, content: "intruder",
    });
    check("non-participant cannot post", !m3.ok, m3.text);

    const read = await api(C, "GET", `/rest/v1/messages?session_id=eq.${sessionId}`);
    check("non-participant cannot read messages",
      read.ok && Array.isArray(read.data) && read.data.length === 0, read.text);
  }

  // ---- 7. Complete + reviews ---------------------------------------------
  console.log("\ncompletion + reviews");
  {
    const done = await api(B, "PATCH", `/rest/v1/sessions?id=eq.${sessionId}`,
      { status: "COMPLETED" }, { Prefer: "return=representation" });
    check("either participant can complete",
      done.ok && done.data?.[0]?.status === "COMPLETED", done.text);

    const review = await api(A, "POST", "/rest/v1/reviews", {
      session_id: sessionId,
      reviewer_id: alice.user.id,
      reviewee_id: bob.user.id,
      rating: 5,
      comment: "Great teacher",
    });
    check("review after COMPLETED accepted", review.ok, review.text);

    const dup = await api(A, "POST", "/rest/v1/reviews", {
      session_id: sessionId,
      reviewer_id: alice.user.id,
      reviewee_id: bob.user.id,
      rating: 4,
    });
    check("duplicate review rejected", !dup.ok, dup.text);

    const self = await api(A, "POST", "/rest/v1/reviews", {
      session_id: sessionId,
      reviewer_id: alice.user.id,
      reviewee_id: alice.user.id,
      rating: 5,
    });
    check("self review rejected", !self.ok, self.text);

    const outsiderReview = await api(C, "POST", "/rest/v1/reviews", {
      session_id: sessionId,
      reviewer_id: carol.user.id,
      reviewee_id: bob.user.id,
      rating: 1,
    });
    check("non-participant review rejected", !outsiderReview.ok, outsiderReview.text);

    const slot2 = iso(48);
    const s2 = await rpc(A, "propose_session", {
      p_provider: bob.user.id,
      p_scheduled_at: slot2,
      p_duration_minutes: 45,
    });
    pendingId = s2.ok ? s2.data : undefined;
    const early = await api(A, "POST", "/rest/v1/reviews", {
      session_id: pendingId,
      reviewer_id: alice.user.id,
      reviewee_id: bob.user.id,
      rating: 5,
    });
    check("review on non-COMPLETED session rejected", !early.ok, early.text);
  }

  // ---- 8. Moderation ------------------------------------------------------
  console.log("\nmoderation");
  {
    const adminFlag = await rpc(A, "flag_user", {
      p_user_id: bob.user.id, p_reason: "E2E test flag",
    });
    check("admin flag_user succeeds", adminFlag.ok, adminFlag.text);

    const feedAsCarol = await rpc(C, "get_marketplace_feed", {});
    const frows = Array.isArray(feedAsCarol.data) ? feedAsCarol.data : [];
    check("flagged user hidden from feed",
      !frows.some((r) => r.profile_id === bob.user.id), feedAsCarol.text);

    const flags = await rpc(A, "get_admin_flags", {});
    check("admin sees flag rows",
      flags.ok && Array.isArray(flags.data) &&
        flags.data.some((r) => r.id === bob.user.id && r.flagged === true),
      flags.text);

    const escalate = await api(B, "PATCH",
      `/rest/v1/profiles?id=eq.${bob.user.id}`, { is_admin: true });
    check("non-admin cannot self-promote", !escalate.ok, escalate.text);

    const modFields = await api(B, "PATCH",
      `/rest/v1/profiles?id=eq.${bob.user.id}`, { flagged: false });
    check("non-admin cannot clear own flag", !modFields.ok, modFields.text);

    const crossEdit = await api(A, "PATCH",
      `/rest/v1/profiles?id=eq.${bob.user.id}`, { flagged: false },
      { Prefer: "return=representation" });
    check("admin cannot edit others via REST (RPC only)",
      crossEdit.ok && Array.isArray(crossEdit.data) && crossEdit.data.length === 0,
      crossEdit.text);

    const unflag = await rpc(A, "unflag_user", { p_user_id: bob.user.id });
    check("admin unflag_user succeeds", unflag.ok, unflag.text);

    const feedBack = await rpc(C, "get_marketplace_feed", {});
    check("unflagged user visible again",
      Array.isArray(feedBack.data) &&
        feedBack.data.some((r) => r.profile_id === bob.user.id), feedBack.text);
  }

  // ---- 8b. Overhaul features: decline, notifications, block, report -------
  let declinedId;
  let cancelId;
  let completeId;
  console.log("\noverhaul features (decline / notifications / block / report)");
  {
    // Decline goes PENDING -> DECLINED (the state machine must accept it).
    const p = await rpc(A, "propose_session", {
      p_provider: bob.user.id,
      p_scheduled_at: iso(72),
      p_duration_minutes: 30,
    });
    declinedId = p.ok ? p.data : undefined;
    check("proposal created for decline", typeof declinedId === "string", p.text);

    const decline = await rpc(B, "respond_session", {
      p_session_id: declinedId,
      p_accept: false,
      p_reason: "Can't make it",
    });
    check("provider can decline (RPC)", decline.ok, decline.text);

    const declined = await api(A, "GET",
      `/rest/v1/sessions?id=eq.${declinedId}&select=status,decline_reason,responded_at`);
    const dRow = declined.data?.[0];
    check("declined status + reason + responded_at stamped",
      dRow?.status === "DECLINED" && dRow?.decline_reason === "Can't make it" &&
        Boolean(dRow?.responded_at), declined.text);

    const reRespond = await rpc(B, "respond_session", {
      p_session_id: declinedId, p_accept: true,
    });
    check("cannot re-respond to a decided proposal", !reRespond.ok, reRespond.text);

    const nProvider = await api(B, "GET",
      `/rest/v1/notifications?session_id=eq.${declinedId}&kind=eq.SESSION_PROPOSED&select=id`);
    check("provider notified of the proposal",
      Array.isArray(nProvider.data) && nProvider.data.length === 1, nProvider.text);

    const nRequester = await api(A, "GET",
      `/rest/v1/notifications?session_id=eq.${declinedId}&kind=eq.SESSION_DECLINED&select=id,read_at`);
    const nid = nRequester.data?.[0]?.id;
    check("requester notified of the decline",
      Array.isArray(nRequester.data) && nRequester.data.length === 1, nRequester.text);

    const tamper = nid
      ? await api(A, "PATCH", `/rest/v1/notifications?id=eq.${nid}`, { title: "hacked" })
      : { ok: false };
    check("notification content cannot be rewritten", !tamper.ok, tamper.text);
    const markRead = nid
      ? await api(A, "PATCH", `/rest/v1/notifications?id=eq.${nid}`,
          { read_at: new Date().toISOString() })
      : { ok: false };
    check("notification can be marked read", markRead.ok, markRead.text);

    // cancel_session + complete_session RPCs (the paths the UI uses).
    const p2 = await rpc(A, "propose_session", {
      p_provider: bob.user.id, p_scheduled_at: iso(96), p_duration_minutes: 30,
    });
    cancelId = p2.ok ? p2.data : undefined;
    const cancelled = await rpc(A, "cancel_session", { p_session_id: cancelId });
    check("cancel_session RPC cancels", cancelled.ok, cancelled.text);

    const p3 = await rpc(A, "propose_session", {
      p_provider: bob.user.id, p_scheduled_at: iso(120), p_duration_minutes: 30,
    });
    completeId = p3.ok ? p3.data : undefined;
    await api(B, "PATCH", `/rest/v1/sessions?id=eq.${completeId}`, { status: "ACCEPTED" });
    const completed = await rpc(A, "complete_session", { p_session_id: completeId });
    check("complete_session RPC completes", completed.ok, completed.text);
    const cRow = await api(A, "GET",
      `/rest/v1/sessions?id=eq.${completeId}&select=status,completed_at,completed_by`);
    check("completed_at/completed_by stamped",
      cRow.data?.[0]?.status === "COMPLETED" &&
        Boolean(cRow.data?.[0]?.completed_at) &&
        cRow.data?.[0]?.completed_by === alice.user.id, cRow.text);

    const offered = await rpc(A, "get_member_offered_skills",
      { p_user_id: bob.user.id });
    check("get_member_offered_skills returns id+name options",
      offered.ok && Array.isArray(offered.data) &&
        offered.data.length > 0 &&
        offered.data.every((s) => "id" in s && "name" in s), offered.text);

    // Blocking hides the pair both ways in the feed; unblock restores.
    const block = await api(A, "POST", "/rest/v1/blocks",
      { blocker_id: alice.user.id, blocked_id: carol.user.id });
    check("alice can block carol", block.ok, block.text);
    const feedBlocked = await rpc(A, "get_marketplace_feed", {});
    check("blocked member hidden from the blocker's feed",
      Array.isArray(feedBlocked.data) &&
        !feedBlocked.data.some((r) => r.profile_id === carol.user.id), feedBlocked.text);
    const unblock = await api(A, "DELETE",
      `/rest/v1/blocks?blocker_id=eq.${alice.user.id}&blocked_id=eq.${carol.user.id}`);
    check("alice can unblock carol", unblock.ok, unblock.text);

    // Reports route to the admin queue and resolve.
    const report = await api(A, "POST", "/rest/v1/reports", {
      reporter_id: alice.user.id, reported_id: bob.user.id,
      reason: "E2E report", session_id: declinedId,
    });
    check("member can submit a report", report.ok, report.text);
    const queue = await rpc(A, "get_reports", {});
    const rep = Array.isArray(queue.data)
      ? queue.data.find((r) => r.reason === "E2E report")
      : null;
    check("admin sees the report", Boolean(rep), queue.text);
    const nonAdminQueue = await rpc(B, "get_reports", {});
    check("non-admin sees no reports",
      Array.isArray(nonAdminQueue.data) && nonAdminQueue.data.length === 0,
      nonAdminQueue.text);
    const resolved = rep
      ? await rpc(A, "resolve_report", { p_report_id: rep.id, p_status: "DISMISSED" })
      : { ok: false };
    check("admin can resolve a report", resolved.ok, resolved.text);
  }

  // ---- 9. Authenticated SSR pages ----------------------------------------
  console.log("\napp (authenticated SSR)");
  {
    const aliceCookie = await appSessionCookie(ALICE);
    const mp = await appGet("/marketplace", { cookie: aliceCookie });
    check("alice GET /marketplace -> 200 with content",
      mp.status === 200 && mp.body.includes("Marketplace"),
      `got ${mp.status}`);
    const admin = await appGet("/admin", { cookie: aliceCookie });
    check("alice GET /admin -> 200 with content",
      admin.status === 200 && admin.body.includes("Moderation"),
      `got ${admin.status}`);
    const matches = await appGet("/matches", { cookie: aliceCookie });
    check("alice GET /matches -> 200", matches.status === 200, `got ${matches.status}`);
    const sessions = await appGet("/sessions", { cookie: aliceCookie });
    check("alice GET /sessions -> 200", sessions.status === 200, `got ${sessions.status}`);

    const login = await appGet("/login", { cookie: aliceCookie });
    check("signed-in GET /login redirects to /home",
      [302, 303, 307, 308].includes(login.status) &&
        (login.location ?? "").includes("/home"),
      `got ${login.status} -> ${login.location}`);

    const bobCookie = await appSessionCookie(BOB);
    const bobSessions = await appGet("/sessions", { cookie: bobCookie });
    check("bob GET /sessions -> 200", bobSessions.status === 200,
      `got ${bobSessions.status}`);
  }

  // ---- 10. Cleanup: delete the sessions this run created -------------------
  console.log("\ncleanup");
  {
    async function removeSession(id) {
      if (!id) return { ok: true };
      let r = await rpc(A, "delete_session", { p_session_id: id });
      if (!r.ok) {
        await api(A, "PATCH", `/rest/v1/sessions?id=eq.${id}`, {
          status: "CANCELLED",
        });
        r = await rpc(A, "delete_session", { p_session_id: id });
      }
      return r;
    }
    const removed = [];
    for (const id of [sessionId, pendingId, declinedId, cancelId, completeId]) {
      removed.push(await removeSession(id));
    }
    check("created sessions removed", removed.every((r) => r.ok),
      removed.map((r) => r.text).join(" ").trim());
  }

  // ---- summary ------------------------------------------------------------
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    failures.forEach((f) => console.log(`  FAIL ${f.name}: ${f.detail}`));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("\nE2E harness error:", err);
  process.exitCode = 1;
});

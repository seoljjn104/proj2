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
    check("GET /login -> 200", login.status === 200, `got ${login.status}`);
    const signup = await appGet("/signup");
    check("GET /signup -> 200", signup.status === 200, `got ${signup.status}`);

    const mp = await appGet("/marketplace");
    check(
      "GET /marketplace redirects to /login",
      [302, 303, 307, 308].includes(mp.status) &&
        (mp.location ?? "").includes("/login"),
      `got ${mp.status} -> ${mp.location}`,
    );
    const admin = await appGet("/admin");
    check(
      "GET /admin redirects to /login?next=/admin",
      [302, 303, 307, 308].includes(admin.status) &&
        (admin.location ?? "").includes("/login") &&
        (admin.location ?? "").includes("admin"),
      `got ${admin.status} -> ${admin.location}`,
    );
    const prof = await appGet("/profile");
    check(
      "GET /profile redirects to login",
      [302, 303, 307, 308].includes(prof.status) &&
        (prof.location ?? "").includes("/login"),
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
    const created = await api(A, "POST", "/rest/v1/sessions", {
      requester_id: alice.user.id,
      provider_id: bob.user.id,
      scheduled_at: slot,
      duration_minutes: 60,
    }, { Prefer: "return=representation" });
    check("requester creates PENDING session",
      created.ok && created.data?.[0]?.status === "PENDING", created.text);
    sessionId = created.data?.[0]?.id;

    const overlap = await api(A, "POST", "/rest/v1/sessions", {
      requester_id: alice.user.id,
      provider_id: bob.user.id,
      scheduled_at: slot,
      duration_minutes: 60,
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
    const s2 = await api(A, "POST", "/rest/v1/sessions", {
      requester_id: alice.user.id,
      provider_id: bob.user.id,
      scheduled_at: slot2,
      duration_minutes: 45,
    }, { Prefer: "return=representation" });
    pendingId = s2.data?.[0]?.id;
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
    check("signed-in GET /login redirects to /marketplace",
      [302, 303, 307, 308].includes(login.status) &&
        (login.location ?? "").includes("/marketplace"),
      `got ${login.status} -> ${login.location}`);

    const bobCookie = await appSessionCookie(BOB);
    const bobSessions = await appGet("/sessions", { cookie: bobCookie });
    check("bob GET /sessions -> 200", bobSessions.status === 200,
      `got ${bobSessions.status}`);
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

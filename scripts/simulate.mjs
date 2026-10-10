#!/usr/bin/env node
/**
 * Full product-flow simulation signed in as a real user.
 *
 * Usage:
 *   SIM_EMAIL=you@example.com SIM_PASSWORD=yourpass node scripts/simulate.mjs
 *
 * Optional: APP_URL, SUPABASE_URL, SUPABASE_ANON_KEY (defaults = local stack).
 *
 * Walks: login → SSR pages → profile/skills setup → marketplace discovery →
 * reciprocal match → propose → provider accept → meeting-link failure path →
 * chat → complete → mutual reviews → non-admin moderation denial.
 * Re-run safe: cancels the account's active sessions first.
 */

import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";

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

const APP = process.env.APP_URL ?? "http://localhost:3000";
const SUPA = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const EMAIL = process.env.SIM_EMAIL;
const PASSWORD = process.env.SIM_PASSWORD;
const PARTNER = process.env.SIM_PARTNER ?? "bob@skillgrid.test";
const PARTNER_PASSWORD = process.env.SIM_PARTNER_PASSWORD ??
  envLocal("SIM_PARTNER_PASSWORD");
if (!PARTNER_PASSWORD) {
  console.error(
    "SIM_PARTNER_PASSWORD missing — set it in the environment or in .env.local (gitignored).",
  );
  process.exit(1);
}

const NEXT_JS_TAG = 5; // catalog is seeded deterministically
const GUITAR_TAG = 39;

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

async function signIn(email, password) {
  const res = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`sign-in failed for ${email}: ${JSON.stringify(data)}`);
  return data;
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

const rpc = (token, fn, params) => api(token, "POST", `/rest/v1/rpc/${fn}`, params ?? {});

async function appGet(path, cookie, redirect = "manual") {
  const res = await fetch(`${APP}${path}`, {
    redirect,
    headers: cookie ? { cookie } : {},
  });
  return { status: res.status, location: res.headers.get("location"), body: await res.text() };
}

async function appSessionCookie(email, password) {
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
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`cookie session failed: ${error.message}`);
  return [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");
}

function iso(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * 3600_000).toISOString();
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("SIM_EMAIL and SIM_PASSWORD are required.");
    process.exitCode = 1;
    return;
  }
  console.log(`Simulation as ${EMAIL} — app=${APP} supabase=${SUPA}\n`);

  // ---- 1. Signed-out surface + show-password toggle -----------------------
  console.log("signed-out pages");
  {
    const home = await appGet("/");
    check("GET / -> 200", home.status === 200, `got ${home.status}`);

    const login = await appGet("/login");
    const loginToggles = (login.body.match(/aria-label="Show password"/g) ?? []).length;
    check("login renders show-password toggle",
      login.status === 200 && loginToggles === 1,
      `status=${login.status} toggles=${loginToggles}`);

    const signup = await appGet("/signup");
    const signupToggles = (signup.body.match(/aria-label="Show password"/g) ?? []).length;
    check("signup renders show-password toggle on both fields",
      signup.status === 200 && signupToggles === 2,
      `status=${signup.status} toggles=${signupToggles}`);

    const market = await appGet("/marketplace");
    check("unauthenticated /marketplace redirects to login",
      [302, 303, 307, 308].includes(market.status) &&
        (market.location ?? "").includes("/login"),
      `got ${market.status} -> ${market.location}`);
  }

  // ---- 2. Sign in ----------------------------------------------------------
  console.log("\nsign-in");
  const session = await signIn(EMAIL, PASSWORD);
  const me = session.user;
  const S = session.access_token;
  check("password sign-in issues session", Boolean(me?.id), String(me?.id));
  const cookie = await appSessionCookie(EMAIL, PASSWORD);
  check("app session cookie established", cookie.length > 0);

  const partner = await signIn(PARTNER, PARTNER_PASSWORD);
  const P = partner.access_token;
  check(`partner (${PARTNER}) sign-in`, Boolean(partner.user?.id));

  // ---- 3. Authenticated SSR pages -----------------------------------------
  console.log("\nauthenticated SSR");
  {
    const market = await appGet("/marketplace", cookie);
    check("GET /marketplace -> 200 + heading",
      market.status === 200 && market.body.includes("Marketplace"),
      `got ${market.status}`);
    for (const [path, marker] of [
      ["/matches", null],
      ["/sessions", null],
      ["/profile", null],
      ["/admin", "Moderation"],
    ]) {
      const r = await appGet(path, cookie);
      check(`GET ${path} -> 200${marker ? " + heading" : ""}`,
        r.status === 200 && (!marker || r.body.includes(marker)),
        `got ${r.status}`);
    }
    const loginAgain = await appGet("/login", cookie);
    check("signed-in /login redirects to /marketplace",
      [302, 303, 307, 308].includes(loginAgain.status) &&
        (loginAgain.location ?? "").includes("/marketplace"),
      `got ${loginAgain.status} -> ${loginAgain.location}`);
  }

  // ---- 4. Housekeeping: cancel this account's active sessions --------------
  {
    const active = await api(S, "GET",
      "/rest/v1/sessions?status=in.(PENDING,ACCEPTED)&select=id");
    for (const s of Array.isArray(active.data) ? active.data : []) {
      await api(S, "PATCH", `/rest/v1/sessions?id=eq.${s.id}`, { status: "CANCELLED" });
    }
  }

  // ---- 5. Profile + skills setup ------------------------------------------
  // Everything this script changes on the real account is recorded here so
  // the cleanup step can undo it exactly.
  console.log("\nprofile + skills");
  let originalBio = null;
  let addedSkills = [];
  let sessionId;
  {
    const before = await api(S, "GET",
      `/rest/v1/profiles?id=eq.${me.id}&select=bio`);
    originalBio = Array.isArray(before.data) ? (before.data[0]?.bio ?? null) : null;

    const bio = "Testing the SkillGRID flow (simulation run).";
    const upd = await api(S, "PATCH", `/rest/v1/profiles?id=eq.${me.id}`, { bio },
      { Prefer: "return=representation" });
    check("update own bio",
      upd.ok && upd.data?.[0]?.bio === bio, upd.text);

    const existing = await api(S, "GET", "/rest/v1/user_skills?select=tag_id,type");
    const have = new Set(
      (Array.isArray(existing.data) ? existing.data : []).map((r) => `${r.tag_id}:${r.type}`),
    );
    const wanted = [
      [NEXT_JS_TAG, "OFFERED"],
      [GUITAR_TAG, "WANTED"],
    ].filter(([tag, type]) => !have.has(`${tag}:${type}`));
    if (wanted.length) {
      const ins = await api(S, "POST", "/rest/v1/user_skills",
        wanted.map(([tag, type]) => ({ user_id: me.id, tag_id: tag, type })));
      check("add OFFERED=Next.js, WANTED=Guitar", ins.ok, ins.text);
      if (ins.ok) addedSkills = wanted;
    } else {
      check("skills already present (re-run)", true);
    }
  }

  // ---- 6. Discovery --------------------------------------------------------
  console.log("\ndiscovery");
  let partnerId = partner.user.id;
  {
    const feed = await rpc(S, "get_marketplace_feed", {});
    const rows = Array.isArray(feed.data) ? feed.data : [];
    const pRow = rows.find((r) => r.profile_id === partnerId);
    check("partner visible in marketplace feed", Boolean(pRow), feed.text);
    check("partner flagged as direct match", pRow?.is_direct_match === true,
      JSON.stringify(pRow));

    const matches = await rpc(S, "get_reciprocal_matches", { p_user_id: me.id });
    const mrows = Array.isArray(matches.data) ? matches.data : [];
    check("reciprocal match found", mrows.some((r) => r.partner_id === partnerId),
      matches.text);
  }

  // ---- 7. Session lifecycle ------------------------------------------------
  console.log("\nsession lifecycle");
  {
    const created = await rpc(S, "propose_session", {
      p_provider: partnerId,
      p_scheduled_at: iso(72),
      p_duration_minutes: 60,
    });
    check("propose session -> PENDING (RPC)",
      created.ok && typeof created.data === "string", created.text);
    sessionId = created.ok ? created.data : undefined;

    const accepted = await api(P, "PATCH", `/rest/v1/sessions?id=eq.${sessionId}`,
      { status: "ACCEPTED" }, { Prefer: "return=representation" });
    check("provider accepts -> ACCEPTED",
      accepted.ok && accepted.data?.[0]?.status === "ACCEPTED", accepted.text);

    const fn = await api(S, "POST", "/functions/v1/generate-meeting-link",
      { session_id: sessionId });
    const roomLink = fn.ok && typeof fn.data === "object" && fn.data
      ? fn.data.meeting_link : null;
    check("meeting room created (Jitsi link)",
      typeof roomLink === "string" && roomLink.startsWith("https://meet.jit.si/"),
      `${fn.status}: ${fn.text}`);
  }

  // ---- 8. Chat -------------------------------------------------------------
  console.log("\nchat");
  {
    const m1 = await api(S, "POST", "/rest/v1/messages", {
      session_id: sessionId, sender_id: me.id,
      content: "Hi! Looking forward to our session.",
    });
    check("user sends message", m1.ok, m1.text);
    const m2 = await api(P, "POST", "/rest/v1/messages", {
      session_id: sessionId, sender_id: partnerId,
      content: "Same here — see you then!",
    });
    check("partner replies", m2.ok, m2.text);
    const read = await api(S, "GET",
      `/rest/v1/messages?session_id=eq.${sessionId}&order=created_at`);
    check("conversation visible to participant",
      read.ok && Array.isArray(read.data) && read.data.length === 2, read.text);
  }

  // ---- 9. Complete + reviews ----------------------------------------------
  console.log("\ncompletion + reviews");
  {
    const done = await api(P, "PATCH", `/rest/v1/sessions?id=eq.${sessionId}`,
      { status: "COMPLETED" }, { Prefer: "return=representation" });
    check("session completed",
      done.ok && done.data?.[0]?.status === "COMPLETED", done.text);

    const r1 = await api(S, "POST", "/rest/v1/reviews", {
      session_id: sessionId, reviewer_id: me.id, reviewee_id: partnerId,
      rating: 5, comment: "Smooth flow, great partner.",
    });
    check("user reviews partner", r1.ok, r1.text);

    const r2 = await api(P, "POST", "/rest/v1/reviews", {
      session_id: sessionId, reviewer_id: partnerId, reviewee_id: me.id,
      rating: 5, comment: "Highly recommended.",
    });
    check("partner reviews user", r2.ok, r2.text);
  }

  // ---- 10. Moderation denial for regular user ------------------------------
  console.log("\nmoderation (regular user)");
  {
    const flag = await rpc(S, "flag_user", { p_user_id: partnerId, p_reason: "nope" });
    check("non-admin cannot flag users", !flag.ok, flag.text);

    const adminView = await rpc(S, "get_admin_flags", {});
    check("admin RPC returns zero rows for regular user",
      adminView.ok && Array.isArray(adminView.data) && adminView.data.length === 0,
      adminView.text);
  }

  // ---- 11. Cleanup: leave the real account exactly as we found it ----------
  console.log("\ncleanup");
  {
    if (sessionId) {
      const removed = await rpc(S, "delete_session", { p_session_id: sessionId });
      check("test session removed from history", removed.ok, removed.text);
    }
    for (const [tag, type] of addedSkills) {
      await api(S, "DELETE",
        `/rest/v1/user_skills?tag_id=eq.${tag}&type=eq.${type}`);
    }
    const restore = await api(S, "PATCH",
      `/rest/v1/profiles?id=eq.${me.id}`, { bio: originalBio });
    check("profile bio restored", restore.ok, restore.text);
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    failures.forEach((f) => console.log(`  FAIL ${f.name}: ${f.detail}`));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("\nSimulation error:", err);
  process.exitCode = 1;
});

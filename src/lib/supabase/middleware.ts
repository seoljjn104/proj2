import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/home",
  "/marketplace",
  "/matches",
  "/sessions",
  "/messages",
  "/notifications",
  "/profile",
  "/settings",
  "/help",
  "/admin",
];

/**
 * Refreshes the Supabase auth cookie on every request, keeps unauthenticated
 * users out of the signed-in area (pointing them at the landing popup), and
 * disables the browser back/forward cache on protected pages so a signed-out
 * user can't press Back and see a stale authenticated view.
 * 
 * Also enforces single-session-per-user: if the current session was revoked
 * (user logged in elsewhere), clear the auth cookie and redirect to login.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run anything between createServerClient and getSession():
  // it can randomly log the user out.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;
  const refreshToken = session?.refresh_token ?? null;

  // Single-session enforcement: if we have a refresh token, check if it was revoked.
  if (user && refreshToken) {
    const { data: isValid } = await supabase.rpc("is_session_valid", {
      p_user_id: user.id,
      p_session_id: refreshToken,
    });
    if (isValid === false) {
      // Session was revoked — clear auth cookies and redirect to login.
      const url = request.nextUrl.clone();
      url.pathname = "/";
      const params = new URLSearchParams();
      params.set("auth", "login");
      params.set("revoked", "1");
      url.search = params.toString();
      const response = NextResponse.redirect(url);
      // Clear all Supabase auth cookies
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.startsWith("sb-")) {
          response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
        }
      });
      return response;
    }
  }

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
  const isAuthPage = path === "/login" || path === "/signup";

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const params = new URLSearchParams();
    params.set("auth", "login");
    if (path !== "/home") params.set("next", path);
    url.search = params.toString();
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isProtected && user) {
    // Never serve a signed-in view from the bfcache after sign-out.
    supabaseResponse.headers.set("Cache-Control", "no-store");
  }

  return supabaseResponse;
}

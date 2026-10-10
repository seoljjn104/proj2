import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Handles the email-verification redirect from Supabase Auth.
 *
 * Two shapes arrive here:
 *  - ?code=...            PKCE flow (the normal in-app signup path)
 *  - ?token_hash=...&type=...  implicit verification (dashboard resends,
 *    raw API signups, recovery links)
 *
 * Uses the middleware cookie pattern so the session cookie is set on the
 * redirect response. This is critical for password recovery (type=recovery)
 * because the user must land on /reset-password with an active session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next") ?? "/marketplace";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/marketplace";

  // Create a response we can attach cookies to (same pattern as middleware).
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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      // Password recovery lands on a dedicated form to choose a new password.
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth=login&error=verification`);
}
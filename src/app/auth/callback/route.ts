import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the email-verification redirect from Supabase Auth.
 *
 * Two shapes arrive here:
 *  - ?code=...            PKCE flow (the normal in-app signup path)
 *  - ?token_hash=...&type=...  implicit verification (dashboard resends,
 *    raw API signups, recovery links)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next") ?? "/marketplace";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/marketplace";

  const supabase = await createClient();

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

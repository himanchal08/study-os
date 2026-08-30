import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Auth callback route handler for OAuth and magic-link flows.
 * Supabase SSR exchanges the code for a session and redirects.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to login with error indicator
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

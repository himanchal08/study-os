import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const origin = new URL(request.url).origin;

  if (error || !code) {
    return NextResponse.redirect(`${origin}/settings?error=calendar_auth_failed`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${origin}/api/calendar/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/settings?error=missing_google_credentials`);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // We only care about saving the refresh token to our DB.
    // In production, we'd encrypt this before saving.
    if (tokens.refresh_token) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.redirect(`${origin}/settings?error=no_active_session`);
      }

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ google_refresh_token: tokens.refresh_token })
        .eq("user_id", user.id);
        
      if (dbError) {
        return NextResponse.redirect(`${origin}/settings?error=db_update_failed&msg=${encodeURIComponent(dbError.message)}`);
      }

      return NextResponse.redirect(`${origin}/settings?success=calendar_connected`);
    } else {
      return NextResponse.redirect(`${origin}/settings?error=no_refresh_token_from_google`);
    }
  } catch (err) {
    console.error("Google Calendar callback error:", err);
    return NextResponse.redirect(`${origin}/settings?error=calendar_auth_error`);
  }
}

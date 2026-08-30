import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=calendar_auth_failed`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/calendar/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/settings?error=missing_google_credentials`);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // We only care about saving the refresh token to our DB.
    // In production, we'd encrypt this before saving.
    if (tokens.refresh_token) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from("profiles")
          .update({ google_refresh_token: tokens.refresh_token })
          .eq("user_id", user.id);
      }
    }

    return NextResponse.redirect(`${appUrl}/settings?success=calendar_connected`);
  } catch (err) {
    console.error("Google Calendar callback error:", err);
    return NextResponse.redirect(`${appUrl}/settings?error=calendar_auth_error`);
  }
}

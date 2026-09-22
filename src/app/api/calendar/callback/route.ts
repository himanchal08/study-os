import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const origin = new URL(request.url).origin;

  if (error || !code) {
    return NextResponse.redirect(`${origin}/settings`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${origin}/api/calendar/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/settings`);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    
    
    if (tokens.refresh_token) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.redirect(`${origin}/settings`);
      }

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ google_refresh_token: tokens.refresh_token })
        .eq("user_id", user.id);
        
      if (dbError) {
        return NextResponse.redirect(`${origin}/settings`);
      }

      return NextResponse.redirect(`${origin}/settings?success=calendar_connected`);
    } else {
      return NextResponse.redirect(`${origin}/settings`);
    }
  } catch (err) {
    return NextResponse.redirect(`${origin}/settings`);
  }
}

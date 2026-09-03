import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/calendar/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/settings?error=missing_google_credentials`);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/tasks"
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", 
  });

  return NextResponse.redirect(url);
}

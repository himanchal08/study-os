import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_refresh_token, timezone")
    .eq("user_id", user.id)
    .single();

  if (!profile?.google_refresh_token) {
    return NextResponse.json({ error: "No Google Calendar connected" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: profile.google_refresh_token });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Fetch today's tasks
  const today = new Date().toISOString().split("T")[0];
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, planned_date, status")
    .eq("user_id", user.id)
    .eq("planned_date", today)
    .is("deleted_at", null);

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ message: "No tasks to sync today" });
  }

  try {
    // For simplicity, we just create an all-day event for each task today.
    // A robust system would keep track of the Google Event ID in the DB to update/delete them.
    for (const task of tasks) {
      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: `[Study OS] ${task.title}`,
          description: `Status: ${task.status}`,
          start: {
            date: task.planned_date,
            timeZone: profile.timezone || 'UTC',
          },
          end: {
            date: task.planned_date,
            timeZone: profile.timezone || 'UTC',
          },
        },
      });
    }

    return NextResponse.json({ success: true, message: `Synced ${tasks.length} tasks to Google Calendar` });
  } catch (err: unknown) {
    console.error("Calendar sync error:", err);
    return NextResponse.json({ error: "Failed to sync to Google Calendar" }, { status: 500 });
  }
}

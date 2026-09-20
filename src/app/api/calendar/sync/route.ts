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
    .select("google_refresh_token, timezone, day_boundary_offset_minutes")
    .eq("user_id", user.id)
    .single();

  if (!profile?.google_refresh_token) {
    return NextResponse.json({ error: "No Google Calendar connected. Please connect via Settings." }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Server misconfiguration: missing Google credentials." }, { status: 500 });
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: profile.google_refresh_token });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const tz = profile.timezone || "Asia/Kolkata";

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("id, start_timestamp, end_timestamp, activity_type, google_event_id, subjects(name), topics(name)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .not("end_timestamp", "is", null)
    .gte("start_timestamp", sevenDaysAgo)
    .order("start_timestamp", { ascending: false })
    .limit(50);

  async function processInBatches<T>(items: T[], batchSize: number, fn: (item: T) => Promise<void>) {
    for (let i = 0; i < items.length; i += batchSize) {
      await Promise.all(items.slice(i, i + batchSize).map(fn));
    }
  }

  let syncedCount = 0;
  const errors: string[] = [];

  try {
    await processInBatches(sessions ?? [], 5, async (s) => {
      const sub = (s.subjects as { name: string } | null)?.name;
      const topic = (s.topics as { name: string } | null)?.name;
      const label = [sub, topic].filter(Boolean).join(" → ") || s.activity_type;
      const actEmoji: Record<string, string> = {
        practice: "✏️", lecture: "📖", revision: "🔁", mock: "📝", reading: "📚", other: "⏱",
      };
      const emoji = actEmoji[s.activity_type] ?? "⏱";

      const eventBody = {
        summary: `${emoji} ${label}`,
        description: `Study OS Session · Activity: ${s.activity_type}`,
        start: { dateTime: s.start_timestamp, timeZone: tz },
        end: { dateTime: s.end_timestamp!, timeZone: tz },
        colorId: "7",
      };

      try {
        let inserted = false;
        if (s.google_event_id) {
          try {
            await calendar.events.update({
              calendarId: "primary",
              eventId: s.google_event_id,
              requestBody: eventBody,
            });
          } catch (updateErr) {
            const err = updateErr as { response?: { status?: number }; code?: number };
            if (err?.response?.status === 404 || err?.code === 404) {
              const res = await calendar.events.insert({
                calendarId: "primary",
                requestBody: eventBody,
              });
              if (res.data.id) {
                await supabase
                  .from("study_sessions")
                  .update({ google_event_id: res.data.id })
                  .eq("id", s.id);
                inserted = true;
              }
            } else {
              throw updateErr;
            }
          }
        } else {
          const res = await calendar.events.insert({
            calendarId: "primary",
            requestBody: eventBody,
          });
          if (res.data.id) {
            await supabase
              .from("study_sessions")
              .update({ google_event_id: res.data.id })
              .eq("id", s.id);
            inserted = true;
          }
        }
        if (!inserted) syncedCount++;
      } catch (e) {
        const err = e as { response?: { status?: number }; message?: string };
        if (err?.response?.status === 403) {
          errors.push(`Calendar forbidden: Reconnect Google account.`);
        } else {
          errors.push(`Session sync failed: ${err?.message}`);
        }
      }
    });

    await supabase
      .from("profiles")
      .update({ google_last_synced_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Synced ${syncedCount} sessions${errors.length > 0 ? ` (${errors.length} failed)` : ""}`,
    });
  } catch (err: unknown) {
    console.error("Session sync error:", err);
    return NextResponse.json({ error: "Failed to sync sessions to Google Calendar" }, { status: 500 });
  }
}

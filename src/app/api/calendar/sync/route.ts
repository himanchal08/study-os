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
  const tasksApi = google.tasks({ version: "v1", auth: oauth2Client });
  const tz = profile.timezone || "Asia/Kolkata";
  const offset = (profile.day_boundary_offset_minutes || 0) * 60000;
  const nowWithOffset = new Date(Date.now() + offset);

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const sevenDaysAgoDate = new Date(nowWithOffset.getTime() - 7 * 86400000);
  const next14DaysDate = new Date(nowWithOffset.getTime() + 14 * 86400000);
  const startRange = formatter.format(sevenDaysAgoDate);
  const endRange = formatter.format(next14DaysDate);

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, planned_date, status, google_event_id, google_task_id")
    .eq("user_id", user.id)
    .gte("planned_date", startRange)
    .lte("planned_date", endRange)
    .is("deleted_at", null);

  if (tasksError) {
    console.error(`Tasks Query Error: ${JSON.stringify(tasksError)}\n`);
  }

  const sevenDaysAgo = sevenDaysAgoDate.toISOString();
  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("id, start_timestamp, end_timestamp, activity_type, google_event_id, subjects(name), topics(name)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .not("end_timestamp", "is", null)
    .gte("start_timestamp", sevenDaysAgo)
    .order("start_timestamp", { ascending: false })
    .limit(50);

  let syncedCount = 0;
  const errors: string[] = [];

  try {
    for (const task of tasks ?? []) {
      const startDateObj = new Date(task.planned_date);
      const endDateObj = new Date(startDateObj.getTime() + 86400000);
      const endDateStr = endDateObj.toISOString().split("T")[0];

      const eventBody = {
        summary: `📚 ${task.title}`,
        description: `Study OS Task · Status: ${task.status}`,
        start: { date: task.planned_date, timeZone: tz },
        end: { date: endDateStr, timeZone: tz },
        colorId: task.status === "completed" ? "2" : "9",
      };

      try {
        let inserted = false;
        if (task.google_event_id) {
          try {
            await calendar.events.update({
              calendarId: "primary",
              eventId: task.google_event_id,
              requestBody: eventBody,
            });
          } catch (updateErr: any) {
            if (updateErr?.response?.status === 404 || updateErr?.code === 404) {
              const res = await calendar.events.insert({
                calendarId: "primary",
                requestBody: eventBody,
              });
              if (res.data.id) {
                await supabase.from("tasks").update({ google_event_id: res.data.id }).eq("id", task.id);
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
            await supabase.from("tasks").update({ google_event_id: res.data.id }).eq("id", task.id);
            inserted = true;
          }
        }
        if (!inserted) syncedCount++;
      } catch (e: any) {
        if (e?.response?.status === 403) {
           errors.push(`Calendar forbidden: Reconnect Google account to grant new permissions.`);
        } else {
           errors.push(`Calendar Task "${task.title}" failed: ${e?.message}`);
        }
      }
    }

    try {
      let taskListId = "";
      const lists = await tasksApi.tasklists.list();
      const studyOsList = lists.data.items?.find(l => l.title === "Study OS");
      
      if (studyOsList?.id) {
        taskListId = studyOsList.id;
      } else {
        const newList = await tasksApi.tasklists.insert({ requestBody: { title: "Study OS" } });
        taskListId = newList.data.id!;
      }

      for (const task of tasks ?? []) {
        const isCompleted = task.status === "completed";
        const taskBody: any = {
          title: task.title,
          notes: `Status: ${task.status}`,
          status: isCompleted ? "completed" : "needsAction",
          due: new Date(task.planned_date).toISOString(),
        };
        
        if (isCompleted) {
          taskBody.completed = new Date().toISOString();
        }

        try {
          if (task.google_task_id) {
            try {
              await tasksApi.tasks.update({
                tasklist: taskListId,
                task: task.google_task_id,
                requestBody: { ...taskBody, id: task.google_task_id },
              });
            } catch (updateErr: any) {
              if (updateErr?.response?.status === 404 || updateErr?.code === 404) {
                const res = await tasksApi.tasks.insert({
                  tasklist: taskListId,
                  requestBody: taskBody,
                });
                if (res.data.id) {
                  await supabase.from("tasks").update({ google_task_id: res.data.id }).eq("id", task.id);
                }
              } else {
                throw updateErr;
              }
            }
          } else {
            const res = await tasksApi.tasks.insert({
              tasklist: taskListId,
              requestBody: taskBody,
            });
            if (res.data.id) {
              await supabase.from("tasks").update({ google_task_id: res.data.id }).eq("id", task.id);
            }
          }
          syncedCount++;
        } catch (e: any) {
           errors.push(`Google Task sync "${task.title}" failed`);
        }
      }
    } catch (e: any) {
      if (e?.response?.status === 403 || e?.code === 403 || String(e).includes("insufficientPermissions")) {
        errors.push(`Tasks forbidden: Please disconnect and reconnect Google account in Settings to grant Tasks permission.`);
      } else {
        errors.push(`Failed to access Google Tasks API: ${e?.message}`);
      }
    }

    for (const s of sessions ?? []) {
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
          } catch (updateErr: any) {
             if (updateErr?.response?.status === 404 || updateErr?.code === 404) {
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
      } catch {
        errors.push(`Session at ${s.start_timestamp} failed`);
      }
    }

    await supabase
      .from("profiles")
      .update({ google_last_synced_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Synced ${syncedCount} events${errors.length > 0 ? ` (${errors.length} failed)` : ""}`,
    });
  } catch (err: unknown) {
    console.error("Calendar sync error:", err);
    return NextResponse.json({ error: "Failed to sync to Google Calendar" }, { status: 500 });
  }
}

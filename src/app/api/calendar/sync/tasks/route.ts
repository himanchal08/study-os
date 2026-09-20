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
  const nowWithOffset = new Date(new Date().getTime() + offset);

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const toYYYYMMDD = (d: Date) => {
    const parts = formatter.formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return `${y}-${m}-${day}`;
  };

  const sevenDaysAgoDate = new Date(nowWithOffset.getTime() - 7 * 86400000);
  const next14DaysDate = new Date(nowWithOffset.getTime() + 14 * 86400000);
  const startRange = toYYYYMMDD(sevenDaysAgoDate);
  const endRange = toYYYYMMDD(next14DaysDate);

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

  async function processInBatches<T>(items: T[], batchSize: number, fn: (item: T) => Promise<void>) {
    for (let i = 0; i < items.length; i += batchSize) {
      await Promise.all(items.slice(i, i + batchSize).map(fn));
    }
  }

  let syncedCount = 0;
  const errors: string[] = [];

  try {
    await processInBatches(tasks ?? [], 5, async (task) => {
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
          } catch (updateErr) {
            const err = updateErr as { response?: { status?: number }; code?: number };
            if (err?.response?.status === 404 || err?.code === 404) {
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
      } catch (e) {
        const err = e as { response?: { status?: number }; message?: string };
        if (err?.response?.status === 403) {
          errors.push(`Calendar forbidden: Reconnect Google account to grant new permissions.`);
        } else {
          errors.push(`Calendar Task "${task.title}" failed: ${err?.message}`);
        }
      }
    });

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

      await processInBatches(tasks ?? [], 5, async (task) => {
        const isCompleted = task.status === "completed";
        const taskBody: { title: string; notes: string; status: string; due: string; completed?: string; id?: string } = {
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
            } catch (updateErr) {
              const err = updateErr as { response?: { status?: number }; code?: number };
              if (err?.response?.status === 404 || err?.code === 404) {
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
        } catch {
          errors.push(`Google Task sync "${task.title}" failed`);
        }
      });
    } catch (e) {
      const err = e as { response?: { status?: number }; code?: number; message?: string };
      if (err?.response?.status === 403 || err?.code === 403 || String(err).includes("insufficientPermissions")) {
        errors.push(`Tasks forbidden: Please disconnect and reconnect Google account in Settings to grant Tasks permission.`);
      } else {
        errors.push(`Failed to access Google Tasks API: ${err?.message}`);
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
      message: `Synced ${syncedCount} tasks${errors.length > 0 ? ` (${errors.length} failed)` : ""}`,
    });
  } catch (err: unknown) {
    console.error("Tasks sync error:", err);
    return NextResponse.json({ error: "Failed to sync tasks to Google" }, { status: 500 });
  }
}

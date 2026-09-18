"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import type { Tables, Database } from "@/types/database";

export type ActiveSession = Tables<"study_sessions">;

export async function startSession(params: {
  userId: string;
  subjectId?: string | null;
  topicId?: string | null;
  chapterId?: string | null;
  notes?: string | null;
  activityType?: Tables<"study_sessions">["activity_type"];
  taskId?: string | null;
  clientGeneratedId?: string;
}) {
  const supabase = await createClient();

  const {
    userId,
    subjectId = null,
    topicId = null,
    chapterId = null,
    notes = null,
    activityType = "practice",
    taskId = null,
    clientGeneratedId = randomUUID(),
  } = params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return { error: "Unauthorized" };
  }

  const { data: existing } = await supabase
    .from("study_sessions")
    .select("id, start_timestamp")
    .eq("user_id", userId)
    .is("end_timestamp", null)
    .maybeSingle();

  if (existing) {
    return {
      error: "A session is already active. Stop it before starting a new one.",
      existingSessionId: existing.id,
    };
  }

  const { data, error } = await supabase
    .from("study_sessions")
    .insert({
      user_id: userId,
      subject_id: subjectId,
      topic_id: topicId,
      chapter_id: chapterId,
      notes,
      activity_type: activityType,
      task_id: taskId,
      client_generated_id: clientGeneratedId,
      source_client: "web",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { session: data };
}

export async function stopSession(params: {
  sessionId: string;
  userId: string;
  pauseDurationSeconds?: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const { sessionId, userId, pauseDurationSeconds = 0, notes } = params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return { error: "Unauthorized" };
  }

  const updateData: { end_timestamp: string; pause_duration_seconds: number; notes?: string } = {
    end_timestamp: new Date().toISOString(),
    pause_duration_seconds: pauseDurationSeconds,
  };
  if (notes !== undefined) {
    updateData.notes = notes;
  }

  const { data, error } = await supabase
    .from("study_sessions")
    .update(updateData)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  if (data && data.topic_id) {
    // Duration gate — only meaningful sessions generate revisions/status changes.
    // An accidental 2-second start+stop should not create revision rows or
    // advance topic status.
    const sessionDurationSec =
      (new Date(data.end_timestamp!).getTime() -
        new Date(data.start_timestamp).getTime()) /
        1000 -
      (data.pause_duration_seconds ?? 0);

    if (sessionDurationSec >= 60) {
      // Fetch user profile to compute revision dates in the user's local timezone.
      // Without this, an IST user stopping at 00:30 IST (18:00 UTC prev day)
      // gets 'tomorrow UTC' = 'today IST' as the daily revision due date.
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("day_boundary_offset_minutes, timezone")
        .eq("user_id", userId)
        .single();
      const userTimezone  = userProfile?.timezone ?? "Asia/Kolkata";

      // Intl.DateTimeFormat returns reliable "YYYY-MM-DD" given en-CA locale.
      const toUserDateStr = (msFromNow: number) => {
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: userTimezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date(Date.now() + msFromNow));
        const y = parts.find(p => p.type === "year")?.value;
        const m = parts.find(p => p.type === "month")?.value;
        const d = parts.find(p => p.type === "day")?.value;
        return `${y}-${m}-${d}`;
      };

      const revisionsToInsert: Database["public"]["Tables"]["revisions"]["Insert"][] = [
        {
          user_id: userId,
          topic_id: data.topic_id,
          source_session_id: data.id,
          cycle_type: "daily",
          due_date: toUserDateStr(1 * 86400000),   // tomorrow (user TZ)
          client_generated_id: randomUUID(),
        },
        {
          user_id: userId,
          topic_id: data.topic_id,
          source_session_id: data.id,
          cycle_type: "weekly",
          due_date: toUserDateStr(7 * 86400000),   // +7 days (user TZ)
          client_generated_id: randomUUID(),
        },
        {
          user_id: userId,
          topic_id: data.topic_id,
          source_session_id: data.id,
          cycle_type: "monthly",
          due_date: toUserDateStr(30 * 86400000),  // +30 days (user TZ)
          client_generated_id: randomUUID(),
        },
      ];

      await supabase
        .from("revisions")
        .upsert(revisionsToInsert, {
          onConflict: "user_id,topic_id,cycle_type,due_date",
          ignoreDuplicates: true,
        });

      // Status lifecycle order — never regress a topic's status
      const STATUS_ORDER: Record<string, number> = {
        not_started: 0, learning: 1, learned: 2, revising: 3, strong: 4,
      };
      let nextStatus: string | null = null;
      if (data.activity_type === "lecture")       nextStatus = "learning";
      else if (data.activity_type === "practice") nextStatus = "learned";
      else if (data.activity_type === "mock")     nextStatus = "strong";
      else if (data.activity_type === "revision") nextStatus = "revising";

      if (nextStatus) {
        const { data: currentTopic } = await supabase
          .from("topics")
          .select("status")
          .eq("id", data.topic_id)
          .single();
        const currentOrder = STATUS_ORDER[currentTopic?.status ?? "not_started"] ?? 0;
        const nextOrder    = STATUS_ORDER[nextStatus] ?? 0;
        if (nextOrder > currentOrder) {
          await supabase
            .from("topics")
            .update({ status: nextStatus as Database["public"]["Enums"]["topic_status_enum"] })
            .eq("id", data.topic_id)
            .eq("user_id", userId);
        }
      }

      const lifecycleUpdates: Database["public"]["Tables"]["topic_lifecycle"]["Update"] = {};
      if (data.activity_type === "lecture") {
        lifecycleUpdates.learning_completed_at = new Date().toISOString();
      } else if (data.activity_type === "practice") {
        lifecycleUpdates.dpp_done = true;
      }

      if (Object.keys(lifecycleUpdates).length > 0) {
        await supabase
          .from("topic_lifecycle")
          .upsert(
            { user_id: userId, topic_id: data.topic_id, ...lifecycleUpdates },
            { onConflict: "user_id,topic_id", ignoreDuplicates: false },
          );
      }
    } // end duration gate
  }

  if (data && data.task_id) {
    await supabase
      .from("tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", data.task_id)
      .eq("user_id", userId);
  }

  revalidatePath("/", "layout");
  return { session: data };
}

export async function deleteStudySession(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("study_sessions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

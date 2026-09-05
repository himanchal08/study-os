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

  const updateData: any = {
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
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);

    const toDateString = (d: Date) => d.toISOString().split("T")[0];

    
    
    const revisionsToInsert: Database["public"]["Tables"]["revisions"]["Insert"][] = [
      {
        user_id: userId,
        topic_id: data.topic_id,
        source_session_id: data.id,
        cycle_type: "daily",
        due_date: toDateString(tomorrow),
        client_generated_id: randomUUID(),
      },
      {
        user_id: userId,
        topic_id: data.topic_id,
        source_session_id: data.id,
        cycle_type: "weekly",
        due_date: toDateString(nextWeek),
        client_generated_id: randomUUID(),
      },
      {
        user_id: userId,
        topic_id: data.topic_id,
        source_session_id: data.id,
        cycle_type: "monthly",
        due_date: toDateString(nextMonth),
        client_generated_id: randomUUID(),
      }
    ];

    await supabase.from("revisions").insert(revisionsToInsert);

    let nextStatus = null;
    if (data.activity_type === "lecture") nextStatus = "learning";
    else if (data.activity_type === "practice" || data.activity_type === "mock") nextStatus = "learned";
    else if (data.activity_type === "revision") nextStatus = "revising";

    if (nextStatus) {
      await supabase
        .from("topics")
        .update({ status: nextStatus as any })
        .eq("id", data.topic_id);
    }

    const lifecycleUpdates: Database["public"]["Tables"]["topic_lifecycle"]["Update"] = {};
    if (data.activity_type === "lecture") {
      lifecycleUpdates.learning_completed_at = new Date().toISOString();
    } else if (data.activity_type === "practice") {
      lifecycleUpdates.dpp_done = true;
    }

    if (Object.keys(lifecycleUpdates).length > 0) {
      const { data: existingLc } = await supabase
        .from("topic_lifecycle")
        .select("id")
        .eq("topic_id", data.topic_id)
        .maybeSingle();

      if (existingLc) {
        await supabase
          .from("topic_lifecycle")
          .update(lifecycleUpdates)
          .eq("topic_id", data.topic_id);
      } else {
        await supabase
          .from("topic_lifecycle")
          .insert({
            user_id: userId,
            topic_id: data.topic_id,
            ...lifecycleUpdates,
          });
      }
    }
  }

  if (data && data.task_id) {
    await supabase
      .from("tasks")
      .update({ status: "completed" })
      .eq("id", data.task_id);
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

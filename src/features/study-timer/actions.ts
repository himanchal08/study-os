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

  revalidatePath("/");
  return { session: data };
}

export async function stopSession(params: {
  sessionId: string;
  userId: string;
  pauseDurationSeconds?: number;
}) {
  const supabase = await createClient();
  const { sessionId, userId, pauseDurationSeconds = 0 } = params;

  const { data, error } = await supabase
    .from("study_sessions")
    .update({
      end_timestamp: new Date().toISOString(),
      pause_duration_seconds: pauseDurationSeconds,
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Auto-Revision Engine
  // If the session was tagged with a topic, spawn the spaced-repetition cycles automatically.
  if (data && data.topic_id) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);

    const toDateString = (d: Date) => d.toISOString().split("T")[0];

    // We use upsert if there's a unique constraint, but since we don't have the exact constraint name,
    // we just insert. The DB might throw on duplicate, which we can silently catch.
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
  }

  revalidatePath("/");
  return { session: data };
}

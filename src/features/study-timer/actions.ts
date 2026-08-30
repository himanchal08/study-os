"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import type { Tables } from "@/types/database";

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

  revalidatePath("/");
  return { session: data };
}

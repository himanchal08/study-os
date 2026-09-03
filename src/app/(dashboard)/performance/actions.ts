"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Topic Lifecycle ────────────────────────────────────────────────────────

interface LifecycleUpdate {
  learning_completed_at?: string | null;
  book_practice_done?: boolean;
  dpp_done?: boolean;
  pyq_done?: boolean;
  tests_attempted_count?: number;
  revision_count?: number;
  last_revised_at?: string | null;
  confidence_level?: number | null;
}

/**
 * Upsert a topic_lifecycle row for the given topic.
 * UNIQUE(user_id, topic_id) ensures exactly one row per topic per user.
 */
export async function saveTopicLifecycle(
  topicId: string,
  update: LifecycleUpdate
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("topic_lifecycle").upsert(
    {
      user_id: user.id,
      topic_id: topicId,
      ...update,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,topic_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/performance");
  return { error: null };
}

// ─── Real Exam Results ──────────────────────────────────────────────────────

interface SubjectBreakdownItem {
  subject_name: string;
  marks_scored: number;
  marks_available: number;
}

interface RealExamResultData {
  exam_name: string;
  exam_type: "banking" | "ssc" | "other";
  stage?: string;
  exam_date: string;
  total_score: number;
  total_max: number;
  subject_breakdown?: SubjectBreakdownItem[];
  cutoff_used?: number;
  notes?: string;
  client_generated_id?: string;
}

/**
 * Insert a real exam result.
 * Uses client_generated_id for idempotency (PRD §C — upsert on conflict).
 * Validates: total_score <= total_max, cutoff <= total_max.
 */
export async function saveRealExamResult(
  data: RealExamResultData
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Client-side validation (server-side constraint also enforced in DB)
  if (data.total_score > data.total_max) {
    return { error: `Score (${data.total_score}) cannot exceed max marks (${data.total_max})` };
  }
  if (data.cutoff_used !== undefined && data.cutoff_used > data.total_max) {
    return { error: `Cutoff (${data.cutoff_used}) cannot exceed max marks (${data.total_max})` };
  }
  if (data.total_max <= 0) {
    return { error: "Max marks must be greater than 0" };
  }

  const { error } = await supabase.from("real_exam_results").upsert(
    {
      user_id: user.id,
      exam_name: data.exam_name,
      exam_type: data.exam_type,
      stage: data.stage ?? null,
      exam_date: data.exam_date,
      total_score: data.total_score,
      total_max: data.total_max,
      subject_breakdown: data.subject_breakdown ?? null,
      cutoff_used: data.cutoff_used ?? null,
      notes: data.notes ?? null,
      client_generated_id: data.client_generated_id ?? null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "client_generated_id",
      ignoreDuplicates: false,
    }
  );

  if (error) return { error: error.message };

  revalidatePath("/performance");
  return { error: null };
}

/**
 * Delete a real exam result by ID.
 */
export async function deleteRealExamResult(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("real_exam_results")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/performance");
  return { error: null };
}

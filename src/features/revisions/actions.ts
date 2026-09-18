"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ADAPTIVE_INTERVALS: Record<number, number> = { 1: 1, 2: 2, 3: 7, 4: 14, 5: 21 };

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function cycleTypeForScore(score: number): "daily" | "weekly" | "monthly" {
  if (score <= 2) return "daily";
  if (score <= 4) return "weekly";
  return "monthly";
}

export async function completeRevision(revisionId: string, recallScore = 3) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const now = new Date();

  const { data: revision, error } = await supabase
    .from("revisions")
    .update({
      completed_at: now.toISOString(),
      recall_score: recallScore,
      updated_at: now.toISOString(),
    })
    .eq("id", revisionId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };

  if (revision) {
    const intervalDays = ADAPTIVE_INTERVALS[recallScore] ?? 7;
    await supabase.from("revisions").upsert(
      {
        user_id: user.id,
        topic_id: revision.topic_id,
        source_session_id: revision.source_session_id,
        cycle_type: cycleTypeForScore(recallScore),
        due_date: addDays(now, intervalDays),
        is_adaptive: true,
        adaptive_interval_days: intervalDays,
        grace_window_days: recallScore <= 2 ? 1 : recallScore === 3 ? 2 : 5,
      },
      { onConflict: "user_id,topic_id,cycle_type,due_date", ignoreDuplicates: true },
    );
  }

  revalidatePath("/");
  revalidatePath("/revisions");
  return { success: true };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";


const ADAPTIVE_INTERVALS: Record<number, number> = {
  1: 1,   
  2: 2,   
  3: 7,   
  4: 14,  
  5: 21,  
};

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export async function markRevisionDone(id: string, recallScore: number) {
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
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };

  
  
  if (revision && recallScore <= 4) {
    const intervalDays = ADAPTIVE_INTERVALS[recallScore] ?? 7;
    const nextDueDate = addDays(now, intervalDays);

    await supabase.from("revisions").insert({
      user_id: user.id,
      topic_id: revision.topic_id,
      source_session_id: revision.source_session_id,
      cycle_type: recallScore <= 2 ? "daily" : recallScore === 3 ? "weekly" : "monthly",
      due_date: nextDueDate,
      is_adaptive: true,
      adaptive_interval_days: intervalDays,
      grace_window_days: recallScore <= 2 ? 1 : recallScore === 3 ? 2 : 5,
    });
  }

  revalidatePath("/revisions");
  revalidatePath("/");
  return { success: true };
}

export async function scheduleRevision(prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const topicId = formData.get("topic_id") as string;
  const cycleType = formData.get("cycle_type") as "daily" | "weekly" | "monthly";
  const dueDate = formData.get("due_date") as string;

  if (!topicId || !cycleType || !dueDate) return { error: "All fields are required." };

  const { error } = await supabase.from("revisions").insert({
    user_id: user.id,
    topic_id: topicId,
    cycle_type: cycleType,
    due_date: dueDate,
    grace_window_days: cycleType === "daily" ? 1 : cycleType === "weekly" ? 2 : 5,
  });

  if (error) return { error: error.message };

  revalidatePath("/revisions");
  revalidatePath("/");
  return { success: true };
}


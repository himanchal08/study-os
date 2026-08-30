"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function markRevisionDone(id: string, recallScore: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("revisions")
    .update({
      completed_at: new Date().toISOString(),
      recall_score: recallScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

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

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function nextSunday(from: Date): string {
  const d = new Date(from);
  const day = d.getUTCDay(); // 0=Sun
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  d.setUTCDate(d.getUTCDate() + daysUntilSunday);
  return d.toISOString().split("T")[0];
}

function nextSaturday(from: Date): string {
  const d = new Date(from);
  const day = d.getUTCDay(); // 6=Sat
  const daysUntilSat = day === 6 ? 7 : (6 - day + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + daysUntilSat);
  return d.toISOString().split("T")[0];
}


const ADAPTIVE_INTERVALS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 7,
  4: 14,
  5: 21,
};

function cycleTypeForScore(score: number): "daily" | "weekly" | "monthly" {
  if (score <= 2) return "daily";
  if (score <= 4) return "weekly";
  return "monthly";
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
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

  if (revision && revision.cycle_type === "monthly") {
    const intervalDays = ADAPTIVE_INTERVALS[recallScore] ?? 7;
    const nextDueDate = addDays(now, intervalDays);

    await supabase.from("revisions").upsert(
      {
        user_id: user.id,
        topic_id: revision.topic_id,
        source_session_id: revision.source_session_id,
        cycle_type: cycleTypeForScore(recallScore),
        due_date: nextDueDate,
        is_adaptive: true,
        adaptive_interval_days: intervalDays,
        grace_window_days: recallScore <= 2 ? 1 : recallScore === 3 ? 2 : 5,
      },
      { onConflict: "user_id,topic_id,cycle_type,due_date", ignoreDuplicates: true },
    );
  }

  revalidatePath("/revisions");
  revalidatePath("/");
  return { success: true };
}

export async function undoRevision(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("revisions")
    .update({
      completed_at: null,
      recall_score: null,
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

  const { error } = await supabase.from("revisions").upsert(
    {
      user_id: user.id,
      topic_id: topicId,
      cycle_type: cycleType,
      due_date: dueDate,
      grace_window_days: cycleType === "daily" ? 1 : cycleType === "weekly" ? 2 : 5,
    },
    { onConflict: "user_id,topic_id,cycle_type,due_date", ignoreDuplicates: true },
  );

  if (error) return { error: error.message };

  revalidatePath("/revisions");
  revalidatePath("/");
  return { success: true };
}

export async function deleteRevision(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("revisions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/revisions");
  revalidatePath("/");
  return { success: true };
}

export async function skipRevision(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: rev, error: fetchErr } = await supabase
    .from("revisions")
    .select("id, topic_id, source_session_id, due_date, cycle_type, skip_count")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !rev) return { error: fetchErr?.message ?? "Not found" };

  const newSkipCount = (rev.skip_count ?? 0) + 1;
  const now = new Date();

  if (newSkipCount >= 3 && rev.cycle_type === "daily") {
    // Escalate: delete daily, add weekly for next Sunday
    await supabase.from("revisions").delete().eq("id", id).eq("user_id", user.id);

    await supabase.from("revisions").upsert(
      {
        user_id: user.id,
        topic_id: rev.topic_id,
        source_session_id: rev.source_session_id,
        cycle_type: "weekly",
        due_date: nextSunday(now),
        grace_window_days: 2,
        skip_count: 0,
      },
      { onConflict: "user_id,topic_id,cycle_type,due_date", ignoreDuplicates: true },
    );

    revalidatePath("/revisions");
    revalidatePath("/");
    return { success: true, escalated: true };
  }

  // Roll over: push due_date forward by 1 day
  const newDue = addDays(new Date(rev.due_date), 1);
  const { error } = await supabase
    .from("revisions")
    .update({ due_date: newDue, skip_count: newSkipCount, updated_at: now.toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/revisions");
  revalidatePath("/");
  return { success: true, escalated: false };
}

/**
 * Delete a weekly revision (after the 1-min warning popup),
 * then schedule the next occurrence for Saturday.
 */
export async function deleteWeeklyRevisionWithFollowup(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: rev } = await supabase
    .from("revisions")
    .select("topic_id, source_session_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  await supabase.from("revisions").delete().eq("id", id).eq("user_id", user.id);

  if (rev) {
    // Schedule next Saturday
    await supabase.from("revisions").upsert(
      {
        user_id: user.id,
        topic_id: rev.topic_id,
        source_session_id: rev.source_session_id,
        cycle_type: "weekly",
        due_date: nextSaturday(new Date()),
        grace_window_days: 2,
        skip_count: 0,
      },
      { onConflict: "user_id,topic_id,cycle_type,due_date", ignoreDuplicates: true },
    );
  }

  revalidatePath("/revisions");
  revalidatePath("/");
  return { success: true };
}

export async function deleteTopicRevisions(topicId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("revisions")
    .delete()
    .eq("topic_id", topicId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/revisions");
  revalidatePath("/");
  return { success: true };
}

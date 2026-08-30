"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function logQuestionBatch(prevState: unknown, formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const attempted = Number(formData.get("attempted"));
    const correct = Number(formData.get("correct"));
    const wrong = Number(formData.get("wrong"));
    const skipped = Number(formData.get("skipped"));
    const subjectId = (formData.get("subject_id") as string) || null;
    const topicId = (formData.get("topic_id") as string) || null;
    const source = (formData.get("source") as string)?.trim() || null;
    const durationMinutes = formData.get("duration_minutes") ? Number(formData.get("duration_minutes")) : null;
    const notes = (formData.get("notes") as string)?.trim() || null;

    if (isNaN(attempted) || attempted <= 0) return { error: "Attempted must be > 0" };
    if (correct + wrong + skipped > attempted) return { error: "Correct + wrong + skipped cannot exceed attempted" };

    const { error } = await supabase.from("question_batches").insert({
      user_id: user.id,
      subject_id: subjectId || null,
      topic_id: topicId || null,
      attempted,
      correct,
      wrong,
      skipped,
      source,
      duration_minutes: durationMinutes,
      notes,
      source_client: "web",
    });

    if (error) return { error: error.message };

    revalidatePath("/questions");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Unexpected error" };
  }
}

export async function deleteQuestionBatch(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("question_batches")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/questions");
  revalidatePath("/");
}

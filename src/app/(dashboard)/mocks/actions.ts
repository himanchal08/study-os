"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function logMock(prevState: unknown, formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const name = (formData.get("name") as string)?.trim();
    const source = (formData.get("source") as string)?.trim();
    const examType = formData.get("exam_type") as "banking" | "ssc" | "other";
    const stage = (formData.get("stage") as string)?.trim() || null;
    const mockDate = formData.get("mock_date") as string;
    const maxMarks = Number(formData.get("maximum_marks"));
    const score = Number(formData.get("score"));
    const attempted = Number(formData.get("attempted"));
    const correct = Number(formData.get("correct"));
    const wrong = Number(formData.get("wrong"));
    const unattempted = Number(formData.get("unattempted"));
    const duration = Number(formData.get("actual_duration_minutes"));
    const percentile = formData.get("percentile") ? Number(formData.get("percentile")) : null;
    const rank = formData.get("rank") ? Number(formData.get("rank")) : null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const recommendedDuration = formData.get("recommended_duration_minutes") ? Number(formData.get("recommended_duration_minutes")) : null;

    if (!name || !source || !mockDate) return { error: "Name, source and date are required." };
    if (isNaN(score) || isNaN(maxMarks) || maxMarks <= 0) return { error: "Invalid marks." };

    const { error } = await supabase.from("mocks").insert({
      user_id: user.id,
      name,
      source,
      exam_type: examType,
      stage,
      mock_date: mockDate,
      maximum_marks: maxMarks,
      score,
      attempted,
      correct,
      wrong,
      unattempted,
      actual_duration_minutes: duration,
      recommended_duration_minutes: recommendedDuration,
      percentile,
      rank,
      notes,
      source_client: "web",
    });

    if (error) return { error: error.message };

    revalidatePath("/mocks");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Unexpected error" };
  }
}

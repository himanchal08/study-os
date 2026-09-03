"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

type ErrorCategory = Database["public"]["Enums"]["error_category_enum"];
type ExamType = Database["public"]["Enums"]["exam_type_enum"];

export async function saveQuestionMetadata(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const subjectId = (formData.get("subject_id") as string) || null;
    const topicId = (formData.get("topic_id") as string) || null;
    const source = (formData.get("source") as string)?.trim() || null;
    const examType = (formData.get("exam_type") as ExamType) || null;
    const errorCategory = (formData.get("error_category") as ErrorCategory) || null;
    const explanation = (formData.get("explanation") as string)?.trim() || null;
    const imagePath = (formData.get("image_path") as string) || null;

    if (!imagePath && !explanation) {
      return { error: "You must provide an image or an explanation." };
    }

    const { error } = await supabase.from("saved_questions").insert({
      user_id: user.id,
      subject_id: subjectId,
      topic_id: topicId,
      source,
      exam_type: examType,
      error_category: errorCategory,
      explanation,
      image_path: imagePath,
    });

    if (error) return { error: error.message };

    revalidatePath("/vault");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Unexpected error" };
  }
}

export async function deleteSavedQuestion(id: string, imagePath: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  
  const { error } = await supabase
    .from("saved_questions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  
  if (imagePath) {
    
    supabase.storage.from("question-images").remove([imagePath]).catch(console.error);
  }

  revalidatePath("/vault");
  return { success: true };
}

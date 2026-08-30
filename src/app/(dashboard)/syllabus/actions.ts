"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addSubject(prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = (formData.get("name") as string)?.trim();
  const examType = formData.get("exam_type") as "banking" | "ssc" | "both";
  const color = (formData.get("color") as string) || "#6366f1";

  if (!name) return { error: "Subject name is required." };

  const { error } = await supabase.from("subjects").insert({
    user_id: user.id,
    name,
    exam_type: examType,
    color,
  });

  if (error) return { error: error.message };
  revalidatePath("/syllabus");
  return { success: true };
}

export async function addTopic(prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = (formData.get("name") as string)?.trim();
  const subjectId = formData.get("subject_id") as string;

  if (!name || !subjectId) return { error: "Topic name and subject are required." };

  const { error } = await supabase.from("topics").insert({
    user_id: user.id,
    subject_id: subjectId,
    name,
    status: "not_started",
  });

  if (error) return { error: error.message };
  revalidatePath("/syllabus");
  return { success: true };
}

export async function updateTopicStatus(id: string, status: "not_started" | "learning" | "learned" | "revising" | "strong" | "weak") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("topics")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/syllabus");
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addExam(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const exam_type = formData.get("exam_type") as "banking" | "ssc" | "other";
  const stage = formData.get("stage") as string;
  const exam_date = formData.get("exam_date") as string;
  const maximum_marks = Number(formData.get("maximum_marks"));
  const safety_target_score = Number(formData.get("safety_target_score"));

  const { error } = await supabase.from("exams").insert({
    user_id: user.id,
    name,
    exam_type,
    stage,
    exam_date: exam_date || null,
    maximum_marks,
    safety_target_score,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/targets");
  revalidatePath("/mocks/analytics");
}

export async function addHistoricalCutoff(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const exam_type = formData.get("exam_type") as "banking" | "ssc" | "other";
  const stage = formData.get("stage") as string;
  const year = Number(formData.get("year"));
  const category = formData.get("category") as string;
  const maximum_marks = Number(formData.get("maximum_marks"));
  const cutoff = Number(formData.get("cutoff"));
  const reference = formData.get("reference") as string;

  const { error } = await supabase.from("cutoffs").insert({
    user_id: user.id,
    exam_type,
    stage,
    year,
    category: category || "General",
    maximum_marks,
    cutoff,
    reference: reference || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/targets");
}

export async function deleteExam(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("exams").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/targets");
  revalidatePath("/mocks/analytics");
}

export async function deleteCutoff(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cutoffs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/targets");
}

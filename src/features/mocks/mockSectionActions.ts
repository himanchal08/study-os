"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function logMockSection(prevState: unknown, formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const mockId = formData.get("mock_id") as string;
    const name = (formData.get("name") as string)?.trim();
    const maxMarks = Number(formData.get("maximum_marks"));
    const score = Number(formData.get("score"));
    const attempted = Number(formData.get("attempted"));
    const correct = Number(formData.get("correct"));
    const wrong = Number(formData.get("wrong"));
    const unattempted = Number(formData.get("unattempted"));
    const duration = formData.get("duration_minutes") ? Number(formData.get("duration_minutes")) : null;

    if (!mockId || !name) return { error: "Mock ID and section name are required." };
    if (isNaN(maxMarks) || maxMarks <= 0) return { error: "Invalid max marks." };

    const { error } = await supabase.from("mock_sections").insert({
      user_id: user.id,
      mock_id: mockId,
      name,
      maximum_marks: maxMarks,
      score,
      attempted,
      correct,
      wrong,
      unattempted,
      duration_minutes: duration,
    });

    if (error) return { error: error.message };

    revalidatePath(`/mocks/${mockId}`);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Unexpected error" };
  }
}

export async function deleteMockSection(sectionId: string, mockId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("mock_sections")
    .delete()
    .eq("id", sectionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/mocks/${mockId}`);
  return { success: true };
}

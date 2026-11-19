"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

type ErrorCategoryEnum = Database["public"]["Enums"]["error_category_enum"];

export type VaultActionState = {
  error?: string;
  success?: boolean;
} | null;

export async function deleteVaultItem(id: string): Promise<VaultActionState> {
  if (!id) return { error: "Invalid item ID." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("saved_questions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id); // ensures users can only delete their own items

  if (error) {
    console.error("[vault] deleteVaultItem error:", error.message);
    return { error: error.message };
  }

  revalidatePath("/vault");
  return { success: true };
}

export async function saveVaultItem(
  _prev: VaultActionState,
  formData: FormData
): Promise<VaultActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in." };

  // Server-side validation
  const subjectId = (formData.get("subject_id") as string) || null;
  const topicId = (formData.get("topic_id") as string) || null;
  const source = (formData.get("source") as string)?.trim() || null;
  const rawCat = (formData.get("error_category") as string) || null;
  const explanation = (formData.get("explanation") as string)?.trim() || null;
  const imageFile = formData.get("image") as File | null;

  let imagePath: string | null = null;

  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 5 * 1024 * 1024) {
      return { error: "Image must be under 5 MB." };
    }

    const ext = imageFile.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("vault-images")
      .upload(path, imageFile, { upsert: true });

    if (uploadError) {
      console.error("[vault] image upload error:", uploadError.message);
      return { error: `Image upload failed: ${uploadError.message}` };
    }

    imagePath = path;
  }

  const { error } = await supabase.from("saved_questions").insert({
    user_id: user.id,
    subject_id: subjectId,
    topic_id: topicId,
    source,
    error_category: rawCat as ErrorCategoryEnum | null,
    explanation,
    image_path: imagePath,
  });

  if (error) {
    console.error("[vault] saveVaultItem error:", error.message);
    return { error: error.message };
  }

  revalidatePath("/vault");
  return { success: true };
}


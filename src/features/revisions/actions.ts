"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeRevision(revisionId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("revisions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", revisionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/revisions");
  return { success: true };
}

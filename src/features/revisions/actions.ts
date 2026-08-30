"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Mark a revision as complete.
 * Uses revalidatePath so the parent Server Component re-fetches fresh data —
 * no router.refresh() needed in the client.
 */
export async function completeRevision(revisionId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("revisions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", revisionId);

  if (error) {
    return { error: error.message };
  }

  // Revalidate dashboard and revisions page so Server Components re-render
  revalidatePath("/");
  revalidatePath("/revisions");
  return { success: true };
}

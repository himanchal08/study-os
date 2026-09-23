"use server";

import { createClient } from "@/lib/supabase/server";

export async function reportError(digest: string, message?: string, errorDetails?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("error_reports").insert({
    user_id: user?.id || null,
    digest,
    message,
    error_details: errorDetails,
  });

  if (error) {
    console.error("Failed to insert error report:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

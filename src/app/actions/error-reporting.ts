"use server";

import { createClient } from "@/lib/supabase/server";

export async function reportError(digest: string, message?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("error_reports" as any).insert({
    user_id: user?.id || null,
    digest,
    message,
  } as any);

  if (error) {
    console.error("Failed to insert error report:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

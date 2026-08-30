"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(prevState: unknown, formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const targetHours = Number(formData.get("daily_target_hours"));
    const offsetMin = Number(formData.get("day_boundary_offset_minutes"));
    const timezone = formData.get("timezone") as string;
    const fullName = (formData.get("full_name") as string)?.trim() || null;

    // Collect exam targets from checkboxes
    const examTargets: string[] = [];
    if (formData.get("exam_banking")) examTargets.push("banking");
    if (formData.get("exam_ssc")) examTargets.push("ssc");

    if (isNaN(targetHours) || targetHours <= 0 || targetHours > 24) {
      return { error: "Target hours must be between 1 and 24." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        exam_targets: examTargets.length > 0 ? examTargets : null,
        daily_target_hours: targetHours,
        day_boundary_offset_minutes: isNaN(offsetMin) ? 0 : offsetMin,
        timezone: timezone || "Asia/Kolkata",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("Profile update error:", error);
      return { error: `Failed to save: ${error.message}` };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "An unexpected error occurred." };
  }
}

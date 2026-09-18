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

export async function updateSubjectColor(subjectId: string, color: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("subjects")
    .update({ color, updated_at: new Date().toISOString() })
    .eq("id", subjectId)
    .eq("user_id", user.id);
  revalidatePath("/syllabus");
}

export async function deleteSubject(subjectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const now = new Date().toISOString();

  const { data: topicRows } = await supabase
    .from("topics")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("user_id", user.id)
    .is("archived_at", null);

  const topicIds = (topicRows ?? []).map(t => t.id);
  if (topicIds.length > 0) {
    await supabase
      .from("revisions")
      .delete()
      .eq("user_id", user.id)
      .in("topic_id", topicIds)
      .is("completed_at", null);
  }

  await supabase.from("topics").update({ archived_at: now }).eq("subject_id", subjectId).eq("user_id", user.id);
  await supabase.from("subjects").update({ deleted_at: now }).eq("id", subjectId).eq("user_id", user.id);
  revalidatePath("/syllabus");
  revalidatePath("/");
  revalidatePath("/revisions");
}

export async function archiveTopic(topicId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const now = new Date().toISOString();

  // Close pending revisions first — same pattern as deleteSubject.
  // Archived topics must not leave ghost entries in the revision queue.
  await supabase
    .from("revisions")
    .delete()
    .eq("user_id", user.id)
    .eq("topic_id", topicId)
    .is("completed_at", null);

  await supabase
    .from("topics")
    .update({ archived_at: now })
    .eq("id", topicId)
    .eq("user_id", user.id);

  revalidatePath("/syllabus");
  revalidatePath("/");
  revalidatePath("/revisions");
}

export async function deleteTopic(topicId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const now = new Date().toISOString();

  await supabase
    .from("revisions")
    .delete()
    .eq("user_id", user.id)
    .eq("topic_id", topicId)
    .is("completed_at", null);

  const { error } = await supabase
    .from("topics")
    .update({ archived_at: now })
    .eq("id", topicId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/syllabus");
  revalidatePath("/");
  revalidatePath("/revisions");
  return { success: true };
}

export async function updateTopicLifecycle(
  topicId: string,
  updates: {
    book_practice_done?: boolean;
    dpp_done?: boolean;
    pyq_done?: boolean;
    tests_attempted_count?: number;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("topic_lifecycle")
    .upsert(
      { user_id: user.id, topic_id: topicId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: "user_id,topic_id", ignoreDuplicates: false },
    );

  revalidatePath("/syllabus");
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { validateTask } from "@/lib/calculations";
import type { Database, Tables } from "@/types/database";

export type TaskStatus = Database["public"]["Enums"]["task_status_enum"];

export type TaskActionState = {
  error?: string;
  success?: boolean;
} | null;

export async function createTask(
  _prev: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create tasks." };
  }

  const title = (formData.get("title") as string)?.trim();
  const subjectId = (formData.get("subject_id") as string) || null;
  const topicId = (formData.get("topic_id") as string) || null;
  const plannedDate = formData.get("planned_date") as string;
  const dueDate = (formData.get("due_date") as string) || null;
  const estimatedMinutesStr = formData.get("estimated_minutes") as string;
  const recurrencePattern = (formData.get("recurrence_pattern") as string) || "none";

  if (!title) {
    return { error: "Task title is required." };
  }
  if (!plannedDate) {
    return { error: "Planned date is required." };
  }

  try {
    validateTask({ plannedDate, dueDate });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid task dates." };
  }

  const estimatedMinutes = estimatedMinutesStr ? parseInt(estimatedMinutesStr, 10) : null;
  const isRecurring = recurrencePattern !== "none";
  const parentTaskId = randomUUID();

  const datesToInsert: string[] = [plannedDate];

  if (isRecurring) {
    const baseDate = new Date(plannedDate);
    if (recurrencePattern === "daily") {
      for (let i = 1; i <= 7; i++) {
        const next = new Date(baseDate);
        next.setDate(baseDate.getDate() + i);
        datesToInsert.push(next.toISOString().split("T")[0]);
      }
    } else if (recurrencePattern === "weekdays") {
      let count = 0;
      let i = 1;
      while (count < 5 && i < 14) {
        const next = new Date(baseDate);
        next.setDate(baseDate.getDate() + i);
        const day = next.getDay();
        if (day >= 1 && day <= 5) {
          datesToInsert.push(next.toISOString().split("T")[0]);
          count++;
        }
        i++;
      }
    } else if (recurrencePattern === "weekly") {
      for (let i = 1; i <= 3; i++) {
        const next = new Date(baseDate);
        next.setDate(baseDate.getDate() + i * 7);
        datesToInsert.push(next.toISOString().split("T")[0]);
      }
    }
  }

  const rows = datesToInsert.map((date, idx) => ({
    id: idx === 0 ? parentTaskId : randomUUID(),
    user_id: user.id,
    title,
    subject_id: subjectId,
    topic_id: topicId,
    planned_date: date,
    due_date: idx === 0 ? dueDate : null,
    estimated_minutes: estimatedMinutes,
    is_recurring: isRecurring,
    recurrence_pattern: isRecurring ? recurrencePattern : null,
    parent_task_id: idx === 0 ? null : parentTaskId,
    client_generated_id: randomUUID(),
    source_client: "web" as const,
  }));

  const { data: inserted, error } = await supabase
    .from("tasks")
    .insert(rows)
    .select("id");

  if (error) {
    return { error: error.message };
  }

  if (inserted && inserted.length > 0) {
    await supabase.from("task_events").insert(
      inserted.map((t) => ({
        user_id: user.id,
        task_id: t.id,
        event_type: "created",
      }))
    );
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return { success: true };
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  failureReason?: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const updatePayload: Partial<Tables<"tasks">> = {
    status,
  };

  if (failureReason !== undefined) {
    updatePayload.failure_reason = failureReason;
  }

  const { error } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("task_events").insert({
    user_id: user.id,
    task_id: taskId,
    event_type: status,
    notes: failureReason ?? null,
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  return { success: true };
}

export async function postponeTask(
  taskId: string,
  newPlannedDate: string,
  failureReason?: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: current } = await supabase
    .from("tasks")
    .select("postpone_count")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  const currentCount = current?.postpone_count ?? 0;

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "postponed",
      planned_date: newPlannedDate,
      postpone_count: currentCount + 1,
      failure_reason: failureReason ?? null,
    })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("task_events").insert({
    user_id: user.id,
    task_id: taskId,
    event_type: "postponed",
    notes: failureReason ? `Postponed to ${newPlannedDate}: ${failureReason}` : `Postponed to ${newPlannedDate}`,
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  return { success: true };
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("task_events").insert({
    user_id: user.id,
    task_id: taskId,
    event_type: "cancelled",
    notes: "Soft deleted",
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  return { success: true };
}

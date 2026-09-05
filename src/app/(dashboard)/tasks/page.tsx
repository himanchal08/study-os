import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { dayBoundaryAwareDate } from "@/lib/calculations";
import { TaskList } from "@/features/tasks/TaskList";
import { TaskForm } from "@/features/tasks/TaskForm";
import type { TaskItem } from "@/features/tasks/TaskCard";

export const metadata: Metadata = { title: "Daily Planner" };

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("day_boundary_offset_minutes, timezone")
    .eq("user_id", user.id)
    .single();

  const timezone = profile?.timezone ?? "Asia/Kolkata";
  const offsetMin = profile?.day_boundary_offset_minutes ?? 0;
  const todayDate = dayBoundaryAwareDate(new Date().getTime(), offsetMin, timezone);

  const { data: rawSubjects } = await supabase
    .from("subjects")
    .select("id, name, color")
    .order("name", { ascending: true });

  const subjects = rawSubjects
    ? [...rawSubjects].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const { data: rawTopics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .is("archived_at", null)
    .order("name", { ascending: true });

  const topics = rawTopics
    ? rawTopics
        .filter(t => t.name.toLowerCase().trim() !== "no specific topic" && t.name.trim() !== "")
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const { data: rawTasks } = await supabase
    .from("tasks")
    .select("*, subjects(id, name, color), topics(id, name)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("planned_date", { ascending: true })
    .order("created_at", { ascending: true });

  const tasks: TaskItem[] = (rawTasks ?? []) as unknown as TaskItem[];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100 tracking-tight mb-1">Daily Planner</h1>
          <p className="text-xs mt-0.5 text-neutral-500">
            Plan today and tomorrow, set targets, and track execution accountability.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TaskList
            tasks={tasks}
            userId={user.id}
            todayDate={todayDate}
            subjects={subjects ?? []}
          />
        </div>

        <div>
          <div className="rounded-xl p-5 sticky top-6" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
              + Plan New Task
            </p>
            <TaskForm
              subjects={subjects ?? []}
              topics={topics ?? []}
              defaultDate={todayDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

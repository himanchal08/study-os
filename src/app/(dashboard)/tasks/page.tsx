import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { dayBoundaryAwareDate } from "@/lib/calculations";
import { TaskList } from "@/features/tasks/TaskList";
import type { TaskItem } from "@/features/tasks/TaskCard";
import { PlannerAddSheet } from "@/features/tasks/PlannerAddSheet";
import { GoogleCalendarPanel } from "../settings/GoogleCalendarPanel";

export const metadata: Metadata = { title: "Daily Planner" };

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("day_boundary_offset_minutes, timezone, daily_questions_cap, google_refresh_token, google_last_synced_at")
    .eq("user_id", user.id)
    .single();

  const timezone = profile?.timezone ?? "Asia/Kolkata";
  const offsetMin = profile?.day_boundary_offset_minutes ?? 0;
  const dailyQuestionsCap = profile?.daily_questions_cap ?? 250;
  const todayDate = dayBoundaryAwareDate(new Date().getTime(), offsetMin, timezone);

  const { data: rawSubjects } = await supabase
    .from("subjects")
    .select("id, name, color, exam_type")
    .order("name", { ascending: true });

  const subjects = rawSubjects ?? [];

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

  const windowStart = new Date(todayDate);
  windowStart.setUTCDate(windowStart.getUTCDate() - 30);
  const windowEnd = new Date(todayDate);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 60);
  const windowStartStr = windowStart.toISOString().split("T")[0];
  const windowEndStr   = windowEnd.toISOString().split("T")[0];

  const { data: rawTasks } = await supabase
    .from("tasks")
    .select("*, subjects(id, name, color), topics(id, name)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("planned_date", windowStartStr)
    .lte("planned_date", windowEndStr)
    .order("planned_date", { ascending: true })
    .order("created_at", { ascending: true });

  const tasks: TaskItem[] = (rawTasks ?? []) as unknown as TaskItem[];

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight">Daily Planner</h1>
        <p className="text-xs mt-1 text-neutral-500">Plan your day and track execution.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TaskList
            tasks={tasks}
            todayDate={todayDate}
            subjects={subjects ?? []}
            timezone={timezone}
          />
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-6 space-y-6">
            <div className="rounded-xl p-5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">+ Plan New Task</p>
              <PlannerAddSheet
                subjects={subjects ?? []}
                topics={topics ?? []}
                defaultDate={todayDate}
                dailyQuestionsCap={dailyQuestionsCap}
                desktopOnly
              />
            </div>

            <GoogleCalendarPanel
              isConnected={!!profile?.google_refresh_token}
              lastSyncedAt={profile?.google_last_synced_at ?? null}
              mode="tasks"
            />
          </div>
        </div>
      </div>

      <PlannerAddSheet
        subjects={subjects ?? []}
        topics={topics ?? []}
        defaultDate={todayDate}
        dailyQuestionsCap={dailyQuestionsCap}
        mobileOnly
      />

      <div className="lg:hidden mt-6">
        <GoogleCalendarPanel
          isConnected={!!profile?.google_refresh_token}
          lastSyncedAt={profile?.google_last_synced_at ?? null}
          mode="tasks"
        />
      </div>
    </div>
  );
}

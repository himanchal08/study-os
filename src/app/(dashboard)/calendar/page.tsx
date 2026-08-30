import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarGrid } from "@/features/calendar/CalendarGrid";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch tasks for the current and surrounding months
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, planned_date, due_date")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  // Fetch study sessions for the last 90 days for calendar overlay
  const now = new Date(); // stable reference — avoids react-hooks/purity on Date.now()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString();
  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("id, start_timestamp, end_timestamp, pause_duration_seconds, activity_type, subjects(name, color), topics(name)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("start_timestamp", ninetyDaysAgo)
    .not("end_timestamp", "is", null)
    .order("start_timestamp", { ascending: false });

  return (
    <div className="space-y-6 animate-fade-in pb-12 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100 tracking-tight mb-1">Calendar</h1>
          <p className="text-sm text-neutral-500">Tasks and study sessions across the month.</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-neutral-600">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: "#262626" }} /> Task</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm border-l-2 border-[#818cf8]" style={{ background: "rgba(129,140,248,0.1)" }} /> Session</span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <CalendarGrid tasks={tasks ?? []} sessions={(sessions ?? []) as Parameters<typeof CalendarGrid>[0]["sessions"]} />
      </div>
    </div>
  );
}

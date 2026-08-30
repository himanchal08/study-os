import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarGrid } from "@/features/calendar/CalendarGrid";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch tasks. In a real production app with thousands of tasks,
  // we would pass the current month down as a param and fetch only that month.
  // For the MVP, fetching all tasks or recent/upcoming tasks is fine.
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, planned_date, due_date")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  return (
    <div className="space-y-6 animate-fade-in pb-12 flex flex-col h-[calc(100vh-6rem)]">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight mb-1">Calendar</h1>
        <p className="text-sm text-neutral-500">View your planned tasks and study schedule across the month.</p>
      </div>

      <div className="flex-1 min-h-0">
        <CalendarGrid tasks={tasks ?? []} />
      </div>
    </div>
  );
}

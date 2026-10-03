import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dayBoundaryAwareDate } from "@/lib/calculations";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("day_boundary_offset_minutes, timezone")
    .eq("user_id", user.id)
    .single();

  const offsetMin = profile?.day_boundary_offset_minutes ?? 0;
  const timezone  = profile?.timezone ?? "Asia/Kolkata";
  const todayStr  = dayBoundaryAwareDate(Date.now(), offsetMin, timezone);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, planned_date, deleted_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("planned_date", { ascending: false })
    .limit(100);

  const grouped = {
    today:      [] as object[],
    stuckToday: [] as object[],
    overdue:    [] as object[],
    upcoming:   [] as object[],
  };

  for (const t of tasks ?? []) {
    const isToday   = t.planned_date === todayStr;
    const isPast    = t.planned_date < todayStr;
    const isStuck   = isToday && (t.status === "cancelled" || t.status === "postponed");
    const isOverdue = isPast && t.status !== "completed" && t.status !== "cancelled" && t.status !== "postponed";

    if (isStuck)        grouped.stuckToday.push({ title: t.title, status: t.status, date: t.planned_date });
    else if (isToday)   grouped.today.push({ title: t.title, status: t.status });
    else if (isOverdue) grouped.overdue.push({ title: t.title, status: t.status, date: t.planned_date });
    else                grouped.upcoming.push({ title: t.title, status: t.status, date: t.planned_date });
  }

  return NextResponse.json({
    todayStr,
    summary: {
      today:      grouped.today.length,
      stuckToday: grouped.stuckToday.length,
      overdue:    grouped.overdue.length,
      upcoming:   grouped.upcoming.length,
    },
    detail: grouped,
  });
}

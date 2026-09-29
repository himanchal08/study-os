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
  const timezone = profile?.timezone ?? "Asia/Kolkata";
  const now = new Date();
  const todayStr = dayBoundaryAwareDate(now.getTime(), offsetMin, timezone);

  // Week start (Monday)
  const dayOfWeek = now.getDay();
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now.getTime() - daysFromMon * 86400000);
  weekStart.setHours(0, 0, 0, 0);

  const [
    { data: todaySessions },
    { data: weekSessions },
    { data: dueRevisions },
  ] = await Promise.all([
    // Today's sessions with subject/topic info
    supabase
      .from("study_sessions")
      .select("id, notes, activity_type, subject_id, topic_id, subjects(name, color), topics(name)")
      .eq("user_id", user.id)
      .gte("start_timestamp", `${todayStr}T00:00:00`)
      .is("deleted_at", null)
      .not("end_timestamp", "is", null)
      .order("start_timestamp", { ascending: false }),

    // This week's sessions (Mon–today)
    supabase
      .from("study_sessions")
      .select("id, notes, subject_id, topic_id, subjects(name, color), topics(name)")
      .eq("user_id", user.id)
      .gte("start_timestamp", weekStart.toISOString())
      .is("deleted_at", null)
      .not("end_timestamp", "is", null),

    // Due revisions (not completed)
    supabase
      .from("revisions")
      .select("id, due_date, cycle_type, skip_count, topics(name, subject_id, subjects(name, color))")
      .eq("user_id", user.id)
      .lte("due_date", todayStr)
      .is("completed_at", null)
      .order("due_date", { ascending: true })
      .limit(50),
  ]);

  return NextResponse.json({
    todaySessions: todaySessions ?? [],
    weekSessions: weekSessions ?? [],
    dueRevisions: dueRevisions ?? [],
    todayStr,
    dayOfWeek: now.getDay(), // 0=Sun
  });
}

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { dayBoundaryAwareDate } from "@/lib/calculations";
import { HistoryClient, type HistorySession } from "@/features/study-timer/HistoryClient";

export const metadata: Metadata = { title: "Session History" };

function sessionSecs(s: { start_timestamp: string; end_timestamp: string; pause_duration_seconds: number | null }): number {
  return Math.max(
    0,
    (new Date(s.end_timestamp).getTime() - new Date(s.start_timestamp).getTime()) / 1000
      - (s.pause_duration_seconds ?? 0)
  );
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("day_boundary_offset_minutes, timezone")
    .eq("user_id", user.id)
    .single();

  const offsetMin = profile?.day_boundary_offset_minutes ?? 0;
  const timezone  = profile?.timezone ?? "Asia/Kolkata";

  const [{ data: rawSessions }, { data: rawSubjects }] = await Promise.all([
    // All completed sessions (no limit — it's their full history)
    supabase
      .from("study_sessions")
      .select("id, start_timestamp, end_timestamp, pause_duration_seconds, activity_type, notes, subjects(name, color), topics(name)")
      .eq("user_id", user.id)
      .not("end_timestamp", "is", null)
      .is("deleted_at", null)
      .order("start_timestamp", { ascending: false }),
    // Subjects for filter dropdown
    supabase
      .from("subjects")
      .select("id, name, color, exam_type")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const sessions = (rawSessions ?? []) as unknown as HistorySession[];
  const subjects = rawSubjects ?? [];

  // ── Compute all-time stats ──────────────────────────────────────────────

  // Total all-time seconds
  const totalAllTimeSecs = sessions.reduce((acc, s) => acc + sessionSecs(s), 0);

  // Group by boundary-aware date for streak + best day
  const dailySecsMap = new Map<string, number>();
  sessions.forEach(s => {
    const dateKey = dayBoundaryAwareDate(new Date(s.start_timestamp).getTime(), offsetMin, timezone);
    dailySecsMap.set(dateKey, (dailySecsMap.get(dateKey) ?? 0) + sessionSecs(s));
  });

  // Best day
  let bestDaySecs = 0;
  let bestDayDate = "—";
  for (const [date, secs] of dailySecsMap.entries()) {
    if (secs > bestDaySecs) {
      bestDaySecs = secs;
      bestDayDate = new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    }
  }

  // Streak calculation
  const sortedDates = Array.from(dailySecsMap.keys())
    .map(d => new Date(d + "T12:00:00"))
    .sort((a, b) => a.getTime() - b.getTime());

  let bestStreak    = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  for (const d of sortedDates) {
    if (!lastDate) {
      currentStreak = 1;
    } else {
      const diffDays = Math.round((d.getTime() - lastDate.getTime()) / 86400000);
      currentStreak = diffDays === 1 ? currentStreak + 1 : 1;
    }
    if (currentStreak > bestStreak) bestStreak = currentStreak;
    lastDate = d;
  }

  // Current streak: count backwards from today
  const todayStr = dayBoundaryAwareDate(new Date().getTime(), offsetMin, timezone);
  let liveStreak = 0;
  {
    let checkDate = new Date(todayStr + "T12:00:00");
    while (true) {
      const key = checkDate.toISOString().split("T")[0];
      if (!dailySecsMap.has(key)) break;
      liveStreak++;
      checkDate = new Date(checkDate.getTime() - 86400000);
    }
  }

  return (
    <HistoryClient
      sessions={sessions}
      subjects={subjects}
      totalAllTimeSecs={totalAllTimeSecs}
      totalSessions={sessions.length}
      bestDaySecs={bestDaySecs}
      bestDayDate={bestDayDate}
      currentStreak={liveStreak}
      bestStreak={bestStreak}
    />
  );
}


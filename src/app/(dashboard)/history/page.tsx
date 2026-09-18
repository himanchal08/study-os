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

  const [{ data: rawStatsSessions }, { data: rawDisplaySessions }, { data: rawSubjects }] = await Promise.all([
    // Lightweight query for all-time stats (no joins, tiny payload)
    supabase
      .from("study_sessions")
      .select("start_timestamp, end_timestamp, pause_duration_seconds")
      .eq("user_id", user.id)
      .not("end_timestamp", "is", null)
      .is("deleted_at", null)
      .order("start_timestamp", { ascending: false }),
    // Full detail query for UI list (bounded to prevent OOM)
    supabase
      .from("study_sessions")
      .select("id, start_timestamp, end_timestamp, pause_duration_seconds, activity_type, notes, subjects(name, color), topics(name)")
      .eq("user_id", user.id)
      .not("end_timestamp", "is", null)
      .is("deleted_at", null)
      .order("start_timestamp", { ascending: false })
      .limit(300),
    // Subjects for filter dropdown
    supabase
      .from("subjects")
      .select("id, name, color, exam_type")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const statsSessions = (rawStatsSessions ?? []) as unknown as { start_timestamp: string; end_timestamp: string; pause_duration_seconds: number }[];
  const displaySessions = (rawDisplaySessions ?? []) as unknown as HistorySession[];
  const subjects = rawSubjects ?? [];

  // ── Compute all-time stats ──────────────────────────────────────────────

  // Total all-time seconds
  const totalAllTimeSecs = statsSessions.reduce((acc, s) => acc + sessionSecs(s), 0);

  // Group by boundary-aware date for streak + best day
  const dailySecsMap = new Map<string, number>();
  statsSessions.forEach(s => {
    const startMs = new Date(s.start_timestamp).getTime();
    const endMs = new Date(s.end_timestamp).getTime();
    const midPointMs = startMs + (endMs - startMs) / 2;
    const dateKey = dayBoundaryAwareDate(midPointMs, offsetMin, timezone);
    const secs = sessionSecs(s);
    dailySecsMap.set(dateKey, (dailySecsMap.get(dateKey) ?? 0) + secs);
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

  let liveStreak = 0;
  {
    const nowMs = Date.now();
    const todayStrRaw = dayBoundaryAwareDate(nowMs, offsetMin, timezone);
    const todayNoonMs = new Date(todayStrRaw + "T12:00:00Z").getTime();
    const todayKey = dayBoundaryAwareDate(todayNoonMs, offsetMin, timezone);
    const yesterdayMs = todayNoonMs - 86400000;
    const yesterdayKey = dayBoundaryAwareDate(yesterdayMs, offsetMin, timezone);
    let checkMs = todayNoonMs;
    if (!dailySecsMap.has(todayKey) && dailySecsMap.has(yesterdayKey)) {
      checkMs = yesterdayMs;
    }

    while (true) {
      const key = dayBoundaryAwareDate(checkMs, offsetMin, timezone);
      if (!dailySecsMap.has(key)) break;
      liveStreak++;
      checkMs -= 86400000;
    }
  }

  return (
    <HistoryClient
      sessions={displaySessions}
      subjects={subjects}
      totalAllTimeSecs={totalAllTimeSecs}
      totalSessions={statsSessions.length}
      bestDaySecs={bestDaySecs}
      bestDayDate={bestDayDate}
      currentStreak={liveStreak}
      bestStreak={bestStreak}
      offsetMin={offsetMin}
      timezone={timezone}
      todayStr={dayBoundaryAwareDate(new Date().getTime(), offsetMin, timezone)}
    />
  );
}


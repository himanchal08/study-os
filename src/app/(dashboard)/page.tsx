import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { dayBoundaryAwareDate, buildHeatmapData, computeStreaks } from "@/lib/calculations";
import { WeeklyTimesheet } from "@/features/study-timer/WeeklyTimesheet";
import { HeatmapGrid } from "@/features/analytics/HeatmapGrid";
import { TaskCard, type TaskItem } from "@/features/tasks/TaskCard";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Home",
};

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function calcTotalSecs(
  sessions: Array<{ start_timestamp: string; end_timestamp: string | null; pause_duration_seconds: number | null }>
): number {
  return sessions.reduce((sum, s) => {
    if (!s.end_timestamp) return sum;
    const secs = Math.max(
      0,
      (new Date(s.end_timestamp).getTime() - new Date(s.start_timestamp).getTime()) / 1000
        - (s.pause_duration_seconds ?? 0)
    );
    return sum + secs;
  }, 0);
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_target_hours, daily_goal_minutes, day_boundary_offset_minutes, timezone")
    .eq("user_id", user.id)
    .single();

  const offsetMin = profile?.day_boundary_offset_minutes ?? 0;
  const timezone = profile?.timezone ?? "Asia/Kolkata";
  const now = new Date().getTime();
  const todayStr = dayBoundaryAwareDate(now, offsetMin, timezone);
  const todayStartStr = `${todayStr}T00:00:00`;

  const nowDate = new Date();
  const dayOfWeek = nowDate.getDay();
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(nowDate.getTime() - daysFromMon * 86400000);
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);

  const heatStartDate = new Date(now - 363 * 86400000);
  const heatmapStart = dayBoundaryAwareDate(heatStartDate.getTime(), offsetMin, timezone);

  const [
    { data: todaySessionsRaw },
    { data: weekSessionsRaw },
    { data: monthSessionsRaw },
    { data: revisionsDue },
    { data: todayTasksRaw },
    { data: heatSessionsRaw },
  ] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("id, start_timestamp, end_timestamp, activity_type, notes, pause_duration_seconds, subject_id, topic_id, subjects(name, color), topics(name)")
      .eq("user_id", user.id)
      .gte("start_timestamp", todayStartStr)
      .is("deleted_at", null)
      .order("start_timestamp", { ascending: false }),
    supabase
      .from("study_sessions")
      .select("start_timestamp, end_timestamp, pause_duration_seconds")
      .eq("user_id", user.id)
      .gte("start_timestamp", weekStart.toISOString())
      .is("deleted_at", null),
    supabase
      .from("study_sessions")
      .select("start_timestamp, end_timestamp, pause_duration_seconds")
      .eq("user_id", user.id)
      .gte("start_timestamp", monthStart.toISOString())
      .is("deleted_at", null),
    supabase
      .from("revisions")
      .select("id")
      .eq("user_id", user.id)
      .lte("due_date", todayStr)
      .is("completed_at", null),
    supabase
      .from("tasks")
      .select("*, subjects(id, name, color), topics(id, name)")
      .eq("user_id", user.id)
      .eq("planned_date", todayStr)
      .neq("status", "completed")
      .is("deleted_at", null)
      .limit(8),
    supabase
      .from("study_sessions")
      .select("start_timestamp, end_timestamp, pause_duration_seconds")
      .eq("user_id", user.id)
      .gte("start_timestamp", heatStartDate.toISOString())
      .is("deleted_at", null),
  ]);

  const todaySecs = calcTotalSecs(todaySessionsRaw ?? []);
  const weekSecs = calcTotalSecs(weekSessionsRaw ?? []);
  const monthSecs = calcTotalSecs(monthSessionsRaw ?? []);
  
  const targetMinutes = profile?.daily_goal_minutes ?? (profile?.daily_target_hours ? profile.daily_target_hours * 60 : 480);
  const targetPct = Math.min(100, (todaySecs / 60 / targetMinutes) * 100);
  const targetLabel = `${Math.round(targetMinutes / 60)}h target`;

  const revisionsCount = revisionsDue?.length ?? 0;
  const todayTasks = (todayTasksRaw ?? []) as unknown as TaskItem[];

  const heatSessions = (heatSessionsRaw ?? []) as unknown as Array<{
    start_timestamp: string;
    end_timestamp: string | null;
    pause_duration_seconds: number;
  }>;

  const { current: currentStreak } = computeStreaks(heatSessions, offsetMin, timezone);

  const knownDates = new Set(
    heatSessions.map(s =>
      dayBoundaryAwareDate(new Date(s.start_timestamp).getTime(), offsetMin, timezone)
    )
  );
  const heatCells = buildHeatmapData({
    startDate: heatmapStart,
    endDate: todayStr,
    sessions: heatSessions,
    metric: "hours",
    dayBoundaryOffsetMin: offsetMin,
    timezone,
    knownDates,
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Today", value: formatHours(todaySecs), sub: `of ${targetLabel}`, pct: targetPct },
          { label: "This Week", value: formatHours(weekSecs), sub: null, pct: null },
          { label: "This Month", value: formatHours(monthSecs), sub: null, pct: null },
          { label: "Streak", value: `${currentStreak} day${currentStreak !== 1 ? 's' : ''}`, sub: null, pct: null, isStreak: true },
        ].map(({ label, value, sub, pct, isStreak }) => (
          <div
            key={label}
            className="rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden"
            style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
          >
            {isStreak && currentStreak > 0 && (
              <div className="absolute -right-2 -top-2 text-5xl opacity-10 blur-sm pointer-events-none">🔥</div>
            )}
            <p className="text-[10px] uppercase tracking-wider text-neutral-600">{label}</p>
            <p className="text-lg md:text-xl font-bold tabular-nums text-neutral-100 flex items-center gap-2">
              {value || "0m"}
              {isStreak && currentStreak > 2 && <span className="text-orange-500 text-sm">🔥</span>}
            </p>

            {sub && <p className="text-[10px] text-neutral-600">{sub}</p>}
            {pct !== null && (
              <div className="w-full h-1 rounded-full mt-1" style={{ background: "#1a1a1a" }}>
                <div
                  className="h-1 rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background:
                      pct >= 100
                        ? "linear-gradient(90deg,#34d399,#10b981)"
                        : pct >= 60
                        ? "linear-gradient(90deg,#818cf8,#a78bfa)"
                        : "linear-gradient(90deg,#525252,#737373)",
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-none">
        <Link
          href="/tasks"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
          style={{ background: "#111", border: "1px solid #1a1a1a", color: "#a1a1aa" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Planner
        </Link>

        <Link
          href="/questions"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
          style={{ background: "#111", border: "1px solid #1a1a1a", color: "#a1a1aa" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          Log Questions
        </Link>

        <Link
          href="/revisions"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
          style={{
            background: revisionsCount > 0 ? "#451a03" : "#111",
            border: `1px solid ${revisionsCount > 0 ? "#92400e" : "#1a1a1a"}`,
            color: revisionsCount > 0 ? "#fb923c" : "#a1a1aa",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Revisions
          {revisionsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "#7c2d12", color: "#fb923c" }}>
              {revisionsCount} due
            </span>
          )}
        </Link>

        <Link
          href="/syllabus"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80 shrink-0"
          style={{ background: "#111", border: "1px solid #1a1a1a", color: "#a1a1aa" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          Syllabus
        </Link>
      </div>

      {todayTasks.length > 0 && (
        <section id="tour-today-tasks" aria-label="Today's Tasks">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            Today&apos;s Tasks
          </h2>
          <div className="space-y-2">
            {todayTasks.map(task => (
              <TaskCard key={task.id} task={task} userId={user.id} />
            ))}
          </div>
        </section>
      )}

      <section aria-label="Today's sessions">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Today&apos;s Sessions
        </h2>
        <WeeklyTimesheet sessions={todaySessionsRaw as React.ComponentProps<typeof WeeklyTimesheet>["sessions"] ?? []} todayOnly />
      </section>

      <section aria-label="Activity Heatmap">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">Consistency Heatmap</h2>
              <p className="text-xs text-neutral-500 mt-0.5">52 weeks · study hours</p>
            </div>
          </div>
          <HeatmapGrid cells={heatCells} metric="hours" weeks={52} />
        </div>
      </section>

    </div>
  );
}



import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { KpiStrip } from "@/features/analytics/KpiStrip";
import { RevisionQueue } from "@/features/revisions/RevisionQueue";
import { HeatmapGrid } from "@/features/analytics/HeatmapGrid";
import { buildHeatmapData, dayBoundaryAwareDate } from "@/lib/calculations";
import { WeeklyTimesheet } from "@/features/study-timer/WeeklyTimesheet";
import { TaskCard, type TaskItem } from "@/features/tasks/TaskCard";

export const metadata: Metadata = {
  title: "Home",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_target_hours, day_boundary_offset_minutes, timezone")
    .eq("user_id", user.id)
    .single();

  const offsetMin = profile?.day_boundary_offset_minutes ?? 0;
  const timezone = profile?.timezone ?? "Asia/Kolkata";

  const now = Date.now();
  const todayStr = dayBoundaryAwareDate(now, offsetMin, timezone);

  // 1. Revisions Due Today
  const { data: revisionsDue } = await supabase
    .from("revisions")
    .select("*, topics(name, subjects(name, color))")
    .eq("user_id", user.id)
    .lte("due_date", todayStr)
    .is("completed_at", null)
    .order("due_date", { ascending: true })
    .limit(10);

  // 2. Heatmap Data (52 weeks)
  const heatStartDate = new Date(now - 363 * 86400000);
  const heatmapStart = dayBoundaryAwareDate(heatStartDate.getTime(), offsetMin, timezone);

  const { data: heatSessions } = await supabase
    .from("study_sessions")
    .select("start_timestamp, end_timestamp, pause_duration_seconds")
    .eq("user_id", user.id)
    .gte("start_timestamp", heatStartDate.toISOString())
    .is("deleted_at", null);

  const knownDates = new Set(
    (heatSessions ?? []).map((s) =>
      dayBoundaryAwareDate(new Date(s.start_timestamp).getTime(), offsetMin, timezone)
    )
  );

  const heatCells = buildHeatmapData({
    startDate: heatmapStart,
    endDate: todayStr,
    sessions: heatSessions ?? [],
    metric: "hours",
    dayBoundaryOffsetMin: offsetMin,
    timezone,
    knownDates,
  });

  // 3. Today's Tasks
  const { data: todayTasksRaw } = await supabase
    .from("tasks")
    .select("*, subjects(id, name, color), topics(id, name)")
    .eq("user_id", user.id)
    .eq("planned_date", todayStr)
    .neq("status", "completed")
    .is("deleted_at", null)
    .limit(5);

  const todayTasks = (todayTasksRaw ?? []) as unknown as TaskItem[];

  // 4. Today's Study Sessions (Recent Activity)
  // We'll just fetch the last 7 days of activity for the timesheet
  const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
  const { data: recentSessionsRaw } = await supabase
    .from("study_sessions")
    .select("id, start_timestamp, end_timestamp, activity_type, notes, pause_duration_seconds, subjects(name, color), topics(name)")
    .eq("user_id", user.id)
    .gte("start_timestamp", sevenDaysAgo)
    .is("deleted_at", null)
    .order("start_timestamp", { ascending: false });

  // Compute today's study hours for the target bar
  const todayStartStr = `${todayStr}T00:00:00`;
  const { data: todaySessions } = await supabase
    .from("study_sessions")
    .select("start_timestamp, end_timestamp, pause_duration_seconds")
    .eq("user_id", user.id)
    .gte("start_timestamp", todayStartStr)
    .is("deleted_at", null);

  const todayHours = (todaySessions ?? []).reduce((sum, s) => {
    if (!s.end_timestamp) return sum;
    const secs = Math.max(0,
      (new Date(s.end_timestamp).getTime() - new Date(s.start_timestamp).getTime()) / 1000
      - (s.pause_duration_seconds ?? 0)
    );
    return sum + secs / 3600;
  }, 0);

  const targetHours = profile?.daily_target_hours ?? 8;
  const targetPct = Math.min(100, (todayHours / targetHours) * 100);
  const targetLabel = targetPct >= 100
    ? "🎯 Daily goal reached!"
    : targetPct >= 75
    ? "Almost there — keep going"
    : targetPct >= 40
    ? "Good progress today"
    : "Session not started yet";

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      {/* Daily Target Bar — Phase 23.4 */}
      <section id="tour-daily-target" aria-label="Daily study target">
        <div className="rounded-2xl p-5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Today&apos;s Target</p>
              <p className="text-sm text-neutral-600 mt-0.5">{targetLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums" style={{ color: targetPct >= 100 ? "#34d399" : "#ededed" }}>
                {todayHours.toFixed(1)}<span className="text-base font-normal text-neutral-600">h</span>
              </p>
              <p className="text-xs text-neutral-600">of {targetHours}h</p>
            </div>
          </div>
          <div className="w-full rounded-full h-2" style={{ background: "#1a1a1a" }}>
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: `${targetPct}%`,
                background: targetPct >= 100
                  ? "linear-gradient(90deg, #34d399, #10b981)"
                  : targetPct >= 60
                  ? "linear-gradient(90deg, #818cf8, #a78bfa)"
                  : "linear-gradient(90deg, #525252, #737373)",
              }}
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* 2. Today's Tasks */}
        <section id="tour-today-tasks" aria-label="Today's Tasks">
          <h2 className="text-sm font-semibold text-neutral-100 uppercase tracking-wider mb-4">Today&apos;s Tasks</h2>
          {todayTasks.length === 0 ? (
            <div className="rounded-xl p-6 text-center border border-neutral-900 bg-black/40">
              <p className="text-sm text-neutral-400">No tasks planned for today.</p>
            </div>
          ) : (
            <div className="space-y-2 min-w-0">
              {todayTasks.map(task => (
                <TaskCard key={task.id} task={task} userId={user.id} />
              ))}
            </div>
          )}
        </section>

        {/* 3. Revision Queue */}
        <section id="tour-revision-queue" aria-label="Revisions due today">
          <h2 className="text-sm font-semibold text-neutral-100 uppercase tracking-wider mb-4">Revision Queue</h2>
          <RevisionQueue
            userId={user.id}
            revisions={revisionsDue ?? []}
          />
        </section>
      </div>

      {/* 4. Heatmap */}
      <section aria-label="Activity Heatmap">
        <div className="glass rounded-2xl p-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">Consistency Heatmap</h2>
              <p className="text-xs text-neutral-500 mt-0.5">52 weeks · study hours</p>
            </div>
          </div>
          <HeatmapGrid cells={heatCells} metric="hours" weeks={52} />
        </div>
      </section>

      {/* 5. Today's Analytics (KPIs) */}
      <section id="tour-analytics-kpi" aria-label="Today's overview">
        <h2 className="text-sm font-semibold text-neutral-100 uppercase tracking-wider mb-4">Today&apos;s Analytics</h2>
        <KpiStrip
          userId={user.id}
          dailyTargetHours={profile?.daily_target_hours ?? 8}
          dayBoundaryOffsetMin={profile?.day_boundary_offset_minutes ?? 0}
          timezone={profile?.timezone ?? "Asia/Kolkata"}
        />
      </section>

      {/* 6. Recent Activity (Timesheet) */}
      <section aria-label="Recent Activity">
        <h2 className="text-sm font-semibold text-neutral-100 uppercase tracking-wider mb-4">Timesheet (Last 7 Days)</h2>
        <WeeklyTimesheet sessions={recentSessionsRaw as any ?? []} />
      </section>
    </div>
  );
}

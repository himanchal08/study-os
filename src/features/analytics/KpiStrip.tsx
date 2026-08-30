import { createClient } from "@/lib/supabase/server";
import {
  studyDurationSeconds,
  secondsToHours,
  dayBoundaryAwareDate,
} from "@/lib/calculations";

interface KpiStripProps {
  userId: string;
  dailyTargetHours: number;
  dayBoundaryOffsetMin: number;
  timezone: string;
}

export async function KpiStrip({
  userId,
  dailyTargetHours,
  dayBoundaryOffsetMin,
  timezone,
}: KpiStripProps) {
  const supabase = await createClient();
  const todayStr = dayBoundaryAwareDate(new Date().getTime(), dayBoundaryOffsetMin, timezone);

  // Fetch today's sessions
  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("start_timestamp, end_timestamp, pause_duration_seconds")
    .eq("user_id", userId)
    .gte("start_timestamp", `${todayStr}T00:00:00`)
    .is("deleted_at", null);

  // Compute total study hours today (day-boundary-aware)
  const totalHours = (sessions ?? []).reduce((sum, s) => {
    const secs = studyDurationSeconds(
      s.start_timestamp,
      s.end_timestamp,
      s.pause_duration_seconds
    );
    return sum + secondsToHours(secs);
  }, 0);

  // Fetch today's tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("status")
    .eq("user_id", userId)
    .eq("planned_date", todayStr)
    .is("deleted_at", null);

  const totalTasks = tasks?.length ?? 0;
  const completedTasks = tasks?.filter((t) => t.status === "completed").length ?? 0;

  // Fetch today's question batches
  const { data: batches } = await supabase
    .from("question_batches")
    .select("attempted, correct")
    .eq("user_id", userId)
    .gte("logged_at", `${todayStr}T00:00:00`)
    .is("deleted_at", null);

  const totalAttempted = batches?.reduce((s, b) => s + b.attempted, 0) ?? 0;
  const totalCorrect = batches?.reduce((s, b) => s + b.correct, 0) ?? 0;
  const todayAccuracy =
    totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : null;

  // Fetch revisions due/completed today
  const { data: revisions } = await supabase
    .from("revisions")
    .select("completed_at")
    .eq("user_id", userId)
    .lte("due_date", todayStr);

  const totalRevisionsDue = revisions?.length ?? 0;
  const completedRevisions = revisions?.filter((r) => r.completed_at).length ?? 0;

  const progressPct = Math.min(100, (totalHours / dailyTargetHours) * 100);

  const kpis = [
    {
      id: "kpi-study-hours",
      label: "Study Hours",
      value: `${totalHours.toFixed(1)}h`,
      sub: `/ ${dailyTargetHours}h target`,
      progress: progressPct,
      color: "#6366f1",
    },
    {
      id: "kpi-tasks",
      label: "Tasks",
      value: `${completedTasks}/${totalTasks}`,
      sub: totalTasks === 0 ? "No tasks today" : `${Math.round(totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0)}% done`,
      progress: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      color: "#22c55e",
    },
    {
      id: "kpi-accuracy",
      label: "Accuracy",
      value: todayAccuracy !== null ? `${todayAccuracy.toFixed(0)}%` : "—",
      sub: totalAttempted > 0 ? `${totalAttempted} attempted` : "No questions yet",
      progress: todayAccuracy ?? 0,
      color: "#f59e0b",
    },
    {
      id: "kpi-revisions",
      label: "Revisions",
      value: `${completedRevisions}/${totalRevisionsDue}`,
      sub: totalRevisionsDue === 0 ? "None due" : `${totalRevisionsDue - completedRevisions} remaining`,
      progress: totalRevisionsDue > 0 ? (completedRevisions / totalRevisionsDue) * 100 : 100,
      color: "#06b6d4",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="list" aria-label="Today's KPIs">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          id={kpi.id}
          className="glass rounded-2xl p-4 relative overflow-hidden"
          role="listitem"
        >
          {/* Progress bar (bottom) */}
          <div
            className="absolute bottom-0 left-0 h-0.5 rounded-b-2xl transition-all duration-500"
            style={{
              width: `${kpi.progress}%`,
              background: kpi.color,
              opacity: 0.7,
            }}
            aria-hidden="true"
          />

          <p className="text-xs font-medium mb-2" style={{ color: "rgba(226,226,240,0.45)" }}>
            {kpi.label}
          </p>
          <p
            className="text-2xl font-bold tabular-nums"
            style={{ color: "var(--foreground)" }}
            aria-label={`${kpi.label}: ${kpi.value}`}
          >
            {kpi.value}
          </p>
          <p className="text-xs mt-1" style={{ color: "rgba(226,226,240,0.35)" }}>
            {kpi.sub}
          </p>
        </div>
      ))}
    </div>
  );
}

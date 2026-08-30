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

const kpiConfig = [
  {
    id: "kpi-study-hours",
    label: "Study Hours",
    icon: "⏱",
    accentColor: "#ededed",
    glowColor: "rgba(99,102,241,0.15)",
    borderColor: "rgba(99,102,241,0.2)",
  },
  {
    id: "kpi-tasks",
    label: "Tasks Done",
    icon: "✓",
    accentColor: "#34d399",
    glowColor: "rgba(52,211,153,0.12)",
    borderColor: "rgba(52,211,153,0.18)",
  },
  {
    id: "kpi-accuracy",
    label: "Accuracy",
    icon: "◎",
    accentColor: "#fbbf24",
    glowColor: "rgba(251,191,36,0.12)",
    borderColor: "rgba(251,191,36,0.18)",
  },
  {
    id: "kpi-revisions",
    label: "Revisions",
    icon: "↺",
    accentColor: "#22d3ee",
    glowColor: "rgba(34,211,238,0.12)",
    borderColor: "rgba(34,211,238,0.18)",
  },
  {
    id: "kpi-focus",
    label: "Focus Score",
    icon: "🎯",
    accentColor: "#a855f7",
    glowColor: "rgba(168,85,247,0.12)",
    borderColor: "rgba(168,85,247,0.18)",
  },
];

export async function KpiStrip({
  userId,
  dailyTargetHours,
  dayBoundaryOffsetMin,
  timezone,
}: KpiStripProps) {
  const supabase = await createClient();
  const todayStr = dayBoundaryAwareDate(new Date().getTime(), dayBoundaryOffsetMin, timezone);

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("start_timestamp, end_timestamp, pause_duration_seconds")
    .eq("user_id", userId)
    .gte("start_timestamp", `${todayStr}T00:00:00`)
    .is("deleted_at", null);

  const totalHours = (sessions ?? []).reduce((sum, s) => {
    const secs = studyDurationSeconds(
      s.start_timestamp,
      s.end_timestamp,
      s.pause_duration_seconds
    );
    return sum + secondsToHours(secs);
  }, 0);
  
  const totalStudySeconds = totalHours * 3600;

  const { data: distractions } = await supabase
    .from("browser_events")
    .select("duration_seconds")
    .eq("user_id", userId)
    .gte("timestamp", `${todayStr}T00:00:00`)
    .is("deleted_at", null);

  const totalDistractionSeconds = distractions?.reduce((sum, d) => sum + (d.duration_seconds || 10), 0) ?? 0;
  
  const focusScore = totalStudySeconds > 0 
    ? Math.max(0, ((totalStudySeconds - totalDistractionSeconds) / totalStudySeconds) * 100)
    : 100;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("status")
    .eq("user_id", userId)
    .eq("planned_date", todayStr)
    .is("deleted_at", null);

  const totalTasks = tasks?.length ?? 0;
  const completedTasks = tasks?.filter((t) => t.status === "completed").length ?? 0;

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
      ...kpiConfig[0],
      value: `${totalHours.toFixed(1)}h`,
      sub: `of ${dailyTargetHours}h target`,
      progress: progressPct,
    },
    {
      ...kpiConfig[1],
      value: `${completedTasks}/${totalTasks}`,
      sub: totalTasks === 0
        ? "No tasks today"
        : `${Math.round(totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0)}% complete`,
      progress: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    },
    {
      ...kpiConfig[2],
      value: todayAccuracy !== null ? `${todayAccuracy.toFixed(0)}%` : "—",
      sub: totalAttempted > 0 ? `${totalAttempted} attempted` : "No questions yet",
      progress: todayAccuracy ?? 0,
    },
    {
      ...kpiConfig[3],
      value: `${completedRevisions}/${totalRevisionsDue}`,
      sub: totalRevisionsDue === 0 ? "None due today" : `${totalRevisionsDue - completedRevisions} remaining`,
      progress: totalRevisionsDue > 0 ? (completedRevisions / totalRevisionsDue) * 100 : 100,
    },
    {
      ...kpiConfig[4],
      value: totalStudySeconds > 0 ? `${focusScore.toFixed(0)}%` : "—",
      sub: totalDistractionSeconds > 0 ? `${Math.floor(totalDistractionSeconds/60)}m distracted` : "100% focused",
      progress: focusScore,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" role="list" aria-label="Today's KPIs">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          id={kpi.id}
          className="rounded-2xl p-4 relative overflow-hidden"
          role="listitem"
          style={{
            background: "#111111",
            border: "1px solid var(--border)",
          }}
        >
          {/* Progress bar at bottom */}
          <div
            className="absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-700"
            style={{
              width: `${kpi.progress}%`,
              background: `linear-gradient(90deg, ${kpi.accentColor}88, ${kpi.accentColor})`,
            }}
            aria-hidden="true"
          />

          {/* Icon chip */}
          <div
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3 text-base font-bold"
            style={{
              background: `${kpi.accentColor}18`,
              color: kpi.accentColor,
              border: `1px solid ${kpi.accentColor}30`,
            }}
            aria-hidden="true"
          >
            {kpi.icon}
          </div>

          <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: "rgba(232,232,240,0.4)" }}>
            {kpi.label}
          </p>
          <p
            className="text-2xl font-bold tabular-nums leading-none"
            style={{ color: kpi.accentColor }}
            aria-label={`${kpi.label}: ${kpi.value}`}
          >
            {kpi.value}
          </p>
          <p className="text-[11px] mt-1.5" style={{ color: "rgba(232,232,240,0.35)" }}>
            {kpi.sub}
          </p>
        </div>
      ))}
    </div>
  );
}

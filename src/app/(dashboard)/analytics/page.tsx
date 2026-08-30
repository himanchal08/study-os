import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  dayBoundaryAwareDate,
  studyDurationSeconds,
  secondsToHours,
  groupSessionsByDay,
  timeOfDayBucket,
} from "@/lib/calculations";
import type { Tables } from "@/types/database";
import { StudyTimeChart } from "@/features/analytics/StudyTimeChart";
import { SubjectAllocationChart } from "@/features/analytics/SubjectAllocationChart";
import { TimeOfDayChart } from "@/features/analytics/TimeOfDayChart";
import { TaskPlanningAnalytics } from "@/features/analytics/TaskPlanningAnalytics";

export const metadata: Metadata = { title: "Analytics" };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TOD_CONFIG = [
  { bucket: "early_morning", label: "Early Morning", emoji: "🌅", color: "#fbbf24" },
  { bucket: "morning",       label: "Morning",       emoji: "☀️",  color: "#34d399" },
  { bucket: "afternoon",     label: "Afternoon",     emoji: "🌤",  color: "#ededed" },
  { bucket: "evening",       label: "Evening",       emoji: "🌇",  color: "#fb7185" },
  { bucket: "night",         label: "Night",         emoji: "🌙",  color: "#a78bfa" },
  { bucket: "late_night",    label: "Late Night",    emoji: "🦉",  color: "#22d3ee" },
];

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_target_hours, day_boundary_offset_minutes, timezone")
    .eq("user_id", user.id)
    .single();

  const offsetMin = profile?.day_boundary_offset_minutes ?? 0;
  const timezone  = profile?.timezone ?? "Asia/Kolkata";
  const target    = profile?.daily_target_hours ?? 8;

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const todayStr = dayBoundaryAwareDate(now, offsetMin, timezone);

  type SessionRow = Pick<Tables<"study_sessions">, "start_timestamp" | "end_timestamp" | "pause_duration_seconds" | "subject_id"> & {
    subjects: { id: string; name: string; color: string } | null;
  };

  const { data: rawSessions } = await supabase
    .from("study_sessions")
    .select("start_timestamp, end_timestamp, pause_duration_seconds, subject_id, subjects(id, name, color)")
    .eq("user_id", user.id)
    .gte("start_timestamp", thirtyDaysAgo)
  const sessions = (rawSessions ?? []) as unknown as SessionRow[];

  // Fetch tasks for the last 7 days to show daily completion indicators
  const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
  const { data: rawTasks } = await supabase
    .from("tasks")
    .select("status, planned_date")
    .eq("user_id", user.id)
    .gte("planned_date", sevenDaysAgo.split("T")[0])
    .is("deleted_at", null);

  const tasksMap = new Map<string, { total: number; completed: number }>();
  (rawTasks ?? []).forEach(t => {
    if (!t.planned_date) return;
    const date = t.planned_date;
    if (!tasksMap.has(date)) tasksMap.set(date, { total: 0, completed: 0 });
    const item = tasksMap.get(date)!;
    item.total++;
    if (t.status === "completed") item.completed++;
  });

  const { data: batches } = await supabase
    .from("question_batches")
    .select("attempted, correct, logged_at")
    .eq("user_id", user.id)
    .gte("logged_at", thirtyDaysAgo)
    .is("deleted_at", null);

  const dailyMap = groupSessionsByDay(sessions, offsetMin, timezone);
  const last7: Array<{ date: string; hours: number; target: number; hitTarget: boolean; allTasksDone: boolean }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = dayBoundaryAwareDate(d.getTime(), offsetMin, timezone);
    const hours = dailyMap.get(key) ?? 0;
    const tasksForDay = tasksMap.get(key);
    const allTasksDone = tasksForDay ? tasksForDay.total > 0 && tasksForDay.completed === tasksForDay.total : false;
    last7.push({ date: DAY_LABELS[d.getDay()], hours, target, hitTarget: hours >= target, allTasksDone });
  }

  // Distraction Telemetry (last 30 days)
  const { data: distractionsRaw } = await supabase
    .from("browser_events")
    .select("domain, duration_seconds")
    .eq("user_id", user.id)
    .gte("timestamp", thirtyDaysAgo);

  const domainDistractions = new Map<string, number>();
  let totalDistractionSecs = 0;
  (distractionsRaw ?? []).forEach(d => {
    const domain = d.domain;
    const dur = d.duration_seconds ?? 10;
    domainDistractions.set(domain, (domainDistractions.get(domain) ?? 0) + dur);
    totalDistractionSecs += dur;
  });
  
  const topDistractions = Array.from(domainDistractions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, secs]) => ({ domain, secs }));

  // Subject allocation donut
  const subjectMap = new Map<string, { name: string; color: string; seconds: number }>();
  sessions.forEach((s) => {
    if (!s.end_timestamp || !s.subject_id) return;
    const secs = Math.max(0,
      (new Date(s.end_timestamp).getTime() - new Date(s.start_timestamp).getTime()) / 1000
      - s.pause_duration_seconds
    );
    const sub = s.subjects as { id: string; name: string; color: string } | null;
    if (!subjectMap.has(s.subject_id)) {
      subjectMap.set(s.subject_id, { name: sub?.name ?? "Unknown", color: sub?.color ?? "#ededed", seconds: 0 });
    }
    subjectMap.get(s.subject_id)!.seconds += secs;
  });
  const subjectSlices = Array.from(subjectMap.values())
    .map((v) => ({ name: v.name, hours: secondsToHours(v.seconds), color: v.color }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8);

  // Time-of-day breakdown
  const todMap = new Map<string, number>();
  TOD_CONFIG.forEach((c) => todMap.set(c.bucket, 0));
  sessions.forEach((s) => {
    if (!s.end_timestamp) return;
    const bucket = timeOfDayBucket(new Date(s.start_timestamp).getTime(), timezone);
    const secs = studyDurationSeconds(s.start_timestamp, s.end_timestamp, s.pause_duration_seconds);
    todMap.set(bucket, (todMap.get(bucket) ?? 0) + secs);
  });
  const todData = TOD_CONFIG.map((c) => ({ ...c, hours: secondsToHours(todMap.get(c.bucket) ?? 0) }));

  // Summary stats
  const totalHours7 = last7.reduce((s, d) => s + d.hours, 0);
  const daysStudied7 = last7.filter((d) => d.hours > 0).length;
  const avgBlockSec = sessions.length > 0
    ? sessions.reduce((s, sess) => s + studyDurationSeconds(sess.start_timestamp, sess.end_timestamp, sess.pause_duration_seconds), 0) / sessions.length
    : 0;
  const totalAttempted30 = batches?.reduce((s, b) => s + b.attempted, 0) ?? 0;
  const totalCorrect30   = batches?.reduce((s, b) => s + b.correct, 0)   ?? 0;
  const accuracy30 = totalAttempted30 > 0 ? (totalCorrect30 / totalAttempted30) * 100 : null;
  const qPerHour = totalHours7 > 0 ? totalAttempted30 / totalHours7 : null;

  const summaryCards = [
    { label: "Hours This Week",    value: `${totalHours7.toFixed(1)}h`,                      sub: `${daysStudied7}/7 days active`,           color: "#ededed" },
    { label: "30-Day Accuracy",    value: accuracy30 !== null ? `${accuracy30.toFixed(0)}%` : "—", sub: `${totalAttempted30} questions`,     color: "#fbbf24" },
    { label: "Questions / Hour",   value: qPerHour !== null ? `${qPerHour.toFixed(0)}` : "—", sub: "active practice rate",                  color: "#34d399" },
    { label: "Avg Session",        value: avgBlockSec > 0 ? formatMins(avgBlockSec / 60) : "—", sub: `across ${sessions.length} sessions`, color: "#22d3ee" },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Summary stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div
            key={i}
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: "#111111",
              border: "1px solid var(--border)",
            }}
          >
            <p className="text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: "rgba(232,232,240,0.38)" }}>
              {card.label}
            </p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: card.color }}>{card.value}</p>
            <p className="text-[11px] mt-1" style={{ color: "rgba(232,232,240,0.3)" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      {/* Task & Planning Analytics (Phase 14) */}
      <TaskPlanningAnalytics />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "rgba(232,232,240,0.85)" }}>Daily Study Hours</h2>
              <p className="text-xs mt-0.5 flex items-center gap-2" style={{ color: "rgba(232,232,240,0.35)" }}>
                <span>Last 7 days</span>
                <span>·</span>
                <span className="flex items-center gap-1"><span style={{ color: "#34d399" }}>■</span> target hit</span>
                <span>·</span>
                <span className="flex items-center gap-1"><span style={{ color: "#ededed" }}>■</span> partial</span>
                <span>·</span>
                <span className="flex items-center gap-1">✨ tasks done</span>
              </p>
            </div>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.18)" }}
            >
              {target}h target
            </span>
          </div>
          <StudyTimeChart data={last7} targetHours={target} />
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-1" style={{ color: "rgba(232,232,240,0.85)" }}>Subject Allocation</h2>
          <p className="text-xs mb-4" style={{ color: "rgba(232,232,240,0.35)" }}>30 days</p>
          <SubjectAllocationChart data={subjectSlices} />
        </div>
      </div>

      {/* Time of day & Distractions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-1" style={{ color: "rgba(232,232,240,0.85)" }}>Time-of-Day Study Breakdown</h2>
          <p className="text-xs mb-5" style={{ color: "rgba(232,232,240,0.35)" }}>When you study most — last 30 days</p>
          <TimeOfDayChart data={todData} />
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "rgba(232,232,240,0.85)" }}>Focus & Distractions</h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(232,232,240,0.35)" }}>Top distraction sites — last 30 days</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold tabular-nums" style={{ color: "#ef4444" }}>
                {formatMins(totalDistractionSecs / 60)}
              </span>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500">lost focus</p>
            </div>
          </div>
          
          {topDistractions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-neutral-800 rounded-xl">
              <p className="text-2xl mb-2">🎯</p>
              <p className="text-sm text-neutral-500 font-medium">100% Focused</p>
              <p className="text-xs text-neutral-600 mt-1">No distractions logged</p>
            </div>
          ) : (
            <div className="space-y-3 mt-6">
              {topDistractions.map((d, i) => (
                <div key={d.domain} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-neutral-600">{i + 1}.</span>
                    <span className="text-sm font-medium text-neutral-300">{d.domain}</span>
                  </div>
                  <span className="text-sm font-mono text-neutral-400">{formatMins(d.secs / 60)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer note */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{
          background: "#111111",
          border: "1px solid var(--border)",
        }}
      >
        <p className="text-xs" style={{ color: "rgba(232,232,240,0.5)" }}>
          Today is <span style={{ color: "#ededed" }}>{todayStr}</span> · Live KPIs on Home dashboard
        </p>
        <Link
          href="/"
          className="text-xs px-3 py-1.5 rounded-xl font-semibold transition-all hover:opacity-80"
          style={{ background: "#ededed", color: "#0a0a0a", border: "1px solid #ededed" }}
        >
          Home ↗
        </Link>
      </div>
    </div>
  );
}

function formatMins(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

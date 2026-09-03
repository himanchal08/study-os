import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { dayBoundaryAwareDate } from "@/lib/calculations/time";

export const metadata: Metadata = { title: "Personal Records" };

export default async function RecordsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("day_boundary_offset_minutes, timezone")
    .eq("user_id", user.id)
    .single();

  const offsetMin = profile?.day_boundary_offset_minutes ?? 0;
  const timezone = profile?.timezone ?? "Asia/Kolkata";
  const now = new Date(); 

  
  const { data: mocks } = await supabase
    .from("mocks")
    .select("score, maximum_marks, name, stage")
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(1);

  const bestMock = mocks && mocks.length > 0 ? mocks[0] : null;

  
  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("start_timestamp")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("start_timestamp", { ascending: true });

  let bestStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  if (sessions && sessions.length > 0) {
    
    const dates = new Set(
      sessions.map((s) =>
        dayBoundaryAwareDate(new Date(s.start_timestamp).getTime(), offsetMin, timezone)
      )
    );
    const sortedDates = Array.from(dates).map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());

    for (const d of sortedDates) {
      if (!lastDate) {
        currentStreak = 1;
      } else {
        const diffDays = Math.round((d.getTime() - lastDate.getTime()) / 86400000);
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }
      if (currentStreak > bestStreak) bestStreak = currentStreak;
      lastDate = d;
    }
  }

  
  const { data: batches } = await supabase
    .from("question_batches")
    .select("attempted, logged_at")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  let bestQuestionVolume = 0;
  let bestQuestionDate = "—";
  if (batches && batches.length > 0) {
    const dailyVolume = new Map<string, number>();
    batches.forEach(b => {
      const date = dayBoundaryAwareDate(new Date(b.logged_at).getTime(), offsetMin, timezone);
      dailyVolume.set(date, (dailyVolume.get(date) ?? 0) + b.attempted);
    });
    for (const [date, vol] of Array.from(dailyVolume.entries())) {
      if (vol > bestQuestionVolume) {
        bestQuestionVolume = vol;
        bestQuestionDate = date;
      }
    }
  }

  
  const { data: tasks } = await supabase
    .from("tasks")
    .select("updated_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .is("deleted_at", null);

  let bestTasksCompleted = 0;
  let bestTasksDate = "—";
  if (tasks && tasks.length > 0) {
    const dailyTasks = new Map<string, number>();
    tasks.forEach(t => {
      if (!t.updated_at) return;
      const date = dayBoundaryAwareDate(new Date(t.updated_at).getTime(), offsetMin, timezone);
      dailyTasks.set(date, (dailyTasks.get(date) ?? 0) + 1);
    });
    for (const [date, count] of Array.from(dailyTasks.entries())) {
      if (count > bestTasksCompleted) {
        bestTasksCompleted = count;
        bestTasksDate = date;
      }
    }
  }

  
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString();
  const { data: sessionLog } = await supabase
    .from("study_sessions")
    .select("id, start_timestamp, end_timestamp, pause_duration_seconds, activity_type, notes, subjects(name, color), topics(name)")
    .eq("user_id", user.id)
    .not("end_timestamp", "is", null)
    .is("deleted_at", null)
    .gte("start_timestamp", ninetyDaysAgo)
    .order("start_timestamp", { ascending: false })
    .limit(200);

  
  type SessionEntry = {
    id: string;
    start_timestamp: string;
    end_timestamp: string;
    pause_duration_seconds: number | null;
    activity_type: string;
    notes: string | null;
    subjects: { name: string; color: string | null } | null;
    topics: { name: string } | null;
  };

  
  const allSessions = (sessionLog ?? []) as SessionEntry[];
  const grouped = new Map<string, SessionEntry[]>();
  allSessions.forEach((s) => {
    const dateKey = dayBoundaryAwareDate(new Date(s.start_timestamp).getTime(), offsetMin, timezone);
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(s);
  });
  const groupedDays = Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  function formatDuration(startTs: string, endTs: string, pauseSec: number | null): string {
    const secs = Math.max(0,
      (new Date(endTs).getTime() - new Date(startTs).getTime()) / 1000 - (pauseSec ?? 0)
    );
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function formatTime(ts: string): string {
    return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  const ACTIVITY_COLORS: Record<string, string> = {
    practice: "#818cf8", lecture: "#22d3ee", revision: "#34d399",
    mock: "#f59e0b", reading: "#a78bfa", other: "#52525b",
  };

  const todayStr = dayBoundaryAwareDate(now.getTime(), offsetMin, timezone);

  const records = [
    { title: "Best Study Streak", value: bestStreak > 0 ? `${bestStreak} Days` : "—", sub: "consecutive days", icon: "🔥", color: "#f59e0b" },
    { title: "Highest Mock Score", value: bestMock ? `${bestMock.score}/${bestMock.maximum_marks}` : "—", sub: bestMock ? `${bestMock.name}` : "no mocks logged", icon: "🏆", color: "#818cf8" },
    { title: "Most Practice Qs", value: bestQuestionVolume > 0 ? bestQuestionVolume : "—", sub: bestQuestionVolume > 0 ? `on ${bestQuestionDate}` : "no questions logged", icon: "⚡", color: "#10b981" },
    { title: "Task Master Day", value: bestTasksCompleted > 0 ? bestTasksCompleted : "—", sub: bestTasksCompleted > 0 ? `tasks on ${bestTasksDate}` : "no tasks completed", icon: "✅", color: "#38bdf8" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-20">
      <header>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight mb-1">Records & Session Log</h1>
        <p className="text-sm text-neutral-500">Personal bests + complete session history for the last 90 days.</p>
      </header>

      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {records.map((r, i) => (
          <div key={i} className="glass rounded-xl p-5 flex flex-col justify-between" style={{ minHeight: "140px" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{r.icon}</span>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                {r.title}
              </h2>
            </div>
            <div>
              <p className="text-3xl font-bold mb-1" style={{ color: r.color }}>
                {r.value}
              </p>
              <p className="text-xs text-neutral-500">
                {r.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      
      <section>
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">
          Session Log — Last 90 Days
          <span className="ml-2 text-neutral-600 font-normal normal-case">({allSessions.length} sessions)</span>
        </h2>

        {groupedDays.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-sm text-neutral-500">No completed sessions in the last 90 days.</p>
            <p className="text-xs text-neutral-600 mt-1">Start a study session and stop it — it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedDays.map(([date, daySessions]) => {
              const dayTotal = daySessions.reduce((sum, s) => {
                const secs = Math.max(0,
                  (new Date(s.end_timestamp).getTime() - new Date(s.start_timestamp).getTime()) / 1000
                  - (s.pause_duration_seconds ?? 0)
                );
                return sum + secs;
              }, 0);
              const dayHours = dayTotal / 3600;
              const dateObj = new Date(date);
              const isToday = date === todayStr;

              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-neutral-300">
                        {isToday ? "Today" : dateObj.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                      <span className="text-[10px] text-neutral-600">{daySessions.length} session{daySessions.length !== 1 ? "s" : ""}</span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: dayHours >= 6 ? "#34d399" : dayHours >= 3 ? "#818cf8" : "#52525b" }}>
                      {dayHours.toFixed(1)}h
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {daySessions.map((s) => {
                      const subjectColor = s.subjects?.color ?? "#52525b";
                      const subjectName = s.subjects?.name ?? null;
                      const topicName = s.topics?.name ?? null;
                      const actColor = ACTIVITY_COLORS[s.activity_type] ?? "#52525b";

                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                          style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderLeftWidth: "3px", borderLeftColor: subjectColor }}
                        >
                          <span className="text-[10px] text-neutral-600 tabular-nums shrink-0 w-12">
                            {formatTime(s.start_timestamp)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {subjectName && <span className="text-xs font-medium" style={{ color: subjectColor }}>{subjectName}</span>}
                              {topicName && (
                                <>
                                  <span className="text-neutral-700 text-[10px]">→</span>
                                  <span className="text-xs text-neutral-400">{topicName}</span>
                                </>
                              )}
                              {!subjectName && !topicName && <span className="text-xs text-neutral-600 italic">No tag</span>}
                            </div>
                            {s.notes && <p className="text-[10px] text-neutral-600 truncate mt-0.5">{s.notes}</p>}
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0" style={{ background: `${actColor}18`, color: actColor }}>
                            {s.activity_type}
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-neutral-400 shrink-0">
                            {formatDuration(s.start_timestamp, s.end_timestamp, s.pause_duration_seconds)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

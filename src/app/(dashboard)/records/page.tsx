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

  // 1. Highest Mock Score
  const { data: mocks } = await supabase
    .from("mocks")
    .select("score, maximum_marks, name, stage")
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(1);

  const bestMock = mocks && mocks.length > 0 ? mocks[0] : null;

  // 2. Best Study Streak
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
    // Unique dates
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

  // 3. Highest Question Volume Day
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

  // 4. Most tasks completed in a day
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

  const records = [
    {
      title: "Best Study Streak",
      value: bestStreak > 0 ? `${bestStreak} Days` : "—",
      sub: "consecutive days studying",
      icon: "🔥",
      color: "#f59e0b",
    },
    {
      title: "Highest Mock Score",
      value: bestMock ? `${bestMock.score}/${bestMock.maximum_marks}` : "—",
      sub: bestMock ? `${bestMock.name} (${bestMock.stage})` : "no mocks logged",
      icon: "🏆",
      color: "#818cf8",
    },
    {
      title: "Most Practice Qs",
      value: bestQuestionVolume > 0 ? bestQuestionVolume : "—",
      sub: bestQuestionVolume > 0 ? `on ${bestQuestionDate}` : "no questions logged",
      icon: "⚡",
      color: "#10b981",
    },
    {
      title: "Task Master",
      value: bestTasksCompleted > 0 ? bestTasksCompleted : "—",
      sub: bestTasksCompleted > 0 ? `tasks on ${bestTasksDate}` : "no tasks completed",
      icon: "✅",
      color: "#38bdf8",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      <header>
        <h1 className="text-2xl font-bold gradient-text mb-2">Personal Records</h1>
        <p className="text-sm" style={{ color: "rgba(226,226,240,0.6)" }}>
          Your all-time best milestones and achievements.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="glass rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 mt-8 opacity-80">
        <div className="text-4xl">👑</div>
        <div>
          <h3 className="text-sm font-bold text-white mb-1">More milestones coming soon</h3>
          <p className="text-xs text-neutral-400 max-w-lg">
            As you log more data, this page will expand to include fastest mocks, best sectional scores, and first safety-target crossings. Keep studying!
          </p>
        </div>
      </div>
    </div>
  );
}

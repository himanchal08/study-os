import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { dayBoundaryAwareDate } from "@/lib/calculations";
import { RevisionCard } from "@/features/revisions/RevisionCard";
import { DeleteTopicRevisionsButton } from "@/features/revisions/DeleteTopicRevisionsButton";
import type { Tables } from "@/types/database";

type RevisionRow = Pick<
  Tables<"revisions">,
  "id" | "due_date" | "completed_at" | "cycle_type" | "recall_score" | "grace_window_days"
> & {
  topics: {
    name: string;
    subject_id: string;
    subjects: { name: string; color: string | null } | null;
  } | null;
};

type WeekSession = {
  id: string;
  notes: string | null;
  activity_type: string;
  start_timestamp: string;
  end_timestamp: string | null;
  pause_duration_seconds: number | null;
  topics: { name: string } | null;
  subjects: { name: string; color: string | null } | null;
};

export const metadata: Metadata = { title: "Revision Engine" };

const ACTIVITY_LABELS: Record<string, string> = {
  practice: "Practice",
  lecture:  "Lecture",
  revision: "Revision",
  mock:     "Mock",
  reading:  "Reading",
  other:    "Other",
};

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDuration(
  startISO: string,
  endISO: string | null,
  pauseSec: number | null,
): string {
  if (!endISO) return "";
  const secs = Math.max(
    0,
    (new Date(endISO).getTime() - new Date(startISO).getTime()) / 1000 -
      (pauseSec ?? 0),
  );
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default async function RevisionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("day_boundary_offset_minutes, timezone")
    .eq("user_id", user.id)
    .single();

  const offsetMin = profile?.day_boundary_offset_minutes ?? 0;
  const timezone  = profile?.timezone ?? "Asia/Kolkata";
  const nowMs     = new Date().getTime();
  const todayStr  = dayBoundaryAwareDate(nowMs, offsetMin, timezone);

  // ── Time & day awareness ─────────────────────────────────────────────────
  // Resolve the user's local hour and weekday using their timezone
  const dtParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour:     "numeric",
    hour12:   false,
    weekday:  "long",
  }).formatToParts(new Date());
  const userHour    = parseInt(dtParts.find((p) => p.type === "hour")?.value ?? "0");
  const userWeekday = dtParts.find((p) => p.type === "weekday")?.value ?? "";
  const isAfter8PM  = userHour >= 20;
  const isSunday    = userWeekday === "Sunday";

  // ── Main queries ─────────────────────────────────────────────────────────
  const [{ data: dueRaw }, { data: completedTodayRaw }, { data: historyRaw }] =
    await Promise.all([
      supabase
        .from("revisions")
        .select(
          "id, due_date, completed_at, cycle_type, recall_score, grace_window_days, topics(name, subject_id, subjects(name, color))",
        )
        .eq("user_id", user.id)
        .lte("due_date", todayStr)
        .is("completed_at", null)
        .order("due_date", { ascending: true })
        .limit(200),
      supabase
        .from("revisions")
        .select(
          "id, due_date, completed_at, cycle_type, recall_score, topics(name, subject_id, subjects(name, color))",
        )
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte(
          "completed_at",
          new Date(
            new Date(todayStr + "T00:00:00.000Z").getTime() -
              offsetMin * 60 * 1000,
          ).toISOString(),
        )
        .order("completed_at", { ascending: false })
        .limit(500),
      supabase
        .from("revisions")
        .select(
          "id, topic_id, due_date, completed_at, cycle_type, recall_score, topics(name, subjects(name, color))",
        )
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte("completed_at", new Date(nowMs - 30 * 86400000).toISOString())
        .order("completed_at", { ascending: false })
        .limit(500),
    ]);

  // ── Sunday: fetch this week's sessions (Mon – Sat) for context ───────────
  let weekSessions: WeekSession[] = [];
  if (isSunday) {
    // Approximate Monday = 6 days ago. Sessions are ordered most-recent first.
    const weekStartISO = new Date(nowMs - 6 * 86400000).toISOString();
    const { data: weekData } = await supabase
      .from("study_sessions")
      .select(
        "id, notes, activity_type, start_timestamp, end_timestamp, pause_duration_seconds, topics(name), subjects(name, color)",
      )
      .eq("user_id", user.id)
      .gte("start_timestamp", weekStartISO)
      .is("deleted_at", null)
      .order("start_timestamp", { ascending: false })
      .limit(100);
    weekSessions = (weekData ?? []) as unknown as WeekSession[];
  }

  // ── 30-day history grouping ──────────────────────────────────────────────
  type HistEntry    = { date: string; cycleType: string; recallScore: number | null };
  type TopicHistory = {
    topicId: string;
    topicName: string;
    subjectName: string;
    subjectColor: string;
    entries: HistEntry[];
  };

  const historyByTopic = new Map<string, TopicHistory>();
  (historyRaw ?? []).forEach(
    (r: {
      completed_at: string | null;
      due_date: string;
      cycle_type: string;
      recall_score: number | null;
      topic_id?: string;
      topics?: { name: string; subjects: { name: string; color: string } | null } | null | unknown;
    }) => {
      const topic = r.topics as {
        name: string;
        subjects: { name: string; color: string } | null;
      } | null;
      const key = (r.topic_id as string) ?? topic?.name ?? "Unknown";
      if (!historyByTopic.has(key)) {
        historyByTopic.set(key, {
          topicId:      key,
          topicName:    topic?.name ?? "Unknown",
          subjectName:  topic?.subjects?.name  ?? "",
          subjectColor: topic?.subjects?.color ?? "#52525b",
          entries: [],
        });
      }
      const completedDate = r.completed_at
        ? dayBoundaryAwareDate(
            new Date(r.completed_at).getTime(),
            offsetMin,
            timezone,
          )
        : r.due_date;
      historyByTopic.get(key)!.entries.push({
        date:        completedDate,
        cycleType:   r.cycle_type,
        recallScore: r.recall_score,
      });
    },
  );
  const historyTopics = Array.from(historyByTopic.values());

  // ── Classify due revisions by strict time / day rules ───────────────────
  const allDue = (dueRaw ?? []) as unknown as RevisionRow[];

  // Daily: only show revisions created today, and only after 8 PM
  const dailyDue = isAfter8PM
    ? allDue.filter((r) => r.cycle_type === "daily" && r.due_date === todayStr)
    : [];

  // Weekly: only show this Sunday's revisions, and only on Sundays
  const weeklyDue = isSunday
    ? allDue.filter((r) => r.cycle_type === "weekly" && r.due_date === todayStr)
    : [];

  // Monthly: always show (supports overdue behaviour)
  const monthlyDue = allDue.filter((r) => r.cycle_type === "monthly");
  const monthlyOverdue = monthlyDue.filter((r) => {
    const graceDays = r.grace_window_days ?? 0;
    const deadline  = new Date(r.due_date);
    deadline.setUTCDate(deadline.getUTCDate() + graceDays);
    return deadline.toISOString().split("T")[0] < todayStr;
  });
  const monthlyOnTime = monthlyDue.filter((r) => !monthlyOverdue.includes(r));

  const completed = (completedTodayRaw ?? []) as unknown as RevisionRow[];

  // Helper to render a revision card
  const renderCard = (r: RevisionRow, isOverdue = false) => {
    const topic   = r.topics as {
      name: string;
      subjects: { name: string; color: string | null } | null;
    } | null;
    const subject = topic?.subjects ?? null;
    return (
      <RevisionCard
        key={r.id}
        id={r.id}
        topicName={topic?.name ?? "Unknown topic"}
        subjectName={subject?.name ?? null}
        subjectColor={subject?.color ?? null}
        cycleType={r.cycle_type}
        dueDate={r.due_date}
        isOverdue={isOverdue}
        completedAt={r.completed_at}
      />
    );
  };

  const totalPending = dailyDue.length + weeklyDue.length + monthlyDue.length;

  return (
    <div className="space-y-5 animate-fade-in pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight">
          Revision Engine
        </h1>
        <p className="text-xs mt-1 text-neutral-500">
          Daily after 8 PM · Weekly every Sunday · Monthly adaptive
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "Weekly",
            value: isSunday ? weeklyDue.length : "—",
            color: isSunday
              ? weeklyDue.length > 0 ? "#a78bfa" : "#10b981"
              : "#3f3f46",
            dim: !isSunday,
          },
          {
            label: "Daily",
            value: isAfter8PM ? dailyDue.length : "—",
            color: isAfter8PM
              ? dailyDue.length > 0 ? "#f59e0b" : "#10b981"
              : "#3f3f46",
            dim: !isAfter8PM,
          },
          {
            label: "Done Today",
            value: completed.length,
            color: "#10b981",
            dim: false,
          },
        ].map(({ label, value, color, dim }) => (
          <div
            key={label}
            className="rounded-xl p-3 text-center"
            style={{
              background: "#0a0a0a",
              border: "1px solid #1a1a1a",
              opacity: dim ? 0.45 : 1,
            }}
          >
            <p className="text-[9px] uppercase tracking-wider text-neutral-600 mb-1">
              {label}
            </p>
            <p className="text-lg font-bold tabular-nums" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Monthly overdue ── */}
      {monthlyOverdue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">
            Overdue (Monthly) — {monthlyOverdue.length}
          </p>
          {monthlyOverdue.map((r) => renderCard(r, true))}
        </div>
      )}

      {/* ── Monthly on-time ── */}
      {monthlyOnTime.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Monthly — {monthlyOnTime.length} due
          </p>
          {monthlyOnTime.map((r) => renderCard(r))}
        </div>
      )}

      {/* ── Sunday: week session summary + weekly revision cards ── */}
      {isSunday && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
            Weekly Revision — Sunday
          </h2>

          {/* Week sessions summary */}
          <div
            className="rounded-xl p-4"
            style={{ background: "#0a0a0a", border: "1px solid #27272a" }}
          >
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-3">
              Sessions this week (Mon – Sat)
            </p>
            {weekSessions.length === 0 ? (
              <p className="text-xs text-neutral-600">No sessions recorded this week.</p>
            ) : (
              <div className="space-y-2.5">
                {weekSessions.map((s) => {
                  const subj  = s.subjects as { name: string; color: string | null } | null;
                  const topic = s.topics   as { name: string } | null;
                  const dur   = formatDuration(
                    s.start_timestamp,
                    s.end_timestamp,
                    s.pause_duration_seconds,
                  );
                  const dayLabel = WEEKDAY_NAMES[
                    new Date(s.start_timestamp).getDay()
                  ];
                  return (
                    <div key={s.id} className="flex items-start gap-2.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{ background: subj?.color ?? "#52525b" }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-neutral-200 font-medium truncate">
                            {topic?.name ?? "—"}
                          </span>
                          {subj?.name && (
                            <span className="text-[10px] text-neutral-600">
                              {subj.name}
                            </span>
                          )}
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: "#1a1a1a", color: "#737373" }}
                          >
                            {ACTIVITY_LABELS[s.activity_type] ?? s.activity_type}
                          </span>
                          {dur && (
                            <span className="text-[10px] text-neutral-600">{dur}</span>
                          )}
                        </div>
                        {s.notes && (
                          <p className="text-[10px] text-neutral-600 mt-0.5 truncate">
                            {s.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-700 shrink-0">
                        {dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weekly revision cards */}
          {weeklyDue.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
            >
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm font-medium text-neutral-300">
                All weekly revisions done!
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                See you next Sunday.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {weeklyDue.map((r) => renderCard(r))}
            </div>
          )}
        </section>
      )}

      {/* ── After 8 PM: daily revision cards ── */}
      {isAfter8PM && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
            Tonight&apos;s Review — {dailyDue.length} remaining
          </h2>
          {dailyDue.length === 0 ? (
            <div
              className="rounded-xl p-10 text-center"
              style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
            >
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-sm font-medium text-neutral-300">
                All caught up for tonight!
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                Daily revisions are based on topics you studied today.
              </p>
            </div>
          ) : (
            dailyDue.map((r) => renderCard(r))
          )}
        </section>
      )}

      {/* ── Not Sunday, not yet 8 PM, nothing monthly either ── */}
      {!isSunday && !isAfter8PM && totalPending === 0 && (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
        >
          <p className="text-4xl mb-3">⏰</p>
          <p className="text-sm font-medium text-neutral-300">
            Daily revisions unlock at 8 PM
          </p>
          <p className="text-xs text-neutral-600 mt-1">
            Weekly revisions are shown every Sunday.
          </p>
        </div>
      )}

      {/* ── Completed today ── */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
            Completed today — {completed.length}
          </p>
          {completed.map((r) => renderCard(r))}
        </div>
      )}

      {/* ── 30-Day History ── */}
      {historyTopics.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            30-Day Revision History
          </h2>
          <div className="space-y-2">
            {historyTopics.map((ht) => {
              const withScore = ht.entries.filter((e) => e.recallScore !== null);
              const avgRecall =
                withScore.length > 0
                  ? withScore.reduce((s, e) => s + (e.recallScore ?? 0), 0) /
                    withScore.length
                  : null;
              return (
                <div
                  key={ht.topicId}
                  className="group rounded-xl p-3.5"
                  style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: ht.subjectColor }}
                      />
                      <span className="text-sm font-medium text-neutral-300 truncate">
                        {ht.topicName}
                      </span>
                      <span className="text-[10px] text-neutral-600 shrink-0 hidden sm:inline">
                        {ht.subjectName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-neutral-500">
                      <span>{ht.entries.length}×</span>
                      {avgRecall !== null && (
                        <span
                          style={{
                            color:
                              avgRecall >= 4
                                ? "#34d399"
                                : avgRecall >= 3
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        >
                          {avgRecall.toFixed(1)}/5
                        </span>
                      )}
                      <DeleteTopicRevisionsButton
                        topicId={ht.topicId}
                        topicName={ht.topicName}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {ht.entries.slice(0, 30).map((e, i) => {
                      const dotColor =
                        e.recallScore === null
                          ? "#262626"
                          : e.recallScore <= 2
                            ? "#ef4444"
                            : e.recallScore === 3
                              ? "#f59e0b"
                              : "#34d399";
                      return (
                        <div
                          key={i}
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: dotColor }}
                          title={`${e.date} — ${e.cycleType}${e.recallScore !== null ? ` — ${e.recallScore}/5` : ""}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

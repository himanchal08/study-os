import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { dayBoundaryAwareDate } from "@/lib/calculations";
import { RevisionCard } from "@/features/revisions/RevisionCard";
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

export const metadata: Metadata = { title: "Revision Engine" };

export default async function RevisionsPage() {
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
  const todayStr  = dayBoundaryAwareDate(Date.now(), offsetMin, timezone);

  // Split into two targeted queries so the 100-row limit can't be consumed by
  // old completed revisions, silently dropping today's due items.
  const [{ data: dueRaw }, { data: completedTodayRaw }, { data: historyRaw }] = await Promise.all([
    // Pending revisions due on or before today
    supabase
      .from("revisions")
      .select("id, due_date, completed_at, cycle_type, recall_score, grace_window_days, topics(name, subject_id, subjects(name, color))")
      .eq("user_id", user.id)
      .lte("due_date", todayStr)
      .is("completed_at", null)
      .order("due_date", { ascending: true })
      .limit(100),
    supabase
      .from("revisions")
      .select("id, due_date, completed_at, cycle_type, recall_score, topics(name, subject_id, subjects(name, color))")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .gte("completed_at", new Date(
        new Date(todayStr + "T00:00:00.000Z").getTime() - offsetMin * 60 * 1000
      ).toISOString())
      .order("completed_at", { ascending: false }),
    supabase
      .from("revisions")
      .select("id, topic_id, due_date, completed_at, cycle_type, recall_score, topics(name, subjects(name, color))")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .gte("completed_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .order("completed_at", { ascending: false })
      .limit(500),
  ]);

  type HistEntry    = { date: string; cycleType: string; recallScore: number | null };
  type TopicHistory = { topicName: string; subjectName: string; subjectColor: string; entries: HistEntry[] };

  const historyByTopic = new Map<string, TopicHistory>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (historyRaw ?? []).forEach((r: any) => {
    const topic = r.topics as { name: string; subjects: { name: string; color: string } | null } | null;
    // Key by topic_id (not name) so renames don’t split history and same-named
    // topics in different subjects don’t merge into one group.
    const key = (r.topic_id as string) ?? topic?.name ?? "Unknown";
    if (!historyByTopic.has(key)) {
      historyByTopic.set(key, {
        topicName:    topic?.name ?? "Unknown",
        subjectName:  topic?.subjects?.name  ?? "",
        subjectColor: topic?.subjects?.color ?? "#52525b",
        entries: [],
      });
    }
    // Use boundary-aware date for completed_at so dots appear on the correct
    // local day for IST users who complete revisions past midnight UTC.
    const completedDate = r.completed_at
      ? dayBoundaryAwareDate(new Date(r.completed_at).getTime(), offsetMin, timezone)
      : r.due_date;
    historyByTopic.get(key)!.entries.push({
      date:        completedDate,
      cycleType:   r.cycle_type,
      recallScore: r.recall_score,
    });
  });
  const historyTopics = Array.from(historyByTopic.values());

  const due       = (dueRaw ?? []) as unknown as RevisionRow[];
  const completed = (completedTodayRaw ?? []) as unknown as RevisionRow[];
  // A revision is only truly "overdue" once its grace window has also expired.
  // e.g. a daily revision (grace=1d) due yesterday is still within grace today.
  const overdue   = due.filter(r => {
    const graceDays = r.grace_window_days ?? 0;
    const deadline  = new Date(r.due_date);
    deadline.setUTCDate(deadline.getUTCDate() + graceDays);
    return deadline.toISOString().split("T")[0] < todayStr;
  });

  return (
    <div className="space-y-5 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight">Revision Engine</h1>
        <p className="text-xs mt-1 text-neutral-500">Review what&apos;s due — rate your recall to schedule the next one.</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Due Today", value: due.length,      color: due.length    > 0 ? "#f59e0b" : "#10b981" },
          { label: "Overdue",   value: overdue.length,  color: overdue.length > 0 ? "#ef4444" : "#10b981" },
          { label: "Done",      value: completed.length, color: "#10b981" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-[9px] uppercase tracking-wider text-neutral-600 mb-1">{label}</p>
            <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Due revisions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Due — {due.length} remaining
        </p>

        {due.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-sm font-medium text-neutral-300">All caught up!</p>
            <p className="text-xs text-neutral-600 mt-1">No revisions due today.</p>
          </div>
        ) : (
          due.map(r => {
            const topic   = r.topics as { name: string; subjects: { name: string; color: string | null } | null } | null;
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
                isOverdue={r.due_date < todayStr}
                completedAt={r.completed_at}
              />
            );
          })
        )}
      </div>

      {/* Completed today */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
            Completed today — {completed.length}
          </p>
          {completed.map(r => {
            const topic   = r.topics as { name: string; subjects: { name: string; color: string | null } | null } | null;
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
                isOverdue={false}
                completedAt={r.completed_at}
              />
            );
          })}
        </div>
      )}

      {/* 30-day history */}
      {historyTopics.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            30-Day Revision History
          </h2>
          <div className="space-y-2">
            {historyTopics.map((ht) => {
              const withScore = ht.entries.filter(e => e.recallScore !== null);
              const avgRecall = withScore.length > 0
                ? withScore.reduce((s, e) => s + (e.recallScore ?? 0), 0) / withScore.length
                : null;
              return (
                <div key={ht.topicName} className="rounded-xl p-3.5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ht.subjectColor }} />
                      <span className="text-sm font-medium text-neutral-300 truncate">{ht.topicName}</span>
                      <span className="text-[10px] text-neutral-600 shrink-0 hidden sm:inline">{ht.subjectName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-neutral-500">
                      <span>{ht.entries.length}×</span>
                      {avgRecall !== null && (
                        <span style={{ color: avgRecall >= 4 ? "#34d399" : avgRecall >= 3 ? "#f59e0b" : "#ef4444" }}>
                          {avgRecall.toFixed(1)}/5
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {ht.entries.slice(0, 30).map((e, i) => {
                      const dotColor = e.recallScore === null ? "#262626"
                        : e.recallScore <= 2 ? "#ef4444"
                        : e.recallScore === 3 ? "#f59e0b"
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

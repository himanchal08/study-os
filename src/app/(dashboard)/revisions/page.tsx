import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { dayBoundaryAwareDate } from "@/lib/calculations";
import { RevisionCard } from "@/features/revisions/RevisionCard";
import type { Tables } from "@/types/database";

type RevisionRow = Pick<
  Tables<"revisions">,
  "id" | "due_date" | "completed_at" | "cycle_type" | "recall_score"
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
  const timezone = profile?.timezone ?? "Asia/Kolkata";
  const now = new Date();
  const todayStr = dayBoundaryAwareDate(now.getTime(), offsetMin, timezone);

  const [{ data: revisionsRaw }, { data: historyRaw }] = await Promise.all([
    supabase
      .from("revisions")
      .select("id, due_date, completed_at, cycle_type, recall_score, topics(name, subject_id, subjects(name, color))")
      .eq("user_id", user.id)
      .lte("due_date", todayStr)
      .order("due_date", { ascending: true })
      .limit(100),
    // Revision history — last 30 days of completed revisions for the history panel
    supabase
      .from("revisions")
      .select("id, due_date, completed_at, cycle_type, recall_score, topics(name, subjects(name, color))")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .gte("completed_at", new Date(now.getTime() - 30 * 86400000).toISOString())
      .order("completed_at", { ascending: false })
      .limit(200),
  ]);

  // Group history by topic
  type HistEntry = { date: string; cycleType: string; recallScore: number | null };
  type TopicHistory = { topicName: string; subjectName: string; subjectColor: string; entries: HistEntry[] };
  const historyByTopic = new Map<string, TopicHistory>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (historyRaw ?? []).forEach((r: any) => {
    const topic = r.topics as { name: string; subjects: { name: string; color: string } | null } | null;
    const key = topic?.name ?? "Unknown";
    if (!historyByTopic.has(key)) {
      historyByTopic.set(key, {
        topicName: key,
        subjectName: topic?.subjects?.name ?? "",
        subjectColor: topic?.subjects?.color ?? "#52525b",
        entries: [],
      });
    }
    historyByTopic.get(key)!.entries.push({
      date: r.completed_at ? r.completed_at.split("T")[0] : r.due_date,
      cycleType: r.cycle_type,
      recallScore: r.recall_score,
    });
  });
  const historyTopics = Array.from(historyByTopic.values());

  const revisions = (revisionsRaw ?? []) as unknown as RevisionRow[];

  const due = (revisions ?? []).filter(r => !r.completed_at);
  const completed = (revisions ?? []).filter(r => r.completed_at);
  const overdue = due.filter(r => r.due_date < todayStr);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight mb-1">Revision Engine</h1>
        <p className="text-sm text-neutral-500">Track what needs reviewing and log how well you remembered it.</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Due Today", value: due.length, color: due.length > 0 ? "#f59e0b" : "#10b981" },
          { label: "Overdue", value: overdue.length, color: overdue.length > 0 ? "#ef4444" : "#10b981" },
          { label: "Done Today", value: completed.length, color: "#10b981" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">{label}</p>
            <p className="text-xl font-semibold tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Due list */}
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Due — {due.length} remaining
          </p>

          {due.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-sm font-medium text-neutral-300">All caught up!</p>
              <p className="text-xs text-neutral-600 mt-1">No revisions due today.</p>
            </div>
          ) : (
            due.map(r => {
              const topic = r.topics as { name: string; subjects: { name: string; color: string | null } | null } | null;
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

          {/* Completed today */}
          {completed.length > 0 && (
            <>
              <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider pt-2">
                Completed today — {completed.length}
              </p>
              {completed.map(r => {
                const topic = r.topics as { name: string; subjects: { name: string; color: string | null } | null } | null;
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
            </>
          )}
        </div>
      </div>

      {/* Revision History — Phase 21.3 */}
      {historyTopics.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            30-Day Revision History
          </h2>
          <div className="space-y-2">
            {historyTopics.map((ht) => {
              const avgRecall = ht.entries.filter(e => e.recallScore !== null).length > 0
                ? ht.entries.reduce((s, e) => s + (e.recallScore ?? 0), 0) / ht.entries.filter(e => e.recallScore !== null).length
                : null;
              return (
                <div key={ht.topicName} className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ht.subjectColor }} />
                      <span className="text-sm font-medium text-neutral-300 truncate">{ht.topicName}</span>
                      <span className="text-[10px] text-neutral-600 shrink-0">{ht.subjectName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-neutral-500">
                      <span>{ht.entries.length} session{ht.entries.length !== 1 ? "s" : ""}</span>
                      {avgRecall !== null && (
                        <span style={{ color: avgRecall >= 4 ? "#34d399" : avgRecall >= 3 ? "#f59e0b" : "#ef4444" }}>
                          avg {avgRecall.toFixed(1)}/5
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Recall score dot timeline */}
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    {ht.entries.slice(0, 30).map((e, i) => {
                      const score = e.recallScore;
                      const dotColor = score === null ? "#262626"
                        : score <= 2 ? "#ef4444"
                        : score === 3 ? "#f59e0b"
                        : "#34d399";
                      return (
                        <div
                          key={i}
                          className="w-2.5 h-2.5 rounded-full transition-all"
                          style={{ background: dotColor }}
                          title={`${e.date} — ${e.cycleType}${score !== null ? ` — ${score}/5` : ""}`}
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

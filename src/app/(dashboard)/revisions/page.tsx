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
  // eslint-disable-next-line react-hooks/purity
  const todayStr = dayBoundaryAwareDate(Date.now(), offsetMin, timezone);

  const [{ data: subjectsRaw }, { data: topicsRaw }, { data: revisionsRaw }] = await Promise.all([
    supabase.from("subjects").select("id, name, color").order("name"),
    supabase.from("topics").select("id, name, subject_id").is("archived_at", null).order("name"),
    supabase
      .from("revisions")
      .select("id, due_date, completed_at, cycle_type, recall_score, topics(name, subject_id, subjects(name, color))")
      .eq("user_id", user.id)
      .lte("due_date", todayStr)
      .order("due_date", { ascending: true })
      .limit(100),
  ]);

  const subjects = subjectsRaw ?? [];
  const topics = topicsRaw ?? [];
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
    </div>
  );
}

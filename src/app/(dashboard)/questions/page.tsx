import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { dayBoundaryAwareDate } from "@/lib/calculations";
import { LogBatchForm } from "@/features/questions/LogBatchForm";
import type { Tables } from "@/types/database";

type BatchRow = Pick<
  Tables<"question_batches">,
  "id" | "logged_at" | "attempted" | "correct" | "wrong" | "skipped" | "source" | "notes" | "duration_minutes" | "subject_id" | "topic_id"
> & {
  subjects: { name: string; color: string | null } | null;
  topics: { name: string } | null;
};

export const metadata: Metadata = { title: "Question Practice" };

function AccuracyBar({ correct, attempted }: { correct: number; attempted: number }) {
  const pct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums shrink-0" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default async function QuestionsPage() {
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

  const [{ data: subjectsRaw }, { data: topicsRaw }, { data: batchesRaw }] = await Promise.all([
    supabase.from("subjects").select("id, name, color").order("name"),
    supabase.from("topics").select("id, name, subject_id").is("archived_at", null).order("name"),
    supabase
      .from("question_batches")
      .select("id, logged_at, attempted, correct, wrong, skipped, source, notes, duration_minutes, subject_id, topic_id, subjects(name, color), topics(name)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("logged_at", { ascending: false })
      .limit(50),
  ]);

  const subjects = subjectsRaw ?? [];
  const topics = topicsRaw ?? [];
  const batches = (batchesRaw ?? []) as unknown as BatchRow[];

  
  const todayBatches = (batches ?? []).filter(b => b.logged_at.startsWith(todayStr));
  const totalAttempted = todayBatches.reduce((s, b) => s + b.attempted, 0);
  const totalCorrect = todayBatches.reduce((s, b) => s + b.correct, 0);
  const todayAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight mb-1">Question Practice</h1>
        <p className="text-sm text-neutral-500">Log practice batches and track accuracy over time.</p>
      </div>

      
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Attempted Today", value: totalAttempted || "—" },
          { label: "Correct Today", value: totalCorrect || "—" },
          { label: "Today Accuracy", value: todayAccuracy !== null ? `${todayAccuracy}%` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">{label}</p>
            <p className="text-xl font-semibold text-neutral-100 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1">
          <div className="rounded-xl p-5 sticky top-6" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Log New Batch</p>
            <LogBatchForm subjects={subjects ?? []} topics={topics ?? []} />
          </div>
        </div>

        
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Recent Batches</p>
          {(batches ?? []).length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p className="text-neutral-600 text-sm">No batches logged yet. Log your first practice set.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(batches ?? []).map((b) => {
                const subject = b.subjects as { name: string; color: string | null } | null;
                const topic = b.topics as { name: string } | null;
                const isToday = b.logged_at.startsWith(todayStr);
                return (
                  <div
                    key={b.id}
                    className="rounded-xl p-4"
                    style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {subject && (
                            <span
                              className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                              style={{ background: `${subject.color ?? "#555"}22`, color: subject.color ?? "#aaa" }}
                            >
                              {subject.name}
                            </span>
                          )}
                          {topic && <span className="text-[11px] text-neutral-500">{topic.name}</span>}
                          {b.source && <span className="text-[11px] text-neutral-600">· {b.source}</span>}
                          {isToday && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded text-emerald-400" style={{ background: "#10b98120" }}>
                              today
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-sm tabular-nums">
                        <span className="text-emerald-400 font-medium">{b.correct}</span>
                        <span className="text-neutral-700">/</span>
                        <span className="text-neutral-300">{b.attempted}</span>
                      </div>
                    </div>
                    <AccuracyBar correct={b.correct} attempted={b.attempted} />
                    {b.notes && (
                      <p className="text-xs text-neutral-600 mt-2">{b.notes}</p>
                    )}
                    <p className="text-[10px] text-neutral-700 mt-2">
                      {new Date(b.logged_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {b.duration_minutes ? ` · ${b.duration_minutes} min` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

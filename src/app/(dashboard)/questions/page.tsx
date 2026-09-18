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
      <span className="text-xs tabular-nums shrink-0 font-medium" style={{ color }}>{pct}%</span>
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
  const nowMs    = Date.now();
  const todayStr = dayBoundaryAwareDate(nowMs, offsetMin, timezone);
  const batchWindowStart = new Date(nowMs - 30 * 86400000).toISOString();

  const [{ data: subjectsRaw }, { data: topicsRaw }, { data: batchesRaw }] = await Promise.all([
    supabase.from("subjects").select("id, name, color, exam_type").order("name"),
    supabase.from("topics").select("id, name, subject_id").is("archived_at", null).order("name"),
    supabase
      .from("question_batches")
      .select("id, logged_at, attempted, correct, wrong, skipped, source, notes, duration_minutes, subject_id, topic_id, subjects(name, color), topics(name)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("logged_at", batchWindowStart) // last 30 days
      .order("logged_at", { ascending: false })
      .limit(300),
  ]);

  const subjects = subjectsRaw ?? [];
  const topics   = topicsRaw ?? [];
  const batches  = (batchesRaw ?? []) as unknown as BatchRow[];

  const todayBatches   = batches.filter(b =>
    dayBoundaryAwareDate(new Date(b.logged_at).getTime(), offsetMin, timezone) === todayStr
  );
  const totalAttempted = todayBatches.reduce((s, b) => s + b.attempted, 0);
  const totalCorrect   = todayBatches.reduce((s, b) => s + b.correct, 0);
  const todayAccuracy  = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null;

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight">Question Practice</h1>
        <p className="text-xs mt-1 text-neutral-500">Log batches, track accuracy over time.</p>
      </div>

      {/* Today's stats strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Attempted", value: totalAttempted || "—" },
          { label: "Correct",   value: totalCorrect   || "—" },
          {
            label: "Accuracy",
            value: todayAccuracy !== null ? `${todayAccuracy}%` : "—",
            color: todayAccuracy !== null
              ? todayAccuracy >= 80 ? "#10b981" : todayAccuracy >= 60 ? "#f59e0b" : "#ef4444"
              : undefined,
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-[9px] uppercase tracking-wider text-neutral-600 mb-1">{label}</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: color ?? "#ededed" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Mobile layout: log form always on top, list below */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Log form — full-width on mobile, 2 cols on desktop */}
        <div className="lg:col-span-2">
          <div className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Log New Batch</p>
            <LogBatchForm subjects={subjects} topics={topics} />
          </div>
        </div>

        {/* Batch list — 3 cols on desktop */}
        <div className="lg:col-span-3 space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Recent Batches</p>

          {batches.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p className="text-sm text-neutral-600">No batches yet — log your first set above.</p>
            </div>
          ) : (
            batches.map(b => {
              const subject = b.subjects as { name: string; color: string | null } | null;
              const topic   = b.topics   as { name: string } | null;
              const isToday = dayBoundaryAwareDate(new Date(b.logged_at).getTime(), offsetMin, timezone) === todayStr;
              return (
                <div
                  key={b.id}
                  className="rounded-xl p-3.5"
                  style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {subject && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: `${subject.color ?? "#555"}20`, color: subject.color ?? "#aaa" }}
                        >
                          {subject.name}
                        </span>
                      )}
                      {topic && <span className="text-[10px] text-neutral-500 truncate">{topic.name}</span>}
                      {b.source && <span className="text-[10px] text-neutral-700">· {b.source}</span>}
                      {isToday && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full text-emerald-400" style={{ background: "#10b98118" }}>
                          today
                        </span>
                      )}
                    </div>

                    {/* Score pill */}
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="text-base font-bold tabular-nums text-emerald-400">{b.correct}</span>
                      <span className="text-neutral-700 text-xs">/</span>
                      <span className="text-sm font-semibold tabular-nums text-neutral-300">{b.attempted}</span>
                    </div>
                  </div>

                  <AccuracyBar correct={b.correct} attempted={b.attempted} />

                  {b.notes && <p className="text-xs text-neutral-600 mt-2 leading-relaxed">{b.notes}</p>}

                  <p className="text-[10px] text-neutral-700 mt-2">
                    {new Date(b.logged_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: timezone })}
                    {b.duration_minutes ? ` · ${b.duration_minutes} min` : ""}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


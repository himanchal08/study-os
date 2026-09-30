import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { dayBoundaryAwareDate } from "@/lib/calculations";
import { LogBatchForm } from "@/features/questions/LogBatchForm";
import type { Tables } from "@/types/database";
import { QuestionsClient } from "@/features/questions/QuestionsClient";
import { deduplicateSubjects, deduplicateTopics } from "@/lib/subject-utils";

type BatchRow = Pick<
  Tables<"question_batches">,
  "id" | "logged_at" | "attempted" | "correct" | "wrong" | "skipped" | "source" | "notes" | "duration_minutes" | "subject_id" | "topic_id"
> & {
  subjects: { name: string; color: string | null } | null;
  topics: { name: string } | null;
};

export const metadata: Metadata = { title: "Question Practice" };

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
  const nowMs    = new Date().getTime();
  const todayStr = dayBoundaryAwareDate(nowMs, offsetMin, timezone);
  const batchWindowStart = new Date(nowMs - 30 * 86400000).toISOString();

  const [{ data: subjectsRaw }, { data: topicsRaw }, { data: batchesRaw }, { data: allBatchesRaw }] = await Promise.all([
    supabase.from("subjects").select("id, name, color, exam_type").order("sort_order"),
    supabase.from("topics").select("id, name, subject_id").is("archived_at", null).order("created_at"),
    supabase
      .from("question_batches")
      .select("id, logged_at, attempted, correct, wrong, skipped, source, notes, duration_minutes, subject_id, topic_id, subjects(name, color), topics(name)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("logged_at", batchWindowStart)
      .order("logged_at", { ascending: false })
      .limit(300),
    supabase
      .from("question_batches")
      .select("attempted, correct, subject_id, topic_id, subjects(name, color), topics(name)")
      .eq("user_id", user.id)
      .is("deleted_at", null),
  ]);

  const subjects = deduplicateSubjects(subjectsRaw ?? []);
  const subjectIds = new Set(subjects.map(s => s.id));
  const topics = deduplicateTopics(topicsRaw ?? [], subjectIds);
  const batches    = (batchesRaw ?? []) as unknown as BatchRow[];
  const allBatches = (allBatchesRaw ?? []) as unknown as BatchRow[];

  const todayBatches = batches.filter(b =>
    dayBoundaryAwareDate(new Date(b.logged_at).getTime(), offsetMin, timezone) === todayStr
  );

  const weekStart = dayBoundaryAwareDate(nowMs - 6 * 86400000, offsetMin, timezone);
  const weekBatches = batches.filter(b =>
    dayBoundaryAwareDate(new Date(b.logged_at).getTime(), offsetMin, timezone) >= weekStart
  );

  type TopicStat = { name: string; attempted: number; correct: number };
  type SubjectStat = { name: string; color: string; attempted: number; correct: number; topics: TopicStat[] };
  const subjectMap = new Map<string, SubjectStat>();
  const topicMapBySubject = new Map<string, Map<string, TopicStat>>();

  for (const b of allBatches) {
    const sub = b.subjects as { name: string; color: string | null } | null;
    const top = b.topics as { name: string } | null;

    const key = b.subject_id ?? "__none__";
    const name = sub?.name ?? "No Subject";
    const color = sub?.color ?? "#52525b";

    const topicKey = b.topic_id ?? "__none__";
    const topicName = top?.name ?? "No Topic";

    if (!subjectMap.has(key)) {
      subjectMap.set(key, { name, color, attempted: 0, correct: 0, topics: [] });
      topicMapBySubject.set(key, new Map<string, TopicStat>());
    }

    const entry = subjectMap.get(key)!;
    entry.attempted += b.attempted;
    entry.correct   += b.correct;

    if (b.topic_id || top) {
      const tMap = topicMapBySubject.get(key)!;
      if (!tMap.has(topicKey)) {
        tMap.set(topicKey, { name: topicName, attempted: 0, correct: 0 });
      }
      const tEntry = tMap.get(topicKey)!;
      tEntry.attempted += b.attempted;
      tEntry.correct += b.correct;
    }
  }

  const subjectStats = Array.from(subjectMap.entries())
    .map(([key, stat]) => {
      stat.topics = Array.from(topicMapBySubject.get(key)!.values())
        .filter(t => t.attempted > 0)
        .sort((a, b) => b.attempted - a.attempted);
      return stat;
    })
    .filter(s => s.attempted > 0)
    .sort((a, b) => b.attempted - a.attempted);

  function computeStats(rows: BatchRow[]) {
    const attempted = rows.reduce((s, b) => s + b.attempted, 0);
    const correct   = rows.reduce((s, b) => s + b.correct, 0);
    const accuracy  = attempted > 0 ? Math.round((correct / attempted) * 100) : null;
    return { attempted, correct, accuracy };
  }

  const todayStats = computeStats(todayBatches);
  const weekStats  = computeStats(weekBatches);
  const allStats   = computeStats(allBatches);

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight">Question Practice</h1>
        <p className="text-xs mt-1 text-neutral-500">Log batches, track accuracy over time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Log New Batch</p>
            <LogBatchForm subjects={subjects} topics={topics} />
          </div>
        </div>

        <div className="lg:col-span-3">
          <QuestionsClient
            todayStats={todayStats}
            weekStats={weekStats}
            allStats={allStats}
            subjectStats={subjectStats}
            batches={batches.map(b => ({
              id: b.id,
              logged_at: b.logged_at,
              attempted: b.attempted,
              correct: b.correct,
              source: b.source ?? null,
              notes: b.notes ?? null,
              duration_minutes: b.duration_minutes ?? null,
              subject: b.subjects as { name: string; color: string | null } | null,
              topic: b.topics as { name: string } | null,
            }))}
            todayStr={todayStr}
            offsetMin={offsetMin}
            timezone={timezone}
          />
        </div>
      </div>
    </div>
  );
}

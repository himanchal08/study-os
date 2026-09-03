import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PastYouComparison } from "@/features/analytics/PastYouComparison";
import { studyDurationSeconds } from "@/lib/calculations/time";
import { accuracy } from "@/lib/calculations/questions";

export const metadata: Metadata = { title: "Subject Performance" };

export default async function SubjectPerformancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  
  const [
    { data: subjects },
    { data: topics },
    { data: sessions },
    { data: questionBatches }
  ] = await Promise.all([
    supabase.from("subjects").select("id, name, color").eq("user_id", user.id),
    supabase.from("topics").select("id, subject_id, name").eq("user_id", user.id).is("archived_at", null),
    supabase.from("study_sessions").select("subject_id, start_timestamp, end_timestamp, pause_duration_seconds").eq("user_id", user.id).is("deleted_at", null).not("end_timestamp", "is", null),
    supabase.from("question_batches").select("subject_id, topic_id, correct, attempted, created_at").eq("user_id", user.id)
  ]);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  
  const currentWeekSessions = (sessions ?? []).filter(s => new Date(s.start_timestamp).getTime() >= sevenDaysAgo.getTime());
  const pastWeekSessions = (sessions ?? []).filter(s => new Date(s.start_timestamp).getTime() >= fourteenDaysAgo.getTime() && new Date(s.start_timestamp).getTime() < sevenDaysAgo.getTime());
  
  const currentHours = currentWeekSessions.reduce((acc, s) => acc + studyDurationSeconds(s.start_timestamp, s.end_timestamp!, s.pause_duration_seconds || 0), 0) / 3600;
  const pastHours = pastWeekSessions.reduce((acc, s) => acc + studyDurationSeconds(s.start_timestamp, s.end_timestamp!, s.pause_duration_seconds || 0), 0) / 3600;

  const currentBatches = (questionBatches ?? []).filter(b => new Date(b.created_at) >= sevenDaysAgo);
  const pastBatches = (questionBatches ?? []).filter(b => new Date(b.created_at) >= fourteenDaysAgo && new Date(b.created_at) < sevenDaysAgo);

  const currentAcc = accuracy(
    currentBatches.reduce((sum, b) => sum + b.correct, 0),
    currentBatches.reduce((sum, b) => sum + b.attempted, 0)
  );
  const pastAcc = accuracy(
    pastBatches.reduce((sum, b) => sum + b.correct, 0),
    pastBatches.reduce((sum, b) => sum + b.attempted, 0)
  );

  
  const subjectMap = new Map();
  (subjects ?? []).forEach(s => {
    subjectMap.set(s.id, {
      ...s,
      hours: 0,
      correct: 0,
      attempted: 0,
      topics: []
    });
  });

  (sessions ?? []).forEach(s => {
    if (s.subject_id && subjectMap.has(s.subject_id)) {
      subjectMap.get(s.subject_id).hours += studyDurationSeconds(s.start_timestamp, s.end_timestamp!, s.pause_duration_seconds || 0) / 3600;
    }
  });

  (questionBatches ?? []).forEach(b => {
    if (b.subject_id && subjectMap.has(b.subject_id)) {
      subjectMap.get(b.subject_id).correct += b.correct;
      subjectMap.get(b.subject_id).attempted += b.attempted;
    }
  });

  (topics ?? []).forEach(t => {
    if (t.subject_id && subjectMap.has(t.subject_id)) {
      const topicBatches = (questionBatches ?? []).filter(b => b.topic_id === t.id);
      const tCorrect = topicBatches.reduce((sum, b) => sum + b.correct, 0);
      const tAttempted = topicBatches.reduce((sum, b) => sum + b.attempted, 0);
      subjectMap.get(t.subject_id).topics.push({
        ...t,
        correct: tCorrect,
        attempted: tAttempted,
        acc: accuracy(tCorrect, tAttempted)
      });
    }
  });

  const subjectData = Array.from(subjectMap.values()).sort((a, b) => b.hours - a.hours);

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1 text-sm">
          <Link href="/analytics" className="text-neutral-500 hover:text-neutral-300 transition-colors">Analytics</Link>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-300">Subjects</span>
        </div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight">Subject & Topic Performance</h1>
        <p className="text-sm text-neutral-500">Deep dive into your accuracy and time allocation.</p>
      </div>

      <PastYouComparison 
        currentHours={currentHours} 
        pastHours={pastHours} 
        currentAccuracy={currentAcc} 
        pastAccuracy={pastAcc} 
      />

      <div className="space-y-6">
        {subjectData.map(sub => {
          const subAcc = accuracy(sub.correct, sub.attempted);
          
          const sortedTopics = [...sub.topics].sort((a, b) => {
            if (a.acc === null) return 1;
            if (b.acc === null) return -1;
            return a.acc - b.acc;
          });

          return (
            <div key={sub.id} className="rounded-xl border overflow-hidden" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#1a1a1a" }}>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: sub.color || "#555" }} />
                  <h2 className="font-semibold text-neutral-200">{sub.name}</h2>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Time Spent</p>
                    <p className="font-medium text-neutral-300">{sub.hours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Accuracy</p>
                    <p className="font-medium" style={{ color: subAcc !== null && subAcc >= 80 ? "#10b981" : subAcc !== null && subAcc >= 50 ? "#f59e0b" : "#ef4444" }}>
                      {subAcc !== null ? Math.round(subAcc) + "%" : "--"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-[#050505]">
                <h3 className="text-xs font-medium text-neutral-500 mb-3 uppercase tracking-wider">Topic Breakdown (Weakest First)</h3>
                {sortedTopics.length === 0 ? (
                  <p className="text-xs text-neutral-600 italic">No topics found for this subject.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sortedTopics.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-[#0a0a0a]" style={{ borderColor: "#1a1a1a" }}>
                        <span className="text-xs text-neutral-300 truncate pr-2">{t.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] text-neutral-600">{t.attempted}Q</span>
                          <span className={`text-xs font-bold w-10 text-right ${t.acc !== null && t.acc >= 80 ? 'text-emerald-500' : t.acc !== null && t.acc >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                            {t.acc !== null ? Math.round(t.acc) + '%' : '--'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

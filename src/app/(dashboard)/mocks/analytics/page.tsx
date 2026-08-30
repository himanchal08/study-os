import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { classifyMockPerformance } from "@/lib/calculations/mocks";

export const metadata: Metadata = { title: "Mock Analytics" };

export default async function MockAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: mocks }, { data: exams }] = await Promise.all([
    supabase
      .from("mocks")
      .select("id, name, score, maximum_marks, attempted, correct, actual_duration_minutes, created_at, exam_type")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }), // chronological for trends
    supabase
      .from("exams")
      .select("safety_target_score, maximum_marks")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
  ]);

  const validMocks = (mocks ?? []).filter(m => m.maximum_marks > 0);
  const target = exams?.[0];
  const safetyTargetPct = target && target.maximum_marks && target.safety_target_score && target.maximum_marks > 0 
    ? (target.safety_target_score / target.maximum_marks) * 100 
    : null;

  // 1. Classification Matrix
  const classifications = validMocks.map(m => {
    // We assume recommended minutes is roughly 1 min per question attempted for this basic proxy
    // In a real scenario, this comes from the mock's exam type schema.
    const mockProxy = {
      score: m.score,
      maximumMarks: m.maximum_marks,
      correct: m.correct,
      attempted: m.attempted,
      actualMinutes: m.actual_duration_minutes,
      recommendedMinutes: m.maximum_marks, // Assuming 1 mark = 1 minute roughly for basic analysis
      highMarksThresholdPct: 60,
      highAccuracyThreshold: 80,
    };
    return {
      mock: m,
      classification: classifyMockPerformance(mockProxy),
    };
  });

  const matrix = {
    A: classifications.filter(c => c.classification?.case === "A"), // Accurate but Slow
    B: classifications.filter(c => c.classification?.case === "B"), // Fast but Inaccurate
    C: classifications.filter(c => c.classification?.case === "C"), // Low Marks + Low Accuracy + Slow
    D: classifications.filter(c => c.classification?.case === "D"), // Accurate but Under-Attempted
  };

  // 2. Trend Data (Last 20 mocks)
  const recentMocks = validMocks.slice(-20);
  const maxScoreScale = Math.max(100, ...recentMocks.map(m => (m.score / m.maximum_marks) * 100));

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1 text-sm">
            <Link href="/mocks" className="text-neutral-500 hover:text-neutral-300 transition-colors">Mocks</Link>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-300">Analytics</span>
          </div>
          <h1 className="text-xl font-semibold text-neutral-100 tracking-tight">Speed vs. Accuracy</h1>
          <p className="text-sm text-neutral-500">Decision matrix based on your historical mock tests.</p>
        </div>
      </div>

      {recentMocks.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <p className="text-neutral-500 text-sm">Log some mock tests to see your performance matrix.</p>
        </div>
      ) : (
        <>
          {/* Trend Chart */}
          <div className="rounded-xl p-6 relative" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <h2 className="text-sm font-semibold text-neutral-300 mb-6 uppercase tracking-wider">Score Trend (Last {recentMocks.length})</h2>
            <div className="h-48 flex items-end gap-2 sm:gap-4 w-full px-2 relative">
              {/* Safety Target Line */}
              {safetyTargetPct !== null && (
                <div 
                  className="absolute w-full border-t border-dashed border-emerald-500/50 z-0 pointer-events-none"
                  style={{ bottom: `${(safetyTargetPct / maxScoreScale) * 100}%` }}
                >
                  <span className="absolute -top-4 right-0 text-[10px] text-emerald-400 font-medium">
                    Safety Target
                  </span>
                </div>
              )}
              {recentMocks.map((m, i) => {
                const scorePct = (m.score / m.maximum_marks) * 100;
                const accPct = m.attempted > 0 ? (m.correct / m.attempted) * 100 : 0;
                const height = `${(scorePct / maxScoreScale) * 100}%`;
                return (
                  <div key={m.id} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-12 bg-neutral-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {m.name}<br/>Score: {scorePct.toFixed(1)}% | Acc: {accPct.toFixed(1)}%
                    </div>
                    {/* Bar */}
                    <div className="w-full relative rounded-t-sm transition-all" style={{ height, background: "#262626" }}>
                      {/* Accuracy marker overlay */}
                      <div className="absolute bottom-0 w-full rounded-t-sm opacity-50" style={{ height: `${accPct}%`, background: "#38bdf8" }} />
                    </div>
                    {/* Label */}
                    <span className="text-[9px] text-neutral-600 mt-2 truncate w-full text-center">#{i + 1}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-6 pt-4 border-t" style={{ borderColor: "#1a1a1a" }}>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#262626]" /><span className="text-xs text-neutral-500">Score %</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded opacity-50 bg-accent-sky" /><span className="text-xs text-neutral-500">Accuracy %</span></div>
              {safetyTargetPct !== null && (
                <div className="flex items-center gap-1.5"><div className="w-3 border-t-2 border-dashed border-emerald-500/50" /><span className="text-xs text-neutral-500">Safety Target</span></div>
              )}
            </div>
          </div>

          {/* Decision Matrix */}
          <div>
            <h2 className="text-sm font-semibold text-neutral-300 mb-4 uppercase tracking-wider">Diagnostic Matrix</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { case: "A", title: "Accurate but Slow", desc: "Speed bottleneck — knowledge is solid", color: "#3b82f6", bg: "#3b82f615", data: matrix.A },
                { case: "B", title: "Fast but Inaccurate", desc: "Rushing risk — speed is high, selection is poor", color: "#ef4444", bg: "#ef444415", data: matrix.B },
                { case: "D", title: "Under-Attempted", desc: "Strategy issue — accurate but skipping too much", color: "#f59e0b", bg: "#f59e0b15", data: matrix.D },
                { case: "C", title: "Knowledge Gap", desc: "Low marks, low accuracy, slow execution", color: "#64748b", bg: "#1a1a1a", data: matrix.C },
              ].map((q) => (
                <div key={q.case} className="rounded-xl p-5 border" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: q.color }}>{q.title}</h3>
                      <p className="text-xs text-neutral-500 mt-1">{q.desc}</p>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: q.color }}>{q.data.length}</div>
                  </div>
                  {q.data.length > 0 ? (
                    <div className="space-y-1.5 mt-4">
                      {q.data.map(c => (
                        <div key={c.mock.id} className="text-xs flex items-center justify-between px-2 py-1.5 rounded bg-white/2">
                          <span className="text-neutral-400 truncate pr-2">{c.mock.name}</span>
                          <span className="text-neutral-600 shrink-0">{c.mock.score} / {c.mock.maximum_marks}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-700 mt-4 italic">No mocks in this quadrant.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

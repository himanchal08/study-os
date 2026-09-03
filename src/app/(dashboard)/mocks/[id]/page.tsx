import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { analyzeSections } from "@/lib/mockAnalysis";
import { LogMockSectionForm } from "@/features/mocks/LogMockSectionForm";

export const metadata: Metadata = { title: "Mock Detail" };

export default async function MockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: mock } = await supabase
    .from("mocks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!mock) notFound();

  const { data: rawSections } = await supabase
    .from("mock_sections")
    .select("*")
    .eq("mock_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const sections = analyzeSections(
    rawSections ?? [],
    mock.maximum_marks,
    mock.recommended_duration_minutes
  );

  const accuracy =
    mock.attempted > 0 ? ((mock.correct / mock.attempted) * 100).toFixed(1) : "—";
  const percentScore = ((mock.score / mock.maximum_marks) * 100).toFixed(1);

  const hasTimingData = sections.some((s) => s.durationMinutes !== null);
  const hasAccurateSlow = sections.some((s) => s.flag === "accurate_but_slow");
  const hasSlowInaccurate = sections.some((s) => s.flag === "slow_and_inaccurate");
  const hasFastInaccurate = sections.some((s) => s.flag === "fast_but_inaccurate");

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-3xl mx-auto">
      
      <Link
        href="/mocks"
        className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1"
      >
        ← Back to Mocks
      </Link>

      
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight">{mock.name}</h1>
        <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500 flex-wrap">
          <span>{mock.mock_date}</span>
          <span>·</span>
          <span>{mock.source}</span>
          <span>·</span>
          <span className="capitalize">{mock.exam_type}</span>
          {mock.stage && <><span>·</span><span>{mock.stage}</span></>}
        </div>
      </div>

      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Score", value: `${mock.score}/${mock.maximum_marks}`, sub: `${percentScore}%`, color: Number(percentScore) >= 75 ? "#34d399" : Number(percentScore) >= 50 ? "#f59e0b" : "#ef4444" },
          { label: "Accuracy", value: `${accuracy}%`, sub: `${mock.correct}/${mock.attempted} correct`, color: "#818cf8" },
          { label: "Time Taken", value: `${mock.actual_duration_minutes}m`, sub: mock.recommended_duration_minutes ? `of ${mock.recommended_duration_minutes}m rec.` : "no target set", color: "#22d3ee" },
          { label: "Percentile", value: mock.percentile ? `${mock.percentile.toFixed(1)}%ile` : "—", sub: mock.rank ? `Rank #${mock.rank}` : "rank not set", color: "#fbbf24" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">{label}</p>
            <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
            <p className="text-[10px] text-neutral-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      
      {hasTimingData && (hasAccurateSlow || hasSlowInaccurate || hasFastInaccurate) && (
        <div className="rounded-xl p-4 space-y-2" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Diagnosis</p>
          {hasAccurateSlow && (
            <div className="flex items-start gap-2 text-sm" style={{ color: "#f59e0b" }}>
              <span className="mt-0.5">⚠️</span>
              <p>You are <strong>accurate but slow</strong> in some sections. Your strategy is correct but you need to improve speed — more timed drills on those sections.</p>
            </div>
          )}
          {hasFastInaccurate && (
            <div className="flex items-start gap-2 text-sm" style={{ color: "#fb923c" }}>
              <span className="mt-0.5">⚠️</span>
              <p>You are <strong>rushing in some sections</strong> and making errors. Slow down, read questions carefully — accuracy before speed.</p>
            </div>
          )}
          {hasSlowInaccurate && (
            <div className="flex items-start gap-2 text-sm" style={{ color: "#ef4444" }}>
              <span className="mt-0.5">🚨</span>
              <p>You are <strong>slow AND inaccurate</strong> in some sections - these need immediate focused study. Review fundamentals.</p>
            </div>
          )}
        </div>
      )}

      
      <div>
        <h2 className="text-sm font-semibold text-neutral-300 mb-3">Sectional Breakdown</h2>
        <div className="rounded-xl p-5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <LogMockSectionForm mockId={id} sections={sections} />
        </div>
      </div>

      
      {mock.notes && (
        <div className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-2">Notes</p>
          <p className="text-sm text-neutral-400 leading-relaxed">{mock.notes}</p>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { dayBoundaryAwareDate } from "@/lib/calculations";
import { LogMockForm } from "@/features/mocks/LogMockForm";

export const metadata: Metadata = { title: "Mock Tests" };

function ScoreBadge({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="text-right">
      <p className="text-lg font-bold tabular-nums" style={{ color }}>{score}</p>
      <p className="text-[10px] text-neutral-600">/ {max} ({pct}%)</p>
    </div>
  );
}

const EXAM_COLORS: Record<string, { text: string; bg: string }> = {
  banking: { text: "#38bdf8", bg: "#38bdf820" },
  ssc: { text: "#a78bfa", bg: "#a78bfa20" },
  other: { text: "#f59e0b", bg: "#f59e0b20" },
};

export default async function MocksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("day_boundary_offset_minutes, timezone, exam_targets")
    .eq("user_id", user.id)
    .single();

  const offsetMin = profile?.day_boundary_offset_minutes ?? 0;
  const timezone = profile?.timezone ?? "Asia/Kolkata";
  // eslint-disable-next-line react-hooks/purity
  const todayStr = dayBoundaryAwareDate(Date.now(), offsetMin, timezone);
  const defaultExamType = (profile?.exam_targets?.[0] as "banking" | "ssc") ?? "banking";

  const { data: mocks } = await supabase
    .from("mocks")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("mock_date", { ascending: false })
    .limit(50);

  // Summary stats
  const allMocks = mocks ?? [];
  const avgScore = allMocks.length > 0
    ? allMocks.reduce((s, m) => s + (m.score / m.maximum_marks) * 100, 0) / allMocks.length
    : null;
  const bestPct = allMocks.length > 0
    ? Math.max(...allMocks.map(m => (m.score / m.maximum_marks) * 100))
    : null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100 tracking-tight mb-1">Mock Tests</h1>
          <p className="text-sm text-neutral-500">Log and track your full-length mock test performance.</p>
        </div>
        <Link 
          href="/mocks/analytics"
          className="text-xs px-3 py-1.5 rounded-lg border font-medium hover:bg-white hover:text-black transition-colors"
          style={{ borderColor: "#262626", color: "#ededed" }}
        >
          View Analytics
        </Link>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Mocks", value: allMocks.length || "—" },
          { label: "Avg Score", value: avgScore !== null ? `${avgScore.toFixed(1)}%` : "—" },
          { label: "Best Score", value: bestPct !== null ? `${bestPct.toFixed(1)}%` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">{label}</p>
            <p className="text-xl font-semibold text-neutral-100 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* History */}
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Mock History</p>
          {allMocks.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p className="text-neutral-600 text-sm">No mocks logged yet. Log your first mock test.</p>
            </div>
          ) : (
            allMocks.map(m => {
              const examStyle = EXAM_COLORS[m.exam_type] ?? EXAM_COLORS.other;
              const accuracy = m.attempted > 0 ? Math.round((m.correct / m.attempted) * 100) : 0;
              return (
                <div key={m.id} className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-200 truncate">{m.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: examStyle.bg, color: examStyle.text }}>
                          {m.exam_type}
                        </span>
                        {m.stage && (
                          <span className="text-[10px] text-neutral-600">{m.stage}</span>
                        )}
                        <span className="text-[10px] text-neutral-600">{m.source}</span>
                        <span className="text-[10px] text-neutral-700">{m.mock_date}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                        <span>✓ {m.correct}</span>
                        <span>✗ {m.wrong}</span>
                        <span>— {m.unattempted}</span>
                        <span className="text-neutral-600">·</span>
                        <span>{accuracy}% acc</span>
                        {m.percentile && <span className="text-emerald-400">{m.percentile.toFixed(1)}%ile</span>}
                      </div>
                    </div>
                    <ScoreBadge score={m.score} max={m.maximum_marks} />
                  </div>
                  {m.notes && (
                    <p className="text-xs text-neutral-600 mt-2 border-t pt-2" style={{ borderColor: "#1a1a1a" }}>
                      {m.notes}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Log form */}
        <div>
          <div className="rounded-xl p-5 sticky top-6" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Log New Mock</p>
            <LogMockForm defaultDate={todayStr} defaultExamType={defaultExamType} />
          </div>
        </div>
      </div>
    </div>
  );
}

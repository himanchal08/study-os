import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { dayBoundaryAwareDate } from "@/lib/calculations";
import { LogMockForm } from "@/features/mocks/LogMockForm";
import { MocksClient } from "@/features/mocks/MocksClient";

export const metadata: Metadata = { title: "Mock Tests" };

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
  const todayStr = dayBoundaryAwareDate(new Date().getTime(), offsetMin, timezone);
  const defaultExamType = (profile?.exam_targets?.[0] as "banking" | "ssc") ?? "banking";

  const { data: mocks } = await supabase
    .from("mocks")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("mock_date", { ascending: false })
    .limit(50);

  const allMockIds = (mocks ?? []).map(m => m.id);
  const { data: sectionsRaw } = allMockIds.length > 0
    ? await supabase
        .from("mock_sections")
        .select("mock_id, duration_minutes")
        .in("mock_id", allMockIds)
        .eq("user_id", user.id)
    : { data: [] };

  const sectionCountMap: Record<string, number> = {};
  (sectionsRaw ?? []).forEach(s => {
    sectionCountMap[s.mock_id] = (sectionCountMap[s.mock_id] ?? 0) + 1;
  });

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
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Mock History</p>
          <MocksClient mocks={allMocks} sectionCountMap={sectionCountMap} />
        </div>

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

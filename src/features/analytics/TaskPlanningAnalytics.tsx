import { createClient } from "@/lib/supabase/server";

export async function TaskPlanningAnalytics() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("status, planned_date, updated_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .not("planned_date", "is", null);

  const validTasks = tasks ?? [];

  
  const currentTasks = validTasks.filter(t => new Date(t.planned_date!) >= sevenDaysAgo);
  const currentPlanned = currentTasks.length;
  const currentCompleted = currentTasks.filter(t => t.status === "completed").length;
  const currentPostponed = currentTasks.filter(t => t.status === "postponed").length;

  const currentCompletionRate = currentPlanned > 0 ? (currentCompleted / currentPlanned) * 100 : null;
  const currentPostponementRate = currentPlanned > 0 ? (currentPostponed / currentPlanned) * 100 : null;

  
  const pastTasks = validTasks.filter(t => new Date(t.planned_date!) >= fourteenDaysAgo && new Date(t.planned_date!) < sevenDaysAgo);
  const pastPlanned = pastTasks.length;
  const pastCompleted = pastTasks.filter(t => t.status === "completed").length;
  const pastPostponed = pastTasks.filter(t => t.status === "postponed").length;

  const pastCompletionRate = pastPlanned > 0 ? (pastCompleted / pastPlanned) * 100 : null;
  const pastPostponementRate = pastPlanned > 0 ? (pastPostponed / pastPlanned) * 100 : null;

  const compDiff = currentCompletionRate !== null && pastCompletionRate !== null ? currentCompletionRate - pastCompletionRate : 0;
  const postDiff = currentPostponementRate !== null && pastPostponementRate !== null ? currentPostponementRate - pastPostponementRate : 0;

  return (
    <div className="glass rounded-2xl p-5 mt-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "rgba(232,232,240,0.85)" }}>Task & Planning Analytics</h2>
        <p className="text-xs mt-0.5" style={{ color: "rgba(232,232,240,0.35)" }}>Are you over-planning your days?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
          <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-semibold">Completion Rate (7d)</p>
          <div className="flex items-end gap-3">
            <span className="text-2xl font-bold text-emerald-400 tabular-nums">{currentCompletionRate !== null ? Math.round(currentCompletionRate) + "%" : "--"}</span>
            {currentCompletionRate !== null && pastCompletionRate !== null && (
              <span className={`text-xs font-medium mb-1 ${compDiff >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {compDiff >= 0 ? "+" : ""}{Math.round(compDiff)}% vs last week
              </span>
            )}
          </div>
          <p className="text-[10px] text-neutral-600 mt-2">Target: &gt;80%. You completed {currentCompleted} out of {currentPlanned} planned tasks.</p>
        </div>

        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
          <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-semibold">Postponement Rate (7d)</p>
          <div className="flex items-end gap-3">
            <span className="text-2xl font-bold text-rose-400 tabular-nums">{currentPostponementRate !== null ? Math.round(currentPostponementRate) + "%" : "--"}</span>
            {currentPostponementRate !== null && pastPostponementRate !== null && (
              <span className={`text-xs font-medium mb-1 ${postDiff <= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {postDiff > 0 ? "+" : ""}{Math.round(postDiff)}% vs last week
              </span>
            )}
          </div>
          <p className="text-[10px] text-neutral-600 mt-2">Target: &lt;10%. High postponement means you are packing too much into a single day.</p>
        </div>
      </div>
    </div>
  );
}

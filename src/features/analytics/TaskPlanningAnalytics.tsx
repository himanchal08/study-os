import { createClient } from "@/lib/supabase/server";

export async function TaskPlanningAnalytics() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("timezone, daily_questions_cap").eq("user_id", user.id).single();
  const tz = profile?.timezone || "Asia/Kolkata";
  const dailyQuestionsCap = profile?.daily_questions_cap ?? 250;
  
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const toUserYYYYMMDD = (d: Date) => {
    const parts = formatter.formatToParts(d);
    return `${parts.find(p => p.type === "year")?.value}-${parts.find(p => p.type === "month")?.value}-${parts.find(p => p.type === "day")?.value}`;
  };

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  const sevenDaysAgoStr = toUserYYYYMMDD(sevenDaysAgo);
  const fourteenDaysAgoStr = toUserYYYYMMDD(fourteenDaysAgo);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("status, planned_date, updated_at, questions_count, actual_questions_count")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .not("planned_date", "is", null)
    .gte("planned_date", fourteenDaysAgoStr);

  const validTasks = tasks ?? [];

  
  const currentTasks = validTasks.filter(t => t.planned_date! >= sevenDaysAgoStr);
  const currentPlanned = currentTasks.length;
  const currentCompleted = currentTasks.filter(t => t.status === "completed").length;
  const currentPostponed = currentTasks.filter(t => t.status === "postponed").length;
  const currentTotalQuestions = currentTasks.reduce((sum, t) => sum + (t.questions_count || 0), 0);
  const currentTotalActualQuestions = currentTasks.reduce((sum, t) => sum + (t.actual_questions_count || 0), 0);

  const currentCompletionRate = currentPlanned > 0 ? (currentCompleted / currentPlanned) * 100 : null;
  const currentPostponementRate = currentPlanned > 0 ? (currentPostponed / currentPlanned) * 100 : null;
  const currentDailyQuestionsAvg = Math.round(currentTotalQuestions / 7);
  const currentDailyActualQuestionsAvg = Math.round(currentTotalActualQuestions / 7);

  
  const pastTasks = validTasks.filter(t => t.planned_date! >= fourteenDaysAgoStr && t.planned_date! < sevenDaysAgoStr);
  const pastPlanned = pastTasks.length;
  const pastCompleted = pastTasks.filter(t => t.status === "completed").length;
  const pastPostponed = pastTasks.filter(t => t.status === "postponed").length;
  const pastTotalQuestions = pastTasks.reduce((sum, t) => sum + (t.questions_count || 0), 0);

  const pastCompletionRate = pastPlanned > 0 ? (pastCompleted / pastPlanned) * 100 : null;
  const pastPostponementRate = pastPlanned > 0 ? (pastPostponed / pastPlanned) * 100 : null;
  const pastDailyQuestionsAvg = Math.round(pastTotalQuestions / 7);

  const compDiff = currentCompletionRate !== null && pastCompletionRate !== null ? currentCompletionRate - pastCompletionRate : 0;
  const postDiff = currentPostponementRate !== null && pastPostponementRate !== null ? currentPostponementRate - pastPostponementRate : 0;
  const questionsDiff = currentDailyQuestionsAvg - pastDailyQuestionsAvg;

  return (
    <div className="glass rounded-2xl p-5 mt-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "rgba(232,232,240,0.85)" }}>Task & Planning Analytics</h2>
        <p className="text-xs mt-0.5" style={{ color: "rgba(232,232,240,0.35)" }}>Are you over-planning your days?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
          <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-semibold">Avg Daily Questions (7d)</p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-xl md:text-2xl font-bold text-neutral-100">
              {currentDailyActualQuestionsAvg} <span className="text-sm font-normal text-neutral-400">/ {currentDailyQuestionsAvg}</span>
            </span>
            {questionsDiff !== 0 && (
              <span className={`text-[10px] font-medium ml-1 px-1.5 py-0.5 rounded-sm ${questionsDiff > 0 ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                {questionsDiff > 0 ? "↑" : "↓"} {Math.abs(questionsDiff)}
              </span>
            )}
          </div>
          <p className="text-[10px] text-neutral-600 mt-2">Target: {dailyQuestionsCap} qs/day. {currentDailyQuestionsAvg > dailyQuestionsCap ? "You might be over-planning!" : currentDailyActualQuestionsAvg < currentDailyQuestionsAvg * 0.8 ? "Falling behind planned questions." : "Optimal pacing."}</p>
        </div>
      </div>
    </div>
  );
}

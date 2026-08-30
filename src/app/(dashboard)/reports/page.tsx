import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { dayBoundaryAwareDate, secondsToHours, studyDurationSeconds } from "@/lib/calculations";

export const metadata: Metadata = { title: "Weekly Report" };

type StrategicState =
  | "weak_under_studied"
  | "weak_adequately_studied"
  | "strong_over_studied"
  | "strong_appropriately_studied";

interface TopicDiagnosis {
  topicId: string;
  topicName: string;
  subjectName: string;
  subjectColor: string;
  hoursSpent: number;
  timeSharePct: number;
  accuracy: number | null;   // null = no practice data
  attempted: number;
  strategicState: StrategicState | "no_data";
  recommendation: string;
  stateLabel: string;
  stateColor: string;
}

const STATE_META: Record<StrategicState, { label: string; color: string; recommendation: string }> = {
  weak_under_studied: {
    label: "Weak + Under-Studied",
    color: "#ef4444",
    recommendation: "⬆️ Increase time allocation. You are not putting in enough time here and it shows.",
  },
  weak_adequately_studied: {
    label: "Weak + Adequately Studied",
    color: "#f97316",
    recommendation: "🔍 Investigate your strategy. You are spending time but not improving — review your approach, not just the quantity.",
  },
  strong_over_studied: {
    label: "Strong + Over-Studied",
    color: "#a78bfa",
    recommendation: "⬇️ Reduce maintenance time. You are past the point of diminishing returns — redirect these hours elsewhere.",
  },
  strong_appropriately_studied: {
    label: "Strong + Appropriate",
    color: "#34d399",
    recommendation: "✅ Maintain current pacing. This topic is healthy — don't change what's working.",
  },
};

const ADEQUATE_TIME_PCT = 5;   // > 5% of weekly time = adequately studied
const OVER_STUDIED_PCT = 15;   // > 15% = over-studied
const STRONG_ACCURACY = 75;    // >= 75% accuracy = strong

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("day_boundary_offset_minutes, timezone")
    .eq("user_id", user.id)
    .single();

  const offsetMin = profile?.day_boundary_offset_minutes ?? 0;
  const timezone = profile?.timezone ?? "Asia/Kolkata";

  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();
  const todayStr = dayBoundaryAwareDate(now, offsetMin, timezone);

  // Fetch sessions with topic + subject info
  const { data: rawSessions } = await supabase
    .from("study_sessions")
    .select("start_timestamp, end_timestamp, pause_duration_seconds, topic_id, topics(name, subjects(name, color))")
    .eq("user_id", user.id)
    .gte("start_timestamp", thirtyDaysAgo)
    .is("deleted_at", null)
    .not("end_timestamp", "is", null);

  // Fetch practice batches with topic info
  const { data: rawBatches } = await supabase
    .from("question_batches")
    .select("attempted, correct, topic_id")
    .eq("user_id", user.id)
    .gte("logged_at", thirtyDaysAgo)
    .is("deleted_at", null);

  // Aggregate time per topic
  type TopicInfo = { name: string; subjectName: string; subjectColor: string; seconds: number };
  const topicTimeMap = new Map<string, TopicInfo>();

  let totalSeconds = 0;

  (rawSessions ?? []).forEach((s: any) => {
    if (!s.end_timestamp || !s.topic_id) return;
    const secs = studyDurationSeconds(s.start_timestamp, s.end_timestamp, s.pause_duration_seconds);
    totalSeconds += secs;

    const topic = s.topics as { name: string; subjects: { name: string; color: string } | null } | null;
    const topicName = topic?.name ?? "Unknown";
    const subjectName = topic?.subjects?.name ?? "Unknown";
    const subjectColor = topic?.subjects?.color ?? "#52525b";

    if (!topicTimeMap.has(s.topic_id)) {
      topicTimeMap.set(s.topic_id, { name: topicName, subjectName, subjectColor, seconds: 0 });
    }
    topicTimeMap.get(s.topic_id)!.seconds += secs;
  });

  // Aggregate accuracy per topic from practice batches
  type PracticeData = { attempted: number; correct: number };
  const topicPracticeMap = new Map<string, PracticeData>();

  (rawBatches ?? []).forEach((b: any) => {
    if (!b.topic_id) return;
    if (!topicPracticeMap.has(b.topic_id)) {
      topicPracticeMap.set(b.topic_id, { attempted: 0, correct: 0 });
    }
    const p = topicPracticeMap.get(b.topic_id)!;
    p.attempted += b.attempted;
    p.correct += b.correct;
  });

  // Build diagnosis for each topic that has study time
  const diagnoses: TopicDiagnosis[] = [];

  topicTimeMap.forEach((info, topicId) => {
    const hours = secondsToHours(info.seconds);
    const timeSharePct = totalSeconds > 0 ? (info.seconds / totalSeconds) * 100 : 0;

    const practice = topicPracticeMap.get(topicId);
    const accuracy = practice && practice.attempted > 0
      ? (practice.correct / practice.attempted) * 100
      : null;
    const attempted = practice?.attempted ?? 0;

    let strategicState: StrategicState | "no_data";

    if (accuracy === null) {
      // No practice data — only classify by time
      strategicState = timeSharePct < ADEQUATE_TIME_PCT ? "weak_under_studied" : "no_data";
    } else {
      const isStrong = accuracy >= STRONG_ACCURACY;
      const isOverStudied = timeSharePct > OVER_STUDIED_PCT;
      const isUnderStudied = timeSharePct < ADEQUATE_TIME_PCT;

      if (!isStrong && isUnderStudied) {
        strategicState = "weak_under_studied";
      } else if (!isStrong && !isUnderStudied) {
        strategicState = "weak_adequately_studied";
      } else if (isStrong && isOverStudied) {
        strategicState = "strong_over_studied";
      } else {
        strategicState = "strong_appropriately_studied";
      }
    }

    const meta = strategicState !== "no_data" ? STATE_META[strategicState] : {
      label: "📊 No Practice Data",
      color: "#52525b",
      recommendation: "Log question batches for this topic to enable accuracy diagnosis.",
    };

    diagnoses.push({
      topicId,
      topicName: info.name,
      subjectName: info.subjectName,
      subjectColor: info.subjectColor,
      hoursSpent: hours,
      timeSharePct,
      accuracy,
      attempted,
      strategicState,
      recommendation: meta.recommendation,
      stateLabel: meta.label,
      stateColor: meta.color,
    });
  });

  // Sort: worst first (weak_under_studied, weak_adequately, strong_over, strong_appropriate, no_data)
  const ORDER: Record<string, number> = {
    weak_under_studied: 0,
    weak_adequately_studied: 1,
    slow_and_inaccurate: 2,
    strong_over_studied: 3,
    strong_appropriately_studied: 4,
    no_data: 5,
  };
  diagnoses.sort((a, b) => (ORDER[a.strategicState] ?? 5) - (ORDER[b.strategicState] ?? 5));

  const groupedByState = {
    weak_under_studied: diagnoses.filter((d) => d.strategicState === "weak_under_studied"),
    weak_adequately_studied: diagnoses.filter((d) => d.strategicState === "weak_adequately_studied"),
    strong_over_studied: diagnoses.filter((d) => d.strategicState === "strong_over_studied"),
    strong_appropriately_studied: diagnoses.filter((d) => d.strategicState === "strong_appropriately_studied"),
    no_data: diagnoses.filter((d) => d.strategicState === "no_data"),
  };

  const totalHours = secondsToHours(totalSeconds);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight mb-1">
          Weekly Diagnosis Report
        </h1>
        <p className="text-sm text-neutral-500">
          Based on 30 days of data · {todayStr} · {totalHours.toFixed(1)}h total study time analyzed
        </p>
      </div>

      {diagnoses.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <p className="text-sm text-neutral-400">No study sessions with topics found in the last 30 days.</p>
          <p className="text-xs text-neutral-600 mt-1">Tag your timer sessions with a topic to enable diagnosis.</p>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Study Time", value: `${totalHours.toFixed(1)}h`, color: "#ededed" },
              { label: "Topics Studied", value: diagnoses.length, color: "#818cf8" },
              { label: "🚨 Need Attention", value: groupedByState.weak_under_studied.length + groupedByState.weak_adequately_studied.length, color: "#ef4444" },
              { label: "✅ On Track", value: groupedByState.strong_appropriately_studied.length, color: "#34d399" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
                <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">{label}</p>
                <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* State Groups */}
          {(Object.entries(groupedByState) as [string, TopicDiagnosis[]][])
            .filter(([, items]) => items.length > 0)
            .map(([state, items]) => {
              const meta = state !== "no_data"
                ? STATE_META[state as StrategicState]
                : { label: "No Practice Data", color: "#52525b", recommendation: "" };
              return (
                <section key={state}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                    <h2 className="text-sm font-semibold text-neutral-200">{meta.label}</h2>
                    <span className="text-xs text-neutral-600">({items.length} topic{items.length !== 1 ? "s" : ""})</span>
                  </div>

                  <div className="space-y-2">
                    {items.map((d) => (
                      <div
                        key={d.topicId}
                        className="rounded-xl p-4"
                        style={{ background: "#0a0a0a", border: `1px solid ${d.stateColor}30` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.subjectColor }} />
                              <span className="text-sm font-medium text-neutral-200 truncate">{d.topicName}</span>
                            </div>
                            <p className="text-xs text-neutral-600 mt-0.5 ml-3.5">{d.subjectName}</p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 text-right">
                            <div>
                              <p className="text-sm font-semibold tabular-nums text-neutral-300">{d.hoursSpent.toFixed(1)}h</p>
                              <p className="text-[10px] text-neutral-600">{d.timeSharePct.toFixed(1)}% of time</p>
                            </div>
                            {d.accuracy !== null && (
                              <div>
                                <p className="text-sm font-semibold tabular-nums" style={{ color: d.accuracy >= 75 ? "#34d399" : "#ef4444" }}>
                                  {d.accuracy.toFixed(0)}%
                                </p>
                                <p className="text-[10px] text-neutral-600">{d.attempted} qs</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div
                          className="mt-3 pt-3 border-t text-xs italic"
                          style={{ borderColor: "#1a1a1a", color: "rgba(232,232,240,0.45)" }}
                        >
                          {d.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
        </>
      )}

      <div className="rounded-xl p-4 text-xs text-neutral-600" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        <strong className="text-neutral-500">How this works:</strong> The engine categorizes each topic by crossing your time allocation (% of total study hours) against your practice accuracy (from question batches). Topics with no accuracy data can only be partially diagnosed. To get full diagnosis, log question batches from the <a href="/questions" className="text-neutral-400 underline hover:text-neutral-200">Questions page</a>.
      </div>
    </div>
  );
}

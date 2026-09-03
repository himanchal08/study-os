import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  classifyMockPerformance,
  dayBoundaryAwareDate,
  mockAccuracy,
} from "@/lib/calculations";
import {
  syllabusCompletionPct,
  examWiseCoverage,
  computeOnTrackStatus,
  computeReadinessScore,
  detectWeakAreas,
  generateNextActions,
  KNOWN_EXAM_DATES,
  REFERENCE_CUTOFFS,
} from "@/lib/calculations/performance";
import { RealExamResultForm } from "@/features/performance/RealExamResultForm";
import { LifecyclePanel } from "@/features/performance/LifecyclePanel";

export const metadata: Metadata = { title: "Performance & Readiness" };

// ─── Colours ──────────────────────────────────────────────────────────────────
const EXAM_COLORS = {
  banking: { text: "#38bdf8", bg: "#38bdf815", border: "#38bdf830" },
  ssc:     { text: "#a78bfa", bg: "#a78bfa15", border: "#a78bfa30" },
  other:   { text: "#f59e0b", bg: "#f59e0b15", border: "#f59e0b30" },
};

const ON_TRACK_COLORS = {
  ahead:            { text: "#34d399", bg: "#34d39915", icon: "🚀", label: "Ahead of Schedule" },
  on_track:         { text: "#22d3ee", bg: "#22d3ee15", icon: "✅", label: "On Track" },
  behind:           { text: "#ef4444", bg: "#ef444415", icon: "⚠️", label: "Behind Schedule" },
  insufficient_data:{ text: "#a1a1aa", bg: "#a1a1aa10", icon: "📊", label: "Insufficient Data" },
};

const READINESS_COLORS: Record<string, string> = {
  "Not Ready":      "#ef4444",
  "Getting There":  "#f97316",
  "On Track":       "#f59e0b",
  "Almost Ready":   "#22d3ee",
  "Ready":          "#34d399",
};

const URGENCY_COLORS = {
  critical: { text: "#ef4444", bg: "#ef444415", border: "#ef444430" },
  high:     { text: "#f97316", bg: "#f9731615", border: "#f9731630" },
  medium:   { text: "#f59e0b", bg: "#f59e0b15", border: "#f59e0b30" },
};

const ACTION_ICONS: Record<string, string> = {
  study:    "📚",
  practice: "✏️",
  revise:   "↺",
  mock:     "📊",
  pyq:      "🏛",
};



function pctColor(pct: number) {
  return pct >= 75 ? "#34d399" : pct >= 50 ? "#f59e0b" : "#ef4444";
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function PerformancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("day_boundary_offset_minutes, timezone, exam_targets, daily_target_hours")
    .eq("user_id", user.id)
    .single();

  const offsetMin = profile?.day_boundary_offset_minutes ?? 0;
  const timezone = profile?.timezone ?? "Asia/Kolkata";
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const todayStr = dayBoundaryAwareDate(now, offsetMin, timezone);

  // ── Parallel data fetches ──────────────────────────────────────────────────
  const thirtyDaysAgo   = new Date(now - 30 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(now - 14 * 86400000).toISOString();
  const prevFourteen    = new Date(now - 28 * 86400000).toISOString();
  const sevenDaysAgo    = new Date(now - 7 * 86400000).toISOString();
  const ninety          = new Date(now - 90 * 86400000).toISOString();

  const [
    { data: subjectsRaw, error: subjectsError },
    { data: topicsRaw, error: topicsError },
    { data: chaptersRaw, error: chaptersError },
    { data: topicExamMapRaw, error: temError },
    { data: lifecycleRaw },
    { data: batchesAll },
    { data: batchesLast14 },
    { data: batchesPrev14 },
    { data: batchesLast7 },
    { data: batchesLast30 },
    { data: mocksRaw },
    { data: revisionsDue30Raw },
    { data: revisionsCompleted30Raw },
    { data: revisionsOverdue },
    { data: examsRaw },
    { data: mockSectionsRaw },
    { data: sessionsEarliest },
    { data: realExamResultsRaw },
  ] = await Promise.all([
    supabase.from("subjects").select("id, name, color, exam_type").eq("user_id", user.id).is("deleted_at", null),
    supabase.from("topics").select("id, name, status, subject_id, chapter_id, pyq_frequency_weight").eq("user_id", user.id).is("deleted_at", null).is("archived_at", null),
    supabase.from("chapters").select("id, subject_id, name, sort_order").eq("user_id", user.id).is("deleted_at", null).order("sort_order"),
    supabase.from("topic_exam_map").select("topic_id, exam_type, priority").eq("user_id", user.id),
    supabase.from("topic_lifecycle").select("*").eq("user_id", user.id),
    supabase.from("question_batches").select("attempted, correct, topic_id, subject_id").eq("user_id", user.id).is("deleted_at", null),
    supabase.from("question_batches").select("attempted, correct").eq("user_id", user.id).gte("logged_at", fourteenDaysAgo).is("deleted_at", null),
    supabase.from("question_batches").select("attempted, correct").eq("user_id", user.id).gte("logged_at", prevFourteen).lt("logged_at", fourteenDaysAgo).is("deleted_at", null),
    supabase.from("question_batches").select("attempted").eq("user_id", user.id).gte("logged_at", sevenDaysAgo).is("deleted_at", null),
    supabase.from("question_batches").select("attempted, correct").eq("user_id", user.id).gte("logged_at", thirtyDaysAgo).is("deleted_at", null),
    supabase.from("mocks").select("*").eq("user_id", user.id).is("deleted_at", null).order("mock_date", { ascending: false }).limit(20),
    supabase.from("revisions").select("id").eq("user_id", user.id).lte("due_date", todayStr).gte("due_date", new Date(now - 30 * 86400000).toISOString().split("T")[0]),
    supabase.from("revisions").select("id").eq("user_id", user.id).lte("due_date", todayStr).gte("due_date", new Date(now - 30 * 86400000).toISOString().split("T")[0]).not("completed_at", "is", null),
    supabase.from("revisions").select("id, topic_id, due_date, topics(name)").eq("user_id", user.id).lt("due_date", todayStr).is("completed_at", null).order("due_date", { ascending: true }).limit(15),
    supabase.from("exams").select("*").eq("user_id", user.id).is("deleted_at", null),
    supabase.from("mock_sections").select("name, attempted, correct").eq("user_id", user.id).gte("created_at", ninety),
    supabase.from("study_sessions").select("start_timestamp").eq("user_id", user.id).is("deleted_at", null).order("start_timestamp", { ascending: true }).limit(1),
    supabase.from("real_exam_results").select("*").eq("user_id", user.id).order("exam_date", { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjects = (subjectsRaw as any[]) ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topics = (topicsRaw as any[]) ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chapters = (chaptersRaw as any[]) ?? [];

  if (temError || subjectsError || topicsError || chaptersError) {
    console.error("Supabase Fetch Errors:");
    if (temError) console.error("temError:", temError.message, temError.code, temError.details);
    if (subjectsError) console.error("subjectsError:", subjectsError.message, subjectsError.code, subjectsError.details);
    if (topicsError) console.error("topicsError:", topicsError.message, topicsError.code, topicsError.details);
    if (chaptersError) console.error("chaptersError:", chaptersError.message, chaptersError.code, chaptersError.details);
  }

  // ── topic_exam_map → per-exam topic ID sets ──────────────────────────────────
  const bankingTopicIdSet = new Set<string>();
  const sscTopicIdSet = new Set<string>();
  // Also build a full map: topic_id → exam_types[] for the LifecyclePanel
  const topicExamRecord: Record<string, string[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((topicExamMapRaw as any[]) ?? []).forEach((row) => {
    if (row.exam_type === "banking") bankingTopicIdSet.add(row.topic_id);
    if (row.exam_type === "ssc")     sscTopicIdSet.add(row.topic_id);
    if (!topicExamRecord[row.topic_id]) topicExamRecord[row.topic_id] = [];
    topicExamRecord[row.topic_id].push(row.exam_type);
  });

  const lifecycleMap = new Map(
    (lifecycleRaw ?? []).map((l) => [l.topic_id, l])
  );
  const mocks = mocksRaw ?? [];
  const exams = examsRaw ?? [];
  const realExamResults = (realExamResultsRaw ?? []) as Array<{
    id: string; exam_name: string; exam_type: "banking"|"ssc"|"other";
    stage: string|null; exam_date: string; total_score: number; total_max: number;
    subject_breakdown: Array<{subject_name:string;marks_scored:number;marks_available:number}>|null;
    cutoff_used: number|null; notes: string|null;
  }>;

  // ── Syllabus stats ──────────────────────────────────────────────────────────
  const overallPct = syllabusCompletionPct(topics);
  const bankingPct = examWiseCoverage(topics, subjects, "banking");
  const sscPct     = examWiseCoverage(topics, subjects, "ssc");

  const totalTopics = topics.length;
  const completedTopics = topics.filter(
    (t) => t.status === "learned" || t.status === "strong"
  ).length;

  // ── Questions stats ─────────────────────────────────────────────────────────
  const totalQuestionsAllTime = (batchesAll ?? []).reduce((s, b) => s + b.attempted, 0);
  const questionsLast7 = (batchesLast7 ?? []).reduce((s, b) => s + b.attempted, 0);

  const last14Att  = (batchesLast14 ?? []).reduce((s, b) => s + b.attempted, 0);
  const last14Cor  = (batchesLast14 ?? []).reduce((s, b) => s + b.correct, 0);
  const prev14Att  = (batchesPrev14 ?? []).reduce((s, b) => s + b.attempted, 0);
  const prev14Cor  = (batchesPrev14 ?? []).reduce((s, b) => s + b.correct, 0);
  const acc14  = last14Att  > 0 ? (last14Cor  / last14Att)  * 100 : null;
  const accPrev= prev14Att  > 0 ? (prev14Cor  / prev14Att)  * 100 : null;
  const att30  = (batchesLast30 ?? []).reduce((s, b) => s + b.attempted, 0);
  const cor30  = (batchesLast30 ?? []).reduce((s, b) => s + b.correct,   0);
  const acc30  = att30 > 0 ? (cor30 / att30) * 100 : null;

  // ── Mock stats ──────────────────────────────────────────────────────────────
  const last5Mocks = mocks.slice(0, 5);
  const last5AvgPct = last5Mocks.length > 0
    ? last5Mocks.reduce((s, m) => s + (m.score / m.maximum_marks) * 100, 0) / last5Mocks.length
    : null;

  const daysSinceLastMock = mocks.length > 0
    ? Math.floor((now - new Date(mocks[0].mock_date).getTime()) / 86400000)
    : null;

  // Speed discipline: mocks where actual ≤ recommended
  const mocksWithRec = mocks.filter((m) => m.recommended_duration_minutes != null);
  const speedDisciplinePct = mocksWithRec.length > 0
    ? (mocksWithRec.filter((m) => m.actual_duration_minutes <= m.recommended_duration_minutes!).length / mocksWithRec.length) * 100
    : null;

  // ── Revision stats ──────────────────────────────────────────────────────────
  const due30 = (revisionsDue30Raw ?? []).length;
  const completed30 = (revisionsCompleted30Raw ?? []).length;
  const adherence30 = due30 > 0 ? Math.round((completed30 / due30) * 100) : null;
  const overdueRevisions = (revisionsOverdue ?? []) as Array<{
    id: string; topic_id: string; due_date: string;
    topics: { name: string } | null;
  }>;
  const overdueTopicNames = overdueRevisions.map((r) => r.topics?.name ?? "Unknown");

  // ── Mock section accuracy map (for weak area corroboration) ────────────────
  const mockSectionAccMap = new Map<string, { attempted: number; correct: number }>();
  (mockSectionsRaw ?? []).forEach((ms: { name: string; attempted: number; correct: number }) => {
    const key = ms.name.toLowerCase().trim();
    if (!mockSectionAccMap.has(key)) mockSectionAccMap.set(key, { attempted: 0, correct: 0 });
    const d = mockSectionAccMap.get(key)!;
    d.attempted += ms.attempted;
    d.correct += ms.correct;
  });

  // ── Per-topic practice aggregation (for weak areas) ────────────────────────
  type TopicPractice = {
    topicId: string; topicName: string; subjectName: string; subjectColor: string;
    attempted: number; correct: number; pyqWeight: number | null;
  };
  const topicPracticeMap = new Map<string, TopicPractice>();
  const topicLookup = new Map(topics.map((t) => [t.id, t]));
  const subjectLookup = new Map(subjects.map((s) => [s.id, s]));

  (batchesAll ?? []).forEach((b: { attempted: number; correct: number; topic_id: string | null }) => {
    if (!b.topic_id) return;
    const topic = topicLookup.get(b.topic_id);
    if (!topic) return;
    const subject = subjectLookup.get(topic.subject_id);
    if (!topicPracticeMap.has(b.topic_id)) {
      topicPracticeMap.set(b.topic_id, {
        topicId: b.topic_id,
        topicName: topic.name,
        subjectName: subject?.name ?? "Unknown",
        subjectColor: subject?.color ?? "#52525b",
        attempted: 0,
        correct: 0,
        pyqWeight: topic.pyq_frequency_weight,
      });
    }
    const p = topicPracticeMap.get(b.topic_id)!;
    p.attempted += b.attempted;
    p.correct += b.correct;
  });

  // ── PYQ coverage ───────────────────────────────────────────────────────────
  const learnedTopicIds = topics
    .filter((t) => t.status === "learned" || t.status === "strong")
    .map((t) => t.id);
  const pyqDoneCount = learnedTopicIds.filter(
    (id) => lifecycleMap.get(id)?.pyq_done
  ).length;
  const pyqCoveragePct = learnedTopicIds.length > 0
    ? Math.round((pyqDoneCount / learnedTopicIds.length) * 100)
    : null;

  // ── Exam date (nearest upcoming) ───────────────────────────────────────────
  const upcomingExams = exams.filter(
    (e) => e.exam_date && new Date(e.exam_date) > new Date()
  ).sort((a, b) => new Date(a.exam_date!).getTime() - new Date(b.exam_date!).getTime());
  const nearestExam = upcomingExams[0] ?? null;
  const examDate = nearestExam?.exam_date ?? null;

  // If no exam date set by user, use known reference dates — pick the NEAREST upcoming one
  const defaultExamType = (profile?.exam_targets?.[0] as "banking" | "ssc") ?? "banking";
  const knownFallback = KNOWN_EXAM_DATES
    .filter((e) => e.examType === defaultExamType && new Date(e.estimatedDate) > new Date())
    .sort((a, b) => new Date(a.estimatedDate).getTime() - new Date(b.estimatedDate).getTime())[0] ?? null;

  const effectiveExamDate = examDate ?? knownFallback?.estimatedDate ?? null;
  const daysRemaining = effectiveExamDate
    ? Math.max(0, Math.ceil((new Date(effectiveExamDate).getTime() - now) / 86400000))
    : null;

  // ── Study start ─────────────────────────────────────────────────────────────
  const studyStartDate =
    (sessionsEarliest ?? [])[0]?.start_timestamp?.split("T")[0] ?? null;

  // ── On Track ────────────────────────────────────────────────────────────────
  const onTrack = computeOnTrackStatus({
    studyStartDate,
    examDate: effectiveExamDate,
    totalTopics,
    completedTopics,
    questionsLast7Days: questionsLast7,
    pyqCoveragePct: pyqCoveragePct,
    accuracyLast14: acc14,
    accuracyPrev14: accPrev,
    mockScoreLast3Avg: mocks.slice(0, 3).length === 3
      ? mocks.slice(0, 3).reduce((s, m) => s + (m.score / m.maximum_marks) * 100, 0) / 3
      : null,
    mockScorePrev3Avg: mocks.slice(3, 6).length === 3
      ? mocks.slice(3, 6).reduce((s, m) => s + (m.score / m.maximum_marks) * 100, 0) / 3
      : null,
    revisionsCompleted30: completed30,
    revisionsDue30: due30,
  });

  // ── Readiness Score ─────────────────────────────────────────────────────────
  const readiness = computeReadinessScore({
    syllabusCompletionPct: overallPct,
    totalQuestionsAllTime,
    pyqCoveragePct,
    last5MockAvgPct: last5AvgPct,
    accuracy30Day: acc30,
    revisionAdherence30: adherence30,
    speedDisciplinePct,
    accuracyTrend: onTrack.accuracyTrend,
    mockTrend: onTrack.mockTrend,
  });

  // ── Practice map as plain object for client component ──────────────────────
  const practiceMapObj: Record<string, { attempted: number; correct: number }> = {};
  topicPracticeMap.forEach((v, k) => {
    practiceMapObj[k] = { attempted: v.attempted, correct: v.correct };
  });

  // ── Weak Areas ──────────────────────────────────────────────────────────────
  const weakAreas = detectWeakAreas({
    topicPractice: Array.from(topicPracticeMap.values()),
    mockSectionAccMap,
    minSampleSize: 10,
  });

  // ── Topics pending PYQ (learned but pyq_done=false) ────────────────────────
  const pyqPendingTopics = learnedTopicIds
    .filter((id) => !lifecycleMap.get(id)?.pyq_done)
    .map((id) => topicLookup.get(id)?.name ?? "")
    .filter(Boolean)
    .slice(0, 10);

  // ── Unstarted topics ────────────────────────────────────────────────────────
  const unstartedTopics = topics
    .filter((t) => t.status === "not_started")
    .map((t) => t.name)
    .slice(0, 5);

  // ── Next Actions ────────────────────────────────────────────────────────────
  const nextActions = generateNextActions({
    onTrack,
    weakAreas,
    overdueRevisionCount: overdueRevisions.length,
    overdueRevisionTopicNames: overdueTopicNames,
    daysSinceLastMock,
    unstartedTopics,
    pyqPendingTopics,
    notStartedTopicsCount: topics.filter((t) => t.status === "not_started").length,
  });

  // ── Subject-wise progress ──────────────────────────────────────────────────
  const subjectProgress = subjects.map((s) => {
    const subTopics = topics.filter((t) => t.subject_id === s.id);
    const done = subTopics.filter((t) => t.status === "learned" || t.status === "strong").length;
    const pct = subTopics.length > 0 ? Math.round((done / subTopics.length) * 100) : 0;
    const practice = Array.from(topicPracticeMap.values()).filter((p) => {
      const topic = topicLookup.get(p.topicId);
      return topic?.subject_id === s.id;
    });
    const totalAtt = practice.reduce((a, p) => a + p.attempted, 0);
    const totalCor = practice.reduce((a, p) => a + p.correct, 0);
    const acc = totalAtt >= 10 ? (totalCor / totalAtt) * 100 : null;
    return { ...s, subTopics, done, pct, accuracy: acc, totalAttempted: totalAtt };
  }).sort((a, b) => a.pct - b.pct); // worst first

  // ── Mock per exam type ──────────────────────────────────────────────────────
  const bankingMocks = mocks.filter((m) => m.exam_type === "banking").slice(0, 5);
  const sscMocks = mocks.filter((m) => m.exam_type === "ssc").slice(0, 5);

  // ── Real exam weakness corroboration ───────────────────────────────────────
  const lastRealExam = realExamResults[0] ?? null;
  const realWeakSubjects = lastRealExam?.subject_breakdown
    ?.filter((s) => s.marks_available > 0 && (s.marks_scored / s.marks_available) < 0.65)
    .sort((a, b) => a.marks_scored / a.marks_available - b.marks_scored / b.marks_available)
    ?? [];

  const onTrackCfg = ON_TRACK_COLORS[onTrack.status];
  const readinessColor = READINESS_COLORS[readiness.label] ?? "#ededed";

  return (
    <div className="space-y-8 animate-fade-in pb-16">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100 tracking-tight mb-1">
            Performance & Readiness
          </h1>
          <p className="text-sm text-neutral-500">
            Exam-wise coverage · topic lifecycle · on-track analysis · readiness score
          </p>
        </div>
        {daysRemaining !== null && (
          <div
            className="rounded-xl px-4 py-3 text-right shrink-0"
            style={{ background: daysRemaining < 30 ? "#ef444415" : "#0a0a0a", border: `1px solid ${daysRemaining < 30 ? "#ef444430" : "#1a1a1a"}` }}
          >
            <p className="text-2xl font-bold tabular-nums" style={{ color: daysRemaining < 30 ? "#ef4444" : "#ededed" }}>
              {daysRemaining}
            </p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">days to exam</p>
            {!examDate && (
              <p className="text-[9px] text-neutral-700 mt-0.5">
                Estimated · <Link href="/targets" className="underline hover:text-neutral-500">set exact date</Link>
              </p>
            )}
            {effectiveExamDate && (
              <p className="text-[9px] text-neutral-600 mt-0.5">
                {nearestExam?.name ?? knownFallback?.name} — {effectiveExamDate}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Overview Strip ──────────────────────────────────────────────────── */}
      <section aria-label="Overview">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Overall Coverage", value: `${overallPct}%`,        sub: `${completedTopics}/${totalTopics} topics`,        color: pctColor(overallPct) },
            { label: "Questions Solved",  value: totalQuestionsAllTime.toLocaleString(), sub: `${questionsLast7} this week`,   color: "#ededed" },
            { label: "Total Mocks",       value: mocks.length,            sub: last5AvgPct != null ? `avg ${last5AvgPct.toFixed(0)}% (last 5)` : "No mocks yet", color: "#fb7185" },
            { label: "Revision Adherence",value: adherence30 != null ? `${adherence30}%` : "-",       sub: `${completed30}/${due30} done (30 days)`,         color: pctColor(adherence30 ?? 0) },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-2xl p-4 relative overflow-hidden" style={{ background: "#111111", border: "1px solid var(--border)" }}>
              <div className="absolute bottom-0 left-0 h-0.5 rounded-full" style={{ width: "100%", background: `${color}20` }} aria-hidden="true" />
              <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: "rgba(232,232,240,0.38)" }}>{label}</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
              <p className="text-[11px] mt-1" style={{ color: "rgba(232,232,240,0.3)" }}>{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Exam-wise Progress ──────────────────────────────────────────────── */}
      <section aria-label="Exam-wise progress">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Exam-wise Progress</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(["banking", "ssc"] as const).map((examType) => {
            const cfg = EXAM_COLORS[examType];
            const pct = examType === "banking" ? bankingPct : sscPct;
            const examMocks = examType === "banking" ? bankingMocks : sscMocks;
            const avgMock = examMocks.length > 0
              ? examMocks.reduce((s, m) => s + (m.score / m.maximum_marks) * 100, 0) / examMocks.length
              : null;
            const examTopics = topics.filter((t) => {
              const s = subjectLookup.get(t.subject_id);
              return s?.exam_type === examType || s?.exam_type === "both";
            });
            const examQs = Array.from(topicPracticeMap.values()).filter((p) => {
              const topic = topicLookup.get(p.topicId);
              const s = topic ? subjectLookup.get(topic.subject_id) : null;
              return s?.exam_type === examType || s?.exam_type === "both";
            }).reduce((s, p) => s + p.attempted, 0);
            const refCutoffs = REFERENCE_CUTOFFS.filter((c) => c.examType === examType);
            const latestCutoff = refCutoffs.sort((a, b) => b.year - a.year)[0];

            return (
              <div key={examType} className="rounded-xl p-5 space-y-4" style={{ background: "#0a0a0a", border: `1px solid ${cfg.border}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                    {examType === "banking" ? "Banking" : "SSC CGL"}
                  </span>
                  <span className="text-xl font-bold tabular-nums" style={{ color: pctColor(pct) }}>{pct}%</span>
                </div>
                {/* Coverage bar */}
                <div>
                  <div className="w-full h-2 rounded-full" style={{ background: "#1a1a1a" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.text }} />
                  </div>
                  <p className="text-[10px] text-neutral-600 mt-1">{examTopics.filter(t => t.status === "learned" || t.status === "strong").length}/{examTopics.length} topics done</p>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t" style={{ borderColor: "#1a1a1a" }}>
                  <div>
                    <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Mock avg</p>
                    <p className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: avgMock !== null ? pctColor(avgMock) : "#525252" }}>
                      {avgMock !== null ? `${avgMock.toFixed(0)}%` : "—"}
                    </p>
                    <p className="text-[9px] text-neutral-700">{examMocks.length} mocks</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Questions</p>
                    <p className="text-sm font-semibold tabular-nums mt-0.5 text-neutral-300">{examQs.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-600 uppercase tracking-wider">PYQ done</p>
                    <p className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: cfg.text }}>
                      {pyqCoveragePct !== null ? `${pyqCoveragePct}%` : "—"}
                    </p>
                  </div>
                </div>
                {latestCutoff && (
                  <div className="rounded-lg px-3 py-2" style={{ background: "#111111" }}>
                    <p className="text-[9px] text-neutral-700 uppercase tracking-wider font-semibold mb-1">Reference Cutoff (est.)</p>
                    <p className="text-xs text-neutral-400">
                      {latestCutoff.examName} {latestCutoff.stage} {latestCutoff.year} · General: <span className="font-semibold text-neutral-200">{latestCutoff.cutoff}/{latestCutoff.maximumMarks}</span>
                    </p>
                    <p className="text-[9px] text-neutral-700 mt-0.5">{latestCutoff.reference}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Am I On Track? ──────────────────────────────────────────────────── */}
      <section aria-label="Am I on track">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Am I On Track?</h2>
        <div className="rounded-xl p-5 space-y-5" style={{ background: "#0a0a0a", border: `1px solid ${onTrackCfg.text}30` }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{onTrackCfg.icon}</span>
            <div>
              <p className="text-base font-semibold" style={{ color: onTrackCfg.text }}>{onTrackCfg.label}</p>
              {onTrack.status !== "insufficient_data" && daysRemaining !== null && (
                <p className="text-xs text-neutral-500 mt-0.5">
                  {daysRemaining} days remaining · {onTrack.syllabusVelocity.toFixed(1)} topics/week actual vs {onTrack.syllabusTarget.toFixed(1)} needed
                </p>
              )}
            </div>
          </div>

          {/* Signal bars */}
          {onTrack.status !== "insufficient_data" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Syllabus Pace",     value: onTrack.syllabusVelocity.toFixed(1), unit: "t/wk", target: onTrack.syllabusTarget.toFixed(1), ok: onTrack.syllabusVelocity >= onTrack.syllabusTarget * 0.85 },
                { label: "Questions / Week",  value: onTrack.questionVolumeWeekly.toString(), unit: "Qs", target: "100", ok: onTrack.questionVolumeWeekly >= 100 },
                { label: "Revision Adherence",value: `${onTrack.revisionAdherencePct}%`, unit: "", target: "75%", ok: onTrack.revisionAdherencePct >= 60 },
                { label: "Accuracy Trend",    value: onTrack.accuracyTrend ?? "n/a", unit: "", target: "improving", ok: onTrack.accuracyTrend !== "declining" },
              ].map(({ label, value, unit, target, ok }) => (
                <div key={label} className="rounded-lg px-3 py-2.5" style={{ background: ok ? "#10b98110" : "#ef444410", border: `1px solid ${ok ? "#10b98130" : "#ef444430"}` }}>
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-bold tabular-nums mt-0.5" style={{ color: ok ? "#34d399" : "#ef4444" }}>
                    {value}<span className="text-[10px] font-normal text-neutral-700 ml-0.5">{unit}</span>
                  </p>
                  <p className="text-[9px] text-neutral-700">target: {target}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reasons */}
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: "#1a1a1a" }}>
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold">Evidence</p>
            {onTrack.reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] text-neutral-700 mt-0.5">·</span>
                <p className="text-xs" style={{ color: "rgba(232,232,240,0.6)" }}>{r}</p>
              </div>
            ))}
          </div>

          {onTrack.status === "insufficient_data" && (
            <div className="text-center py-4">
              <p className="text-xs text-neutral-500">
                {!examDate
                  ? <><Link href="/targets" className="text-neutral-400 underline hover:text-neutral-200">Add an exam date</Link> in Targets to enable on-track tracking.</>
                  : "Study for at least 2 weeks and log sessions with topics to enable this analysis."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Exam Readiness Score ────────────────────────────────────────────── */}
      <section aria-label="Exam readiness score">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Exam Readiness Score</h2>
        <div className="rounded-xl p-5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <div className="flex items-center gap-6 mb-6">
            <div className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1a1a1a" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={readinessColor} strokeWidth="10"
                  strokeDasharray={`${readiness.total * 2.638} 263.8`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold tabular-nums" style={{ color: readinessColor }}>{readiness.total}</span>
                <span className="text-[9px] text-neutral-600">/100</span>
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: readinessColor }}>{readiness.label}</p>
              <p className="text-xs text-neutral-500 mt-1">Based on 8 components · all factors visible below</p>
              {exams.length === 0 && (
                <p className="text-[10px] text-neutral-700 mt-2">
                  <Link href="/targets" className="underline hover:text-neutral-500">Add an exam target</Link> to personalise this score.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {readiness.components.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-neutral-400">{c.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-neutral-700">{Math.round(c.weight * 100)}%</span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: pctColor(c.score), minWidth: 32, textAlign: "right" }}>
                      {c.score.toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: "#1a1a1a" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${c.score}%`, background: pctColor(c.score) }} />
                </div>
                <p className="text-[10px] text-neutral-700 mt-0.5">{c.evidence}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Weak Areas + Next Actions (side by side) ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Weak Areas */}
        <section aria-label="Weak areas">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Weak Areas</h2>
          {weakAreas.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p className="text-2xl mb-2">🎯</p>
              <p className="text-sm text-neutral-400 font-medium">No weak areas detected</p>
              <p className="text-xs text-neutral-600 mt-1">Practice ≥ 10 questions per topic to enable this diagnosis.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {weakAreas.slice(0, 8).map((w) => {
                const uc = URGENCY_COLORS[w.urgency];
                return (
                  <div key={w.topicId} className="rounded-xl p-4" style={{ background: "#0a0a0a", border: `1px solid ${uc.border}` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: w.subjectColor }} />
                          <p className="text-sm font-medium text-neutral-200 truncate">{w.topicName}</p>
                          {w.mockCorroboration && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "#a78bfa20", color: "#a78bfa", border: "1px solid #a78bfa30" }}>
                              mock confirmed
                            </span>
                          )}
                          {w.pyqWeight && w.pyqWeight > 3 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "#f59e0b20", color: "#f59e0b", border: "1px solid #f59e0b30" }}>
                              high-freq PYQ
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-600 mt-0.5 ml-3.5">{w.subjectName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums" style={{ color: uc.text }}>{w.accuracy.toFixed(0)}%</p>
                        <p className="text-[10px] text-neutral-600">{w.attempted} Qs</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full h-1 rounded-full" style={{ background: "#1a1a1a" }}>
                        <div className="h-full rounded-full" style={{ width: `${w.accuracy}%`, background: uc.text }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {weakAreas.length > 8 && (
                <p className="text-xs text-neutral-600 text-center pt-1">+{weakAreas.length - 8} more weak topics</p>
              )}
              {realWeakSubjects.length > 0 && (
                <div className="rounded-xl p-3 mt-2" style={{ background: "#0a0a0a", border: "1px solid #a78bfa30" }}>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold mb-2">From Last Real Exam</p>
                  {realWeakSubjects.map((s, i) => {
                    const sPct = Math.round((s.marks_scored / s.marks_available) * 100);
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">{s.subject_name}</span>
                        <span style={{ color: pctColor(sPct) }}>{s.marks_scored}/{s.marks_available} ({sPct}%)</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Next Actions */}
        <section aria-label="Next actions">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Next Actions</h2>
          {nextActions.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm text-neutral-400 font-medium">All caught up!</p>
              <p className="text-xs text-neutral-600 mt-1">No critical actions right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {nextActions.map((action, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4"
                  style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">{ACTION_ICONS[action.type]}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-200">{action.label}</p>
                      <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{action.reason}</p>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-700 shrink-0">#{action.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Subject Progress ────────────────────────────────────────────────── */}
      <section aria-label="Subject progress">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Subject Progress</h2>
        <div className="space-y-2">
          {subjectProgress.map((s) => (
            <div key={s.id} className="rounded-xl" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color ?? "#52525b" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-neutral-200 truncate">{s.name}</p>
                    <div className="flex items-center gap-4 shrink-0">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={
                          s.exam_type === "banking"
                            ? { background: EXAM_COLORS.banking.bg, color: EXAM_COLORS.banking.text }
                            : s.exam_type === "ssc"
                            ? { background: EXAM_COLORS.ssc.bg, color: EXAM_COLORS.ssc.text }
                            : { background: "#f59e0b15", color: "#f59e0b" }
                        }
                      >
                        {s.exam_type}
                      </span>
                      {s.accuracy !== null && (
                        <span className="text-xs tabular-nums" style={{ color: pctColor(s.accuracy) }}>
                          {s.accuracy.toFixed(0)}% acc
                        </span>
                      )}
                      <span className="text-xs text-neutral-600 tabular-nums">{s.done}/{s.subTopics.length}</span>
                      <span className="text-sm font-semibold tabular-nums" style={{ color: pctColor(s.pct), minWidth: 36, textAlign: "right" }}>
                        {s.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full mt-2" style={{ background: "#1a1a1a" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${s.pct}%`, background: s.color ?? "#52525b" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {subjectProgress.length === 0 && (
            <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p className="text-sm text-neutral-500">No subjects yet. <Link href="/syllabus" className="text-neutral-400 underline hover:text-neutral-200">Add subjects</Link> on the Syllabus page.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Topic Lifecycle ─────────────────────────────────────────────────── */}
      <LifecyclePanel
        subjects={subjects}
        chapters={chapters}
        topics={topics}
        lifecycles={lifecycleRaw ?? []}
        practiceMap={practiceMapObj}
        topicExamRecord={topicExamRecord}
      />

      {/* ── Mock Performance ────────────────────────────────────────────────── */}
      <section aria-label="Mock performance">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Mock Performance</h2>
        {mocks.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-sm text-neutral-500">No mocks logged yet. <Link href="/mocks" className="text-neutral-400 underline hover:text-neutral-200">Log your first mock</Link>.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(["banking", "ssc"] as const).map((examType) => {
              const examMocks = examType === "banking" ? bankingMocks : sscMocks;
              if (examMocks.length === 0) return null;
              const cfg = EXAM_COLORS[examType];
              return (
                <div key={examType} className="rounded-xl p-4 space-y-3" style={{ background: "#0a0a0a", border: `1px solid ${cfg.border}` }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: cfg.text }}>
                    {examType === "banking" ? "Banking" : "SSC"} Mocks (last 5)
                  </p>
                  {examMocks.map((m) => {
                    const pct = m.maximum_marks > 0 ? (m.score / m.maximum_marks) * 100 : 0;
                    const acc = mockAccuracy(m.correct, m.attempted);
                    const classification = classifyMockPerformance({
                      score: m.score, maximumMarks: m.maximum_marks,
                      correct: m.correct, attempted: m.attempted,
                      actualMinutes: m.actual_duration_minutes,
                      recommendedMinutes: m.recommended_duration_minutes,
                    });
                    return (
                      <div key={m.id} className="flex items-start justify-between gap-3 py-2 border-t first:border-t-0" style={{ borderColor: "#1a1a1a" }}>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-neutral-300 truncate">{m.name}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="text-[9px] text-neutral-600">{m.mock_date}</span>
                            {acc !== null && (
                              <span className="text-[9px] tabular-nums" style={{ color: pctColor(acc) }}>{acc.toFixed(0)}% acc</span>
                            )}
                            {classification && (
                              <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "#1a1a1a", color: "#a1a1aa" }}>
                                Case {classification.case}: {classification.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold tabular-nums" style={{ color: pctColor(pct) }}>{pct.toFixed(0)}%</p>
                          <p className="text-[10px] text-neutral-600">{m.score}/{m.maximum_marks}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Revision Status ─────────────────────────────────────────────────── */}
      <section aria-label="Revision status">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Revision Status</h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Overdue",   value: overdueRevisions.length, color: "#ef4444" },
            { label: "30-day Due",  value: due30,                   color: "#f59e0b" },
            { label: "Adherence",  value: adherence30 != null ? `${adherence30}%` : "-",        color: pctColor(adherence30 ?? 0) },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">{label}</p>
              <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
        {overdueRevisions.length > 0 && (
          <div className="rounded-xl p-4 space-y-2" style={{ background: "#0a0a0a", border: "1px solid #ef444430" }}>
            <p className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold">Overdue Revisions</p>
            {overdueRevisions.map((r) => {
              const daysOverdue = Math.floor((now - new Date(r.due_date).getTime()) / 86400000);
              return (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="text-xs text-neutral-300">{r.topics?.name ?? "Unknown topic"}</span>
                  <span className="text-[10px] text-rose-400">{daysOverdue}d overdue</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Reference Cutoffs ───────────────────────────────────────────────── */}
      <section aria-label="Reference cutoffs">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Reference Cutoffs (Estimated)</h2>
        <div className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <p className="text-[10px] text-neutral-700 mb-3 italic">
            Sourced Sep 2026 from official results. These are historical/reference figures - actual cutoffs vary by year, vacancies, paper difficulty.{" "}
            <Link href="/targets" className="underline hover:text-neutral-500">Add your own safety targets</Link>.
          </p>
          <div className="space-y-1.5">
            {REFERENCE_CUTOFFS.map((c, i) => {
              const pct = Math.round((c.cutoff / c.maximumMarks) * 100);
              return (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full"
                      style={
                        c.examType === "banking"
                          ? { background: EXAM_COLORS.banking.bg, color: EXAM_COLORS.banking.text }
                          : { background: EXAM_COLORS.ssc.bg, color: EXAM_COLORS.ssc.text }
                      }
                    >
                      {c.examType === "banking" ? "Banking" : "SSC"}
                    </span>
                    <span className="text-neutral-400">{c.examName} {c.stage} {c.year}</span>
                    <span className="text-neutral-700">{c.category}</span>
                  </div>
                  <span className="font-semibold tabular-nums" style={{ color: "#ededed" }}>
                    {c.cutoff}/{c.maximumMarks} <span className="text-[10px] text-neutral-600">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Real Exam Results ───────────────────────────────────────────────── */}
      <section aria-label="Real exam results">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Real Exam Results</h2>
        <p className="text-xs text-neutral-600 mb-4">
          Log your actual exam attempts - subject-wise marks help identify where you lost points.
        </p>
        <RealExamResultForm
          existingResults={realExamResults}
          defaultExamType={defaultExamType}
          todayStr={todayStr}
        />
      </section>

      {/* Footer */}
      <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "#111111", border: "1px solid var(--border)" }}>
        <p className="text-xs" style={{ color: "rgba(232,232,240,0.4)" }}>
          Data: Supabase is source of truth · This page is a view · {todayStr}
        </p>
        <Link href="/" className="text-xs px-3 py-1.5 rounded-xl font-semibold transition-all hover:opacity-80" style={{ background: "#ededed", color: "#0a0a0a" }}>
          Home ↗
        </Link>
      </div>
    </div>
  );
}

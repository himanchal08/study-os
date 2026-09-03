/**
 * Performance calculations — Phase 11 (Syllabus Coverage) + Phase 22 (Exam Readiness).
 * All functions are framework-agnostic (no React/Next imports) and purely deterministic.
 *
 * Reuses existing shared types from this module; does NOT reimport from React.
 * Per LLM rules §5.1: every metric is implemented once here and reused across
 * the dashboard page, components, and future exports.
 */

// ─── Lightweight topic shape for coverage calculations ────────────────────────
export interface TopicForCoverage {
  id: string;
  status: "not_started" | "learning" | "learned" | "revising" | "strong" | "weak";
  subject_id: string;
}

export interface SubjectForCoverage {
  id: string;
  exam_type: "banking" | "ssc" | "both";
}

/** Overall syllabus completion %. Counts 'learned' + 'strong' as done. */
export function syllabusCompletionPct(topics: TopicForCoverage[]): number {
  if (topics.length === 0) return 0;
  const done = topics.filter((t) =>
    t.status === "learned" || t.status === "strong"
  ).length;
  return Math.round((done / topics.length) * 100);
}

/**
 * Coverage % for a specific exam type.
 * Includes topics whose subject is tagged for that exam OR 'both'.
 */
export function examWiseCoverage(
  topics: TopicForCoverage[],
  subjects: SubjectForCoverage[],
  examType: "banking" | "ssc"
): number {
  const relevantSubjectIds = new Set(
    subjects
      .filter((s) => s.exam_type === examType || s.exam_type === "both")
      .map((s) => s.id)
  );
  const relevant = topics.filter((t) => relevantSubjectIds.has(t.subject_id));
  if (relevant.length === 0) return 0;
  const done = relevant.filter(
    (t) => t.status === "learned" || t.status === "strong"
  ).length;
  return Math.round((done / relevant.length) * 100);
}

// ─── Am I On Track? ──────────────────────────────────────────────────────────

export type OnTrackStatus = "ahead" | "on_track" | "behind" | "insufficient_data";

export interface OnTrackResult {
  status: OnTrackStatus;
  /** Topics completed per week (actual) */
  syllabusVelocity: number;
  /** Topics per week needed to finish before exam */
  syllabusTarget: number;
  /** Total questions attempted in last 7 days */
  questionVolumeWeekly: number;
  /** % topics with pyq_done = true (null if no lifecycle data) */
  pyqCoveragePct: number | null;
  accuracyTrend: "improving" | "stable" | "declining" | null;
  mockTrend: "improving" | "stable" | "declining" | null;
  /** % due revisions completed (last 30 days) */
  revisionAdherencePct: number;
  /** Days remaining until nearest exam date */
  daysRemaining: number | null;
  /** Human-readable evidence strings (1 per signal) */
  reasons: string[];
}

export interface OnTrackParams {
  /** ISO date string of earliest study session */
  studyStartDate: string | null;
  /** ISO date string of nearest upcoming exam */
  examDate: string | null;
  totalTopics: number;
  completedTopics: number;
  /** Number of questions attempted in last 7 days */
  questionsLast7Days: number;
  /** % topics with pyq_done = true (null = no lifecycle data) */
  pyqCoveragePct: number | null;
  /** Accuracy 0–100 for last 14 days (null = no data) */
  accuracyLast14: number | null;
  /** Accuracy 0–100 for days 15–28 ago (null = no data) */
  accuracyPrev14: number | null;
  /** Average mock score % of last 3 mocks (null = < 3 mocks) */
  mockScoreLast3Avg: number | null;
  /** Average mock score % of mocks 4–6 (null = insufficient) */
  mockScorePrev3Avg: number | null;
  /** Revisions completed in last 30 days */
  revisionsCompleted30: number;
  /** Revisions that were due in last 30 days */
  revisionsDue30: number;
}

export function computeOnTrackStatus(params: OnTrackParams): OnTrackResult {
  const {
    studyStartDate,
    examDate,
    totalTopics,
    completedTopics,
    questionsLast7Days,
    pyqCoveragePct,
    accuracyLast14,
    accuracyPrev14,
    mockScoreLast3Avg,
    mockScorePrev3Avg,
    revisionsCompleted30,
    revisionsDue30,
  } = params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Revision adherence (guard zero denominator)
  const revisionAdherencePct =
    revisionsDue30 > 0
      ? Math.round((revisionsCompleted30 / revisionsDue30) * 100)
      : 100; // no revisions due = 100% adherence (not penalised)

  // Days remaining
  let daysRemaining: number | null = null;
  if (examDate) {
    const exam = new Date(examDate);
    exam.setHours(0, 0, 0, 0);
    daysRemaining = Math.max(
      0,
      Math.ceil((exam.getTime() - today.getTime()) / 86400000)
    );
  }

  // Insufficient data check: < 14 days of sessions or no exam date
  if (!studyStartDate || !examDate || daysRemaining === null) {
    return {
      status: "insufficient_data",
      syllabusVelocity: 0,
      syllabusTarget: 0,
      questionVolumeWeekly: questionsLast7Days,
      pyqCoveragePct,
      accuracyTrend: null,
      mockTrend: null,
      revisionAdherencePct,
      daysRemaining,
      reasons: [
        !examDate
          ? "Set an exam date in Targets to enable on-track tracking."
          : "Need at least 14 days of study sessions for a meaningful assessment.",
      ],
    };
  }

  const startDate = new Date(studyStartDate);
  startDate.setHours(0, 0, 0, 0);
  const daysElapsed = Math.max(
    1,
    Math.ceil((today.getTime() - startDate.getTime()) / 86400000)
  );

  if (daysElapsed < 14) {
    return {
      status: "insufficient_data",
      syllabusVelocity: 0,
      syllabusTarget: 0,
      questionVolumeWeekly: questionsLast7Days,
      pyqCoveragePct,
      accuracyTrend: null,
      mockTrend: null,
      revisionAdherencePct,
      daysRemaining,
      reasons: [
        `Only ${daysElapsed} day${daysElapsed !== 1 ? "s" : ""} of study data — need 14+ days for a reliable assessment.`,
      ],
    };
  }

  const weeksElapsed = daysElapsed / 7;
  const weeksRemaining = Math.max(0.14, daysRemaining / 7); // at least 1 day

  const remainingTopics = totalTopics - completedTopics;
  const syllabusVelocity = completedTopics / weeksElapsed;
  const syllabusTarget =
    weeksRemaining > 0 ? remainingTopics / weeksRemaining : remainingTopics * 99;

  // Trends
  let accuracyTrend: OnTrackResult["accuracyTrend"] = null;
  if (accuracyLast14 !== null && accuracyPrev14 !== null) {
    const delta = accuracyLast14 - accuracyPrev14;
    if (delta >= 3) accuracyTrend = "improving";
    else if (delta <= -3) accuracyTrend = "declining";
    else accuracyTrend = "stable";
  }

  let mockTrend: OnTrackResult["mockTrend"] = null;
  if (mockScoreLast3Avg !== null && mockScorePrev3Avg !== null) {
    const delta = mockScoreLast3Avg - mockScorePrev3Avg;
    if (delta >= 2) mockTrend = "improving";
    else if (delta <= -2) mockTrend = "declining";
    else mockTrend = "stable";
  }

  // Build evidence reasons
  const reasons: string[] = [];

  const velRatio = syllabusTarget > 0 ? syllabusVelocity / syllabusTarget : 1;

  if (syllabusTarget > 0) {
    const v = syllabusVelocity.toFixed(1);
    const t = syllabusTarget.toFixed(1);
    if (velRatio >= 1.15) {
      reasons.push(
        `Syllabus pace: ${v} topics/week — ahead of the needed ${t} topics/week to finish before the exam.`
      );
    } else if (velRatio >= 0.85) {
      reasons.push(
        `Syllabus pace: ${v} topics/week — on track with the needed ${t} topics/week.`
      );
    } else {
      reasons.push(
        `Syllabus pace: only ${v} topics/week, but need ${t} topics/week to cover all topics before the exam.`
      );
    }
  }

  if (questionsLast7Days < 100) {
    reasons.push(
      `Question volume this week: ${questionsLast7Days} — aim for at least 100/week to build sufficient practice depth.`
    );
  } else {
    reasons.push(
      `Question volume this week: ${questionsLast7Days} — solid practice pace.`
    );
  }

  if (revisionsDue30 > 0) {
    if (revisionAdherencePct < 50) {
      reasons.push(
        `Revision adherence: ${revisionAdherencePct}% — ${revisionsDue30 - revisionsCompleted30} of ${revisionsDue30} due revisions were skipped in the last 30 days.`
      );
    } else if (revisionAdherencePct < 75) {
      reasons.push(
        `Revision adherence: ${revisionAdherencePct}% — some revisions are being skipped (${revisionsDue30 - revisionsCompleted30} missed of ${revisionsDue30}).`
      );
    } else {
      reasons.push(
        `Revision adherence: ${revisionAdherencePct}% — good revision discipline (${revisionsCompleted30}/${revisionsDue30} done).`
      );
    }
  }

  if (accuracyTrend) {
    const curr = accuracyLast14!.toFixed(0);
    const prev = accuracyPrev14!.toFixed(0);
    if (accuracyTrend === "declining") {
      reasons.push(
        `Accuracy has dropped from ${prev}% (15–28 days ago) to ${curr}% (last 14 days) — investigate cause.`
      );
    } else if (accuracyTrend === "improving") {
      reasons.push(
        `Accuracy improving: ${prev}% → ${curr}% over the last 28 days — keep the momentum.`
      );
    }
  }

  if (mockTrend === "declining") {
    reasons.push(
      `Mock scores are trending down: last 3 avg ${mockScoreLast3Avg!.toFixed(0)}% vs previous 3 avg ${mockScorePrev3Avg!.toFixed(0)}%.`
    );
  } else if (mockTrend === "improving") {
    reasons.push(
      `Mock scores improving: last 3 avg ${mockScoreLast3Avg!.toFixed(0)}% vs previous 3 avg ${mockScorePrev3Avg!.toFixed(0)}%.`
    );
  }

  if (pyqCoveragePct !== null) {
    reasons.push(
      `PYQ coverage: ${pyqCoveragePct.toFixed(0)}% of topics marked as PYQ-practiced.${pyqCoveragePct < 40 ? " Increase PYQ practice for exam-aligned preparation." : ""}`
    );
  }

  // Determine status
  const isBehind =
    velRatio < 0.85 ||
    revisionAdherencePct < 50 ||
    accuracyTrend === "declining" ||
    mockTrend === "declining";

  const isAhead =
    velRatio >= 1.15 &&
    revisionAdherencePct >= 70 &&
    accuracyTrend !== "declining" &&
    mockTrend !== "declining";

  const status: OnTrackStatus = isBehind
    ? "behind"
    : isAhead
    ? "ahead"
    : "on_track";

  return {
    status,
    syllabusVelocity,
    syllabusTarget,
    questionVolumeWeekly: questionsLast7Days,
    pyqCoveragePct,
    accuracyTrend,
    mockTrend,
    revisionAdherencePct,
    daysRemaining,
    reasons,
  };
}

// ─── Exam Readiness Score ─────────────────────────────────────────────────────

export interface ReadinessComponent {
  label: string;
  /** 0–100 score for this component */
  score: number;
  /** Fraction 0–1; all weights sum to 1.0 */
  weight: number;
  /** Human-readable evidence for the score */
  evidence: string;
}

export type ReadinessLabel =
  | "Not Ready"
  | "Getting There"
  | "On Track"
  | "Almost Ready"
  | "Ready";

export interface ReadinessScore {
  /** Weighted composite 0–100 */
  total: number;
  components: ReadinessComponent[];
  label: ReadinessLabel;
}

export interface ReadinessParams {
  /** 0–100 */
  syllabusCompletionPct: number;
  /** Total questions attempted all-time */
  totalQuestionsAllTime: number;
  /** % topics with pyq_done (0–100); null if no lifecycle data */
  pyqCoveragePct: number | null;
  /** Average score % of last 5 mocks (null if < 1 mock) */
  last5MockAvgPct: number | null;
  /** 30-day accuracy (0–100); null if no data */
  accuracy30Day: number | null;
  /** Revision adherence last 30 days (0–100) */
  revisionAdherence30: number;
  /**
   * % of mocks where actual_duration <= recommended_duration.
   * null if no recommended_duration data.
   */
  speedDisciplinePct: number | null;
  /** accuracy trend */
  accuracyTrend: "improving" | "stable" | "declining" | null;
  /** mock trend */
  mockTrend: "improving" | "stable" | "declining" | null;
  /**
   * Benchmark for "100% question practice score".
   * Default 5000 (reasonable for Banking+SSC combined prep).
   */
  questionBenchmark?: number;
}

function readinessLabel(total: number): ReadinessLabel {
  if (total >= 85) return "Ready";
  if (total >= 70) return "Almost Ready";
  if (total >= 55) return "On Track";
  if (total >= 40) return "Getting There";
  return "Not Ready";
}

export function computeReadinessScore(params: ReadinessParams): ReadinessScore {
  const benchmark = params.questionBenchmark ?? 5000;

  // Component: Syllabus Coverage (weight 0.20)
  const syllabusScore = Math.min(100, params.syllabusCompletionPct);
  const syllabusEvidence = `${params.syllabusCompletionPct}% of topics marked as learned or strong.`;

  // Component: Question Practice (weight 0.15)
  const qScore = Math.min(
    100,
    Math.round((params.totalQuestionsAllTime / benchmark) * 100)
  );
  const qEvidence = `${params.totalQuestionsAllTime.toLocaleString()} questions attempted (target: ${benchmark.toLocaleString()}).`;

  // Component: PYQ Coverage (weight 0.15)
  const pyqScore =
    params.pyqCoveragePct !== null ? Math.min(100, params.pyqCoveragePct) : 0;
  const pyqEvidence =
    params.pyqCoveragePct !== null
      ? `${params.pyqCoveragePct.toFixed(0)}% of topics have PYQs marked as practised.`
      : "No PYQ lifecycle data recorded yet. Mark topics as PYQ-done on the Performance page.";

  // Component: Mock Performance (weight 0.20)
  const mockScore =
    params.last5MockAvgPct !== null ? Math.min(100, params.last5MockAvgPct) : 0;
  const mockEvidence =
    params.last5MockAvgPct !== null
      ? `Average score of last 5 mocks: ${params.last5MockAvgPct.toFixed(1)}%.`
      : "No mock test data. Log mocks on the Mocks page.";

  // Component: Accuracy (30-day) (weight 0.10)
  const accScore =
    params.accuracy30Day !== null ? Math.min(100, params.accuracy30Day) : 0;
  const accEvidence =
    params.accuracy30Day !== null
      ? `30-day question accuracy: ${params.accuracy30Day.toFixed(0)}%.`
      : "No question batch data in last 30 days.";

  // Component: Revision Discipline (weight 0.10)
  const revScore = Math.min(100, params.revisionAdherence30);
  const revEvidence = `${params.revisionAdherence30}% of due revisions completed in last 30 days.`;

  // Component: Speed Discipline (weight 0.05)
  const speedScore =
    params.speedDisciplinePct !== null
      ? Math.min(100, params.speedDisciplinePct)
      : 50; // neutral if no data
  const speedEvidence =
    params.speedDisciplinePct !== null
      ? `${params.speedDisciplinePct.toFixed(0)}% of mocks completed within recommended time.`
      : "No recommended-duration data on mocks — add it when logging mocks.";

  // Component: Trend (weight 0.05)
  let trendScore = 50; // neutral
  const accTrendVal =
    params.accuracyTrend === "improving"
      ? 1
      : params.accuracyTrend === "declining"
      ? -1
      : 0;
  const mockTrendVal =
    params.mockTrend === "improving"
      ? 1
      : params.mockTrend === "declining"
      ? -1
      : 0;
  const trendAvg = (accTrendVal + mockTrendVal) / 2;
  trendScore = Math.round(50 + trendAvg * 50);
  const trendLabels: Record<string, string> = {
    improving: "improving",
    stable: "stable",
    declining: "declining",
  };
  const trendEvidence = `Accuracy trend: ${trendLabels[params.accuracyTrend ?? "stable"] ?? "stable"}, mock score trend: ${trendLabels[params.mockTrend ?? "stable"] ?? "stable"}.`;

  const components: ReadinessComponent[] = [
    { label: "Syllabus Coverage",      score: syllabusScore, weight: 0.20, evidence: syllabusEvidence },
    { label: "Mock Performance",        score: mockScore,     weight: 0.20, evidence: mockEvidence },
    { label: "Question Practice",       score: qScore,        weight: 0.15, evidence: qEvidence },
    { label: "PYQ Coverage",            score: pyqScore,      weight: 0.15, evidence: pyqEvidence },
    { label: "Accuracy (30-day)",       score: accScore,      weight: 0.10, evidence: accEvidence },
    { label: "Revision Discipline",     score: revScore,      weight: 0.10, evidence: revEvidence },
    { label: "Speed Discipline",        score: speedScore,    weight: 0.05, evidence: speedEvidence },
    { label: "Performance Trend",       score: trendScore,    weight: 0.05, evidence: trendEvidence },
  ];

  const total = Math.round(
    components.reduce((sum, c) => sum + c.score * c.weight, 0)
  );

  return { total, components, label: readinessLabel(total) };
}

// ─── Weak Areas Detection ─────────────────────────────────────────────────────

export interface WeakArea {
  topicId: string;
  topicName: string;
  subjectName: string;
  subjectColor: string;
  /** 0–100 */
  accuracy: number;
  attempted: number;
  /** true if mock_sections show corroborating low accuracy for this topic */
  mockCorroboration: boolean;
  urgency: "critical" | "high" | "medium";
  /** PYQ weight from topics table (higher = exam frequently tests this) */
  pyqWeight: number | null;
}

export interface WeakAreaParams {
  topicPractice: Array<{
    topicId: string;
    topicName: string;
    subjectName: string;
    subjectColor: string;
    attempted: number;
    correct: number;
    pyqWeight: number | null;
  }>;
  /** Map of topic name (lowercased) → mock section accuracy */
  mockSectionAccMap: Map<string, { attempted: number; correct: number }>;
  /** Minimum attempted questions before labelling weak (per LLM rules §5.5) */
  minSampleSize?: number;
  /** Accuracy threshold below which a topic is "weak" */
  weakThreshold?: number;
}

export function detectWeakAreas(params: WeakAreaParams): WeakArea[] {
  const {
    topicPractice,
    mockSectionAccMap,
    minSampleSize = 10,
    weakThreshold = 65,
  } = params;

  const weakAreas: WeakArea[] = [];

  for (const tp of topicPractice) {
    if (tp.attempted < minSampleSize) continue; // small-sample guardrail
    const accuracy = tp.attempted > 0 ? (tp.correct / tp.attempted) * 100 : 0;
    if (accuracy >= weakThreshold) continue;

    const mockKey = tp.topicName.toLowerCase().trim();
    const mockData = mockSectionAccMap.get(mockKey);
    const mockCorroboration =
      !!mockData &&
      mockData.attempted >= 5 &&
      mockData.correct / mockData.attempted < weakThreshold / 100;

    // Urgency: critical < 45%, high < 55%, medium < weakThreshold
    const urgency: WeakArea["urgency"] =
      accuracy < 45 ? "critical" : accuracy < 55 ? "high" : "medium";

    weakAreas.push({
      topicId: tp.topicId,
      topicName: tp.topicName,
      subjectName: tp.subjectName,
      subjectColor: tp.subjectColor,
      accuracy,
      attempted: tp.attempted,
      mockCorroboration,
      urgency,
      pyqWeight: tp.pyqWeight,
    });
  }

  // Sort: critical first, then by accuracy ascending (worst first)
  const urgencyOrder = { critical: 0, high: 1, medium: 2 };
  weakAreas.sort(
    (a, b) =>
      urgencyOrder[a.urgency] - urgencyOrder[b.urgency] ||
      a.accuracy - b.accuracy
  );

  return weakAreas;
}

// ─── Next Actions ─────────────────────────────────────────────────────────────

export interface NextAction {
  type: "study" | "practice" | "revise" | "mock" | "pyq";
  priority: number; // 1 = highest
  label: string;
  reason: string;
  targetTopic?: string;
  targetSubject?: string;
}

export interface NextActionParams {
  onTrack: OnTrackResult;
  weakAreas: WeakArea[];
  overdueRevisionCount: number;
  overdueRevisionTopicNames: string[];
  daysSinceLastMock: number | null;
  /** Topics with no question practice at all */
  unstartedTopics: string[];
  /** Topics learned but with pyq_done = false */
  pyqPendingTopics: string[];
  /** total topics with lifecycle not yet started */
  notStartedTopicsCount: number;
}

export function generateNextActions(params: NextActionParams): NextAction[] {
  const {
    onTrack,
    weakAreas,
    overdueRevisionCount,
    overdueRevisionTopicNames,
    daysSinceLastMock,
    unstartedTopics,
    pyqPendingTopics,
  } = params;

  const actions: NextAction[] = [];

  // 1. Overdue revisions — highest priority
  if (overdueRevisionCount > 0) {
    const names = overdueRevisionTopicNames.slice(0, 2).join(", ");
    const more =
      overdueRevisionCount > 2 ? ` + ${overdueRevisionCount - 2} more` : "";
    actions.push({
      type: "revise",
      priority: 1,
      label: `Clear ${overdueRevisionCount} overdue revision${overdueRevisionCount !== 1 ? "s" : ""}`,
      reason: `${names}${more} ${overdueRevisionCount !== 1 ? "are" : "is"} overdue — skipping revisions drops retention and adherence score.`,
      targetTopic: overdueRevisionTopicNames[0],
    });
  }

  // 2. Critical weak areas — practice
  const criticalWeak = weakAreas.filter((w) => w.urgency === "critical");
  if (criticalWeak.length > 0) {
    const top = criticalWeak[0];
    actions.push({
      type: "practice",
      priority: 2,
      label: `Practice ${top.topicName} (${top.accuracy.toFixed(0)}% accuracy)`,
      reason: `Critical weak area (${top.attempted} Qs, ${top.accuracy.toFixed(0)}% acc${top.mockCorroboration ? ", confirmed by mock sections" : ""}) — needs targeted practice before any new topics.`,
      targetTopic: top.topicName,
      targetSubject: top.subjectName,
    });
  }

  // 3. Mock — if no mock in > 7 days
  if (daysSinceLastMock === null || daysSinceLastMock > 7) {
    const daysLabel =
      daysSinceLastMock === null
        ? "No mocks logged"
        : `${daysSinceLastMock} days since last mock`;
    actions.push({
      type: "mock",
      priority: 3,
      label: "Attempt a full-length mock test",
      reason: `${daysLabel} — regular mock attempts are essential for speed conditioning and readiness calibration.`,
    });
  }

  // 4. PYQ practice for learned topics
  if (pyqPendingTopics.length > 0) {
    const top3 = pyqPendingTopics.slice(0, 3).join(", ");
    actions.push({
      type: "pyq",
      priority: 4,
      label: `Practice PYQs for ${pyqPendingTopics.length} learned topic${pyqPendingTopics.length !== 1 ? "s" : ""}`,
      reason: `Topics marked as learned but PYQs not yet done: ${top3}${pyqPendingTopics.length > 3 ? "…" : ""}. PYQs align practice to actual exam patterns.`,
    });
  }

  // 5. Syllabus pace — study new topics if behind
  if (
    onTrack.status === "behind" &&
    onTrack.syllabusVelocity < onTrack.syllabusTarget
  ) {
    if (unstartedTopics.length > 0) {
      actions.push({
        type: "study",
        priority: 5,
        label: `Start a new topic — ${unstartedTopics.length} topics not started`,
        reason: `Syllabus pace (${onTrack.syllabusVelocity.toFixed(1)} topics/week) is below required ${onTrack.syllabusTarget.toFixed(1)} topics/week — begin new topics to close the gap.`,
        targetTopic: unstartedTopics[0],
      });
    }
  }

  // Limit to top 5 by priority
  return actions.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

// ─── Known exam reference data ────────────────────────────────────────────────

/**
 * Known upcoming exam dates.
 * 2027 dates are ESTIMATED based on historical annual patterns — official schedules
 * for 2027 have not been released as of Sep 2026. User should override via Targets page.
 * Sourced: official 2026 results + historical trend analysis, Sep 2026.
 */
export const KNOWN_EXAM_DATES: Array<{
  name: string;
  examType: "banking" | "ssc";
  stage: string;
  estimatedDate: string; // ISO YYYY-MM-DD
  source: string;
}> = [
  // ── SSC CGL 2027 (estimated from annual pattern: notification Apr, Tier1 Aug-Sep, Tier2 Dec) ──
  {
    name: "SSC CGL 2027",
    examType: "ssc",
    stage: "Tier 1",
    estimatedDate: "2027-08-15",
    source: "Estimated from SSC CGL annual pattern (2025: Sep, 2026: Aug–Sep)",
  },
  {
    name: "SSC CGL 2027",
    examType: "ssc",
    stage: "Tier 2",
    estimatedDate: "2027-12-15",
    source: "Estimated from SSC CGL annual pattern (Tier 2 typically Dec)",
  },
  // ── SBI PO 2027 (estimated: Prelims Nov, Mains Dec based on trend shift) ──
  {
    name: "SBI PO 2027",
    examType: "banking",
    stage: "Prelims",
    estimatedDate: "2027-11-01",
    source: "Estimated from SBI PO annual pattern (2026: Aug, trend shifting later)",
  },
  {
    name: "SBI PO 2027",
    examType: "banking",
    stage: "Mains",
    estimatedDate: "2027-12-15",
    source: "Estimated from SBI PO annual pattern (Mains ~6 weeks after Prelims)",
  },
  // ── IBPS PO 2027 (estimated: Prelims Oct, Mains Nov) ──
  {
    name: "IBPS PO 2027",
    examType: "banking",
    stage: "Prelims",
    estimatedDate: "2027-10-09",
    source: "Estimated from IBPS annual calendar pattern (2026: Aug, 2027 expected Oct)",
  },
  {
    name: "IBPS PO 2027",
    examType: "banking",
    stage: "Mains",
    estimatedDate: "2027-11-20",
    source: "Estimated from IBPS annual calendar pattern (Mains ~6 weeks after Prelims)",
  },
  {
    name: "IBPS Clerk 2027",
    examType: "banking",
    stage: "Prelims",
    estimatedDate: "2027-10-09",
    source: "Estimated from IBPS annual calendar pattern",
  },
  // ── Keep SSC CGL 2026 Tier 2 only (Dec 2026, still upcoming) ──
  {
    name: "SSC CGL 2026",
    examType: "ssc",
    stage: "Tier 2",
    estimatedDate: "2026-12-15",
    source: "SSC official notification, May 2026",
  },
];

/**
 * Historical + estimated cutoff reference data (General/UR category).
 * Official 2025–26 figures from SSC/IBPS/SBI result notifications.
 * 2027 figures are ESTIMATED by extrapolating the 2025–26 trend ±1–2%.
 * Per PRD §E: cutoff ≤ maximum_marks enforced in DB constraints.
 * Source checked: Sep 2026.
 */
export const REFERENCE_CUTOFFS: Array<{
  examType: "banking" | "ssc";
  examName: string;
  stage: string;
  year: number;
  category: string;
  cutoff: number;
  maximumMarks: number;
  reference: string;
}> = [
  // ── SSC CGL Tier 1 (out of 200) ──────────────────────────────────────────
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2027, category: "General", cutoff: 138.00, maximumMarks: 200, reference: "Estimated from 2025 cutoff (136.83) + ~1% trend" },
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2027, category: "OBC",     cutoff: 138.00, maximumMarks: 200, reference: "Estimated from 2025 trend" },
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2027, category: "SC",      cutoff: 116.00, maximumMarks: 200, reference: "Estimated from 2025 cutoff (114.97)" },
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2027, category: "ST",      cutoff: 107.00, maximumMarks: 200, reference: "Estimated from 2025 cutoff (106.37)" },
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2025, category: "General", cutoff: 136.83, maximumMarks: 200, reference: "SSC CGL 2025 official result, Dec 2025" },
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2025, category: "SC",      cutoff: 114.97, maximumMarks: 200, reference: "SSC CGL 2025 official result" },
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2025, category: "ST",      cutoff: 106.37, maximumMarks: 200, reference: "SSC CGL 2025 official result" },

  // ── SBI PO Prelims (out of 100) ──────────────────────────────────────────
  { examType: "banking", examName: "SBI PO", stage: "Prelims", year: 2027, category: "General", cutoff: 67.00, maximumMarks: 100, reference: "Estimated from 2026 cutoff (66.25) + slight uptick" },
  { examType: "banking", examName: "SBI PO", stage: "Prelims", year: 2026, category: "General", cutoff: 66.25, maximumMarks: 100, reference: "SBI PO 2026 official cutoff, Sep 2026" },
  { examType: "banking", examName: "SBI PO", stage: "Prelims", year: 2025, category: "General", cutoff: 66.75, maximumMarks: 100, reference: "SBI PO 2025 official cutoff" },

  // ── SBI PO Mains (out of 250) ─────────────────────────────────────────────
  { examType: "banking", examName: "SBI PO", stage: "Mains", year: 2027, category: "General", cutoff: 76.00, maximumMarks: 250, reference: "Estimated from 2025 cutoff (75.00) + trend" },
  { examType: "banking", examName: "SBI PO", stage: "Mains", year: 2025, category: "General", cutoff: 75.00, maximumMarks: 250, reference: "SBI PO 2025 official cutoff" },

  // ── IBPS PO Prelims (out of 100) ─────────────────────────────────────────
  { examType: "banking", examName: "IBPS PO", stage: "Prelims", year: 2027, category: "General", cutoff: 50.00, maximumMarks: 100, reference: "Estimated from 2025 cutoff (49.21) + trend" },
  { examType: "banking", examName: "IBPS PO", stage: "Prelims", year: 2025, category: "General", cutoff: 49.21, maximumMarks: 100, reference: "IBPS PO 2025 official cutoff" },

  // ── IBPS PO Mains (out of 225) ───────────────────────────────────────────
  { examType: "banking", examName: "IBPS PO", stage: "Mains", year: 2027, category: "General", cutoff: 76.50, maximumMarks: 225, reference: "Estimated from 2025 cutoff (75.75) + trend" },
  { examType: "banking", examName: "IBPS PO", stage: "Mains", year: 2025, category: "General", cutoff: 75.75, maximumMarks: 225, reference: "IBPS PO 2025 official cutoff" },
];

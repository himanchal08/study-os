


export interface TopicForCoverage {
  id: string;
  status: "not_started" | "learning" | "learned" | "revising" | "strong" | "weak";
  subject_id: string;
}

export interface SubjectForCoverage {
  id: string;
  exam_type: "banking" | "ssc" | "both" | "other";
}


export function syllabusCompletionPct(topics: TopicForCoverage[]): number {
  if (topics.length === 0) return 0;
  const done = topics.filter((t) =>
    t.status === "learned" || t.status === "strong"
  ).length;
  return Math.round((done / topics.length) * 100);
}


export function examWiseCoverage(
  topics: TopicForCoverage[],
  subjects: SubjectForCoverage[],
  examType: "banking" | "ssc",
  
  examTopicIdSet?: Set<string>
): number {
  let relevant: TopicForCoverage[];
  if (examTopicIdSet && examTopicIdSet.size > 0) {
    relevant = topics.filter((t) => examTopicIdSet.has(t.id));
  } else {
    const relevantSubjectIds = new Set(
      subjects
        .filter((s) => s.exam_type === examType || s.exam_type === "both")
        .map((s) => s.id)
    );
    relevant = topics.filter((t) => relevantSubjectIds.has(t.subject_id));
  }
  if (relevant.length === 0) return 0;
  const done = relevant.filter(
    (t) => t.status === "learned" || t.status === "strong"
  ).length;
  return Math.round((done / relevant.length) * 100);
}



export type OnTrackStatus = "ahead" | "on_track" | "behind" | "insufficient_data";

export interface OnTrackResult {
  status: OnTrackStatus;
  
  syllabusVelocity: number;
  
  syllabusTarget: number;
  
  questionVolumeWeekly: number;
  
  pyqCoveragePct: number | null;
  accuracyTrend: "improving" | "stable" | "declining" | null;
  mockTrend: "improving" | "stable" | "declining" | null;
  
  revisionAdherencePct: number;
  
  daysRemaining: number | null;
  
  reasons: string[];
}

export interface OnTrackParams {
  
  studyStartDate: string | null;
  
  examDate: string | null;
  totalTopics: number;
  completedTopics: number;
  
  questionsLast7Days: number;
  
  pyqCoveragePct: number | null;
  
  accuracyLast14: number | null;
  
  accuracyPrev14: number | null;
  
  mockScoreLast3Avg: number | null;
  
  mockScorePrev3Avg: number | null;
  
  revisionsCompleted30: number;
  
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

  
  const revisionAdherencePct =
    revisionsDue30 > 0
      ? Math.round((revisionsCompleted30 / revisionsDue30) * 100)
      : 100; 

  
  let daysRemaining: number | null = null;
  if (examDate) {
    const exam = new Date(examDate);
    exam.setHours(0, 0, 0, 0);
    daysRemaining = Math.max(
      0,
      Math.ceil((exam.getTime() - today.getTime()) / 86400000)
    );
  }

  
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
  const weeksRemaining = Math.max(0.14, daysRemaining / 7); 

  const remainingTopics = totalTopics - completedTopics;
  const syllabusVelocity = completedTopics / weeksElapsed;
  const syllabusTarget =
    weeksRemaining > 0 ? remainingTopics / weeksRemaining : remainingTopics * 99;

  
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



export interface ReadinessComponent {
  label: string;
  
  score: number;
  
  weight: number;
  
  evidence: string;
}

export type ReadinessLabel =
  | "Not Ready"
  | "Getting There"
  | "On Track"
  | "Almost Ready"
  | "Ready";

export interface ReadinessScore {
  
  total: number;
  components: ReadinessComponent[];
  label: ReadinessLabel;
}

export interface ReadinessParams {
  
  syllabusCompletionPct: number;
  
  totalQuestionsAllTime: number;
  
  pyqCoveragePct: number | null;
  
  last5MockAvgPct: number | null;
  
  accuracy30Day: number | null;
  
  revisionAdherence30: number | null;
  
  speedDisciplinePct: number | null;
  
  accuracyTrend: "improving" | "stable" | "declining" | null;
  
  mockTrend: "improving" | "stable" | "declining" | null;
  
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

  
  const syllabusScore = Math.min(100, params.syllabusCompletionPct);
  const syllabusEvidence = `${params.syllabusCompletionPct}% of topics marked as learned or strong.`;

  
  const qScore = Math.min(
    100,
    Math.round((params.totalQuestionsAllTime / benchmark) * 100)
  );
  const qEvidence = `${params.totalQuestionsAllTime.toLocaleString()} questions attempted (target: ${benchmark.toLocaleString()}).`;

  
  const pyqScore =
    params.pyqCoveragePct !== null ? Math.min(100, params.pyqCoveragePct) : 0;
  const pyqEvidence =
    params.pyqCoveragePct !== null
      ? `${params.pyqCoveragePct.toFixed(0)}% of topics have PYQs marked as practised.`
      : "No PYQ lifecycle data recorded yet. Mark topics as PYQ-done on the Performance page.";

  
  const mockScore =
    params.last5MockAvgPct !== null ? Math.min(100, params.last5MockAvgPct) : 0;
  const mockEvidence =
    params.last5MockAvgPct !== null
      ? `Average score of last 5 mocks: ${params.last5MockAvgPct.toFixed(1)}%.`
      : "No mock test data. Log mocks on the Mocks page.";

  
  const accScore =
    params.accuracy30Day !== null ? Math.min(100, params.accuracy30Day) : 0;
  const accEvidence =
    params.accuracy30Day !== null
      ? `30-day question accuracy: ${params.accuracy30Day.toFixed(0)}%.`
      : "No question batch data in last 30 days.";

  
  const revScore =
    params.revisionAdherence30 !== null ? Math.min(100, params.revisionAdherence30) : 0;
  const revEvidence =
    params.revisionAdherence30 !== null
      ? `${params.revisionAdherence30}% of due revisions completed in last 30 days.`
      : "No revisions due in the last 30 days.";

  
  const speedScore =
    params.speedDisciplinePct !== null
      ? Math.min(100, params.speedDisciplinePct)
      : 0; 
  const speedEvidence =
    params.speedDisciplinePct !== null
      ? `${params.speedDisciplinePct.toFixed(0)}% of mocks completed within recommended time.`
      : "No recommended-duration data on mocks - add it when logging mocks.";

  
  const hasTrendData = params.accuracyTrend !== null || params.mockTrend !== null;
  let trendScore = 0;
  if (hasTrendData) {
    const accTrendVal =
      params.accuracyTrend === "improving" ? 1 : params.accuracyTrend === "declining" ? -1 : 0;
    const mockTrendVal =
      params.mockTrend === "improving" ? 1 : params.mockTrend === "declining" ? -1 : 0;
    const trendAvg = (accTrendVal + mockTrendVal) / 2;
    trendScore = Math.round(50 + trendAvg * 50);
  }
  
  const trendLabels: Record<string, string> = {
    improving: "improving",
    stable: "stable",
    declining: "declining",
  };
  const trendEvidence = hasTrendData
    ? `Accuracy trend: ${trendLabels[params.accuracyTrend ?? "stable"] ?? "stable"}, mock score trend: ${trendLabels[params.mockTrend ?? "stable"] ?? "stable"}.`
    : "Not enough data to calculate performance trends.";

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



export interface WeakArea {
  topicId: string;
  topicName: string;
  subjectName: string;
  subjectColor: string;
  
  accuracy: number;
  attempted: number;
  
  mockCorroboration: boolean;
  urgency: "critical" | "high" | "medium";
  
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
  
  mockSectionAccMap: Map<string, { attempted: number; correct: number }>;
  
  minSampleSize?: number;
  
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
    if (tp.attempted < minSampleSize) continue; 
    const accuracy = tp.attempted > 0 ? (tp.correct / tp.attempted) * 100 : 0;
    if (accuracy >= weakThreshold) continue;

    const mockKey = tp.topicName.toLowerCase().trim();
    const mockData = mockSectionAccMap.get(mockKey);
    const mockCorroboration =
      !!mockData &&
      mockData.attempted >= 5 &&
      mockData.correct / mockData.attempted < weakThreshold / 100;

    
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

  
  const urgencyOrder = { critical: 0, high: 1, medium: 2 };
  weakAreas.sort(
    (a, b) =>
      urgencyOrder[a.urgency] - urgencyOrder[b.urgency] ||
      a.accuracy - b.accuracy
  );

  return weakAreas;
}



export interface NextAction {
  type: "study" | "practice" | "revise" | "mock" | "pyq";
  priority: number; 
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
  
  unstartedTopics: string[];
  
  pyqPendingTopics: string[];
  
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

  
  if (pyqPendingTopics.length > 0) {
    const top3 = pyqPendingTopics.slice(0, 3).join(", ");
    actions.push({
      type: "pyq",
      priority: 4,
      label: `Practice PYQs for ${pyqPendingTopics.length} learned topic${pyqPendingTopics.length !== 1 ? "s" : ""}`,
      reason: `Topics marked as learned but PYQs not yet done: ${top3}${pyqPendingTopics.length > 3 ? "…" : ""}. PYQs align practice to actual exam patterns.`,
    });
  }

  
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

  
  return actions.sort((a, b) => a.priority - b.priority).slice(0, 5);
}




export const KNOWN_EXAM_DATES: Array<{
  name: string;
  examType: "banking" | "ssc";
  stage: string;
  estimatedDate: string; 
  source: string;
}> = [
  
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
  
  {
    name: "SSC CGL 2026",
    examType: "ssc",
    stage: "Tier 2",
    estimatedDate: "2026-12-15",
    source: "SSC official notification, May 2026",
  },
];


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
  
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2027, category: "General", cutoff: 138.00, maximumMarks: 200, reference: "Estimated from 2025 cutoff (136.83) + ~1% trend" },
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2027, category: "OBC",     cutoff: 138.00, maximumMarks: 200, reference: "Estimated from 2025 trend" },
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2027, category: "SC",      cutoff: 116.00, maximumMarks: 200, reference: "Estimated from 2025 cutoff (114.97)" },
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2027, category: "ST",      cutoff: 107.00, maximumMarks: 200, reference: "Estimated from 2025 cutoff (106.37)" },
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2025, category: "General", cutoff: 136.83, maximumMarks: 200, reference: "SSC CGL 2025 official result, Dec 2025" },
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2025, category: "SC",      cutoff: 114.97, maximumMarks: 200, reference: "SSC CGL 2025 official result" },
  { examType: "ssc", examName: "SSC CGL", stage: "Tier 1", year: 2025, category: "ST",      cutoff: 106.37, maximumMarks: 200, reference: "SSC CGL 2025 official result" },

  
  { examType: "banking", examName: "SBI PO", stage: "Prelims", year: 2027, category: "General", cutoff: 67.00, maximumMarks: 100, reference: "Estimated from 2026 cutoff (66.25) + slight uptick" },
  { examType: "banking", examName: "SBI PO", stage: "Prelims", year: 2026, category: "General", cutoff: 66.25, maximumMarks: 100, reference: "SBI PO 2026 official cutoff, Sep 2026" },
  { examType: "banking", examName: "SBI PO", stage: "Prelims", year: 2025, category: "General", cutoff: 66.75, maximumMarks: 100, reference: "SBI PO 2025 official cutoff" },

  
  { examType: "banking", examName: "SBI PO", stage: "Mains", year: 2027, category: "General", cutoff: 76.00, maximumMarks: 250, reference: "Estimated from 2025 cutoff (75.00) + trend" },
  { examType: "banking", examName: "SBI PO", stage: "Mains", year: 2025, category: "General", cutoff: 75.00, maximumMarks: 250, reference: "SBI PO 2025 official cutoff" },

  
  { examType: "banking", examName: "IBPS PO", stage: "Prelims", year: 2027, category: "General", cutoff: 50.00, maximumMarks: 100, reference: "Estimated from 2025 cutoff (49.21) + trend" },
  { examType: "banking", examName: "IBPS PO", stage: "Prelims", year: 2025, category: "General", cutoff: 49.21, maximumMarks: 100, reference: "IBPS PO 2025 official cutoff" },

  
  { examType: "banking", examName: "IBPS PO", stage: "Mains", year: 2027, category: "General", cutoff: 76.50, maximumMarks: 225, reference: "Estimated from 2025 cutoff (75.75) + trend" },
  { examType: "banking", examName: "IBPS PO", stage: "Mains", year: 2025, category: "General", cutoff: 75.75, maximumMarks: 225, reference: "IBPS PO 2025 official cutoff" },
];

/**
 * Mock test metrics — all from PRD metric dictionary §44.
 * Implemented once here, reused in dashboard KPI strip, drill-down, reports, exports.
 */

export type MockPerformanceCase = "A" | "B" | "C" | "D";

export interface MockClassification {
  case: MockPerformanceCase;
  label: string;
  diagnosis: string;
  action: string;
}

export function mockAccuracy(
  correct: number,
  attempted: number
): number | null {
  if (attempted === 0) return null;
  return (correct / attempted) * 100;
}

export function timeGap(
  actualMinutes: number,
  recommendedMinutes: number | null
): number | null {
  if (recommendedMinutes === null) return null;
  return actualMinutes - recommendedMinutes;
}

/**
 * cutoffGap = score − historical_cutoff
 * Positive = above cutoff; Negative = below cutoff.
 */
export function cutoffGap(score: number, cutoff: number): number {
  return score - cutoff;
}

/**
 * safetyGap = score − safety_target
 * Positive = above target; Negative = below target.
 */
export function safetyGap(score: number, safetyTarget: number): number {
  return score - safetyTarget;
}

/**
 * Classify mock performance into one of four cases (PRD §37 decision matrix).
 *
 * Thresholds (configurable in the future; using sensible defaults):
 *   high accuracy  = accuracy ≥ 80%
 *   positive time  = timeGap > 0 (took longer than recommended)
 *
 * Case A: High marks + High accuracy + Slow   → Speed bottleneck
 * Case B: High marks + Low  accuracy + Fast   → Rushing/guessing risk
 * Case C: Low  marks + Low  accuracy + Slow   → Knowledge + speed issue
 * Case D: Low  marks + High accuracy + Slow   → Insufficient attempt volume
 */
export function classifyMockPerformance(params: {
  score: number;
  maximumMarks: number;
  correct: number;
  attempted: number;
  actualMinutes: number;
  recommendedMinutes: number | null;
  /** Percentage of max marks considered "high" — default 60 */
  highMarksThresholdPct?: number;
  /** Accuracy percentage considered "high" — default 80 */
  highAccuracyThreshold?: number;
}): MockClassification | null {
  const {
    score,
    maximumMarks,
    correct,
    attempted,
    actualMinutes,
    recommendedMinutes,
    highMarksThresholdPct = 60,
    highAccuracyThreshold = 80,
  } = params;

  if (maximumMarks === 0) return null;

  const scorePct = (score / maximumMarks) * 100;
  const acc = mockAccuracy(correct, attempted);
  if (acc === null) return null;

  const gap = timeGap(actualMinutes, recommendedMinutes);
  const isSlow = gap === null ? false : gap > 0;
  const isHighMarks = scorePct >= highMarksThresholdPct;
  const isHighAccuracy = acc >= highAccuracyThreshold;

  if (isHighMarks && isHighAccuracy && isSlow) {
    return {
      case: "A",
      label: "Accurate but Slow",
      diagnosis: "Speed bottleneck — knowledge is solid, execution pace needs work",
      action: "Focus on timed practice sets with strict per-question time limits",
    };
  }
  if (isHighMarks && !isHighAccuracy && !isSlow) {
    return {
      case: "B",
      label: "Fast but Inaccurate",
      diagnosis: "Rushing/guessing risk — speed is there, selection discipline is not",
      action: "Practice accuracy-first — attempt fewer questions more carefully",
    };
  }
  if (!isHighMarks && !isHighAccuracy && isSlow) {
    return {
      case: "C",
      label: "Low Marks + Low Accuracy + Slow",
      diagnosis: "Knowledge and speed gap — foundational concepts need reinforcement",
      action: "Return to concept revision and targeted practice before timed sets",
    };
  }
  if (!isHighMarks && isHighAccuracy && isSlow) {
    return {
      case: "D",
      label: "Accurate but Under-Attempted",
      diagnosis: "Insufficient attempt volume under time pressure",
      action: "Work on attempt strategy — prioritise high-confidence questions first",
    };
  }

  // Fallback: doesn't neatly fit one case
  return null;
}

/**
 * Validate mock entry before write (PRD §E).
 */
export function validateMock(mock: {
  score: number;
  maximumMarks: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  actualDurationMinutes: number;
}): void {
  const { score, maximumMarks, attempted, correct, wrong, unattempted, actualDurationMinutes } =
    mock;
  if (score > maximumMarks) {
    throw new Error(`score (${score}) cannot exceed maximum_marks (${maximumMarks})`);
  }
  if (correct + wrong + unattempted !== attempted) {
    throw new Error(
      `correct (${correct}) + wrong (${wrong}) + unattempted (${unattempted}) must equal attempted (${attempted})`
    );
  }
  if (actualDurationMinutes <= 0) {
    throw new Error("actual_duration_minutes must be > 0");
  }
  if (score < 0 || attempted < 0 || correct < 0 || wrong < 0 || unattempted < 0) {
    throw new Error("All numeric values must be ≥ 0");
  }
}

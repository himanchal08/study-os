/**
 * Accuracy and question-batch metrics.
 * Rule: every metric implemented once here, reused everywhere (LLM rules §5.1).
 */

/**
 * accuracy = correct ÷ attempted × 100
 * Guards against zero denominator → returns null (render "no data", never 0% or NaN).
 *
 * @example accuracy(42, 50) → 84
 * @example accuracy(0, 0) → null
 */
export function accuracy(
  correct: number,
  attempted: number
): number | null {
  if (attempted === 0) return null;
  return (correct / attempted) * 100;
}

/**
 * questions_per_hour = attempted ÷ active_practice_hours
 * Guards against zero denominator → returns null.
 */
export function questionsPerHour(
  attempted: number,
  activeStudyHours: number
): number | null {
  if (activeStudyHours === 0) return null;
  return attempted / activeStudyHours;
}

/**
 * Validate a question batch before write.
 * Throws with a descriptive message on any violation (PRD §E).
 */
export function validateQuestionBatch(batch: {
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
}): void {
  const { attempted, correct, wrong, skipped } = batch;
  if (attempted < 0 || correct < 0 || wrong < 0 || skipped < 0) {
    throw new Error("All counts must be ≥ 0");
  }
  if (correct + wrong + skipped > attempted) {
    throw new Error(
      `correct (${correct}) + wrong (${wrong}) + skipped (${skipped}) must be ≤ attempted (${attempted})`
    );
  }
  if (attempted === 0) {
    throw new Error("attempted must be > 0 to log a batch");
  }
}




export function accuracy(
  correct: number,
  attempted: number
): number | null {
  if (attempted === 0) return null;
  return (correct / attempted) * 100;
}


export function questionsPerHour(
  attempted: number,
  activeStudyHours: number
): number | null {
  if (activeStudyHours === 0) return null;
  return attempted / activeStudyHours;
}


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

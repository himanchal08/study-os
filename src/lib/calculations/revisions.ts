
export function revisionAdherence(
  completedDue: number,
  totalDue: number
): number | null {
  if (totalDue === 0) return null;
  return (completedDue / totalDue) * 100;
}

/**
 * Compute the next due date for a revision cycle.
 * @param completedAt  ISO date string of completion
 * @param cycleType    daily | weekly | monthly
 * @param adaptiveIntervalDays  if set (and adaptive mode on), override the cycle interval
 */
export function nextDueDate(
  completedAt: string,
  cycleType: "daily" | "weekly" | "monthly",
  adaptiveIntervalDays?: number | null
): string {
  const base = new Date(completedAt);

  if (adaptiveIntervalDays != null) {
    base.setDate(base.getDate() + adaptiveIntervalDays);
    return base.toISOString().split("T")[0];
  }

  const cycleDays = { daily: 1, weekly: 7, monthly: 30 } as const;
  base.setDate(base.getDate() + cycleDays[cycleType]);
  return base.toISOString().split("T")[0];
}

/**
 * SM-2-inspired adaptive interval adjustment.
 * Takes the current interval and a recall score (0–5) and returns the new interval in days.
 *
 * Opt-in only — deterministic daily/weekly/monthly cadence remains the default.
 * Only used when adaptive revision is enabled in user settings.
 *
 * @param currentIntervalDays  Current interval (1 for daily, 7 for weekly, etc.)
 * @param recallScore         0–5 (0 = completely forgot, 5 = perfect recall)
 */
export function adaptiveInterval(
  currentIntervalDays: number,
  recallScore: number
): number {
  // Score ≥ 3 = correct response → stretch interval
  // Score < 3 = incorrect → compress to 1 day
  if (recallScore < 3) return 1;
  if (recallScore === 3) return Math.max(1, Math.round(currentIntervalDays * 1.2));
  if (recallScore === 4) return Math.max(1, Math.round(currentIntervalDays * 1.5));
  // score 5
  return Math.max(1, Math.round(currentIntervalDays * 2.0));
}

/**
 * Validate a revision before marking complete (PRD §E).
 * A revision cannot be marked complete before (due_date - grace_window_days).
 */
export function validateRevisionCompletion(params: {
  dueDate: string;
  completedAt: string;
  graceWindowDays: number;
}): void {
  const { dueDate, completedAt, graceWindowDays } = params;
  const earliest = new Date(dueDate);
  earliest.setDate(earliest.getDate() - graceWindowDays);
  const completed = new Date(completedAt);
  if (completed < earliest) {
    throw new Error(
      `Revision cannot be completed more than ${graceWindowDays} day(s) before its due date`
    );
  }
}

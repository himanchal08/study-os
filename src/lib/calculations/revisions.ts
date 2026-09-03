
export function revisionAdherence(
  completedDue: number,
  totalDue: number
): number | null {
  if (totalDue === 0) return null;
  return (completedDue / totalDue) * 100;
}


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


export function adaptiveInterval(
  currentIntervalDays: number,
  recallScore: number
): number {
  
  
  if (recallScore < 3) return 1;
  if (recallScore === 3) return Math.max(1, Math.round(currentIntervalDays * 1.2));
  if (recallScore === 4) return Math.max(1, Math.round(currentIntervalDays * 1.5));
  
  return Math.max(1, Math.round(currentIntervalDays * 2.0));
}


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

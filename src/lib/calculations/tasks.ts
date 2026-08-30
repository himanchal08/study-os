/**
 * Task and planning metrics.
 * All metrics defined once here, reused in dashboard, planning page, reports.
 */

/**
 * taskCompletionRate = completed ÷ planned × 100
 * Guards zero denominator → null (render "no data").
 */
export function taskCompletionRate(
  completed: number,
  planned: number
): number | null {
  if (planned === 0) return null;
  return (completed / planned) * 100;
}

/**
 * postponementRate = postponed ÷ planned × 100
 * Guards zero denominator → null.
 */
export function postponementRate(
  postponed: number,
  planned: number
): number | null {
  if (planned === 0) return null;
  return (postponed / planned) * 100;
}

/**
 * Validate a task before write (PRD §E + v3 additions).
 * due_date must be ≥ planned_date if set.
 */
export function validateTask(task: {
  plannedDate: string;
  dueDate?: string | null;
}): void {
  if (task.dueDate && task.dueDate < task.plannedDate) {
    throw new Error(
      `due_date (${task.dueDate}) must be ≥ planned_date (${task.plannedDate})`
    );
  }
}

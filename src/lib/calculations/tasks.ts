


export function taskCompletionRate(
  completed: number,
  planned: number
): number | null {
  if (planned === 0) return null;
  return (completed / planned) * 100;
}


export function postponementRate(
  postponed: number,
  planned: number
): number | null {
  if (planned === 0) return null;
  return (postponed / planned) * 100;
}


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

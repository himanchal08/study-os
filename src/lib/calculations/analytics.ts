
import { dayBoundaryAwareDate, secondsToHours } from "./time";


export function allocationPct(
  subjectSeconds: number,
  totalTrackedSeconds: number
): number | null {
  if (totalTrackedSeconds === 0) return null;
  return (subjectSeconds / totalTrackedSeconds) * 100;
}


export function activePracticeRatio(
  practiceSeconds: number,
  revisionSeconds: number,
  totalStudySeconds: number
): number | null {
  if (totalStudySeconds === 0) return null;
  return ((practiceSeconds + revisionSeconds) / totalStudySeconds) * 100;
}


export function groupSessionsByDay(
  sessions: Array<{
    start_timestamp: string;
    end_timestamp: string | null;
    pause_duration_seconds: number;
  }>,
  offsetMin: number,
  timezone: string
): Map<string, number> {
  const result = new Map<string, number>();

  for (const s of sessions) {
    if (!s.end_timestamp) continue; 
    const dateKey = dayBoundaryAwareDate(
      new Date(s.start_timestamp).getTime(),
      offsetMin,
      timezone
    );
    const durationSec =
      (new Date(s.end_timestamp).getTime() -
        new Date(s.start_timestamp).getTime()) /
        1000 -
      s.pause_duration_seconds;
    const hours = secondsToHours(Math.max(0, durationSec));
    result.set(dateKey, (result.get(dateKey) ?? 0) + hours);
  }

  return result;
}


export function examProximityWeight(
  examDate: string | null,
  horizonDays = 60
): number {
  if (!examDate) return 1.0;
  const today = new Date();
  const exam = new Date(examDate);
  const daysRemaining = Math.max(0, Math.ceil((exam.getTime() - today.getTime()) / 86400000));
  if (daysRemaining >= horizonDays) return 1.0;
  
  return 1.0 + (1.0 - daysRemaining / horizonDays);
}

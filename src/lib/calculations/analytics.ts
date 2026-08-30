
import { dayBoundaryAwareDate, secondsToHours } from "./time";

/**
 * allocationPct = subject_time ÷ total_tracked_time × 100
 * Guards zero denominator → null.
 */
export function allocationPct(
  subjectSeconds: number,
  totalTrackedSeconds: number
): number | null {
  if (totalTrackedSeconds === 0) return null;
  return (subjectSeconds / totalTrackedSeconds) * 100;
}

/**
 * activePracticeRatio = (practice + revision) ÷ total_study_time × 100
 * Guards zero denominator → null.
 */
export function activePracticeRatio(
  practiceSeconds: number,
  revisionSeconds: number,
  totalStudySeconds: number
): number | null {
  if (totalStudySeconds === 0) return null;
  return ((practiceSeconds + revisionSeconds) / totalStudySeconds) * 100;
}

/**
 * Group an array of study sessions by day-boundary-aware date.
 * Returns a Map<dateString, totalHours>.
 *
 * @param sessions  array of sessions with start/end timestamps
 * @param offsetMin day_boundary_offset_minutes from user profile
 * @param timezone  IANA timezone from user profile
 */
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
    if (!s.end_timestamp) continue; // skip open sessions
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

/**
 * Exam-proximity weight factor for adaptive planning (New Feature #2).
 * Returns a multiplier 1.0–2.0 based on days remaining until exam.
 * At ≥ 60 days: 1.0 (no extra weight).
 * At 0 days: 2.0 (maximum urgency).
 */
export function examProximityWeight(
  examDate: string | null,
  horizonDays = 60
): number {
  if (!examDate) return 1.0;
  const today = new Date();
  const exam = new Date(examDate);
  const daysRemaining = Math.max(0, Math.ceil((exam.getTime() - today.getTime()) / 86400000));
  if (daysRemaining >= horizonDays) return 1.0;
  // Linear interpolation from 1.0 (at horizon) to 2.0 (at 0 days)
  return 1.0 + (1.0 - daysRemaining / horizonDays);
}


import { dayBoundaryAwareDate } from "./time";


export function computeStreaks(
  sessions: Array<{
    start_timestamp: string;
    end_timestamp: string | null;
    pause_duration_seconds: number;
  }>,
  offsetMin: number,
  timezone: string,
  annotations: Map<string, { exclude_from_trends: boolean }> = new Map()
): { current: number; longest: number } {
  
  const studyDates = new Set<string>();
  for (const s of sessions) {
    if (!s.end_timestamp) continue;
    studyDates.add(
      dayBoundaryAwareDate(
        new Date(s.start_timestamp).getTime(),
        offsetMin,
        timezone
      )
    );
  }

  if (studyDates.size === 0) return { current: 0, longest: 0 };

  
  const sorted = [...studyDates].sort();

  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / 86400000
    );

    if (diffDays === 1) {
      tempStreak++;
    } else if (diffDays > 1) {
      
      let gapIsAnnotated = true;
      for (let d = 1; d < diffDays; d++) {
        const gapDate = new Date(prev);
        gapDate.setDate(gapDate.getDate() + d);
        const gapDateStr = gapDate.toISOString().split("T")[0];
        if (!annotations.has(gapDateStr)) {
          gapIsAnnotated = false;
          break;
        }
      }
      if (!gapIsAnnotated) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
      
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  
  const todayStr = dayBoundaryAwareDate(Date.now(), offsetMin, timezone);
  const yesterdayStr = (() => {
    const d = new Date(todayStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();

  if (!studyDates.has(todayStr) && !studyDates.has(yesterdayStr)) {
    currentStreak = 0;
  } else {
    currentStreak = tempStreak; 
  }

  return { current: currentStreak, longest: longestStreak };
}

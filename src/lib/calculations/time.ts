


export function dayBoundaryAwareDate(
  timestampMs: number,
  offsetMinutes: number,
  timezone: string
): string {
  
  
  const shiftedMs = timestampMs - offsetMinutes * 60 * 1000;
  return new Date(shiftedMs).toLocaleDateString("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }); 
}


export function studyDurationSeconds(
  startTimestamp: string,
  endTimestamp: string | null,
  pauseDurationSec: number
): number {
  if (!endTimestamp) return 0;
  const durationSec =
    (new Date(endTimestamp).getTime() - new Date(startTimestamp).getTime()) /
    1000;
  return Math.max(0, durationSec - pauseDurationSec);
}


export function secondsToHours(seconds: number): number {
  return seconds / 3600;
}


export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}


export function timeOfDayBucket(
  timestampMs: number,
  timezone: string
): "early_morning" | "morning" | "afternoon" | "evening" | "night" | "late_night" {
  const hour = parseInt(
    new Date(timestampMs).toLocaleString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }),
    10
  );
  if (hour >= 4 && hour < 7) return "early_morning";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  if (hour >= 20 && hour < 23) return "night";
  return "late_night"; 
}

/**
 * Day-boundary-aware date utilities.
 *
 * All daily aggregation in Study OS buckets by the user's configured
 * day_boundary_offset_minutes (default 0 = midnight).
 *
 * Rule: a timestamp at 00:30 AM with offset 180 (3 AM boundary)
 * still belongs to the PREVIOUS calendar day.
 */

/**
 * Shift a UTC timestamp by the user's day-boundary offset and return
 * the resulting local date string (YYYY-MM-DD).
 *
 * @param timestampMs  - UTC milliseconds since epoch
 * @param offsetMinutes - user's day_boundary_offset_minutes (0 = midnight default)
 * @param timezone     - IANA timezone string (e.g. "Asia/Kolkata")
 */
export function dayBoundaryAwareDate(
  timestampMs: number,
  offsetMinutes: number,
  timezone: string
): string {
  // Subtract the offset so that e.g. 01:00 AM with a 3 AM boundary
  // is shifted back to 22:00 PM of the prior calendar day.
  const shiftedMs = timestampMs - offsetMinutes * 60 * 1000;
  return new Date(shiftedMs).toLocaleDateString("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }); // returns YYYY-MM-DD in en-CA locale
}

/**
 * Compute study duration in seconds from a session.
 * study_duration = end_timestamp - start_timestamp - pause_duration_seconds
 *
 * @param startTimestamp   ISO string
 * @param endTimestamp     ISO string (null if session still open → returns 0)
 * @param pauseDurationSec total accumulated pause time in seconds
 */
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

/**
 * Convert seconds to hours (decimal).
 */
export function secondsToHours(seconds: number): number {
  return seconds / 3600;
}

/**
 * Format seconds as "Xh Ym" for display.
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Return the time-of-day bucket for a given timestamp.
 * Buckets: early_morning / morning / afternoon / evening / night / late_night
 */
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
  return "late_night"; // 23:00 – 03:59
}

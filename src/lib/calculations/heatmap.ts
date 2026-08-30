/**
 * Heatmap data builder — day-boundary-aware (PRD Phase 12).
 * Every heatmap cell is a VIEW over raw study_sessions, never a cached count.
 */

import { dayBoundaryAwareDate, secondsToHours } from "./time";

export type HeatmapMetric = "hours" | "tasks" | "questions" | "revisions" | "mocks";

export interface HeatmapCell {
  date: string; // YYYY-MM-DD
  value: number;
  metric: HeatmapMetric;
  isAnnotated: boolean;
  annotationTag?: string;
  /** true = no data at all (never started); false = genuinely zero effort */
  isMissing: boolean;
}

export interface BuildHeatmapParams {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  sessions?: Array<{
    start_timestamp: string;
    end_timestamp: string | null;
    pause_duration_seconds: number;
  }>;
  taskCounts?: Map<string, number>;
  questionCounts?: Map<string, number>;
  revisionCounts?: Map<string, number>;
  mockCounts?: Map<string, number>;
  annotations?: Map<string, { tag: string; exclude_from_trends: boolean }>;
  metric: HeatmapMetric;
  dayBoundaryOffsetMin: number;
  timezone: string;
  /** Dates for which we have at least some telemetry (to distinguish missing from zero) */
  knownDates?: Set<string>;
}

/**
 * Build an array of HeatmapCell objects for the given date range.
 * Uses day-boundary-aware aggregation throughout.
 *
 * Missing telemetry is flagged as isMissing=true and MUST NOT be rendered
 * identically to a genuine zero-effort day (PRD Phase 12 guardrail).
 */
export function buildHeatmapData(params: BuildHeatmapParams): HeatmapCell[] {
  const {
    startDate,
    endDate,
    sessions = [],
    taskCounts = new Map(),
    questionCounts = new Map(),
    revisionCounts = new Map(),
    mockCounts = new Map(),
    annotations = new Map(),
    metric,
    dayBoundaryOffsetMin,
    timezone,
    knownDates = new Set(),
  } = params;

  // Build hours-by-date map from sessions
  const hoursByDate = new Map<string, number>();
  for (const s of sessions) {
    if (!s.end_timestamp) continue;
    const dateKey = dayBoundaryAwareDate(
      new Date(s.start_timestamp).getTime(),
      dayBoundaryOffsetMin,
      timezone
    );
    const durationSec =
      (new Date(s.end_timestamp).getTime() - new Date(s.start_timestamp).getTime()) / 1000 -
      s.pause_duration_seconds;
    hoursByDate.set(dateKey, (hoursByDate.get(dateKey) ?? 0) + secondsToHours(Math.max(0, durationSec)));
  }

  const cells: HeatmapCell[] = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);

  while (cursor <= end) {
    const dateStr = cursor.toISOString().split("T")[0];
    const annotation = annotations.get(dateStr);

    let value = 0;
    switch (metric) {
      case "hours":
        value = hoursByDate.get(dateStr) ?? 0;
        break;
      case "tasks":
        value = taskCounts.get(dateStr) ?? 0;
        break;
      case "questions":
        value = questionCounts.get(dateStr) ?? 0;
        break;
      case "revisions":
        value = revisionCounts.get(dateStr) ?? 0;
        break;
      case "mocks":
        value = mockCounts.get(dateStr) ?? 0;
        break;
    }

    cells.push({
      date: dateStr,
      value,
      metric,
      isAnnotated: !!annotation,
      annotationTag: annotation?.tag,
      // isMissing: date is in the past, has no telemetry, and is not annotated
      isMissing: !knownDates.has(dateStr) && !annotation && new Date(dateStr) < new Date(),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return cells;
}

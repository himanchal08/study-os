

import { dayBoundaryAwareDate, secondsToHours } from "./time";

export type HeatmapMetric = "hours" | "tasks" | "questions" | "revisions" | "mocks";

export interface HeatmapCell {
  date: string; 
  value: number;
  metric: HeatmapMetric;
  isAnnotated: boolean;
  annotationTag?: string;
  
  isMissing: boolean;
}

export interface BuildHeatmapParams {
  startDate: string; 
  endDate: string;   
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
  
  knownDates?: Set<string>;
}


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
      (s.pause_duration_seconds ?? 0);
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
      
      isMissing: !knownDates.has(dateStr) && !annotation && new Date(dateStr) < new Date(),
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return cells;
}

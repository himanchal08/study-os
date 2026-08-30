"use client";

import { useState } from "react";
import type { HeatmapCell, HeatmapMetric } from "@/lib/calculations";

interface HeatmapGridProps {
  cells: HeatmapCell[];
  metric: HeatmapMetric;
  /** How many weeks to show — default 52 */
  weeks?: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Map a float value to a heat level 0–5 */
function toHeatLevel(value: number, metric: HeatmapMetric): 0 | 1 | 2 | 3 | 4 | 5 {
  if (value <= 0) return 0;
  switch (metric) {
    case "hours":
      if (value < 1)  return 1;
      if (value < 3)  return 2;
      if (value < 5)  return 3;
      if (value < 8)  return 4;
      return 5;
    case "tasks":
      if (value < 2)  return 1;
      if (value < 4)  return 2;
      if (value < 6)  return 3;
      if (value < 8)  return 4;
      return 5;
    case "questions":
      if (value < 20) return 1;
      if (value < 50) return 2;
      if (value < 100) return 3;
      if (value < 200) return 4;
      return 5;
    default:
      if (value < 1)  return 1;
      if (value < 2)  return 2;
      if (value < 4)  return 3;
      if (value < 6)  return 4;
      return 5;
  }
}

function formatValue(value: number, metric: HeatmapMetric): string {
  switch (metric) {
    case "hours": return `${value.toFixed(1)}h`;
    default:      return `${value}`;
  }
}

const METRIC_LABELS: Record<HeatmapMetric, string> = {
  hours:     "study hours",
  tasks:     "tasks completed",
  questions: "questions",
  revisions: "revisions",
  mocks:     "mocks",
};

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  cell: HeatmapCell | null;
}

export function HeatmapGrid({ cells, metric, weeks = 52 }: HeatmapGridProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, cell: null });

  // Build a map for fast lookup
  const cellMap = new Map<string, HeatmapCell>(cells.map((c) => [c.date, c]));

  // Build grid: columns = weeks, rows = 7 days (Sun–Sat)
  // End date is today, start date is (weeks * 7 - 1) days ago
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Align start so the grid begins on Sunday
  const endDayOfWeek = today.getDay(); // 0 = Sun
  const totalDays = weeks * 7;
  const start = new Date(today);
  start.setDate(today.getDate() - totalDays + 1 + (6 - endDayOfWeek));
  // Adjust so columns always end on Saturday
  // Simple approach: just go back (weeks*7) days, then align to Sunday start
  const gridStart = new Date(today);
  gridStart.setDate(today.getDate() - (weeks * 7 - 1) - today.getDay());

  // Build columns (each column = one week, 7 cells, Sun on top)
  const columns: Array<Array<HeatmapCell | null>> = [];
  const monthLabels: Array<{ col: number; month: string }> = [];

  let prevMonth = -1;
  const cursor = new Date(gridStart);

  for (let col = 0; col < weeks; col++) {
    const week: Array<HeatmapCell | null> = [];
    for (let day = 0; day < 7; day++) {
      const dateStr = cursor.toISOString().split("T")[0];
      const isAfterToday = cursor > today;
      week.push(isAfterToday ? null : (cellMap.get(dateStr) ?? {
        date: dateStr,
        value: 0,
        metric,
        isAnnotated: false,
        isMissing: true,
      }));

      // Track month label position (first col of each new month)
      if (day === 0) {
        const m = cursor.getMonth();
        if (m !== prevMonth) {
          monthLabels.push({ col, month: MONTH_NAMES[m] });
          prevMonth = m;
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(week);
  }

  const CELL_SIZE = 11;
  const CELL_GAP  = 2;
  const COL_W     = CELL_SIZE + CELL_GAP;
  const ROW_H     = CELL_SIZE + CELL_GAP;
  const LEFT_PAD  = 28; // space for day labels
  const TOP_PAD   = 18; // space for month labels
  const svgW = LEFT_PAD + weeks * COL_W;
  const svgH = TOP_PAD + 7 * ROW_H;

  return (
    <div className="relative">
      {/* SVG grid */}
      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: "block", overflow: "visible" }}
        aria-label={`${METRIC_LABELS[metric]} heatmap — all days shown`}
      >
        {/* Month labels */}
        {monthLabels.map(({ col, month }) => (
          <text
            key={`${col}-${month}`}
            x={LEFT_PAD + col * COL_W}
            y={TOP_PAD - 5}
            fontSize={7}
            fill="rgba(232,232,240,0.3)"
            fontFamily="Inter, ui-sans-serif"
          >
            {month}
          </text>
        ))}

        {/* Day labels — all 7 */}
        {DAYS.map((day, i) => (
          <text
            key={day}
            x={LEFT_PAD - 4}
            y={TOP_PAD + i * ROW_H + CELL_SIZE * 0.75}
            fontSize={7}
            fill="rgba(232,232,240,0.25)"
            textAnchor="end"
            fontFamily="Inter, ui-sans-serif"
          >
            {day}
          </text>
        ))}

        {/* Cells */}
        {columns.map((week, colIdx) =>
          week.map((cell, rowIdx) => {
            if (cell === null) return null; // future day
            const x = LEFT_PAD + colIdx * COL_W;
            const y = TOP_PAD + rowIdx * ROW_H;
            const level = cell.isAnnotated ? "annotated" : (cell.isMissing ? "missing" : toHeatLevel(cell.value, metric));
            const className = level === "annotated"
              ? "heat-annotated"
              : level === "missing"
              ? "heat-missing"
              : `heat-${level}`;

            return (
              <rect
                key={cell.date}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                className={`heat-cell ${className}`}
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGRectElement).getBoundingClientRect();
                  setTooltip({ visible: true, x: rect.left + rect.width / 2, y: rect.top - 8, cell });
                }}
                onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
                aria-label={`${cell.date}: ${formatValue(cell.value, metric)}`}
              />
            );
          })
        )}
      </svg>

      {/* Floating tooltip — rendered outside SVG */}
      {tooltip.visible && tooltip.cell && (
        <div
          className="fixed z-50 px-2.5 py-1.5 rounded-lg text-xs pointer-events-none shadow-xl"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
            background: "#1a1a2c",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e8e8f0",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "rgba(232,232,240,0.5)" }}>{tooltip.cell.date}</span>
          {" — "}
          {tooltip.cell.isMissing
            ? <span style={{ color: "rgba(232,232,240,0.4)" }}>no data</span>
            : tooltip.cell.isAnnotated
            ? <span style={{ color: "#fbbf24" }}>{tooltip.cell.annotationTag ?? "annotated"}</span>
            : <span style={{ color: "#818cf8" }}>{formatValue(tooltip.cell.value, metric)} {METRIC_LABELS[metric]}</span>
          }
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px]" style={{ color: "rgba(232,232,240,0.3)" }}>Less</span>
        {[0, 1, 2, 3, 4, 5].map((l) => (
          <div key={l} className={`heat-cell heat-${l}`} style={{ width: CELL_SIZE, height: CELL_SIZE, flexShrink: 0 }} />
        ))}
        <span className="text-[10px]" style={{ color: "rgba(232,232,240,0.3)" }}>More</span>
      </div>
    </div>
  );
}

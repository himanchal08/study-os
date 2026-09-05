"use client";

import type { HeatmapCell, HeatmapMetric } from "@/lib/calculations";

interface HeatmapGridProps {
  cells: HeatmapCell[];
  metric: HeatmapMetric;
  weeks?: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const HEAT_COLORS = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353", "#69e87a"];

function toHeatLevel(value: number, metric: HeatmapMetric): 0 | 1 | 2 | 3 | 4 | 5 {
  if (value <= 0) return 0;
  switch (metric) {
    case "hours":
      if (value < 1) return 1;
      if (value < 3) return 2;
      if (value < 5) return 3;
      if (value < 8) return 4;
      return 5;
    case "tasks":
      if (value < 2) return 1;
      if (value < 4) return 2;
      if (value < 6) return 3;
      if (value < 8) return 4;
      return 5;
    case "questions":
      if (value < 20) return 1;
      if (value < 50) return 2;
      if (value < 100) return 3;
      if (value < 200) return 4;
      return 5;
    default:
      if (value < 1) return 1;
      if (value < 2) return 2;
      if (value < 4) return 3;
      if (value < 6) return 4;
      return 5;
  }
}

export function HeatmapGrid({ cells, metric, weeks = 52 }: HeatmapGridProps) {
  const cellMap = new Map<string, HeatmapCell>(cells.map((c) => [c.date, c]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const gridStart = new Date(today);
  gridStart.setDate(today.getDate() - today.getDay() - (weeks - 1) * 7);

  const columns: Array<Array<{ fill: string; isToday: boolean; date: string; value: number } | null>> = [];
  const monthLabels: Array<{ col: number; month: string }> = [];

  let prevMonth = -1;
  const cursor = new Date(gridStart);

  for (let col = 0; col < weeks; col++) {
    const week: Array<{ fill: string; isToday: boolean; date: string; value: number } | null> = [];
    for (let day = 0; day < 7; day++) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      const isAfterToday = cursor > today;

      if (isAfterToday) {
        week.push(null);
      } else {
        const cell = cellMap.get(dateStr);
        let fill: string;
        if (!cell || cell.isMissing || cell.value <= 0) {
          fill = HEAT_COLORS[0];
        } else if (cell.isAnnotated) {
          fill = "#f59e0b";
        } else {
          fill = HEAT_COLORS[toHeatLevel(cell.value, metric)];
        }
        week.push({ fill, isToday: dateStr === todayStr, date: dateStr, value: cell?.value ?? 0 });
      }

      if (day === 0) {
        const mo = cursor.getMonth();
        if (mo !== prevMonth) {
          monthLabels.push({ col, month: MONTH_NAMES[mo] });
          prevMonth = mo;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(week);
  }

  // Fixed cell size — SVG scales via viewBox + width="100%"
  const CELL_SIZE = 11;
  const CELL_GAP  = 2;
  const COL_W     = CELL_SIZE + CELL_GAP;
  const ROW_H     = CELL_SIZE + CELL_GAP;
  const LEFT_PAD  = 28;
  const TOP_PAD   = 18;
  const svgW = LEFT_PAD + weeks * COL_W;
  const svgH = TOP_PAD + 7 * ROW_H;

  return (
    <div className="relative">
      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: "block", overflow: "visible" }}
        aria-label="Study activity heatmap"
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

        {/* Day labels */}
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
            if (!cell) return null;
            const x = LEFT_PAD + colIdx * COL_W;
            const y = TOP_PAD + rowIdx * ROW_H;
            return (
              <rect
                key={cell.date}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                fill={cell.fill}
                stroke={cell.isToday ? "rgba(255,255,255,0.55)" : "none"}
                strokeWidth={cell.isToday ? 1 : 0}
                style={{ cursor: "default" }}
              >
                <title>
                  {cell.date}
                  {"\n"}
                  {cell.value > 0 ? `${cell.value.toFixed(1)}h studied` : "No activity"}
                </title>
              </rect>
            );
          })
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px]" style={{ color: "rgba(232,232,240,0.3)" }}>Less</span>
        {HEAT_COLORS.map((bg, i) => (
          <div key={i} style={{ width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2, background: bg, flexShrink: 0 }} />
        ))}
        <span className="text-[10px]" style={{ color: "rgba(232,232,240,0.3)" }}>More</span>
      </div>
    </div>
  );
}

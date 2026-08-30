"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface DailyBarData {
  date: string;        // "Mon", "Tue" etc
  hours: number;
  target: number;
  hitTarget: boolean;
  allTasksDone?: boolean;
}

interface StudyTimeChartProps {
  data: DailyBarData[];
  targetHours: number;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{
        background: "#1a1a2c",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#e8e8f0",
      }}
    >
      <p className="font-semibold mb-0.5">{label}</p>
      <p style={{ color: "#ededed" }}>{payload[0]?.value?.toFixed(1)}h studied</p>
    </div>
  );
}

export function StudyTimeChart({ data, targetHours }: StudyTimeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barSize={20} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={(props: any) => {
            const { x, y, payload } = props;
            const dataItem = data.find(d => d.date === payload.value);
            return (
              <g transform={`translate(${x},${y})`}>
                <text x={0} y={0} dy={16} textAnchor="middle" fill="rgba(232,232,240,0.35)" fontSize={11}>
                  {payload.value}
                </text>
                {dataItem?.allTasksDone && (
                  <text x={0} y={0} dy={28} textAnchor="middle" fontSize={10}>
                    ✨
                  </text>
                )}
              </g>
            );
          }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "rgba(232,232,240,0.25)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}h`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <ReferenceLine
          y={targetHours}
          stroke="rgba(251,191,36,0.4)"
          strokeDasharray="4 3"
          label={{ value: "target", fill: "rgba(251,191,36,0.5)", fontSize: 10, position: "right" }}
        />
        <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.hitTarget ? "#34d399" : entry.hours > 0 ? "#ededed" : "rgba(255,255,255,0.05)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

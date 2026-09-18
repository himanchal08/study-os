"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TopicSlice {
  name: string;
  subjectName: string | null;
  hours: number;
  color: string | null;
}

const FALLBACK_COLORS = [
  "#818cf8", "#34d399", "#fbbf24", "#22d3ee",
  "#fb7185", "#a78bfa", "#38bdf8", "#4ade80",
];

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: TopicSlice }>;
}) {
  if (!active || !payload?.length) return null;
  const { name, subjectName, hours } = payload[0].payload;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{
        background: "#1a1a2c",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#e8e8f0",
      }}
    >
      <p className="font-semibold text-neutral-100">{name}</p>
      {subjectName && (
        <p className="text-[10px] text-neutral-400 mb-1">{subjectName}</p>
      )}
      <p style={{ color: "rgba(232,232,240,0.55)" }}>{hours.toFixed(1)}h total</p>
    </div>
  );
}

export function TopicAllocationChart({ data }: { data: TopicSlice[] }) {
  const enriched = data.map((d, i) => ({
    ...d,
    fill: d.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));

  if (enriched.length === 0) {
    return (
      <div className="flex items-center justify-center h-50">
        <p className="text-sm" style={{ color: "rgba(232,232,240,0.3)" }}>No topics recorded yet</p>
      </div>
    );
  }

  const chartHeight = Math.max(200, enriched.length * 35);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart layout="vertical" data={enriched} margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "rgba(232,232,240,0.55)", fontSize: 11 }}
          width={120}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}

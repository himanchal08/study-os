"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface SubjectSlice {
  name: string;
  hours: number;
  color: string;
}

const FALLBACK_COLORS = [
  "#818cf8", "#34d399", "#fbbf24", "#22d3ee",
  "#fb7185", "#a78bfa", "#38bdf8", "#4ade80",
];

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: SubjectSlice }>;
}) {
  if (!active || !payload?.length) return null;
  const { name, hours } = payload[0].payload;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{
        background: "#1a1a2c",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#e8e8f0",
      }}
    >
      <p className="font-semibold">{name}</p>
      <p style={{ color: "rgba(232,232,240,0.55)" }}>{hours.toFixed(1)}h total</p>
    </div>
  );
}

export function SubjectAllocationChart({ data }: { data: SubjectSlice[] }) {
  const enriched = data.map((d, i) => ({
    ...d,
    color: d.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));

  if (enriched.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <p className="text-sm" style={{ color: "rgba(232,232,240,0.3)" }}>No sessions recorded yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart layout="vertical" data={enriched} margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "rgba(232,232,240,0.55)", fontSize: 11 }}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={16}>
          {enriched.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

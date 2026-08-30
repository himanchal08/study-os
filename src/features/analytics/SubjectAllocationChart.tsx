"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
      <PieChart>
        <Pie
          data={enriched}
          dataKey="hours"
          nameKey="name"
          cx="40%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          strokeWidth={0}
        >
          {enriched.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ color: "rgba(232,232,240,0.55)", fontSize: 11 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

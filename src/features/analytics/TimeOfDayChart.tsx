"use client";

interface TimeOfDayData {
  bucket: string;
  label: string;
  hours: number;
  emoji: string;
  color: string;
}

export function TimeOfDayChart({ data }: { data: TimeOfDayData[] }) {
  const max = Math.max(...data.map((d) => d.hours), 0.1);

  return (
    <div className="space-y-2.5">
      {data.map((row) => (
        <div key={row.bucket} className="flex items-center gap-3">
          <span className="text-base w-6 text-center" aria-hidden="true">{row.emoji}</span>
          <span
            className="text-xs w-24 shrink-0"
            style={{ color: "rgba(232,232,240,0.45)" }}
          >
            {row.label}
          </span>
          <div className="flex-1 relative h-5 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div
              className="h-full rounded-md transition-all duration-700"
              style={{
                width: `${(row.hours / max) * 100}%`,
                background: `linear-gradient(90deg, ${row.color}88, ${row.color})`,
                minWidth: row.hours > 0 ? 4 : 0,
              }}
            />
          </div>
          <span
            className="text-xs tabular-nums w-10 text-right shrink-0"
            style={{ color: row.hours > 0 ? row.color : "rgba(232,232,240,0.2)" }}
          >
            {row.hours > 0 ? `${row.hours.toFixed(1)}h` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

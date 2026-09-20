"use client";

import { useState } from "react";

interface Stats {
  attempted: number;
  correct: number;
  accuracy: number | null;
}

interface SubjectStat {
  name: string;
  color: string;
  attempted: number;
  correct: number;
}

interface BatchItem {
  id: string;
  logged_at: string;
  attempted: number;
  correct: number;
  source: string | null;
  notes: string | null;
  duration_minutes: number | null;
  subject: { name: string; color: string | null } | null;
  topic: { name: string } | null;
}

interface Props {
  todayStats: Stats;
  weekStats: Stats;
  allStats: Stats;
  subjectStats: SubjectStat[];
  batches: BatchItem[];
  todayStr: string;
  offsetMin: number;
  timezone: string;
}

type Tab = "today" | "week" | "all";

export function QuestionsClient({ todayStats, weekStats, allStats, subjectStats }: Props) {
  const [tab, setTab] = useState<Tab>("today");

  const stats = tab === "today" ? todayStats : tab === "week" ? weekStats : allStats;
  const tabLabel = tab === "today" ? "Today" : tab === "week" ? "Last 7 Days" : "All Time";

  const accColor = stats.accuracy === null
    ? "#525252"
    : stats.accuracy >= 80 ? "#10b981"
    : stats.accuracy >= 60 ? "#f59e0b"
    : "#ef4444";

  return (
    <div className="space-y-4">

      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        {(["today", "week", "all"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === t ? "#1a1a1a" : "transparent",
              color: tab === t ? "#ededed" : "#525252",
              border: tab === t ? "1px solid #262626" : "1px solid transparent",
            }}
          >
            {t === "today" ? "Today" : t === "week" ? "7 Days" : "All Time"}
          </button>
        ))}
      </div>


      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "Attempted",
            value: stats.attempted.toLocaleString(),
            color: "#ededed",
            empty: stats.attempted === 0,
          },
          {
            label: "Correct",
            value: stats.correct.toLocaleString(),
            color: "#10b981",
            empty: stats.attempted === 0,
          },
          {
            label: "Accuracy",
            value: stats.accuracy !== null ? `${stats.accuracy}%` : "—",
            color: accColor,
            empty: stats.accuracy === null,
          },
        ].map(({ label, value, color, empty }) => (
          <div
            key={label}
            className="rounded-xl p-3 text-center"
            style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
          >
            <p className="text-[9px] uppercase tracking-wider text-neutral-600 mb-1">{label}</p>
            <p
              className="text-lg font-bold tabular-nums"
              style={{ color: empty ? "#333" : color }}
            >
              {empty && label !== "Accuracy" ? "0" : value}
            </p>
            <p className="text-[9px] text-neutral-700 mt-0.5">{tabLabel}</p>
          </div>
        ))}
      </div>


      {subjectStats.length > 0 && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
        >
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Subject Breakdown <span className="text-neutral-700 font-normal normal-case">(all time)</span>
          </p>

          <div className="space-y-2.5">
            {subjectStats.map(s => {
              const pct = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0;
              const barColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
              const totalPct = allStats.attempted > 0
                ? Math.round((s.attempted / allStats.attempted) * 100)
                : 0;
              return (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: s.color }}
                      />
                      <span className="text-xs font-medium text-neutral-300 truncate">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] tabular-nums shrink-0">
                      <span className="text-neutral-600">{s.attempted.toLocaleString()} tried</span>
                      <span style={{ color: barColor }} className="font-semibold">{pct}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "#1a1a1a" }}
                    >

                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                    <span className="text-[9px] text-neutral-700 tabular-nums w-7 text-right shrink-0">
                      {totalPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>


          <div
            className="flex items-center justify-between pt-2"
            style={{ borderTop: "1px solid #1a1a1a" }}
          >
            <span className="text-[10px] text-neutral-600">Total questions</span>
            <div className="flex items-center gap-3 text-[10px] tabular-nums">
              <span className="text-neutral-400 font-semibold">{allStats.attempted.toLocaleString()} attempted</span>
              <span className="text-emerald-500 font-semibold">{allStats.correct.toLocaleString()} correct</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

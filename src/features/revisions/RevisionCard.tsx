"use client";

import { useTransition } from "react";
import { markRevisionDone } from "@/app/(dashboard)/revisions/actions";

interface RevisionCardProps {
  id: string;
  topicName: string;
  subjectName: string | null;
  subjectColor: string | null;
  cycleType: "daily" | "weekly" | "monthly";
  dueDate: string;
  isOverdue: boolean;
  completedAt: string | null;
}

const CYCLE_COLORS = {
  daily:   { text: "#38bdf8", bg: "#38bdf818" },
  weekly:  { text: "#a78bfa", bg: "#a78bfa18" },
  monthly: { text: "#f59e0b", bg: "#f59e0b18" },
};

const RECALL_LABELS = [
  { score: 1, label: "Forgot",  color: "#ef4444" },
  { score: 3, label: "Hard",    color: "#f59e0b" },
  { score: 4, label: "Good",    color: "#10b981" },
  { score: 5, label: "Easy",    color: "#34d399" },
];

export function RevisionCard({
  id, topicName, subjectName, subjectColor,
  cycleType, dueDate, isOverdue, completedAt,
}: RevisionCardProps) {
  const [isPending, startTransition] = useTransition();
  const cycleStyle = CYCLE_COLORS[cycleType];

  const done = (score: number) => {
    startTransition(() => { markRevisionDone(id, score); });
  };

  if (completedAt) {
    return (
      <div
        className="rounded-xl p-3.5 flex items-center gap-3 opacity-40"
        style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
      >
        <span className="text-emerald-400 shrink-0">✓</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-neutral-300 truncate">{topicName}</p>
          {subjectName && <p className="text-xs text-neutral-600">{subjectName}</p>}
        </div>
        <span className="text-xs text-neutral-600 shrink-0">done</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "#0a0a0a",
        border: `1px solid ${isOverdue ? "#7c1d1d55" : "#1a1a1a"}`,
      }}
    >
      {/* Topic info */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-neutral-100 leading-snug">{topicName}</p>
          <span className="text-[10px] text-neutral-600 shrink-0 mt-0.5">{dueDate}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {subjectName && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: `${subjectColor ?? "#555"}20`, color: subjectColor ?? "#aaa" }}
            >
              {subjectName}
            </span>
          )}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: cycleStyle.bg, color: cycleStyle.text }}
          >
            {cycleType}
          </span>
          {isOverdue && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full text-red-400" style={{ background: "#ef444418" }}>
              overdue
            </span>
          )}
        </div>
      </div>

      {/* Recall buttons — full width on mobile */}
      <div className="grid grid-cols-4 gap-px border-t" style={{ borderColor: "#1a1a1a" }}>
        {RECALL_LABELS.map(({ score, label, color }) => (
          <button
            key={score}
            type="button"
            disabled={isPending}
            onClick={() => done(score)}
            className="py-2.5 text-xs font-semibold transition-all hover:opacity-80 active:scale-95 disabled:opacity-40"
            style={{ background: `${color}14`, color }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

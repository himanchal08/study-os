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
  daily: { text: "#38bdf8", bg: "#38bdf820" },
  weekly: { text: "#a78bfa", bg: "#a78bfa20" },
  monthly: { text: "#f59e0b", bg: "#f59e0b20" },
};

const RECALL_LABELS = [
  { score: 1, label: "Forgot", color: "#ef4444" },
  { score: 3, label: "Hard", color: "#f59e0b" },
  { score: 4, label: "Good", color: "#10b981" },
  { score: 5, label: "Easy", color: "#34d399" },
];

export function RevisionCard({
  id,
  topicName,
  subjectName,
  subjectColor,
  cycleType,
  dueDate,
  isOverdue,
  completedAt,
}: RevisionCardProps) {
  const [isPending, startTransition] = useTransition();
  const cycleStyle = CYCLE_COLORS[cycleType];

  const done = (score: number) => {
    startTransition(() => {
      markRevisionDone(id, score);
    });
  };

  if (completedAt) {
    return (
      <div
        className="rounded-xl p-4 flex items-center gap-3 opacity-50"
        style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
      >
        <span className="text-emerald-400 text-lg shrink-0">✓</span>
        <div className="min-w-0">
          <p className="text-sm text-neutral-300 truncate">{topicName}</p>
          {subjectName && <p className="text-xs text-neutral-600">{subjectName}</p>}
        </div>
        <span className="ml-auto text-xs text-neutral-600 shrink-0">done</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "#0a0a0a",
        border: `1px solid ${isOverdue ? "#3f151533" : "#1a1a1a"}`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-200 truncate">{topicName}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {subjectName && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: `${subjectColor ?? "#555"}22`, color: subjectColor ?? "#aaa" }}
              >
                {subjectName}
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: cycleStyle.bg, color: cycleStyle.text }}>
              {cycleType}
            </span>
            {isOverdue && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full text-red-400" style={{ background: "#ef444420" }}>
                overdue
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-neutral-600 shrink-0">{dueDate}</p>
      </div>

      {/* Recall score buttons */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-neutral-600 uppercase tracking-wider mr-1">Recall:</span>
        {RECALL_LABELS.map(({ score, label, color }) => (
          <button
            key={score}
            type="button"
            disabled={isPending}
            onClick={() => done(score)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-95 disabled:opacity-40"
            style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

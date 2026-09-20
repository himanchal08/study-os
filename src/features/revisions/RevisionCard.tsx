"use client";

import { useTransition, useState } from "react";
import { markRevisionDone, deleteRevision, undoRevision } from "@/app/(dashboard)/revisions/actions";

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
  { score: 2, label: "Vague",   color: "#fb923c" },
  { score: 3, label: "Hard",    color: "#f59e0b" },
  { score: 4, label: "Good",    color: "#10b981" },
  { score: 5, label: "Easy",    color: "#34d399" },
];

export function RevisionCard({
  id, topicName, subjectName, subjectColor,
  cycleType, dueDate, isOverdue, completedAt,
}: RevisionCardProps) {
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cycleStyle = CYCLE_COLORS[cycleType];

  const done = (score: number) => {
    setSaveError(null);
    startTransition(async () => {
      const result = await markRevisionDone(id, score);
      if (result && "error" in result) {
        setSaveError(result.error ?? "Failed to save. Please try again.");
      }
    });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    startTransition(async () => {
      await deleteRevision(id);
    });
  };

  const handleUndo = () => {
    startTransition(async () => {
      await undoRevision(id);
    });
  };

  const handlePrefillTimer = () => {
    window.dispatchEvent(
      new CustomEvent("timer:prefill", {
        detail: {
          activityType: "revision",
          notes: topicName,
          revisionId: id,
        },
      })
    );
  };

  if (completedAt) {
    return (
      <div
        className="group rounded-xl p-3.5 flex items-center gap-3 opacity-40 hover:opacity-70 transition-opacity relative"
        style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
      >
        <span className="text-emerald-400 shrink-0">✓</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-neutral-300 truncate">{topicName}</p>
          {subjectName && <p className="text-xs text-neutral-600">{subjectName}</p>}
        </div>
        <span className="text-xs text-neutral-600 shrink-0">done</span>

        {/* Actions on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={isPending}
            onClick={handleUndo}
            title="Undo completion"
            className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 transition-all text-neutral-300 disabled:opacity-50"
          >
            Undo ↩
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            title="Delete this revision"
            className="text-neutral-600 hover:text-red-400 w-6 h-6 flex items-center justify-center rounded bg-neutral-900"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group rounded-xl overflow-hidden"
      style={{
        background: "#0a0a0a",
        border: `1px solid ${isOverdue ? "#7c1d1d55" : "#1a1a1a"}`,
      }}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-neutral-100 leading-snug">{topicName}</p>

          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span className="text-[10px] text-neutral-600">{dueDate}</span>

            <button
              type="button"
              disabled={isPending}
              onClick={handlePrefillTimer}
              title="Prefill timer for this revision"
              className="opacity-0 group-hover:opacity-100 transition-all text-xs w-6 h-6 flex items-center justify-center rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              title={confirmDelete ? "Click again to confirm delete" : "Delete this revision"}
              className="opacity-0 group-hover:opacity-100 transition-all text-xs w-6 h-6 flex items-center justify-center rounded"
              style={{ color: confirmDelete ? "#ef4444" : "#525252" }}
            >
              {confirmDelete ? "✕" : "✕"}
            </button>
          </div>
        </div>

        {confirmDelete && (
          <p className="text-[10px] text-red-400 mb-2">
            Click ✕ again to confirm delete
          </p>
        )}

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

      {saveError && (
        <div className="px-3.5 pb-3 text-xs text-red-400">
          Failed to save — {saveError}. Please try again.
        </div>
      )}

      <div className="grid grid-cols-5 gap-px border-t" style={{ borderColor: "#1a1a1a" }}>
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

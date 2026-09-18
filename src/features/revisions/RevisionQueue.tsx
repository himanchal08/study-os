"use client";

import { useEffect, useState, useTransition } from "react";
import { completeRevision, undoRevision } from "./actions";

interface RevisionQueueProps {
  revisions: Array<{
    id: string;
    topic_id: string;
    cycle_type: string;
    due_date: string;
    topics?: {
      name: string;
      subjects?: { name: string; color: string | null } | null;
    } | null;
  }>;
}

const RECALL = [
  { score: 1, label: "✗", title: "Forgot",  color: "#ef4444" },
  { score: 2, label: "~", title: "Vague",   color: "#fb923c" },
  { score: 3, label: "±", title: "Hard",    color: "#f59e0b" },
  { score: 4, label: "✓", title: "Good",    color: "#10b981" },
  { score: 5, label: "★", title: "Easy",    color: "#34d399" },
] as const;

const cycleLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

function RevisionItem({
  rev,
}: {
  rev: RevisionQueueProps["revisions"][number];
}) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (done) {
      timeout = setTimeout(() => {
        setHidden(true);
      }, 4000);
    }
    return () => clearTimeout(timeout);
  }, [done]);

  if (hidden) return null;

  if (done) {
    return (
      <li
        className="p-3 rounded-xl flex items-center justify-between transition-all"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed var(--border-subtle)",
          opacity: isPending ? 0.5 : 0.8,
        }}
      >
        <span className="text-xs italic text-neutral-500">Marked as completed</span>
        <button
          onClick={() => {
            startTransition(async () => {
              await undoRevision(rev.id);
              setDone(false);
            });
          }}
          disabled={isPending}
          className="text-xs font-medium px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 transition-all text-neutral-300 disabled:opacity-50"
        >
          Undo ↩
        </button>
      </li>
    );
  }

  return (
    <li
      className="p-3 rounded-xl transition-all"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--border-subtle)",
        opacity: isPending ? 0.5 : 1,
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: rev.topics?.subjects?.color ?? "#6366f1" }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-medium truncate"
            style={{ color: "var(--foreground)" }}
          >
            {rev.topics?.name ?? "Unknown topic"}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(226,226,240,0.4)" }}>
            {rev.topics?.subjects?.name} · {cycleLabels[rev.cycle_type] ?? rev.cycle_type}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {RECALL.map(({ score, label, title, color }) => (
          <button
            key={score}
            type="button"
            disabled={isPending}
            title={title}
            onClick={() => {
              startTransition(async () => {
                await completeRevision(rev.id, score);
                setDone(true);
              });
            }}
            className="py-1 rounded text-xs font-bold transition-all hover:opacity-80 active:scale-95 disabled:opacity-40"
            style={{ background: `${color}18`, color }}
          >
            {label}
          </button>
        ))}
      </div>
    </li>
  );
}

export function RevisionQueue({ revisions }: RevisionQueueProps) {
  return (
    <div className="glass rounded-2xl p-5 h-full w-full min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "rgba(226,226,240,0.4)" }}
        >
          Revisions Due
        </h2>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background:
              revisions.length > 0
                ? "rgba(239,68,68,0.15)"
                : "rgba(34,197,94,0.12)",
            color: revisions.length > 0 ? "#fca5a5" : "#86efac",
          }}
        >
          {revisions.length}
        </span>
      </div>

      {revisions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-sm font-medium" style={{ color: "#86efac" }}>
            All caught up!
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "rgba(226,226,240,0.35)" }}
          >
            No revisions due today.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {RECALL.map(({ label, title, color }) => (
              <span key={title} className="flex items-center gap-1 text-[10px]" style={{ color }}>
                <span className="font-bold">{label}</span> {title}
              </span>
            ))}
          </div>
          <ul className="space-y-2" aria-label="Revisions due today">
            {revisions.map((rev) => (
              <RevisionItem key={rev.id} rev={rev} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

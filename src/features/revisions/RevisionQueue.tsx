"use client";

import { useState, useTransition } from "react";
import { completeRevision } from "./actions";

interface RevisionQueueProps {
  userId: string;
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

export function RevisionQueue({ revisions }: RevisionQueueProps) {
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function handleComplete(revisionId: string) {
    setCompleting((prev) => new Set(prev).add(revisionId));
    startTransition(async () => {
      await completeRevision(revisionId);
      setCompleting((prev) => {
        const next = new Set(prev);
        next.delete(revisionId);
        return next;
      });
    });
  }

  const cycleLabels: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
  };

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
        <ul className="space-y-2" aria-label="Revisions due today">
          {revisions.map((rev) => (
            <li
              key={rev.id}
              className="flex items-center gap-3 p-3 rounded-xl transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border-subtle)",
                opacity: completing.has(rev.id) ? 0.5 : 1,
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: rev.topics?.subjects?.color ?? "#6366f1",
                }}
                aria-hidden="true"
              />

              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: "var(--foreground)" }}
                >
                  {rev.topics?.name ?? "Unknown topic"}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "rgba(226,226,240,0.4)" }}
                >
                  {rev.topics?.subjects?.name} ·{" "}
                  {cycleLabels[rev.cycle_type] ?? rev.cycle_type}
                </p>
              </div>

              <button
                onClick={() => handleComplete(rev.id)}
                disabled={completing.has(rev.id)}
                aria-label={`Mark ${rev.topics?.name ?? "revision"} as complete`}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80 shrink-0 disabled:opacity-40"
                style={{
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  color: "#86efac",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

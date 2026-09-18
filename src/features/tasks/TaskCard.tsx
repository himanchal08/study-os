"use client";

import { useState, useTransition } from "react";
import { updateTaskStatus, postponeTask, deleteTask, type TaskStatus } from "./actions";
import { startSession } from "@/features/study-timer/actions";
import type { Database } from "@/types/database";

export interface TaskItem {
  id: string;
  user_id: string;
  title: string;
  status: Database["public"]["Enums"]["task_status_enum"];
  planned_date: string;
  due_date: string | null;
  completed_at: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  failure_reason: string | null;
  postpone_count: number;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  subjects?: { id: string; name: string; color: string | null } | null;
  topics?: { id: string; name: string } | null;
}

interface TaskCardProps {
  task: TaskItem;
  userId: string;
}

export function TaskCard({ task, userId }: TaskCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [postponeDate, setPostponeDate] = useState(() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    // Use local date parts (not toISOString which is UTC) so the default
    // is always tomorrow in the user's browser timezone.
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, "0");
    const d = String(next.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [postponeReason, setPostponeReason] = useState("");

  const isCompleted = task.status === "completed";
  // Disable the start-session shortcut when a task has no subject and no topic.
  // A session without both creates an empty history entry with no metadata.
  const canStartSession = !!(task.subjects || task.topics);

  function handleToggleComplete() {
    const newStatus: TaskStatus = isCompleted ? "pending" : "completed";
    startTransition(async () => { await updateTaskStatus(task.id, newStatus); });
  }

  function handleStartStudy() {
    startTransition(async () => {
      await startSession({
        userId,
        taskId: task.id,
        subjectId: task.subjects?.id,
        topicId: task.topics?.id,
        notes: task.title,
        activityType: "practice",
      });
    });
  }

  function handlePostponeSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await postponeTask(task.id, postponeDate, postponeReason || null);
      setShowPostponeModal(false);
    });
  }

  function handleDelete() {
    startTransition(async () => { await deleteTask(task.id); });
  }

  return (
    <div
      className="rounded-xl transition-all overflow-hidden"
      style={{
        background: isCompleted ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.035)",
        border: isCompleted ? "1px solid rgba(255,255,255,0.04)" : "1px solid var(--border-subtle)",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 p-3.5">
        {/* Checkbox */}
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={isPending}
          aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
          className="mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center transition-all shrink-0"
          style={{
            background: isCompleted ? "#22c55e" : "rgba(255,255,255,0.06)",
            border: isCompleted ? "1px solid #22c55e" : "1px solid var(--border)",
            color: "#fff",
          }}
        >
          {isCompleted && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold leading-snug"
            style={{
              color: isCompleted ? "rgba(226,226,240,0.35)" : "var(--foreground)",
              textDecoration: isCompleted ? "line-through" : "none",
            }}
          >
            {task.title}
          </p>

          {/* Tags row */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {task.subjects && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: `${task.subjects.color ?? "#818cf8"}18`, color: task.subjects.color ?? "#818cf8" }}
              >
                {task.subjects.name}
              </span>
            )}
            {task.topics && (
              <span className="text-[10px] text-neutral-600 truncate max-w-35">
                {task.topics.name}
              </span>
            )}
            {task.is_recurring && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>
                🔄 {task.recurrence_pattern}
              </span>
            )}
            {task.postpone_count > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{
                  background: task.postpone_count >= 3 ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                  color: task.postpone_count >= 3 ? "#fca5a5" : "#fbbf24",
                }}
              >
                ↩ {task.postpone_count}x
              </span>
            )}
          </div>
        </div>

        {/* Desktop-only action buttons (hidden on mobile) */}
        {!isCompleted && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleStartStudy}
              disabled={isPending || !canStartSession}
              title={canStartSession ? "Start study session" : "Add a subject or topic to enable"}
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all hover:opacity-90 active:scale-95 flex items-center gap-1 disabled:opacity-40"
              style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Start
            </button>
            <button
              type="button"
              onClick={() => setShowPostponeModal(!showPostponeModal)}
              disabled={isPending}
              title="Postpone"
              className="p-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(226,226,240,0.5)", border: "1px solid var(--border-subtle)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              title="Delete"
              className="p-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(226,226,240,0.35)", border: "1px solid var(--border-subtle)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}
        {isCompleted && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            title="Delete"
            className="hidden sm:flex p-1.5 rounded-lg transition-all hover:opacity-80 shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(226,226,240,0.35)", border: "1px solid var(--border-subtle)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Mobile action bar — shown below the card content on small screens */}
      {!isCompleted && (
        <div className="flex sm:hidden items-center gap-2 px-3.5 pb-3 border-t border-neutral-900 pt-2.5">
          <button
            type="button"
            onClick={handleStartStudy}
            disabled={isPending || !canStartSession}
            className="flex-1 text-xs py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "rgba(99,102,241,0.18)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Start Session
          </button>
          <button
            type="button"
            onClick={() => setShowPostponeModal(!showPostponeModal)}
            disabled={isPending}
            className="px-3 py-2 rounded-lg text-xs transition-all"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(226,226,240,0.5)", border: "1px solid var(--border-subtle)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="px-3 py-2 rounded-lg text-xs transition-all"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(226,226,240,0.35)", border: "1px solid var(--border-subtle)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Failure reason */}
      {task.failure_reason && (
        <div className="px-3.5 pb-3">
          <p className="text-xs px-2.5 py-1.5 rounded-lg italic" style={{ background: "rgba(245,158,11,0.08)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}>
            Note: {task.failure_reason}
          </p>
        </div>
      )}

      {/* Postpone form */}
      {showPostponeModal && (
        <form
          onSubmit={handlePostponeSubmit}
          className="mx-3.5 mb-3.5 p-3 rounded-xl space-y-2.5 animate-fade-in"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}
        >
          <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Postpone to</p>
          <input
            type="date"
            required
            value={postponeDate}
            onChange={e => setPostponeDate(e.target.value)}
            className="w-full px-2.5 py-2 rounded-lg text-sm"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
          <input
            type="text"
            placeholder="Reason (optional)"
            value={postponeReason}
            onChange={e => setPostponeReason(e.target.value)}
            className="w-full px-2.5 py-2 rounded-lg text-sm"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPostponeModal(false)}
              className="flex-1 py-2 rounded-lg text-xs"
              style={{ background: "transparent", color: "rgba(226,226,240,0.5)", border: "1px solid var(--border-subtle)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2 rounded-lg text-xs font-semibold"
              style={{ background: "#f59e0b", color: "#000" }}
            >
              {isPending ? "Moving…" : "Confirm"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

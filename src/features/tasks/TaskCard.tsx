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
  estimated_minutes: number | null;
  actual_minutes: number | null;
  failure_reason: string | null;
  postpone_count: number;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  subjects?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  topics?: {
    id: string;
    name: string;
  } | null;
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
    return next.toISOString().split("T")[0];
  });
  const [postponeReason, setPostponeReason] = useState("");

  const isCompleted = task.status === "completed";

  function handleToggleComplete() {
    const newStatus: TaskStatus = isCompleted ? "pending" : "completed";
    startTransition(async () => {
      await updateTaskStatus(task.id, newStatus);
    });
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
    startTransition(async () => {
      await deleteTask(task.id);
    });
  }

  return (
    <div
      className="p-4 rounded-2xl transition-all relative overflow-hidden group"
      style={{
        background: isCompleted ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.035)",
        border: isCompleted
          ? "1px solid rgba(255,255,255,0.04)"
          : "1px solid var(--border-subtle)",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <div className="flex items-start gap-3.5">
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="text-sm font-semibold truncate transition-all"
              style={{
                color: isCompleted ? "rgba(226,226,240,0.4)" : "var(--foreground)",
                textDecoration: isCompleted ? "line-through" : "none",
              }}
            >
              {task.title}
            </h3>

            {task.is_recurring && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{
                  background: "rgba(99,102,241,0.12)",
                  color: "#818cf8",
                }}
              >
                🔄 {task.recurrence_pattern}
              </span>
            )}

            {task.postpone_count > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{
                  background:
                    task.postpone_count >= 3
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(245,158,11,0.15)",
                  color: task.postpone_count >= 3 ? "#fca5a5" : "#fbbf24",
                }}
              >
                ⚡ Postponed {task.postpone_count}x
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap" style={{ color: "rgba(226,226,240,0.45)" }}>
            {task.subjects && (
              <span className="flex items-center gap-1.5 font-medium" style={{ color: task.subjects.color ?? "#818cf8" }}>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: task.subjects.color ?? "#818cf8" }}
                  aria-hidden="true"
                />
                {task.subjects.name}
              </span>
            )}

            {task.topics && (
              <>
                <span>•</span>
                <span>{task.topics.name}</span>
              </>
            )}



            {task.due_date && (
              <>
                <span>•</span>
                <span style={{ color: "#f87171" }}>Due: {task.due_date}</span>
              </>
            )}
          </div>

          {task.failure_reason && (
            <p
              className="text-xs mt-2 px-2.5 py-1 rounded-lg italic"
              style={{
                background: "rgba(245,158,11,0.08)",
                color: "#fbbf24",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              Note: {task.failure_reason}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isCompleted && (
            <button
              type="button"
              onClick={handleStartStudy}
              disabled={isPending}
              title="Start Study Session from this Task"
              className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all hover:opacity-90 active:scale-95 flex items-center gap-1"
              style={{
                background: "rgba(99,102,241,0.15)",
                color: "#818cf8",
                border: "1px solid rgba(99,102,241,0.25)",
              }}
            >
              ▶ Start
            </button>
          )}

          {!isCompleted && (
            <button
              type="button"
              onClick={() => setShowPostponeModal(!showPostponeModal)}
              disabled={isPending}
              title="Postpone Task"
              className="p-1.5 rounded-lg text-xs transition-all hover:opacity-80"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(226,226,240,0.55)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              📅
            </button>
          )}

          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            title="Delete Task"
            className="p-1.5 rounded-lg text-xs transition-all hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "rgba(226,226,240,0.4)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {showPostponeModal && (
        <form
          onSubmit={handlePostponeSubmit}
          className="mt-3 pt-3 border-t space-y-2.5 animate-fade-in"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(226,226,240,0.5)" }}>
                New Planned Date
              </label>
              <input
                type="date"
                required
                value={postponeDate}
                onChange={(e) => setPostponeDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(226,226,240,0.5)" }}>
                Reason for Postponing (Accountability)
              </label>
              <input
                type="text"
                placeholder="e.g. Overestimated time / Exam change"
                value={postponeReason}
                onChange={(e) => setPostponeReason(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPostponeModal(false)}
              className="px-2.5 py-1 rounded-lg text-xs"
              style={{ background: "transparent", color: "rgba(226,226,240,0.6)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-1 rounded-lg text-xs font-semibold"
              style={{ background: "#f59e0b", color: "#000" }}
            >
              {isPending ? "Postponing..." : "Confirm Postpone"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

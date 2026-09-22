"use client";

import { useState, useTransition } from "react";
import { updateTaskStatus, postponeTask, deleteTask, updateTaskChecklist, type TaskStatus } from "./actions";
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
  questions_count?: number | null;
  actual_questions_count?: number | null;
  checklist?: { id: string; title: string; completed: boolean }[] | null;
  subjects?: { id: string; name: string; color: string | null } | null;
  topics?: { id: string; name: string } | null;
}

interface TaskCardProps {
  task: TaskItem;
  isToday?: boolean;
}

export function TaskCard({ task, isToday = true }: TaskCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [postponeDate, setPostponeDate] = useState(() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, "0");
    const d = String(next.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [postponeReason, setPostponeReason] = useState("");
  const [prefillFeedback, setPrefillFeedback] = useState(false);

  const isCompleted = task.status === "completed";

  function handleToggleComplete() {
    if (!isToday && !isCompleted) return;
    const newStatus: TaskStatus = isCompleted ? "pending" : "completed";
    startTransition(async () => { await updateTaskStatus(task.id, newStatus); });
  }

  function handlePrefillTimer() {
    let actType = "practice";
    let notes = task.title;

    if (task.title.startsWith("[Lecture] ")) {
      actType = "lecture";
      notes = task.title.replace("[Lecture] ", "");
    } else if (task.title.startsWith("[Revision] ")) {
      actType = "revision";
      notes = task.title.replace("[Revision] ", "");
    } else if (task.title.startsWith("[Mock] ")) {
      actType = "mock";
      notes = task.title.replace("[Mock] ", "");
    } else if (task.title.startsWith("[Reading] ")) {
      actType = "reading";
      notes = task.title.replace("[Reading] ", "");
    } else if (task.title.startsWith("[DPP] ")) {
      actType = "practice";
      notes = task.title.replace("[DPP] ", "");
    }

    window.dispatchEvent(
      new CustomEvent("timer:prefill", {
        detail: {
          subjectId: task.subjects?.id ?? "",
          topicId: task.topics?.id ?? "",
          activityType: actType,
          notes,
          taskId: task.id,
          plannedQuestions: task.questions_count ?? null,
        },
      })
    );
    setPrefillFeedback(true);
    setTimeout(() => setPrefillFeedback(false), 2500);
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

  function handleToggleChecklistItem(itemId: string) {
    if (!task.checklist) return;
    const newChecklist = task.checklist.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    // Optimistic update locally could be done, but server action handles it
    startTransition(async () => {
      await updateTaskChecklist(task.id, newChecklist);
    });
  }

  const cardOpacity = !isToday && !isCompleted ? 0.45 : isPending ? 0.6 : 1;

  return (
    <div
      className="rounded-xl transition-all overflow-hidden"
      style={{
        background: isCompleted ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.035)",
        border: isCompleted ? "1px solid rgba(255,255,255,0.04)" : "1px solid var(--border-subtle)",
        opacity: cardOpacity,
      }}
    >
      <div className="flex items-start gap-3 p-3.5">
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={isPending || (!isToday && !isCompleted)}
          aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
          className="mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center transition-all shrink-0"
          style={{
            background: isCompleted ? "#22c55e" : "rgba(255,255,255,0.06)",
            border: isCompleted ? "1px solid #22c55e" : "1px solid var(--border)",
            color: "#fff",
            cursor: !isToday && !isCompleted ? "not-allowed" : "pointer",
          }}
        >
          {isCompleted && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

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
            {task.estimated_minutes && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: "rgba(255,255,255,0.05)", color: "#737373" }}>
                ~{task.estimated_minutes}m
              </span>
            )}
            {task.is_recurring && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>
                🔄 {task.recurrence_pattern}
              </span>
            )}
            {task.questions_count != null && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
                {task.actual_questions_count != null ? `${task.actual_questions_count} / ` : ""}{task.questions_count} Qs
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
            {prefillFeedback && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium animate-fade-in" style={{ background: "rgba(99,102,241,0.18)", color: "#a5b4fc" }}>
                ↑ Timer prefilled
              </span>
            )}
          </div>
        </div>

        {!isCompleted && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrefillTimer}
              disabled={isPending}
              title="Prefill timer — set subject & start when ready"
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all hover:opacity-90 active:scale-95 flex items-center gap-1"
              style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Focus
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

      {!isCompleted && (
        <div className="flex sm:hidden items-center gap-2 px-3.5 pb-3 border-t border-neutral-900 pt-2.5">
          <button
            type="button"
            onClick={handlePrefillTimer}
            disabled={isPending}
            className="flex-1 text-xs py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            style={{ background: "rgba(99,102,241,0.18)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Focus
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

      {task.failure_reason && (
        <div className="px-3.5 pb-3">
          <p className="text-xs px-2.5 py-1.5 rounded-lg italic" style={{ background: "rgba(245,158,11,0.08)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}>
            Note: {task.failure_reason}
          </p>
        </div>
      )}

      {task.checklist && task.checklist.length > 0 && !isCompleted && (
        <div className="px-3.5 pb-3 space-y-1">
          {task.checklist.map(item => (
            <label 
              key={item.id} 
              className="flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <input 
                type="checkbox" 
                checked={item.completed} 
                onChange={() => handleToggleChecklistItem(item.id)}
                disabled={isPending}
                className="mt-0.5 shrink-0 accent-indigo-500"
              />
              <span className="text-xs text-neutral-300" style={{ textDecoration: item.completed ? "line-through" : "none", opacity: item.completed ? 0.5 : 1 }}>
                {item.title}
              </span>
            </label>
          ))}
        </div>
      )}

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

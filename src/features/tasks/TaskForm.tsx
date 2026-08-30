"use client";

import { useState, useActionState, useEffect } from "react";
import { createTask, type TaskActionState } from "./actions";

interface SubjectOption {
  id: string;
  name: string;
  color: string | null;
}

interface TopicOption {
  id: string;
  name: string;
  subject_id: string;
}

interface TaskFormProps {
  subjects: SubjectOption[];
  topics: TopicOption[];
  defaultDate: string;
  onSuccess?: () => void;
}

const INITIAL_STATE: TaskActionState = null;

const QUICK_MINUTES = [15, 30, 45, 60, 90, 120];

export function TaskForm({
  subjects,
  topics,
  defaultDate,
  onSuccess,
}: TaskFormProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | "">("");
  const [state, formAction, pending] = useActionState(createTask, INITIAL_STATE);

  const filteredTopics = selectedSubject
    ? topics.filter((t) => t.subject_id === selectedSubject)
    : topics;

  useEffect(() => {
    if (state?.success && onSuccess) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="task-title"
          className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: "rgba(226,226,240,0.6)" }}
        >
          Task Title *
        </label>
        <input
          id="task-title"
          name="title"
          type="text"
          required
          placeholder="e.g. Percentage Level 2 Practice (50 Qs)"
          className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="task-subject"
            className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: "rgba(226,226,240,0.6)" }}
          >
            Subject
          </label>
          <select
            id="task-subject"
            name="subject_id"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              background: "rgba(30,30,40,0.95)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            <option value="">No specific subject</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="task-topic"
            className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: "rgba(226,226,240,0.6)" }}
          >
            Topic
          </label>
          <select
            id="task-topic"
            name="topic_id"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              background: "rgba(30,30,40,0.95)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            <option value="">No specific topic</option>
            {filteredTopics.map((top) => (
              <option key={top.id} value={top.id}>
                {top.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="task-planned-date"
            className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: "rgba(226,226,240,0.6)" }}
          >
            Planned Date *
          </label>
          <input
            id="task-planned-date"
            name="planned_date"
            type="date"
            required
            defaultValue={defaultDate}
            className="w-full px-3.5 py-2 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>

        <div>
          <label
            htmlFor="task-due-date"
            className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: "rgba(226,226,240,0.6)" }}
          >
            Due Date (Optional)
          </label>
          <input
            id="task-due-date"
            name="due_date"
            type="date"
            min={defaultDate}
            className="w-full px-3.5 py-2 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="task-est-minutes"
          className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: "rgba(226,226,240,0.6)" }}
        >
          Estimated Time (Minutes)
        </label>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {QUICK_MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setEstimatedMinutes(m)}
              className="text-xs px-2.5 py-1 rounded-lg transition-all"
              style={{
                background:
                  estimatedMinutes === m
                    ? "rgba(99,102,241,0.25)"
                    : "rgba(255,255,255,0.04)",
                color: estimatedMinutes === m ? "#818cf8" : "rgba(226,226,240,0.6)",
                border:
                  estimatedMinutes === m
                    ? "1px solid rgba(99,102,241,0.4)"
                    : "1px solid var(--border-subtle)",
              }}
            >
              {m}m
            </button>
          ))}
        </div>
        <input
          id="task-est-minutes"
          name="estimated_minutes"
          type="number"
          min="1"
          max="720"
          value={estimatedMinutes}
          onChange={(e) =>
            setEstimatedMinutes(e.target.value === "" ? "" : parseInt(e.target.value, 10))
          }
          placeholder="e.g. 45"
          className="w-full px-3.5 py-2 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      <div>
        <label
          htmlFor="task-recurrence"
          className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: "rgba(226,226,240,0.6)" }}
        >
          Recurrence
        </label>
        <select
          id="task-recurrence"
          name="recurrence_pattern"
          defaultValue="none"
          className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
          style={{
            background: "rgba(30,30,40,0.95)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        >
          <option value="none">One-time task</option>
          <option value="daily">Daily (Generate next 7 days)</option>
          <option value="weekdays">Weekdays Mon–Fri (Generate next 5 weekdays)</option>
          <option value="weekly">Weekly (Generate next 4 weeks)</option>
        </select>
      </div>

      {state?.error && (
        <p
          role="alert"
          className="text-xs px-3 py-2 rounded-lg"
          style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}
        >
          {state.error}
        </p>
      )}

      {state?.success && (
        <p
          role="status"
          className="text-xs px-3 py-2 rounded-lg"
          style={{ background: "rgba(34,197,94,0.12)", color: "#86efac" }}
        >
          Task added successfully!
        </p>
      )}

      <button
        id="create-task-submit"
        type="submit"
        disabled={pending}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          color: "#fff",
        }}
      >
        {pending ? "Adding task..." : "+ Add Task"}
      </button>
    </form>
  );
}

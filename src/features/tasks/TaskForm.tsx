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


export function TaskForm({
  subjects,
  topics,
  defaultDate,
  onSuccess,
}: TaskFormProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("");

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
          className="input-premium"
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
            className="input-premium appearance-none"
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
            className="input-premium appearance-none"
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
            className="input-premium"
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
            className="input-premium"
          />
        </div>
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
          className="input-premium appearance-none"
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
        className="btn-premium w-full"
      >
        {pending ? "Adding task..." : "+ Add Task"}
      </button>
    </form>
  );
}

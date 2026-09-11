"use client";

import { useState, useActionState, useEffect } from "react";
import { createTask, type TaskActionState } from "./actions";
import { SubjectOptions } from "@/components/ui/SubjectOptions";

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

export function TaskForm({ subjects, topics, defaultDate, onSuccess }: TaskFormProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [state, formAction, pending] = useActionState(createTask, INITIAL_STATE);

  const filteredTopics = (selectedSubject
    ? topics.filter(t => t.subject_id === selectedSubject)
    : topics
  ).filter(t => !t.name.toLowerCase().includes("no specific"));

  useEffect(() => {
    if (state?.success && onSuccess) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="space-y-3">
      {/* Title */}
      <input
        id="task-title"
        name="title"
        type="text"
        required
        placeholder="e.g. Percentage Level 2 (50 Qs)"
        className="input-premium"
        autoComplete="off"
      />

      {/* Subject + Topic row */}
      <div className="grid grid-cols-2 gap-2">
        <select
          id="task-subject"
          name="subject_id"
          value={selectedSubject}
          onChange={e => setSelectedSubject(e.target.value)}
          className="select-premium"
        >
          <option value="">Subject</option>
          <SubjectOptions subjects={subjects} />
        </select>

        <select
          id="task-topic"
          name="topic_id"
          className="select-premium"
        >
          <option value="">Topic</option>
          {filteredTopics.map(top => (
            <option key={top.id} value={top.id}>{top.name}</option>
          ))}
        </select>
      </div>

      {/* Date */}
      <input
        id="task-planned-date"
        name="planned_date"
        type="date"
        required
        defaultValue={defaultDate}
        className="input-premium"
      />

      {/* Hidden fields with sensible defaults */}
      <input type="hidden" name="recurrence_pattern" value="none" />

      {state?.error && (
        <p role="alert" className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}>
          {state.error}
        </p>
      )}

      {state?.success && (
        <p role="status" className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(34,197,94,0.12)", color: "#86efac" }}>
          Task added!
        </p>
      )}

      <button
        id="create-task-submit"
        type="submit"
        disabled={pending}
        className="btn-premium w-full"
      >
        {pending ? "Adding…" : "+ Add Task"}
      </button>
    </form>
  );
}

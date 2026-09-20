"use client";

import { useState, useActionState, useEffect } from "react";
import { createTask, type TaskActionState } from "./actions";
import { SubjectOptions } from "@/components/ui/SubjectOptions";

interface SubjectOption {
  id: string;
  name: string;
  color: string | null;
  exam_type?: string | null;
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

const sel = "w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer";
const selS = { background: "#111", border: "1px solid #1e1e1e", color: "#ededed" };

export function TaskForm({ subjects, topics, defaultDate, onSuccess }: TaskFormProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [activityType, setActivityType] = useState<string>("practice");
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
      <input
        id="task-title"
        name="title"
        type="text"
        required
        placeholder="e.g. Percentage Level 2"
        className="input-premium"
        autoComplete="off"
      />

      <div className="grid grid-cols-2 gap-2">
        <select
          id="task-subject"
          name="subject_id"
          value={selectedSubject}
          onChange={e => setSelectedSubject(e.target.value)}
          className={sel}
          style={selS}
        >
          <option value="">Subject</option>
          <SubjectOptions subjects={subjects} />
        </select>

        <select id="task-topic" name="topic_id" className={sel} style={selS}>
          <option value="">Topic</option>
          {filteredTopics.map(top => (
            <option key={top.id} value={top.id}>{top.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select 
          id="task-activity-type" 
          name="activity_type" 
          className={sel} 
          style={selS}
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
        >
          <option value="practice">Practice</option>
          <option value="lecture">Lecture</option>
          <option value="revision">Revision</option>
          <option value="mock">Mock Test</option>
          <option value="reading">Reading</option>
        </select>

        <select id="task-recurrence" name="recurrence_pattern" className={sel} style={selS}>
          <option value="none">No repeat</option>
          <option value="daily">Daily (7 days)</option>
          <option value="weekdays">Weekdays</option>
          <option value="weekly">Weekly (4 wks)</option>
          <option value="monthly">Monthly (3 mo)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          id="task-planned-date"
          name="planned_date"
          type="date"
          required
          defaultValue={defaultDate}
          className="input-premium"
        />
        <input
          id="task-estimated-minutes"
          name="estimated_minutes"
          type="number"
          min="5"
          max="480"
          placeholder="Est. min"
          className="input-premium"
        />
      </div>

      {activityType !== "lecture" && (
        <div className="space-y-1">
          <input
            id="task-questions-count"
            name="questions_count"
            type="number"
            min="1"
            max="500"
            placeholder="No. of questions (optional)"
            className="input-premium"
          />
          <p className="text-[10px] text-neutral-500 pl-1">
            *Toppers usually attempt 200-250 questions per day.
          </p>
        </div>
      )}

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

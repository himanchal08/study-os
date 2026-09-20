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
  dailyQuestionsCap?: number;
  onSuccess?: () => void;
}

const INITIAL_STATE: TaskActionState = null;

const sel = "w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer";
const selS = { background: "#111", border: "1px solid #1e1e1e", color: "#ededed" };

export function TaskForm({ subjects, topics, defaultDate, dailyQuestionsCap = 250, onSuccess }: TaskFormProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [activityType, setActivityType] = useState<string>("practice");
  const [checklist, setChecklist] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
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

  function handleAddChecklistItem(e: React.KeyboardEvent | React.MouseEvent) {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;
    setChecklist(prev => [...prev, { id: crypto.randomUUID(), title: newChecklistItem.trim(), completed: false }]);
    setNewChecklistItem("");
  }

  function removeChecklistItem(id: string) {
    setChecklist(prev => prev.filter(item => item.id !== id));
  }

  return (
    <form action={formAction} className="space-y-3">
      {checklist.length > 0 && (
        <input type="hidden" name="checklist" value={JSON.stringify(checklist)} />
      )}
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
            *Your daily target is {dailyQuestionsCap} questions.
          </p>
        </div>
      )}

      <div className="space-y-2 pt-1 border-t border-neutral-800">
        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Subtasks (Optional)</label>
        {checklist.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {checklist.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800">
                <span className="text-xs text-neutral-300">{item.title}</span>
                <button type="button" onClick={() => removeChecklistItem(item.id)} className="text-neutral-500 hover:text-red-400 p-1">×</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newChecklistItem}
            onChange={e => setNewChecklistItem(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddChecklistItem(e)}
            placeholder="Add a step..."
            className="input-premium flex-1 py-1.5!"
          />
          <button type="button" onClick={handleAddChecklistItem} className="px-3 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-medium hover:bg-neutral-700 transition-colors">
            Add
          </button>
        </div>
      </div>

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

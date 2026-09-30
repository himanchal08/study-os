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
  initialSubjectId?: string;
  initialTopicId?: string;
  onSuccess?: () => void;
}

const INITIAL_STATE: TaskActionState = null;

const sel = "w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer";
const selS = { background: "#111", border: "1px solid #1e1e1e", color: "#ededed" };

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface RepeatCalendarProps {
  plannedDate: string;
  selected: string[];
  onChange: (dates: string[]) => void;
}

function RepeatCalendar({ plannedDate, selected, onChange }: RepeatCalendarProps) {
  const base = plannedDate ? new Date(plannedDate + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const selectedSet = new Set(selected);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }
  function toggleDay(iso: string) {
    if (iso === plannedDate) return;
    if (selectedSet.has(iso)) {
      onChange(selected.filter(d => d !== iso));
    } else {
      onChange([...selected, iso].sort());
    }
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      className="rounded-2xl p-3 mt-1"
      style={{ background: "#0d0d0d", border: "1px solid #222" }}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          type="button"
          onClick={prevMonth}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors text-base"
        >
          ‹
        </button>
        <span className="text-xs font-semibold text-neutral-200">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors text-base"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-neutral-600 py-0.5">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const iso = toISO(viewYear, viewMonth, day);
          const isStart = iso === plannedDate;
          const isSelected = selectedSet.has(iso);
          const isPast = iso < plannedDate;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => toggleDay(iso)}
              disabled={isPast || isStart}
              className="w-full aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all"
              style={{
                background: isStart
                  ? "linear-gradient(135deg,#a78bfa,#818cf8)"
                  : isSelected
                  ? "rgba(167,139,250,0.25)"
                  : "transparent",
                color: isStart
                  ? "#fff"
                  : isSelected
                  ? "#c4b5fd"
                  : isPast
                  ? "#333"
                  : "#aaa",
                cursor: isPast || isStart ? "default" : "pointer",
                border: isSelected && !isStart ? "1px solid rgba(167,139,250,0.4)" : "1px solid transparent",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-neutral-600 mt-2 text-center">
        Tap dates to repeat — start date always included
      </p>
    </div>
  );
}

// ── Main form ──────────────────────────────────────────────────────────────────
export function TaskForm({ subjects, topics, defaultDate, dailyQuestionsCap = 250, initialSubjectId = "", initialTopicId = "", onSuccess }: TaskFormProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubjectId);
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopicId);
  const [activityType, setActivityType] = useState<string>("practice");
  const [checklist, setChecklist] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  // Repeat calendar state
  const [showRepeatCalendar, setShowRepeatCalendar] = useState(false);
  const [repeatDates, setRepeatDates] = useState<string[]>([]);

  // DPP questions count
  const [dppQuestionsCount, setDppQuestionsCount] = useState<string>("20");

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

  useEffect(() => {
    if (!showRepeatCalendar) setRepeatDates([]);
  }, [showRepeatCalendar]);

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
      {showRepeatCalendar && repeatDates.length > 0 && (
        <input type="hidden" name="custom_repeat_dates" value={JSON.stringify(repeatDates)} />
      )}
      {activityType === "lecture" && (
        <input type="hidden" name="dpp_questions_count" value={dppQuestionsCount} />
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

        <select
          id="task-topic"
          name="topic_id"
          className={sel}
          style={selS}
          value={selectedTopic}
          onChange={e => setSelectedTopic(e.target.value)}
        >
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

        {/* Repeat toggle button – replaces old dropdown */}
        <button
          type="button"
          id="task-repeat-toggle"
          onClick={() => setShowRepeatCalendar(prev => !prev)}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between gap-2"
          style={{
            background: showRepeatCalendar ? "rgba(167,139,250,0.15)" : "#111",
            border: showRepeatCalendar ? "1px solid rgba(167,139,250,0.4)" : "1px solid #1e1e1e",
            color: showRepeatCalendar ? "#c4b5fd" : "#ededed",
          }}
        >
          <span>
            {showRepeatCalendar
              ? repeatDates.length > 0
                ? `Repeat ×${repeatDates.length + 1}`
                : "Pick dates…"
              : "No repeat"}
          </span>
          <span className="text-xs opacity-60">🗓</span>
        </button>
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

      {/* Repeat calendar */}
      {showRepeatCalendar && (
        <RepeatCalendar
          plannedDate={defaultDate}
          selected={repeatDates}
          onChange={setRepeatDates}
        />
      )}

      {/* Questions count for non-lecture types */}
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

      {/* DPP questions count – shown when lecture is selected */}
      {activityType === "lecture" && (
        <div className="space-y-1.5">
          <div
            className="rounded-xl px-3 py-2 flex items-center gap-2"
            style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}
          >
            <span className="text-xs">📋</span>
            <span className="text-xs text-violet-300 font-medium">
              A DPP task will be auto-added. How many questions?
            </span>
          </div>
          <input
            id="task-dpp-questions"
            type="number"
            min="1"
            max="500"
            placeholder="DPP questions (default: 20)"
            value={dppQuestionsCount}
            onChange={e => setDppQuestionsCount(e.target.value)}
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

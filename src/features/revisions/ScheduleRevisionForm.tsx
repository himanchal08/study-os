"use client";

import { useActionState } from "react";
import { scheduleRevision } from "@/app/(dashboard)/revisions/actions";

interface Topic { id: string; name: string; subject_id: string; }
interface Subject { id: string; name: string; }

interface ScheduleFormProps {
  topics: Topic[];
  subjects: Subject[];
  defaultDate: string;
}

const inputCls = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-white/30 appearance-none transition-all";
const inputStyle = { background: "#111111", border: "1px solid #262626", color: "#ededed" };
const labelCls = "block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider";

export function ScheduleRevisionForm({ topics, subjects, defaultDate }: ScheduleFormProps) {
  const [state, action, isPending] = useActionState(scheduleRevision, null);

  // Build grouped topic options
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={labelCls}>Topic</label>
        <select name="topic_id" className={inputCls} style={inputStyle} required>
          <option value="">— Select topic —</option>
          {topics.map(t => (
            <option key={t.id} value={t.id}>
              {subjectMap[t.subject_id] ? `${subjectMap[t.subject_id]} · ` : ""}{t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Cycle</label>
        <select name="cycle_type" className={inputCls} style={inputStyle} defaultValue="weekly">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div>
        <label className={labelCls}>Due Date</label>
        <input
          name="due_date"
          type="date"
          defaultValue={defaultDate}
          className={inputCls}
          style={{ ...inputStyle, colorScheme: "dark" }}
          required
        />
      </div>

      {state?.error && (
        <p className="text-xs p-2 rounded-lg" style={{ background: "#1a0a0a", border: "1px solid #3f1515", color: "#f87171" }}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-xs p-2 rounded-lg" style={{ background: "#0a1a0f", border: "1px solid #14532d", color: "#4ade80" }}>
          ✓ Revision scheduled
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ background: "#ededed", color: "#0a0a0a" }}
      >
        {isPending ? "Scheduling…" : "Schedule Revision"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { logMock } from "@/app/(dashboard)/mocks/actions";

const inputCls = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-white/30 placeholder:text-neutral-600 transition-all";
const inputStyle = { background: "#111111", border: "1px solid #262626", color: "#ededed" };
const labelCls = "block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider";

interface LogMockFormProps {
  defaultDate: string;
  defaultExamType?: "banking" | "ssc" | "other";
}

export function LogMockForm({ defaultDate, defaultExamType = "banking" }: LogMockFormProps) {
  const [state, action, isPending] = useActionState(logMock, null);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Mock Name</label>
          <input
            name="name"
            type="text"
            placeholder="e.g. IBPS PO Pre Mock 12"
            className={inputCls}
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label className={labelCls}>Platform / Source</label>
          <input
            name="source"
            type="text"
            placeholder="Oliveboard, Testbook…"
            className={inputCls}
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label className={labelCls}>Exam Type</label>
          <select name="exam_type" defaultValue={defaultExamType} className={inputCls + " appearance-none"} style={inputStyle}>
            <option value="banking">Banking</option>
            <option value="ssc">SSC</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Stage</label>
          <input
            name="stage"
            type="text"
            placeholder="Pre / Mains / Tier 1…"
            className={inputCls}
            style={inputStyle}
          />
        </div>

        <div>
          <label className={labelCls}>Date</label>
          <input
            name="mock_date"
            type="date"
            defaultValue={defaultDate}
            className={inputCls}
            style={{ ...inputStyle, colorScheme: "dark" }}
            required
          />
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Score</label>
          <input name="score" type="number" step="0.25" placeholder="0" className={inputCls} style={inputStyle} required />
        </div>
        <div>
          <label className={labelCls}>Max Marks</label>
          <input name="maximum_marks" type="number" defaultValue={100} className={inputCls} style={inputStyle} required />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { name: "attempted", label: "Attempted" },
          { name: "correct", label: "Correct" },
          { name: "wrong", label: "Wrong" },
          { name: "unattempted", label: "Skipped" },
        ].map(({ name, label }) => (
          <div key={name}>
            <label className={labelCls}>{label}</label>
            <input name={name} type="number" min="0" placeholder="0" className={inputCls} style={inputStyle} required />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Duration (min)</label>
          <input name="actual_duration_minutes" type="number" placeholder="60" className={inputCls} style={inputStyle} required />
        </div>
        <div>
          <label className={labelCls}>Percentile</label>
          <input name="percentile" type="number" step="0.01" min="0" max="100" placeholder="optional" className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls}>Rank</label>
          <input name="rank" type="number" placeholder="optional" className={inputCls} style={inputStyle} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          name="notes"
          rows={2}
          placeholder="What went wrong? What to improve?"
          className={inputCls + " resize-none"}
          style={inputStyle}
        />
      </div>

      {state?.error && (
        <p className="text-xs p-2 rounded-lg" style={{ background: "#1a0a0a", border: "1px solid #3f1515", color: "#f87171" }}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-xs p-2 rounded-lg" style={{ background: "#0a1a0f", border: "1px solid #14532d", color: "#4ade80" }}>
          ✓ Mock logged
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ background: "#ededed", color: "#0a0a0a" }}
      >
        {isPending ? "Saving…" : "Log Mock"}
      </button>
    </form>
  );
}

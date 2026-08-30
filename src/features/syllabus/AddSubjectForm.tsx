"use client";

import { useActionState } from "react";
import { addSubject } from "@/app/(dashboard)/syllabus/actions";

const inputCls = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-white/30 placeholder:text-neutral-600 transition-all";
const inputStyle = { background: "#111111", border: "1px solid #262626", color: "#ededed" };
const labelCls = "block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider";

const PRESET_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#38bdf8", "#a78bfa", "#f43f5e", "#34d399"];

export function AddSubjectForm() {
  const [state, action, isPending] = useActionState(addSubject, null);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={labelCls}>Name</label>
        <input
          name="name"
          type="text"
          placeholder="e.g. Quantitative Aptitude"
          className={inputCls}
          style={inputStyle}
          required
        />
      </div>

      <div>
        <label className={labelCls}>Exam</label>
        <select name="exam_type" className={inputCls + " appearance-none"} style={inputStyle} defaultValue="both">
          <option value="banking">Banking</option>
          <option value="ssc">SSC</option>
          <option value="both">Both</option>
        </select>
      </div>

      <div>
        <label className={labelCls}>Color</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map(c => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} className="sr-only" defaultChecked={c === "#6366f1"} />
              <div
                className="w-6 h-6 rounded-full transition-all hover:scale-110"
                style={{ background: c }}
                title={c}
              />
            </label>
          ))}
        </div>
      </div>

      {state?.error && (
        <p className="text-xs p-2 rounded-lg" style={{ background: "#1a0a0a", border: "1px solid #3f1515", color: "#f87171" }}>{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs p-2 rounded-lg" style={{ background: "#0a1a0f", border: "1px solid #14532d", color: "#4ade80" }}>✓ Subject added</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ background: "#ededed", color: "#0a0a0a" }}
      >
        {isPending ? "Adding…" : "Add Subject"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { addTopic } from "@/app/(dashboard)/syllabus/actions";

interface Subject { id: string; name: string; color: string | null; }

const inputCls = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-white/30 placeholder:text-neutral-600 transition-all";
const inputStyle = { background: "#111111", border: "1px solid #262626", color: "#ededed" };
const labelCls = "block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider";

export function AddTopicForm({ subjects }: { subjects: Subject[] }) {
  const [state, action, isPending] = useActionState(addTopic, null);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={labelCls}>Subject</label>
        <select name="subject_id" className={inputCls + " appearance-none"} style={inputStyle} required>
          <option value="">— Select subject —</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Topic Name</label>
        <input
          name="name"
          type="text"
          placeholder="e.g. Percentage, Speed & Distance"
          className={inputCls}
          style={inputStyle}
          required
        />
      </div>

      {state?.error && (
        <p className="text-xs p-2 rounded-lg" style={{ background: "#1a0a0a", border: "1px solid #3f1515", color: "#f87171" }}>{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs p-2 rounded-lg" style={{ background: "#0a1a0f", border: "1px solid #14532d", color: "#4ade80" }}>✓ Topic added</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ background: "#ededed", color: "#0a0a0a" }}
      >
        {isPending ? "Adding…" : "Add Topic"}
      </button>
    </form>
  );
}

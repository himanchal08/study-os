"use client";

import { useActionState, useState } from "react";
import { logQuestionBatch } from "@/app/(dashboard)/questions/actions";

interface Subject { id: string; name: string; color: string | null; }
interface Topic   { id: string; name: string; subject_id: string;  }

interface LogBatchFormProps {
  subjects: Subject[];
  topics:   Topic[];
}

const inp  = "w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-1 focus:ring-white/20 placeholder:text-neutral-600 transition-all";
const inpS = { background: "#111", border: "1px solid #262626", color: "#ededed" };

export function LogBatchForm({ subjects, topics }: LogBatchFormProps) {
  const [state, action, isPending] = useActionState(logQuestionBatch, null);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [attempted, setAttempted] = useState<number>(0);
  const [correct,   setCorrect]   = useState<number>(0);
  const [wrong,     setWrong]     = useState<number>(0);

  const filteredTopics = topics.filter(t => t.subject_id === selectedSubject);
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : null;
  const skipped  = Math.max(0, attempted - correct - wrong);
  const accColor = accuracy == null ? "#525252" : accuracy >= 80 ? "#10b981" : accuracy >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <form action={action} className="space-y-3">

      {/* Subject */}
      <select
        name="subject_id"
        value={selectedSubject}
        onChange={e => setSelectedSubject(e.target.value)}
        className={inp + " appearance-none"}
        style={inpS}
      >
        <option value="">Subject (optional)</option>
        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {/* Topic — only if subject chosen */}
      {filteredTopics.length > 0 && (
        <select name="topic_id" className={inp + " appearance-none"} style={inpS}>
          <option value="">Topic (optional)</option>
          {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}

      {/* Source */}
      <input
        name="source"
        type="text"
        placeholder="Source / Book (optional)"
        className={inp}
        style={inpS}
      />

      {/* Attempted / Correct / Wrong — big tap targets */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { name: "attempted", label: "Tried",   val: attempted, set: setAttempted, color: "#ededed" },
          { name: "correct",   label: "✓ Right",  val: correct,   set: setCorrect,   color: "#10b981" },
          { name: "wrong",     label: "✗ Wrong",  val: wrong,     set: setWrong,     color: "#ef4444" },
        ].map(({ name, label, val, set, color }) => (
          <div key={name} className="rounded-xl p-3 flex flex-col items-center gap-1" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "rgba(226,226,240,0.4)" }}>
              {label}
            </span>
            <input
              name={name}
              type="number"
              inputMode="numeric"
              min="0"
              value={val || ""}
              onChange={e => set(Number(e.target.value))}
              placeholder="0"
              className="w-full text-center text-lg font-bold tabular-nums bg-transparent outline-none"
              style={{ color }}
              required={name === "attempted"}
            />
          </div>
        ))}
      </div>

      {/* Live accuracy bar */}
      {accuracy !== null && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${accuracy}%`, background: accColor }}
            />
          </div>
          <div className="flex justify-between text-[10px]" style={{ color: accColor }}>
            <span>{accuracy}% accuracy</span>
            <span>{skipped} skipped</span>
          </div>
        </div>
      )}

      <input type="hidden" name="skipped" value={skipped} />

      {/* Duration + Notes — collapsible feel but always visible */}
      <div className="grid grid-cols-2 gap-2">
        <input
          name="duration_minutes"
          type="number"
          inputMode="numeric"
          min="1"
          placeholder="Duration (min)"
          className={inp}
          style={inpS}
        />
        <input
          name="notes"
          type="text"
          placeholder="Notes"
          className={inp}
          style={inpS}
        />
      </div>

      {state?.error && (
        <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "#1a0808", border: "1px solid #3f1515", color: "#f87171" }}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "#0a1a0f", border: "1px solid #14532d", color: "#4ade80" }}>
          ✓ Batch logged
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ background: "#ededed", color: "#0a0a0a" }}
      >
        {isPending ? "Logging…" : "Log Batch"}
      </button>
    </form>
  );
}

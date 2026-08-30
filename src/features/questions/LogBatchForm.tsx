"use client";

import { useActionState, useState } from "react";
import { logQuestionBatch } from "@/app/(dashboard)/questions/actions";

interface Subject { id: string; name: string; color: string | null; }
interface Topic { id: string; name: string; subject_id: string; }

interface LogBatchFormProps {
  subjects: Subject[];
  topics: Topic[];
}

const inputCls = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-white/30 placeholder:text-neutral-600 transition-all";
const inputStyle = { background: "#111111", border: "1px solid #262626", color: "#ededed" };
const labelCls = "block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider";

export function LogBatchForm({ subjects, topics }: LogBatchFormProps) {
  const [state, action, isPending] = useActionState(logQuestionBatch, null);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [attempted, setAttempted] = useState<number>(0);
  const [correct, setCorrect] = useState<number>(0);
  const [wrong, setWrong] = useState<number>(0);

  const filteredTopics = topics.filter(t => t.subject_id === selectedSubject);
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : null;
  const skipped = Math.max(0, attempted - correct - wrong);

  return (
    <form action={action} className="space-y-4">
      {/* Subject */}
      <div>
        <label className={labelCls}>Subject</label>
        <select
          name="subject_id"
          value={selectedSubject}
          onChange={e => setSelectedSubject(e.target.value)}
          className={inputCls + " appearance-none"}
          style={inputStyle}
        >
          <option value="">— No subject —</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Topic */}
      {filteredTopics.length > 0 && (
        <div>
          <label className={labelCls}>Topic</label>
          <select name="topic_id" className={inputCls + " appearance-none"} style={inputStyle}>
            <option value="">— No topic —</option>
            {filteredTopics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Source */}
      <div>
        <label className={labelCls}>Source / Book</label>
        <input
          name="source"
          type="text"
          placeholder="e.g. Arun Sharma, Oliveboard, PYQ 2023"
          className={inputCls}
          style={inputStyle}
        />
      </div>

      {/* Attempted / Correct / Wrong */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Attempted</label>
          <input
            name="attempted"
            type="number"
            min="1"
            value={attempted || ""}
            onChange={e => setAttempted(Number(e.target.value))}
            placeholder="0"
            className={inputCls}
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Correct ✓</label>
          <input
            name="correct"
            type="number"
            min="0"
            value={correct || ""}
            onChange={e => setCorrect(Number(e.target.value))}
            placeholder="0"
            className={inputCls}
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Wrong ✗</label>
          <input
            name="wrong"
            type="number"
            min="0"
            value={wrong || ""}
            onChange={e => setWrong(Number(e.target.value))}
            placeholder="0"
            className={inputCls}
            style={inputStyle}
            required
          />
        </div>
      </div>

      {/* Live accuracy preview */}
      {accuracy !== null && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${accuracy}%`,
                background: accuracy >= 80 ? "#10b981" : accuracy >= 60 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
          <span style={{
            color: accuracy >= 80 ? "#10b981" : accuracy >= 60 ? "#f59e0b" : "#ef4444",
          }}>
            {accuracy}% accuracy · {skipped} skipped
          </span>
        </div>
      )}

      {/* Hidden skipped */}
      <input type="hidden" name="skipped" value={skipped} />

      {/* Duration */}
      <div>
        <label className={labelCls}>Duration (min)</label>
        <input
          name="duration_minutes"
          type="number"
          min="1"
          placeholder="optional"
          className={inputCls}
          style={inputStyle}
        />
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          name="notes"
          rows={2}
          placeholder="Weak areas, patterns noticed…"
          className={inputCls + " resize-none"}
          style={inputStyle}
        />
      </div>

      {state?.error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#1a0a0a", border: "1px solid #3f1515", color: "#f87171" }}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#0a1a0f", border: "1px solid #14532d", color: "#4ade80" }}>
          ✓ Batch logged
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ background: "#ededed", color: "#0a0a0a" }}
      >
        {isPending ? "Logging…" : "Log Batch"}
      </button>
    </form>
  );
}

"use client";

import { useTransition, useState } from "react";
import { saveRealExamResult, deleteRealExamResult } from "@/app/(dashboard)/performance/actions";

const EXAM_COLORS: Record<string, { text: string; bg: string }> = {
  banking: { text: "#38bdf8", bg: "#38bdf820" },
  ssc:     { text: "#a78bfa", bg: "#a78bfa20" },
  other:   { text: "#f59e0b", bg: "#f59e0b20" },
};

interface SubjectRow {
  subject_name: string;
  marks_scored: number;
  marks_available: number;
}

interface ExamResult {
  id: string;
  exam_name: string;
  exam_type: "banking" | "ssc" | "other";
  stage: string | null;
  exam_date: string;
  total_score: number;
  total_max: number;
  subject_breakdown: SubjectRow[] | null;
  cutoff_used: number | null;
  notes: string | null;
}

interface RealExamResultFormProps {
  existingResults: ExamResult[];
  defaultExamType: "banking" | "ssc" | "other";
  todayStr: string;
}

export function RealExamResultForm({
  existingResults,
  defaultExamType,
  todayStr,
}: RealExamResultFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([
    { subject_name: "", marks_scored: 0, marks_available: 25 },
  ]);

  function addSubjectRow() {
    setSubjectRows((r) => [...r, { subject_name: "", marks_scored: 0, marks_available: 25 }]);
  }

  function removeSubjectRow(idx: number) {
    setSubjectRows((r) => r.filter((_, i) => i !== idx));
  }

  function updateSubjectRow(
    idx: number,
    field: keyof SubjectRow,
    value: string | number
  ) {
    setSubjectRows((r) =>
      r.map((row, i) =>
        i === idx ? { ...row, [field]: field === "subject_name" ? value : Number(value) } : row
      )
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);

    const totalScore = parseFloat(fd.get("total_score") as string);
    const totalMax = parseFloat(fd.get("total_max") as string);
    const cutoffStr = fd.get("cutoff_used") as string;
    const cutoff = cutoffStr ? parseFloat(cutoffStr) : undefined;

    const validSubjects = subjectRows.filter((r) => r.subject_name.trim());

    startTransition(async () => {
      const result = await saveRealExamResult({
        exam_name: fd.get("exam_name") as string,
        exam_type: fd.get("exam_type") as "banking" | "ssc" | "other",
        stage: (fd.get("stage") as string) || undefined,
        exam_date: fd.get("exam_date") as string,
        total_score: totalScore,
        total_max: totalMax,
        cutoff_used: cutoff,
        subject_breakdown: validSubjects.length > 0 ? validSubjects : undefined,
        notes: (fd.get("notes") as string) || undefined,
        client_generated_id: crypto.randomUUID(),
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setSubjectRows([{ subject_name: "", marks_scored: 0, marks_available: 25 }]);
        (e.target as HTMLFormElement).reset();
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl p-5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Log Real Exam Result</p>

        <div className="grid grid-cols-2 gap-3">
          <input
            name="exam_name"
            required
            placeholder="Exam name (e.g., SBI PO 2026)"
            className="col-span-2 bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-200 outline-none focus:border-neutral-600"
          />
          <select
            name="exam_type"
            defaultValue={defaultExamType}
            className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-200 outline-none focus:border-neutral-600"
          >
            <option value="banking">Banking</option>
            <option value="ssc">SSC</option>
            <option value="other">Other</option>
          </select>
          <input
            name="stage"
            placeholder="Stage (e.g., Prelims)"
            className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-200 outline-none focus:border-neutral-600"
          />
          <input
            name="exam_date"
            type="date"
            defaultValue={todayStr}
            required
            className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-400 outline-none focus:border-neutral-600"
          />
          <input
            name="cutoff_used"
            type="number"
            step="0.01"
            min="0"
            placeholder="Cutoff (optional)"
            className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-rose-400 outline-none focus:border-neutral-600"
          />
          <input
            name="total_score"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="Your score"
            className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-emerald-400 outline-none focus:border-neutral-600"
          />
          <input
            name="total_max"
            type="number"
            step="0.01"
            min="1"
            required
            placeholder="Max marks"
            className="bg-neutral-900 border border-neutral-800 text-sm rounded-lg px-3 py-2 text-neutral-200 outline-none focus:border-neutral-600"
          />
        </div>

        {/* Subject breakdown */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold">
            Subject Breakdown (optional)
          </p>
          {subjectRows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={row.subject_name}
                onChange={(e) => updateSubjectRow(idx, "subject_name", e.target.value)}
                placeholder="Subject name"
                className="flex-1 bg-neutral-900 border border-neutral-800 text-xs rounded-lg px-2 py-1.5 text-neutral-300 outline-none focus:border-neutral-600"
              />
              <input
                type="number"
                value={row.marks_scored}
                onChange={(e) => updateSubjectRow(idx, "marks_scored", e.target.value)}
                step="0.01"
                min="0"
                className="w-16 bg-neutral-900 border border-neutral-800 text-xs rounded-lg px-2 py-1.5 text-emerald-400 outline-none focus:border-neutral-600 tabular-nums"
              />
              <span className="text-neutral-700 text-xs">/</span>
              <input
                type="number"
                value={row.marks_available}
                onChange={(e) => updateSubjectRow(idx, "marks_available", e.target.value)}
                step="0.01"
                min="1"
                className="w-16 bg-neutral-900 border border-neutral-800 text-xs rounded-lg px-2 py-1.5 text-neutral-400 outline-none focus:border-neutral-600 tabular-nums"
              />
              {subjectRows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSubjectRow(idx)}
                  className="text-neutral-700 hover:text-rose-400 text-xs transition-colors px-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addSubjectRow}
            className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            + Add subject
          </button>
        </div>

        <input
          name="notes"
          placeholder="Notes (optional)"
          className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-lg px-3 py-2 text-neutral-400 outline-none focus:border-neutral-600"
        />

        {error && (
          <p className="text-xs text-rose-400 bg-rose-400/10 rounded-lg px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-xs text-emerald-400 bg-emerald-400/10 rounded-lg px-3 py-2">✓ Result saved</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full text-xs font-medium py-2 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Exam Result"}
        </button>
      </form>

      {/* History */}
      {existingResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Exam History
          </p>
          {existingResults.map((result) => {
            const examStyle = EXAM_COLORS[result.exam_type] ?? EXAM_COLORS.other;
            const pct = result.total_max > 0 ? (result.total_score / result.total_max) * 100 : 0;
            const cutoffGap = result.cutoff_used != null ? result.total_score - result.cutoff_used : null;

            return (
              <ExamResultCard
                key={result.id}
                result={result}
                examStyle={examStyle}
                pct={pct}
                cutoffGap={cutoffGap}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExamResultCard({
  result,
  examStyle,
  pct,
  cutoffGap,
}: {
  result: ExamResult;
  examStyle: { text: string; bg: string };
  pct: number;
  cutoffGap: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  const scoreColor = pct >= 70 ? "#34d399" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-neutral-200">{result.exam_name}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: examStyle.bg, color: examStyle.text }}>
              {result.exam_type.toUpperCase()}
            </span>
            {result.stage && <span className="text-[10px] text-neutral-600">{result.stage}</span>}
            <span className="text-[10px] text-neutral-700">{result.exam_date}</span>
          </div>
          {cutoffGap !== null && (
            <p className="text-xs mt-1" style={{ color: cutoffGap >= 0 ? "#34d399" : "#ef4444" }}>
              {cutoffGap >= 0 ? "+" : ""}{cutoffGap.toFixed(2)} vs cutoff ({result.cutoff_used})
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold tabular-nums" style={{ color: scoreColor }}>
            {result.total_score}
          </p>
          <p className="text-[10px] text-neutral-600">/ {result.total_max} ({pct.toFixed(0)}%)</p>
        </div>
      </div>

      {/* Subject breakdown bars */}
      {result.subject_breakdown && result.subject_breakdown.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: "#1a1a1a" }}>
          {result.subject_breakdown.map((s, i) => {
            const sPct = s.marks_available > 0 ? (s.marks_scored / s.marks_available) * 100 : 0;
            const sColor = sPct >= 70 ? "#34d399" : sPct >= 50 ? "#f59e0b" : "#ef4444";
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] text-neutral-500 w-28 truncate shrink-0">{s.subject_name}</span>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: "#1a1a1a" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, sPct)}%`, background: sColor }}
                  />
                </div>
                <span className="text-[10px] tabular-nums shrink-0" style={{ color: sColor }}>
                  {s.marks_scored}/{s.marks_available}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {result.notes && (
        <p className="text-xs text-neutral-600 italic">{result.notes}</p>
      )}

      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Delete this exam result?")) return;
          setDeleted(true);
          startTransition(() => void deleteRealExamResult(result.id));
        }}
        className="text-[10px] text-neutral-700 hover:text-rose-400 transition-colors"
      >
        Delete
      </button>
    </div>
  );
}

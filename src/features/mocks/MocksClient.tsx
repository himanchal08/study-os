"use client";

import { useState, useActionState, useEffect } from "react";
import Link from "next/link";
import { deleteMock, updateMock } from "@/app/(dashboard)/mocks/actions";

interface MockItem {
  id: string;
  name: string;
  source: string;
  exam_type: string;
  stage: string | null;
  mock_date: string;
  maximum_marks: number;
  score: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  actual_duration_minutes: number;
  recommended_duration_minutes: number | null;
  percentile: number | null;
  rank: number | null;
  notes: string | null;
}

interface Props {
  mocks: MockItem[];
  sectionCountMap: Record<string, number>;
}

const EXAM_COLORS: Record<string, { text: string; bg: string }> = {
  banking: { text: "#38bdf8", bg: "#38bdf820" },
  ssc: { text: "#a78bfa", bg: "#a78bfa20" },
  other: { text: "#f59e0b", bg: "#f59e0b20" },
};

const inputCls   = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-white/20 placeholder:text-neutral-600 transition-all";
const inputStyle = { background: "#111111", border: "1px solid #262626", color: "#ededed" };
const labelCls   = "block text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider";

function ScoreBadge({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="text-right">
      <p className="text-lg font-bold tabular-nums" style={{ color }}>{score}</p>
      <p className="text-[10px] text-neutral-600">/ {max} ({pct}%)</p>
    </div>
  );
}

// -- Inline Edit Modal ----------------------------------------------------------
function EditMockModal({ mock, onClose }: { mock: MockItem; onClose: () => void }) {
  const [state, action, isPending] = useActionState(updateMock, null);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 space-y-4 my-8"
        style={{ background: "#0d0d0d", border: "1px solid #262626" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-200">Edit Mock</p>
          <button
            onClick={onClose}
            className="text-neutral-600 hover:text-neutral-300 transition-colors text-lg leading-none"
          >
            ?
          </button>
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={mock.id} />

          {/* Mock Name */}
          <div>
            <label className={labelCls}>Mock Name *</label>
            <input name="name" type="text" defaultValue={mock.name} className={inputCls} style={inputStyle} required />
          </div>

          {/* Source + Exam Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Platform / Source *</label>
              <input name="source" type="text" defaultValue={mock.source} className={inputCls} style={inputStyle} required />
            </div>
            <div>
              <label className={labelCls}>Exam Type</label>
              <select name="exam_type" defaultValue={mock.exam_type} className="select-premium">
                <option value="banking">Banking</option>
                <option value="ssc">SSC CGL</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Stage + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Stage</label>
              <input name="stage" type="text" defaultValue={mock.stage ?? ""} placeholder="Pre / Mains…" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Date *</label>
              <input name="mock_date" type="date" defaultValue={mock.mock_date} className={inputCls} style={{ ...inputStyle, colorScheme: "dark" }} required />
            </div>
          </div>

          {/* Score + Max */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Score *</label>
              <input name="score" type="number" step="0.25" min="0" defaultValue={mock.score} className={inputCls} style={inputStyle} required />
            </div>
            <div>
              <label className={labelCls}>Max Marks *</label>
              <input name="maximum_marks" type="number" min="1" defaultValue={mock.maximum_marks} className={inputCls} style={inputStyle} required />
            </div>
          </div>

          {/* Q counts */}
          <div className="grid grid-cols-4 gap-2">
            {([
              { name: "attempted",   label: "Attempted *", required: true  },
              { name: "correct",     label: "Correct",     required: false },
              { name: "wrong",       label: "Wrong",       required: false },
              { name: "unattempted", label: "Skipped",     required: false },
            ] as const).map(({ name, label, required }) => {
              const defaultVal =
                name === "attempted"   ? mock.attempted   :
                name === "correct"     ? mock.correct     :
                name === "wrong"       ? mock.wrong       :
                mock.unattempted;
              return (
                <div key={name} className="rounded-xl p-2.5 flex flex-col items-center gap-1" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-center leading-tight" style={{ color: "rgba(226,226,240,0.4)" }}>
                    {label}
                  </label>
                  <input
                    name={name}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    defaultValue={defaultVal}
                    placeholder="0"
                    className="w-full text-center text-base font-bold tabular-nums bg-transparent outline-none text-neutral-200"
                    required={required}
                  />
                </div>
              );
            })}
          </div>

          {/* Durations */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Actual Duration (min) *</label>
              <input name="actual_duration_minutes" type="number" min="1" defaultValue={mock.actual_duration_minutes} className={inputCls} style={inputStyle} required />
            </div>
            <div>
              <label className={labelCls}>Recommended Duration (min)</label>
              <input name="recommended_duration_minutes" type="number" min="1" defaultValue={mock.recommended_duration_minutes ?? ""} placeholder="optional" className={inputCls} style={inputStyle} />
            </div>
          </div>

          {/* Percentile + Rank */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Percentile</label>
              <input name="percentile" type="number" step="0.01" min="0" max="100" defaultValue={mock.percentile ?? ""} placeholder="optional" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Rank</label>
              <input name="rank" type="number" min="1" defaultValue={mock.rank ?? ""} placeholder="optional" className={inputCls} style={inputStyle} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea name="notes" rows={2} defaultValue={mock.notes ?? ""} placeholder="What went wrong? What to improve?" className={inputCls + " resize-none"} style={inputStyle} />
          </div>

          {state?.error && (
            <p className="text-xs p-2 rounded-lg" style={{ background: "#1a0a0a", border: "1px solid #3f1515", color: "#f87171" }}>
              {state.error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: "#1a1a1a", color: "#999", border: "1px solid #262626" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: "#ededed", color: "#0a0a0a" }}
            >
              {isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -- Mock Card ------------------------------------------------------------------
function MockCard({ mock, sectionCount }: { mock: MockItem; sectionCount: number }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const examStyle = EXAM_COLORS[mock.exam_type] ?? EXAM_COLORS.other;
  const accuracy = mock.attempted > 0 ? Math.round((mock.correct / mock.attempted) * 100) : 0;

  async function handleDelete() {
    if (!confirm("Delete this mock?")) return;
    setDeleting(true);
    await deleteMock(mock.id);
  }

  return (
    <>
      {editOpen && <EditMockModal mock={mock} onClose={() => setEditOpen(false)} />}
      <div className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-neutral-200 truncate">{mock.name}</p>
              <Link
                href={`/mocks/${mock.id}`}
                className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors shrink-0"
              >
                View ?
              </Link>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: examStyle.bg, color: examStyle.text }}>
                {mock.exam_type}
              </span>
              {mock.stage && <span className="text-[10px] text-neutral-600">{mock.stage}</span>}
              <span className="text-[10px] text-neutral-600">{mock.source}</span>
              <span className="text-[10px] text-neutral-700">{mock.mock_date}</span>
              {sectionCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                  {sectionCount} section{sectionCount !== 1 ? "s" : ""} logged
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
              <span>? {mock.correct}</span>
              <span>? {mock.wrong}</span>
              <span>— {mock.unattempted}</span>
              <span className="text-neutral-600">·</span>
              <span>{accuracy}% acc</span>
              {mock.percentile && <span className="text-emerald-400">{mock.percentile.toFixed(1)}%ile</span>}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <ScoreBadge score={mock.score} max={mock.maximum_marks} />
            <div className="flex gap-1.5">
              <button
                onClick={() => setEditOpen(true)}
                className="text-[10px] px-2 py-1 rounded-lg transition-colors font-medium"
                style={{ background: "#1a1a1a", color: "#a3a3a3", border: "1px solid #262626" }}
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[10px] px-2 py-1 rounded-lg transition-colors font-medium"
                style={{ background: "#1a0808", color: "#f87171", border: "1px solid #3f1515" }}
              >
                {deleting ? "…" : "Del"}
              </button>
            </div>
          </div>
        </div>

        {mock.notes && (
          <p className="text-xs text-neutral-600 mt-2 border-t pt-2" style={{ borderColor: "#1a1a1a" }}>
            {mock.notes}
          </p>
        )}
      </div>
    </>
  );
}

// -- Main Component -------------------------------------------------------------
export function MocksClient({ mocks, sectionCountMap }: Props) {
  if (mocks.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        <p className="text-neutral-600 text-sm">No mocks logged yet. Log your first mock test.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {mocks.map(m => (
        <MockCard
          key={m.id}
          mock={m}
          sectionCount={sectionCountMap[m.id] ?? 0}
        />
      ))}
    </div>
  );
}

"use client";

import { useState, useActionState, useEffect } from "react";
import { deleteQuestionBatch, updateQuestionBatch } from "@/app/(dashboard)/questions/actions";

interface Stats {
  attempted: number;
  correct: number;
  accuracy: number | null;
}

interface TopicStat {
  name: string;
  attempted: number;
  correct: number;
}

interface SubjectStat {
  name: string;
  color: string;
  attempted: number;
  correct: number;
  topics: TopicStat[];
}

interface BatchItem {
  id: string;
  logged_at: string;
  attempted: number;
  correct: number;
  source: string | null;
  notes: string | null;
  duration_minutes: number | null;
  subject: { name: string; color: string | null } | null;
  topic: { name: string } | null;
}

interface Props {
  todayStats: Stats;
  weekStats: Stats;
  allStats: Stats;
  subjectStats: SubjectStat[];
  batches: BatchItem[];
  todayStr: string;
  offsetMin: number;
  timezone: string;
  hideStats?: boolean;
}

type Tab = "today" | "week" | "all";

// ── Inline Edit Modal ──────────────────────────────────────────────────────────
function EditBatchModal({ batch, onClose }: { batch: BatchItem; onClose: () => void }) {
  const [state, action, isPending] = useActionState(updateQuestionBatch, null);
  const [attempted, setAttempted] = useState(batch.attempted);
  const [correct, setCorrect] = useState(batch.correct);
  const [wrong, setWrong] = useState(Math.max(0, batch.attempted - batch.correct));

  const skipped = Math.max(0, attempted - correct - wrong);
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : null;
  const accColor = accuracy == null ? "#525252" : accuracy >= 80 ? "#10b981" : accuracy >= 60 ? "#f59e0b" : "#ef4444";

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const inp = "w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-1 focus:ring-white/20 placeholder:text-neutral-600 transition-all";
  const inpS = { background: "#111", border: "1px solid #262626", color: "#ededed" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 space-y-4 relative my-8"
        style={{ background: "#0d0d0d", border: "1px solid #262626" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-200">Edit Batch</p>
          <button
            onClick={onClose}
            className="text-neutral-600 hover:text-neutral-300 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form action={action} className="space-y-3">
          <input type="hidden" name="id" value={batch.id} />
          <input type="hidden" name="skipped" value={skipped} />

          <input
            name="source"
            type="text"
            defaultValue={batch.source ?? ""}
            placeholder="Source / Book (optional)"
            className={inp}
            style={inpS}
          />

          <div className="grid grid-cols-3 gap-2">
            {[
              { name: "attempted", label: "Tried", val: attempted, set: setAttempted, color: "#ededed" },
              { name: "correct", label: "✓ Right", val: correct, set: setCorrect, color: "#10b981" },
              { name: "wrong", label: "✗ Wrong", val: wrong, set: setWrong, color: "#ef4444" },
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

          <div className="grid grid-cols-2 gap-2">
            <input
              name="duration_minutes"
              type="number"
              inputMode="numeric"
              min="1"
              defaultValue={batch.duration_minutes ?? ""}
              placeholder="Duration (min)"
              className={inp}
              style={inpS}
            />
            <input
              name="notes"
              type="text"
              defaultValue={batch.notes ?? ""}
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

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "#1a1a1a", color: "#999", border: "1px solid #262626" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40"
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

// ── Batch Card ─────────────────────────────────────────────────────────────────
function BatchCard({ batch, todayStr, offsetMin, timezone }: { batch: BatchItem; todayStr: string; offsetMin: number; timezone: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function dayDate(ts: string) {
    const d = new Date(ts);
    const shifted = new Date(d.getTime() + offsetMin * 60000);
    return shifted.toISOString().slice(0, 10);
  }

  const isToday = dayDate(batch.logged_at) === todayStr;
  const pct = batch.attempted > 0 ? Math.round((batch.correct / batch.attempted) * 100) : 0;
  const barColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";

  async function handleDelete() {
    if (!confirm("Delete this batch?")) return;
    setDeleting(true);
    await deleteQuestionBatch(batch.id);
  }

  return (
    <>
      {editOpen && <EditBatchModal batch={batch} onClose={() => setEditOpen(false)} />}
      <div className="rounded-xl p-3.5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {batch.subject && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: `${batch.subject.color ?? "#555"}20`, color: batch.subject.color ?? "#aaa" }}
              >
                {batch.subject.name}
              </span>
            )}
            {batch.topic && <span className="text-[10px] text-neutral-500 truncate">{batch.topic.name}</span>}
            {batch.source && <span className="text-[10px] text-neutral-700">· {batch.source}</span>}
            {isToday && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full text-emerald-400" style={{ background: "#10b98118" }}>
                today
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold tabular-nums text-emerald-400">{batch.correct}</span>
              <span className="text-neutral-700 text-xs">/</span>
              <span className="text-sm font-semibold tabular-nums text-neutral-300">{batch.attempted}</span>
            </div>
            <button
              onClick={() => setEditOpen(true)}
              className="text-[10px] px-2 py-1 rounded-lg transition-colors font-medium"
              style={{ background: "#1a1a1a", color: "#a3a3a3", border: "1px solid #262626" }}
              title="Edit batch"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-[10px] px-2 py-1 rounded-lg transition-colors font-medium"
              style={{ background: "#1a0808", color: "#f87171", border: "1px solid #3f1515" }}
              title="Delete batch"
            >
              {deleting ? "…" : "Del"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
          </div>
          <span className="text-xs tabular-nums shrink-0 font-medium" style={{ color: barColor }}>{pct}%</span>
        </div>

        {batch.notes && <p className="text-xs text-neutral-600 mt-2 leading-relaxed">{batch.notes}</p>}

        <p className="text-[10px] text-neutral-700 mt-2">
          {new Date(batch.logged_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: timezone })}
          {batch.duration_minutes ? ` · ${batch.duration_minutes} min` : ""}
        </p>
      </div>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function QuestionsClient({ todayStats, weekStats, allStats, subjectStats, batches, todayStr, offsetMin, timezone, hideStats }: Props) {
  const [tab, setTab] = useState<Tab>("today");

  const stats = tab === "today" ? todayStats : tab === "week" ? weekStats : allStats;
  const tabLabel = tab === "today" ? "Today" : tab === "week" ? "Last 7 Days" : "All Time";

  const accColor = stats.accuracy === null
    ? "#525252"
    : stats.accuracy >= 80 ? "#10b981"
    : stats.accuracy >= 60 ? "#f59e0b"
    : "#ef4444";

  return (
    <div className="space-y-4">

      {!hideStats && (
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          {(["today", "week", "all"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t ? "#1a1a1a" : "transparent",
                color: tab === t ? "#ededed" : "#525252",
                border: tab === t ? "1px solid #262626" : "1px solid transparent",
              }}
            >
              {t === "today" ? "Today" : t === "week" ? "7 Days" : "All Time"}
            </button>
          ))}
        </div>
      )}


      {!hideStats && (
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Attempted",
              value: stats.attempted.toLocaleString(),
              color: "#ededed",
              empty: stats.attempted === 0,
            },
            {
              label: "Correct",
              value: stats.correct.toLocaleString(),
              color: "#10b981",
              empty: stats.attempted === 0,
            },
            {
              label: "Accuracy",
              value: stats.accuracy !== null ? `${stats.accuracy}%` : "—",
              color: accColor,
              empty: stats.accuracy === null,
            },
          ].map(({ label, value, color, empty }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center"
              style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
            >
              <p className="text-[9px] uppercase tracking-wider text-neutral-600 mb-1">{label}</p>
              <p
                className="text-lg font-bold tabular-nums"
                style={{ color: empty ? "#333" : color }}
              >
                {empty && label !== "Accuracy" ? "0" : value}
              </p>
              <p className="text-[9px] text-neutral-700 mt-0.5">{tabLabel}</p>
            </div>
          ))}
        </div>
      )}


      {!hideStats && subjectStats.length > 0 && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
        >
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Subject Breakdown <span className="text-neutral-700 font-normal normal-case">(all time)</span>
          </p>

          <div className="space-y-4">
            {subjectStats.map(s => {
              const pct = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0;
              const barColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
              const totalPct = allStats.attempted > 0
                ? Math.round((s.attempted / allStats.attempted) * 100)
                : 0;
              return (
                <div key={s.name} className="space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: s.color }}
                      />
                      <span className="text-xs font-medium text-neutral-300 truncate">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] tabular-nums shrink-0">
                      <span className="text-neutral-600">{s.attempted.toLocaleString()} tried</span>
                      <span style={{ color: barColor }} className="font-semibold">{pct}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "#1a1a1a" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                    <span className="text-[9px] text-neutral-700 tabular-nums w-7 text-right shrink-0">
                      {totalPct}%
                    </span>
                  </div>
                  {s.topics && s.topics.length > 0 && (
                    <div className="pl-4 pt-1 space-y-1">
                      {s.topics.map(t => {
                        const tPct = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0;
                        const tBarColor = tPct >= 80 ? "#10b981" : tPct >= 60 ? "#f59e0b" : "#ef4444";
                        return (
                          <div key={t.name} className="flex items-center justify-between group">
                            <span className="text-[10px] text-neutral-500 truncate group-hover:text-neutral-400 transition-colors">{t.name}</span>
                            <div className="flex items-center gap-2 text-[9px] tabular-nums shrink-0">
                              <span className="text-neutral-600">{t.attempted.toLocaleString()}</span>
                              <span style={{ color: tBarColor }} className="font-medium">{tPct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>


          <div
            className="flex items-center justify-between pt-2"
            style={{ borderTop: "1px solid #1a1a1a" }}
          >
            <span className="text-[10px] text-neutral-600">Total questions</span>
            <div className="flex items-center gap-3 text-[10px] tabular-nums">
              <span className="text-neutral-400 font-semibold">{allStats.attempted.toLocaleString()} attempted</span>
              <span className="text-emerald-500 font-semibold">{allStats.correct.toLocaleString()} correct</span>
            </div>
          </div>
        </div>
      )}

      {hideStats && (
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Recent Batches</p>
      )}

      {/* Batch list with Edit/Delete */}
      {batches.length > 0 ? (
        <div className="space-y-2">
          {batches.map(b => (
            <BatchCard
              key={b.id}
              batch={b}
              todayStr={todayStr}
              offsetMin={offsetMin}
              timezone={timezone}
            />
          ))}
        </div>
      ) : hideStats ? (
        <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <p className="text-sm text-neutral-600">No batches yet — log your first set.</p>
        </div>
      ) : null}
    </div>
  );
}

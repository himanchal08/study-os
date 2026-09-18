"use client";

import { useMemo, useState, useTransition } from "react";
import type { Tables } from "@/types/database";
import { format } from "date-fns";
import { deleteStudySession, updateSessionTimes } from "./actions";

type SessionRow = Pick<Tables<"study_sessions">, "id" | "start_timestamp" | "end_timestamp" | "activity_type" | "notes" | "pause_duration_seconds"> & {
  subjects: { name: string; color: string | null } | null;
  topics: { name: string } | null;
};

interface WeeklyTimesheetProps {
  sessions: SessionRow[];
  todayOnly?: boolean;
}

export function WeeklyTimesheet({ sessions, todayOnly = false }: WeeklyTimesheetProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (confirm("Delete this session? This cannot be undone.")) {
      startTransition(async () => {
        const res = await deleteStudySession(id);
        if (res.error) alert("Failed to delete: " + res.error);
      });
    }
  };

  const grouped = useMemo(() => {
    const groups: Record<string, SessionRow[]> = {};
    sessions.forEach(s => {
      const dateStr = s.start_timestamp.split("T")[0];
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(s);
    });
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => new Date(b.start_timestamp).getTime() - new Date(a.start_timestamp).getTime()),
      }));
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        <p className="text-sm font-medium text-neutral-400">No sessions yet today</p>
        <p className="text-xs text-neutral-600 mt-1">Start the timer to record your first session.</p>
      </div>
    );
  }

  if (todayOnly) {
    const allSessions = grouped.flatMap(g => g.items);
    return (
      <div className="rounded-xl overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        <div className="divide-y divide-neutral-900">
          {allSessions.map(session => (
            <SessionRowItem
              key={session.id}
              session={session}
              onDelete={handleDelete}
              isPending={isPending}
              canEdit={true}
              editingId={editingId}
              setEditingId={setEditingId}
              startTransition={startTransition}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ date, items }) => {
        const totalSecs = items.reduce((acc, s) => {
          if (!s.end_timestamp) return acc;
          const start = new Date(s.start_timestamp).getTime();
          const end = new Date(s.end_timestamp).getTime();
          return acc + Math.max(0, (end - start) / 1000 - (s.pause_duration_seconds ?? 0));
        }, 0);
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const dayTotal = h > 0 ? `${h}h ${m}m` : `${m}m`;

        return (
          <div key={date} className="rounded-xl overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1a1a1a", background: "#111111" }}>
              <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                {format(new Date(date), "EEEE, MMM d")}
              </h3>
              <span className="text-xs font-medium text-neutral-400">{dayTotal} total</span>
            </div>
            <div className="divide-y divide-neutral-900">
              {items.map(session => (
                <SessionRowItem
                  key={session.id}
                  session={session}
                  onDelete={handleDelete}
                  isPending={isPending}
                  canEdit={false}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  startTransition={startTransition}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Session row (with optional inline time editor) ───────────────────────────

function toLocalTimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function applyTimeToDate(baseIso: string, timeStr: string): string {
  const base = new Date(baseIso);
  const [h, m] = timeStr.split(":").map(Number);
  base.setHours(h, m, 0, 0);
  return base.toISOString();
}

function SessionRowItem({
  session,
  onDelete,
  isPending,
  canEdit,
  editingId,
  setEditingId,
  startTransition,
}: {
  session: SessionRow;
  onDelete: (id: string) => void;
  isPending: boolean;
  canEdit: boolean;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  startTransition: ReturnType<typeof useTransition>[1];
}) {
  const isEditing  = editingId === session.id;
  const isRunning  = !session.end_timestamp;
  const start      = new Date(session.start_timestamp);
  const end        = session.end_timestamp ? new Date(session.end_timestamp) : null;
  const color      = session.subjects?.color ?? "#52525b";

  const [editStart, setEditStart] = useState(() => toLocalTimeInput(session.start_timestamp));
  const [editEnd,   setEditEnd]   = useState(() =>
    session.end_timestamp ? toLocalTimeInput(session.end_timestamp) : ""
  );
  const [editError, setEditError] = useState<string | null>(null);

  let durationStr = "Running…";
  if (end) {
    const duration = Math.max(0, (end.getTime() - start.getTime()) / 1000 - (session.pause_duration_seconds ?? 0));
    const dh = Math.floor(duration / 3600);
    const dm = Math.floor((duration % 3600) / 60);
    const ds = Math.floor(duration % 60);
    durationStr = dh > 0
      ? `${dh}:${String(dm).padStart(2, "0")}:${String(ds).padStart(2, "0")}`
      : `${dm}:${String(ds).padStart(2, "0")}`;
  }

  const handleSaveEdit = () => {
    if (!editEnd) { setEditError("End time is required."); return; }
    const newStart = applyTimeToDate(session.start_timestamp, editStart);
    const newEnd   = applyTimeToDate(session.start_timestamp, editEnd);

    // If end appears before start on the same day, assume it crosses midnight
    const startMs = new Date(newStart).getTime();
    let   endMs   = new Date(newEnd).getTime();
    if (endMs <= startMs) endMs += 24 * 60 * 60 * 1000;

    if (endMs - startMs > 24 * 60 * 60 * 1000) {
      setEditError("Session cannot span more than 24 hours.");
      return;
    }

    setEditError(null);
    startTransition(async () => {
      const res = await updateSessionTimes({
        sessionId:      session.id,
        startTimestamp: new Date(startMs).toISOString(),
        endTimestamp:   new Date(endMs).toISOString(),
      });
      if (res.error) {
        setEditError(res.error);
      } else {
        setEditingId(null);
      }
    });
  };

  return (
    <div className="group" style={{ borderLeft: `3px solid ${color}` }}>
      {/* Main row */}
      <div className="px-4 py-3 flex items-center justify-between hover:bg-white/2 transition-colors">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-200 truncate">
                {session.notes || "(No description)"}
              </span>
              {session.activity_type && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-neutral-800 text-neutral-500 uppercase tracking-wider shrink-0">
                  {session.activity_type}
                </span>
              )}
              {isRunning && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm text-emerald-400 shrink-0" style={{ background: "#10b98120" }}>
                  live
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-600 truncate">
              {session.subjects?.name && <span style={{ color }}>{session.subjects.name}</span>}
              {session.subjects?.name && session.topics?.name && <span>·</span>}
              {session.topics?.name && <span className="text-neutral-600">{session.topics.name}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-4 shrink-0">
          <div className="text-xs text-neutral-500 hidden sm:block">
            {format(start, "h:mm a")} {end ? `– ${format(end, "h:mm a")}` : ""}
          </div>
          <div className="text-sm font-mono font-medium tabular-nums text-neutral-300 w-16 text-right">
            {durationStr}
          </div>

          {/* Edit button — only for today's completed sessions */}
          {canEdit && !isRunning && (
            <button
              onClick={() => {
                if (isEditing) {
                  setEditingId(null);
                } else {
                  setEditStart(toLocalTimeInput(session.start_timestamp));
                  setEditEnd(session.end_timestamp ? toLocalTimeInput(session.end_timestamp) : "");
                  setEditError(null);
                  setEditingId(session.id);
                }
              }}
              disabled={isPending}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-neutral-600 hover:text-neutral-300 hover:bg-white/5 transition-all"
              title="Edit times"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          <button
            onClick={() => onDelete(session.id)}
            disabled={isPending}
            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 text-neutral-600 hover:text-red-400 rounded transition-all"
            title="Delete session"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Inline time editor — expands below row when editing */}
      {isEditing && (
        <div
          className="px-4 pb-3 pt-0"
          style={{ background: "#0f0f0f", borderTop: "1px solid #1a1a1a" }}
        >
          <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-2 pt-2">Edit session times</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-neutral-500 uppercase tracking-wider w-9">Start</label>
              <input
                type="time"
                value={editStart}
                onChange={e => setEditStart(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-sm outline-none font-mono tabular-nums"
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#ededed", colorScheme: "dark" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-neutral-500 uppercase tracking-wider w-9">End</label>
              <input
                type="time"
                value={editEnd}
                onChange={e => setEditEnd(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-sm outline-none font-mono tabular-nums"
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#ededed", colorScheme: "dark" }}
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setEditingId(null)}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.3)" }}
              >
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          {editError && (
            <p className="text-xs text-red-400 mt-2">{editError}</p>
          )}
        </div>
      )}
    </div>
  );
}

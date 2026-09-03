"use client";

import { useMemo, useTransition } from "react";
import type { Tables } from "@/types/database";
import { format } from "date-fns";
import { deleteStudySession } from "./actions";

type SessionRow = Pick<Tables<"study_sessions">, "id" | "start_timestamp" | "end_timestamp" | "activity_type" | "notes" | "pause_duration_seconds"> & {
  subjects: { name: string; color: string | null } | null;
  topics: { name: string } | null;
};

interface WeeklyTimesheetProps {
  sessions: SessionRow[];
}

export function WeeklyTimesheet({ sessions }: WeeklyTimesheetProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this study session? This action cannot be undone.")) {
      startTransition(async () => {
        const res = await deleteStudySession(id);
        if (res.error) {
          alert("Failed to delete: " + res.error);
        }
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
      .map(([date, items]) => {
        
        const sortedItems = items.sort((a, b) => new Date(b.start_timestamp).getTime() - new Date(a.start_timestamp).getTime());
        return { date, items: sortedItems };
      });
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        <p className="text-sm font-medium text-neutral-300">No recent activity</p>
        <p className="text-xs text-neutral-600 mt-1">Start the timer to record a session.</p>
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
          const duration = Math.max(0, (end - start) / 1000 - s.pause_duration_seconds);
          return acc + duration;
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
              {items.map(session => {
                const isRunning = !session.end_timestamp;
                const start = new Date(session.start_timestamp);
                const end = session.end_timestamp ? new Date(session.end_timestamp) : null;
                
                let durationStr = "Running...";
                if (end) {
                  const duration = Math.max(0, (end.getTime() - start.getTime()) / 1000 - session.pause_duration_seconds);
                  const dh = Math.floor(duration / 3600);
                  const dm = Math.floor((duration % 3600) / 60);
                  const ds = Math.floor(duration % 60);
                  durationStr = dh > 0 ? `${dh}:${String(dm).padStart(2, '0')}:${String(ds).padStart(2, '0')}` : `${dm}:${String(ds).padStart(2, '0')}`;
                }

                const color = session.subjects?.color ?? "#52525b";

                return (
                  <div key={session.id} className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: color }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-200 truncate">
                            {session.notes || "(No description)"}
                          </span>
                          {session.activity_type && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-neutral-800 text-neutral-400 uppercase tracking-wider">
                              {session.activity_type}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500 truncate">
                          {session.subjects?.name && <span style={{ color }}>{session.subjects.name}</span>}
                          {session.subjects?.name && session.topics?.name && <span>•</span>}
                          {session.topics?.name && <span>{session.topics.name}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 ml-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-neutral-400">
                          {format(start, "h:mm a")} - {end ? format(end, "h:mm a") : "Now"}
                        </div>
                      </div>
                      <div className="text-sm font-mono font-medium tabular-nums text-neutral-300 w-20 text-right">
                        {durationStr}
                      </div>
                      <button 
                        onClick={() => handleDelete(session.id)}
                        disabled={isPending}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 text-neutral-500 hover:text-red-400 rounded transition-all"
                        title="Delete session"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

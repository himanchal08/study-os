"use client";

import { useState } from "react";

interface CalendarGridProps {
  tasks: Array<{ id: string; title: string; status: string; planned_date: string | null; due_date: string | null }>;
  sessions?: Array<{ id: string; start_timestamp: string; end_timestamp: string | null; pause_duration_seconds: number | null; activity_type: string; subjects: { name: string; color: string | null } | null; topics: { name: string } | null }>;
}

export function CalendarGrid({ tasks, sessions = [] }: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday

  // Previous month padding
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const prevMonthDays = Array.from({ length: firstDayOfMonth }).map((_, i) => {
    return { day: daysInPrevMonth - firstDayOfMonth + i + 1, isCurrentMonth: false, date: new Date(year, month - 1, daysInPrevMonth - firstDayOfMonth + i + 1) };
  });

  // Current month
  const currentMonthDays = Array.from({ length: daysInMonth }).map((_, i) => {
    return { day: i + 1, isCurrentMonth: true, date: new Date(year, month, i + 1) };
  });

  // Next month padding to fill 6 rows (42 cells)
  const totalCells = 42;
  const remainingCells = totalCells - (prevMonthDays.length + currentMonthDays.length);
  const nextMonthDays = Array.from({ length: remainingCells }).map((_, i) => {
    return { day: i + 1, isCurrentMonth: false, date: new Date(year, month + 1, i + 1) };
  });

  const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  // Helper to format Date to YYYY-MM-DD local time string for matching DB dates
  const toDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getTasksForDate = (dateStr: string) => {
    return tasks.filter(t => t.planned_date === dateStr || t.due_date === dateStr);
  };

  const getSessionsForDate = (dateStr: string) => {
    return sessions.filter(s => {
      if (!s.end_timestamp) return false;
      const d = new Date(s.start_timestamp);
      return toDateString(d) === dateStr;
    });
  };

  function sessionDuration(s: typeof sessions[0]): string {
    if (!s.end_timestamp) return "";
    const secs = Math.max(0,
      (new Date(s.end_timestamp).getTime() - new Date(s.start_timestamp).getTime()) / 1000
      - (s.pause_duration_seconds ?? 0)
    );
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
  }

  const goPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  return (
    <div className="rounded-xl border flex flex-col overflow-hidden" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
      {/* Header Controls */}
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#1a1a1a" }}>
        <h2 className="text-lg font-semibold text-neutral-100">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setSyncing(true);
              setSyncMsg(null);
              try {
                const res = await fetch("/api/calendar/sync", { method: "POST" });
                const data = await res.json();
                setSyncMsg({ text: data.message ?? data.error ?? "Done", ok: res.ok });
              } catch {
                setSyncMsg({ text: "Network error", ok: false });
              } finally {
                setSyncing(false);
                setTimeout(() => setSyncMsg(null), 5000);
              }
            }}
            disabled={syncing}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {syncing && (
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {syncing ? "Syncing…" : "Sync to Google"}
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors">
            Today
          </button>
          <div className="flex items-center bg-neutral-900 border rounded-lg overflow-hidden" style={{ borderColor: "#262626" }}>
            <button onClick={goPrevMonth} className="p-2 hover:bg-neutral-800 transition-colors border-r" style={{ borderColor: "#262626" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={goNextMonth} className="p-2 hover:bg-neutral-800 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Sync result banner */}
      {syncMsg && (
        <div
          className="px-4 py-2 text-xs"
          style={{
            background: syncMsg.ok ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.08)",
            borderBottom: `1px solid ${syncMsg.ok ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)"}`,
            color: syncMsg.ok ? "#34d399" : "#ef4444",
          }}
        >
          {syncMsg.text}
        </div>
      )}

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b bg-[#111]" style={{ borderColor: "#1a1a1a" }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 auto-rows-fr flex-1 bg-[#1a1a1a] gap-px">
        {allDays.map((cell, idx) => {
          const dateStr = toDateString(cell.date);
          const isToday = dateStr === toDateString(new Date());
          const cellTasks = getTasksForDate(dateStr);
          
          return (
            <div 
              key={idx} 
              className={`min-h-25 p-2 flex flex-col ${cell.isCurrentMonth ? "bg-[#0a0a0a]" : "bg-[#0f0f0f]"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday 
                    ? "bg-white text-black" 
                    : cell.isCurrentMonth ? "text-neutral-300" : "text-neutral-600"
                }`}>
                  {cell.day}
                </span>
                {cellTasks.length > 0 && (
                  <span className="text-[9px] text-neutral-500 font-medium">
                    {cellTasks.length} {cellTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                )}
              </div>
              
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {cellTasks.map(t => (
                  <div 
                    key={t.id} 
                    className="text-[10px] truncate px-1.5 py-0.5 rounded"
                    style={{ 
                      background: t.status === "completed" ? "#10b98115" : t.status === "postponed" ? "#f59e0b15" : "#262626",
                      color: t.status === "completed" ? "#34d399" : t.status === "postponed" ? "#fbbf24" : "#a1a1aa",
                      textDecoration: t.status === "completed" ? "line-through" : "none"
                    }}
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}

                {/* Session blocks */}
                {getSessionsForDate(dateStr).map(s => {
                  const color = s.subjects?.color ?? "#52525b";
                  const label = s.subjects?.name ?? s.topics?.name ?? s.activity_type;
                  const dur = sessionDuration(s);
                  return (
                    <div
                      key={s.id}
                      className="text-[9px] truncate px-1.5 py-0.5 rounded flex items-center gap-1"
                      style={{ background: `${color}18`, borderLeft: `2px solid ${color}`, color: `${color}cc` }}
                      title={`${label} — ${dur}`}
                    >
                      ⏱ {dur}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

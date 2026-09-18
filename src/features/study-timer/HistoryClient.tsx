"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { deleteStudySession } from "@/features/study-timer/actions";
import { useTransition } from "react";
import { SubjectOptions } from "@/components/ui/SubjectOptions";
import { dayBoundaryAwareDate } from "@/lib/calculations";

const ACTIVITY_COLORS: Record<string, string> = {
  practice: "#818cf8",
  lecture:  "#22d3ee",
  revision: "#34d399",
  mock:     "#f59e0b",
  reading:  "#a78bfa",
  other:    "#52525b",
};

export interface HistorySession {
  id: string;
  start_timestamp: string;
  end_timestamp: string;
  pause_duration_seconds: number | null;
  activity_type: string;
  notes: string | null;
  subjects: { name: string; color: string | null } | null;
  topics: { name: string } | null;
}

interface HistoryClientProps {
  sessions: HistorySession[];
  subjects: Array<{ id: string; name: string; color: string | null; exam_type?: string | null }>;
  totalAllTimeSecs: number;
  totalSessions: number;
  bestDaySecs: number;
  bestDayDate: string;
  currentStreak: number;
  bestStreak: number;
  offsetMin: number;
  timezone: string;
  todayStr: string;
}

function formatHMS(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function sessionDurationSecs(s: HistorySession): number {
  return Math.max(
    0,
    (new Date(s.end_timestamp).getTime() - new Date(s.start_timestamp).getTime()) / 1000
      - (s.pause_duration_seconds ?? 0)
  );
}

export function HistoryClient({
  sessions,
  subjects,
  totalAllTimeSecs,
  totalSessions,
  bestDaySecs,
  bestDayDate,
  currentStreak,
  bestStreak,
  offsetMin,
  timezone,
  todayStr,
}: HistoryClientProps) {
  const [search, setSearch]       = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterActivity, setFilterActivity] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return sessions.filter(s => {
      if (filterSubject && s.subjects?.name !== filterSubject) return false;
      if (filterActivity && s.activity_type !== filterActivity) return false;
      if (q) {
        const haystack = [s.notes, s.subjects?.name, s.topics?.name, s.activity_type]
          .filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [sessions, search, filterSubject, filterActivity]);

  const grouped = useMemo(() => {
    const map = new Map<string, HistorySession[]>();
    filtered.forEach(s => {
      const key = dayBoundaryAwareDate(new Date(s.start_timestamp).getTime(), offsetMin, timezone);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) =>
          new Date(b.start_timestamp).getTime() - new Date(a.start_timestamp).getTime()
        ),
        totalSecs: items.reduce((acc, s) => acc + sessionDurationSecs(s), 0),
      }));
  }, [filtered, offsetMin, timezone]);

  const filteredTotalSecs = useMemo(
    () => filtered.reduce((acc, s) => acc + sessionDurationSecs(s), 0),
    [filtered]
  );

  const handleDelete = (id: string) => {
    if (!confirm("Delete this session?")) return;
    startTransition(async () => { await deleteStudySession(id); });
  };

  const statCards = [
    { label: "All-Time Hours",    value: formatHMS(totalAllTimeSecs), color: "#818cf8" },
    { label: "Total Sessions",    value: totalSessions,               color: "#22d3ee" },
    { label: "Best Day",          value: formatHMS(bestDaySecs),      sub: bestDayDate,  color: "#f59e0b" },
    { label: "Current Streak",    value: `${currentStreak}d`,         sub: `best: ${bestStreak}d`, color: "#34d399" },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight">Session History</h1>
        <p className="text-xs mt-1 text-neutral-500">All your study sessions — search, filter, delete.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {statCards.map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-[9px] uppercase tracking-wider text-neutral-600 mb-1">{label}</p>
            <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
            {sub && <p className="text-[10px] text-neutral-600 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search sessions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "#0f0f0f", border: "1px solid #1e1e1e", color: "#ededed" }}
          />
        </div>

        <select
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
          style={{ background: "#0f0f0f", border: "1px solid #1e1e1e", color: filterSubject ? "#ededed" : "#555" }}
        >
          <option value="">All Subjects</option>
          <SubjectOptions subjects={subjects} />
        </select>

        <select
          value={filterActivity}
          onChange={e => setFilterActivity(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
          style={{ background: "#0f0f0f", border: "1px solid #1e1e1e", color: filterActivity ? "#ededed" : "#555" }}
        >
          <option value="">All Types</option>
          {["practice", "lecture", "revision", "mock", "reading", "other"].map(a => (
            <option key={a} value={a} style={{ textTransform: "capitalize" }}>{a}</option>
          ))}
        </select>
      </div>

      {(search || filterSubject || filterActivity) && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500">
            {filtered.length} session{filtered.length !== 1 ? "s" : ""} · {formatHMS(filteredTotalSecs)}
          </span>
          <button
            onClick={() => { setSearch(""); setFilterSubject(""); setFilterActivity(""); }}
            className="text-neutral-500 hover:text-neutral-200 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <p className="text-neutral-500 text-sm">No sessions match your filters.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ date, items, totalSecs }) => {
            const dateObj  = new Date(date + "T12:00:00");
            const isToday  = date === todayStr;
            const dayHours = totalSecs / 3600;
            const dayColor = dayHours >= 6 ? "#34d399" : dayHours >= 3 ? "#818cf8" : "#52525b";

            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-neutral-200">
                      {isToday ? "Today" : format(dateObj, "EEE, MMM d")}
                    </p>
                    <span className="text-[10px] text-neutral-600">
                      {items.length} session{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: dayColor }}>
                    {formatHMS(totalSecs)}
                  </span>
                </div>

                <div
                  className="rounded-xl overflow-hidden divide-y"
                  style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
                >
                  {items.map(s => {
                    const subjectColor = s.subjects?.color ?? "#52525b";
                    const actColor     = ACTIVITY_COLORS[s.activity_type] ?? "#52525b";
                    const durationSecs = sessionDurationSecs(s);
                    const dh = Math.floor(durationSecs / 3600);
                    const dm = Math.floor((durationSecs % 3600) / 60);
                    const ds = Math.floor(durationSecs % 60);
                    const durationStr = dh > 0
                      ? `${dh}:${String(dm).padStart(2, "0")}:${String(ds).padStart(2, "0")}`
                      : `${dm}:${String(ds).padStart(2, "0")}`;

                    return (
                      <div
                        key={s.id}
                        className="flex items-start gap-3 px-3.5 py-3 hover:bg-white/1.5 transition-colors group"
                        style={{ borderLeft: `3px solid ${subjectColor}` }}
                      >
                        <span className="text-[10px] text-neutral-600 tabular-nums shrink-0 mt-0.5 w-14">
                          {format(new Date(s.start_timestamp), "h:mm a")}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {s.subjects?.name && (
                              <span className="text-xs font-medium" style={{ color: subjectColor }}>
                                {s.subjects.name}
                              </span>
                            )}
                            {s.topics?.name && (
                              <>
                                <span className="text-neutral-700 text-[10px]">›</span>
                                <span className="text-xs text-neutral-400 truncate max-w-45">
                                  {s.topics.name}
                                </span>
                              </>
                            )}
                          </div>
                          {s.notes && (
                            <p className="text-[11px] text-neutral-600 mt-0.5 truncate">{s.notes}</p>
                          )}
                        </div>

                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0 hidden sm:inline-flex"
                          style={{ background: `${actColor}18`, color: actColor }}
                        >
                          {s.activity_type}
                        </span>

                        <span className="text-xs font-mono font-semibold tabular-nums text-neutral-300 shrink-0 w-14 text-right">
                          {durationStr}
                        </span>

                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={isPending}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-neutral-700 hover:text-red-400 transition-all shrink-0"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

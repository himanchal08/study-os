"use client";

import { useState, useMemo } from "react";
import { TaskCard, type TaskItem } from "./TaskCard";
import { taskCompletionRate } from "@/lib/calculations";
import { SubjectOptions } from "@/components/ui/SubjectOptions";

interface SubjectOption {
  id: string;
  name: string;
  color: string | null;
}

interface TaskListProps {
  tasks: TaskItem[];
  userId: string;
  todayDate: string;
  subjects: SubjectOption[];
  offsetMin: number;
  timezone: string;
}

type FilterTab = "today" | "upcoming" | "completed" | "all";

export function TaskList({ tasks, userId, todayDate, subjects, offsetMin, timezone }: TaskListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("today");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.planned_date === todayDate && t.status !== "completed"),
    [tasks, todayDate]
  );
  const completedTasks = useMemo(
    () => tasks.filter((t) => {
      if (t.status !== "completed") return false;
      if (t.completed_at) {
        const completedLocalDate = new Date(t.completed_at)
          .toLocaleDateString("en-CA", {
            timeZone: timezone,
            year: "numeric", month: "2-digit", day: "2-digit",
          });
        return completedLocalDate === todayDate;
      }
      return t.planned_date === todayDate;
    }),
    [tasks, todayDate, timezone]
  );
  const upcomingTasks = useMemo(
    () => tasks.filter((t) => t.planned_date > todayDate && t.status !== "completed"),
    [tasks, todayDate]
  );

  const filteredTasks = useMemo(() => {
    let list: TaskItem[];
    if (activeTab === "today")     list = todayTasks;
    else if (activeTab === "upcoming")  list = upcomingTasks;
    else if (activeTab === "completed") list = completedTasks;
    else list = tasks;

    if (selectedSubject !== "all") {
      list = list.filter((t) => t.subjects?.id === selectedSubject);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.subjects?.name.toLowerCase().includes(q) ||
          t.topics?.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTab, selectedSubject, searchQuery, todayTasks, upcomingTasks, completedTasks, tasks]);

  const totalPlannedToday   = tasks.filter((t) => t.planned_date === todayDate).length;
  const totalCompletedToday = completedTasks.length;
  const completionRate = taskCompletionRate(totalCompletedToday, totalPlannedToday);

  const tabs = [
    { key: "today",     label: "Today",     count: todayTasks.length },
    { key: "upcoming",  label: "Upcoming",  count: upcomingTasks.length },
    { key: "completed", label: "Done",      count: completedTasks.length },
    { key: "all",       label: "All",       count: tasks.length },
  ] as const;

  return (
    <div className="space-y-4 overflow-x-hidden">

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <p className="text-[9px] uppercase tracking-wider text-neutral-600 mb-1">Today</p>
          <p className="text-lg font-bold tabular-nums text-neutral-100">
            {totalCompletedToday}<span className="text-neutral-600 text-sm font-normal"> / {totalPlannedToday}</span>
          </p>
          <p className="text-[9px] text-neutral-600 mt-0.5">done</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <p className="text-[9px] uppercase tracking-wider text-neutral-600 mb-1">Rate</p>
          <p className="text-lg font-bold tabular-nums" style={{ color: "#22c55e" }}>
            {completionRate !== null ? `${Math.round(completionRate)}%` : "—"}
          </p>
          <p className="text-[9px] text-neutral-600 mt-0.5">completed</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <p className="text-[9px] uppercase tracking-wider text-neutral-600 mb-1">Upcoming</p>
          <p className="text-lg font-bold tabular-nums" style={{ color: "#818cf8" }}>
            {upcomingTasks.length}
          </p>
          <p className="text-[9px] text-neutral-600 mt-0.5">scheduled</p>
        </div>
      </div>

      {/* ── Tab bar — horizontal scroll ───────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
              style={{
                background: isActive ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.03)",
                color:      isActive ? "#818cf8" : "rgba(226,226,240,0.45)",
                border:     isActive ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
              }}
            >
              {tab.label}
              <span
                className="px-1.5 rounded-full text-[10px]"
                style={{
                  background: isActive ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)",
                  color: isActive ? "#fff" : "rgba(226,226,240,0.3)",
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Filters row ───────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-hidden">
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="select-premium text-xs truncate flex-1 min-w-0"
        >
          <option value="all">All Subjects</option>
          <SubjectOptions subjects={subjects} />
        </select>

        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs outline-none"
            style={{ background: "#0f0f0f", border: "1px solid #1e1e1e", color: "#ededed" }}
          />
        </div>
      </div>

      {/* ── Task list ─────────────────────────────────────────────── */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm text-neutral-500">No tasks here</p>
          <p className="text-xs text-neutral-700 mt-1">
            {activeTab === "today" ? "Tap + to plan your day" : "Try a different filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}

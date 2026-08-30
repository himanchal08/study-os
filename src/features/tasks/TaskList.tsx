"use client";

import { useState, useMemo } from "react";
import { TaskCard, type TaskItem } from "./TaskCard";
import { taskCompletionRate, postponementRate } from "@/lib/calculations";

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
}

type FilterTab = "today" | "upcoming" | "completed" | "postponed" | "all";

export function TaskList({ tasks, userId, todayDate, subjects }: TaskListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("today");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.planned_date === todayDate && t.status !== "completed"),
    [tasks, todayDate]
  );

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === "completed"),
    [tasks]
  );

  const upcomingTasks = useMemo(
    () => tasks.filter((t) => t.planned_date > todayDate && t.status !== "completed"),
    [tasks, todayDate]
  );

  const postponedTasks = useMemo(
    () => tasks.filter((t) => t.postpone_count > 0 || (t.planned_date < todayDate && t.status !== "completed")),
    [tasks, todayDate]
  );

  const filteredTasks = useMemo(() => {
    let list: TaskItem[];
    if (activeTab === "today") list = todayTasks;
    else if (activeTab === "upcoming") list = upcomingTasks;
    else if (activeTab === "completed") list = completedTasks;
    else if (activeTab === "postponed") list = postponedTasks;
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
  }, [activeTab, selectedSubject, searchQuery, todayTasks, upcomingTasks, completedTasks, postponedTasks, tasks]);

  const totalPlannedToday = tasks.filter((t) => t.planned_date === todayDate).length;
  const totalCompletedToday = tasks.filter(
    (t) => t.planned_date === todayDate && t.status === "completed"
  ).length;
  const completionRate = taskCompletionRate(totalCompletedToday, totalPlannedToday);

  const totalPostponedToday = tasks.filter(
    (t) => t.planned_date === todayDate && t.status === "postponed"
  ).length;
  const postRate = postponementRate(totalPostponedToday, totalPlannedToday);


  return (
    <div className="space-y-5">
      {/* Planner Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-3.5">
          <p className="text-[11px] font-medium" style={{ color: "rgba(226,226,240,0.45)" }}>
            Today&apos;s Tasks
          </p>
          <p className="text-xl font-bold mt-1 tabular-nums" style={{ color: "var(--foreground)" }}>
            {totalCompletedToday} / {totalPlannedToday}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(226,226,240,0.35)" }}>
            {totalPlannedToday - totalCompletedToday} remaining
          </p>
        </div>

        <div className="glass rounded-2xl p-3.5">
          <p className="text-[11px] font-medium" style={{ color: "rgba(226,226,240,0.45)" }}>
            Completion Rate
          </p>
          <p className="text-xl font-bold mt-1 tabular-nums" style={{ color: "#22c55e" }}>
            {completionRate !== null ? `${Math.round(completionRate)}%` : "—"}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(226,226,240,0.35)" }}>
            Planned vs Done
          </p>
        </div>



        <div className="glass rounded-2xl p-3.5">
          <p className="text-[11px] font-medium" style={{ color: "rgba(226,226,240,0.45)" }}>
            Postponed
          </p>
          <p className="text-xl font-bold mt-1 tabular-nums" style={{ color: "#f59e0b" }}>
            {postponedTasks.length}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(226,226,240,0.35)" }}>
            {postRate !== null ? `${Math.round(postRate)}% rate` : "0% rate"}
          </p>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(
            [
              { key: "today", label: "Today", count: todayTasks.length },
              { key: "upcoming", label: "Upcoming", count: upcomingTasks.length },
              { key: "completed", label: "Completed", count: completedTasks.length },
              { key: "postponed", label: "Backlog / Postponed", count: postponedTasks.length },
              { key: "all", label: "All", count: tasks.length },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
                style={{
                  background: isActive ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.03)",
                  color: isActive ? "#818cf8" : "rgba(226,226,240,0.55)",
                  border: isActive ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                }}
              >
                {tab.label}
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px]"
                  style={{
                    background: isActive ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)",
                    color: isActive ? "#fff" : "rgba(226,226,240,0.4)",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs"
            style={{
              background: "rgba(30,30,40,0.9)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs w-36 sm:w-44"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>

      {/* Task List items */}
      {filteredTasks.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center flex flex-col items-center justify-center">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm font-medium" style={{ color: "rgba(226,226,240,0.6)" }}>
            No tasks found in this view
          </p>
          <p className="text-xs mt-1" style={{ color: "rgba(226,226,240,0.35)" }}>
            {activeTab === "today"
              ? "Plan your day by adding tasks on the right!"
              : "Try switching to another tab or creating a new task."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}

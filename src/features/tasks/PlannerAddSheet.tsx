"use client";

import { useState } from "react";
import { TaskForm } from "./TaskForm";

interface PlannerAddSheetProps {
  subjects: Array<{ id: string; name: string; color: string | null }>;
  topics: Array<{ id: string; name: string; subject_id: string }>;
  defaultDate: string;
  desktopOnly?: boolean;
  mobileOnly?: boolean;
}

export function PlannerAddSheet({
  subjects,
  topics,
  defaultDate,
  desktopOnly = false,
  mobileOnly = false,
}: PlannerAddSheetProps) {
  const [open, setOpen] = useState(false);

  if (desktopOnly) {
    return (
      <TaskForm
        subjects={subjects}
        topics={topics}
        defaultDate={defaultDate}
        onSuccess={() => {}}
      />
    );
  }

  if (mobileOnly) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          aria-label="Add task"
          className="fixed bottom-6 right-6 z-30 lg:hidden w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl font-light transition-transform active:scale-95"
          style={{ background: "linear-gradient(135deg,#a78bfa,#818cf8)" }}
        >
          +
        </button>

        {open && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setOpen(false)}
          />
        )}

        <div
          className="fixed bottom-0 left-0 right-0 z-50 lg:hidden rounded-t-2xl p-5 transition-transform duration-300 ease-in-out"
          style={{
            background: "#111111",
            border: "1px solid #1a1a1a",
            borderBottom: "none",
            transform: open ? "translateY(0)" : "translateY(100%)",
            maxHeight: "90dvh",
            overflowY: "auto",
          }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-neutral-700" />
          </div>

          <p className="text-sm font-semibold text-neutral-200 mb-4">Add Task</p>
          <TaskForm
            subjects={subjects}
            topics={topics}
            defaultDate={defaultDate}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </>
    );
  }

  return null;
}

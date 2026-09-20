"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  const actions = [
    {
      id: "add-task",
      name: "Add Task",
      shortcut: "T",
      onSelect: () => {
        setOpen(false);
        router.push("/tasks?new=1");
      },
    },
    {
      id: "log-questions",
      name: "Log Questions",
      shortcut: "Q",
      onSelect: () => {
        setOpen(false);
        router.push("/questions");
      },
    },
    {
      id: "schedule-revision",
      name: "Schedule Revision",
      shortcut: "R",
      onSelect: () => {
        setOpen(false);
        router.push("/revisions?new=1");
      },
    },
    {
      id: "start-timer",
      name: "Start Study Timer",
      shortcut: "S",
      onSelect: () => {
        setOpen(false);
        window.dispatchEvent(
          new CustomEvent("timer:prefill", {
            detail: {
              activityType: "practice",
            },
          })
        );
      },
    },
  ];

  const filtered = actions.filter((action) =>
    action.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh]">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={() => setOpen(false)} 
      />
      <div 
        className="relative w-full max-w-lg bg-[#111] border border-[#222] rounded-xl shadow-2xl overflow-hidden animate-fade-in"
      >
        <div className="flex items-center px-4 border-b border-[#222]">
          <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            className="w-full bg-transparent border-0 outline-none text-neutral-100 placeholder-neutral-500 py-4 px-3 text-sm"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter" && filtered.length > 0) {
                filtered[0].onSelect();
              }
            }}
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">
              No results found.
            </p>
          )}
          {filtered.map((action) => (
            <button
              key={action.id}
              onClick={action.onSelect}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#1a1a1a] transition-colors focus:bg-[#1a1a1a] outline-none group"
            >
              <span className="text-sm font-medium text-neutral-300 group-hover:text-neutral-100">
                {action.name}
              </span>
              {action.shortcut && (
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#222] text-neutral-500 border border-[#333]">
                  <span className="text-[12px]">⌘</span>{action.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

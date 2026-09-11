"use client";

import { useState } from "react";
import { SubjectCard } from "./SubjectCard";

type ExamTab = "all" | "banking" | "ssc";

interface Topic { id: string; name: string; status: string; subject_id: string; chapter_id: string | null; }
interface Chapter { id: string; name: string; subject_id: string; sort_order: number | null; }
interface Subject { id: string; name: string; color: string; exam_type: string | null; topics: Topic[]; chapters: Chapter[]; }

const TABS: { key: ExamTab; label: string; accent: string }[] = [
  { key: "all",     label: "All",     accent: "#94a3b8" },
  { key: "banking", label: "Banking", accent: "#34d399" },
  { key: "ssc",     label: "SSC CGL", accent: "#fbbf24" },
];

function matchesTab(s: Subject, tab: ExamTab) {
  if (tab === "all")     return true;
  if (tab === "banking") return s.exam_type === "banking" || s.exam_type === "both";
  if (tab === "ssc")     return s.exam_type === "ssc"     || s.exam_type === "both";
  return true;
}

export function SyllabusTabs({ subjects }: { subjects: Subject[] }) {
  const [active, setActive] = useState<ExamTab>("all");

  const filtered   = subjects.filter(s => matchesTab(s, active));
  const allTopics  = filtered.flatMap(s => s.topics);
  const learned    = allTopics.filter(t => ["learned", "strong"].includes(t.status)).length;
  const coverage   = allTopics.length > 0 ? Math.round((learned / allTopics.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Stats � update per tab */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Subjects", value: filtered.length },
          { label: "Topics",   value: allTopics.length },
          { label: "Coverage", value: `${coverage}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-[9px] uppercase tracking-wider text-neutral-600 mb-1">{label}</p>
            <p className="text-lg font-bold text-neutral-100 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Exam tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        {TABS.map(tab => {
          const count = subjects.filter(s => matchesTab(s, tab.key)).length;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: isActive ? "#1a1a1a" : "transparent",
                color:      isActive ? tab.accent : "#52525b",
                border:     isActive ? `1px solid ${tab.accent}30` : "1px solid transparent",
              }}
            >
              {tab.label}
              <span className="ml-1 text-[10px] opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Subject list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Subjects &amp; Topics</p>
        {filtered.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-neutral-600 text-sm">No subjects for this exam yet.</p>
            <p className="text-neutral-700 text-xs mt-1">Run the seed SQL in Supabase to populate this tab.</p>
          </div>
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filtered.map(s => <SubjectCard key={s.id} subject={s as any} />)
        )}
      </div>
    </div>
  );
}

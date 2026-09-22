"use client";

import { useState, useTransition } from "react";
import { SubjectCard } from "./SubjectCard";
import { updateExamTargets } from "@/app/(dashboard)/syllabus/actions";

type ExamTab = "all" | "banking" | "ssc";

type TopicStatus = "not_started" | "learning" | "learned" | "revising" | "strong" | "weak";

interface Topic { 
  id: string; 
  name: string; 
  status: TopicStatus; 
  subject_id: string; 
  chapter_id: string | null; 
  lifecycle: { 
    book_practice_done: boolean; 
    dpp_done: boolean; 
    pyq_done: boolean; 
    tests_attempted_count: number; 
  } | null;
}
interface Chapter { id: string; name: string; subject_id: string; sort_order: number; }
interface Subject { id: string; name: string; color: string | null; exam_type: string | null; topics: Topic[]; chapters: Chapter[]; }

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

export function SyllabusTabs({ subjects, initialExamTargets }: { subjects: Subject[], initialExamTargets: string[] }) {
  const [examTargets, setExamTargets] = useState<string[]>(initialExamTargets);
  const [isPending, startTransition] = useTransition();

  const defaultTab = examTargets.length === 1 && examTargets[0] !== "both" ? (examTargets[0] as ExamTab) : "all";
  const [active, setActive] = useState<ExamTab>(defaultTab);

  // If no targets selected, force them to choose
  if (examTargets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 mt-4 rounded-2xl" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-5 border border-neutral-800">
          <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-neutral-100 mb-2">Choose your target exam</h2>
        <p className="text-sm text-neutral-500 mb-8 text-center max-w-sm">
          Select the exam you are preparing for. This will automatically filter your syllabus to show only relevant subjects.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          {TABS.filter(t => t.key !== "all").map(tab => (
            <button
              key={tab.key}
              disabled={isPending}
              onClick={() => {
                startTransition(() => {
                  updateExamTargets([tab.key]);
                  setExamTargets([tab.key]);
                  setActive(tab.key);
                });
              }}
              className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              style={{ background: "#111", color: tab.accent, border: `1px solid ${tab.accent}40` }}
            >
              {tab.label}
            </button>
          ))}
          <button
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                updateExamTargets(["both"]);
                setExamTargets(["both"]);
                setActive("all");
              });
            }}
            className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 bg-white text-black"
          >
            Both
          </button>
        </div>
      </div>
    );
  }

  // Pre-filter the subjects based on the user's permanent exam_targets preference
  // If "both" is in targets, they see everything. Otherwise, only subjects matching their target.
  const isBoth = examTargets.includes("both");
  const userSubjects = isBoth 
    ? subjects 
    : subjects.filter(s => examTargets.some(target => s.exam_type === target || s.exam_type === "both"));

  const filtered   = userSubjects.filter(s => matchesTab(s, active));
  const allTopics  = filtered.flatMap(s => s.topics);
  const learned    = allTopics.filter(t => ["learned", "strong"].includes(t.status)).length;
  const coverage   = allTopics.length > 0 ? Math.round((learned / allTopics.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">
          Target: <span className="text-neutral-300">{isBoth ? "Banking + SSC" : examTargets.join(", ")}</span>
        </p>
        <button
          onClick={() => setExamTargets([])}
          className="text-[10px] text-neutral-500 hover:text-white transition-colors underline underline-offset-2"
        >
          Change Target
        </button>
      </div>

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

      <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        {TABS.map(tab => {
          const count = userSubjects.filter(s => matchesTab(s, tab.key)).length;
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

      <div className="space-y-2">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Subjects &amp; Topics</p>
        {filtered.length === 0 ? (
          <div className="rounded-xl p-8 text-center flex flex-col items-center justify-center gap-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <div>
              <p className="text-neutral-300 font-semibold mb-1">Your Syllabus is Empty</p>
              <p className="text-neutral-500 text-xs max-w-sm">
                We could not find any subjects for this exam. You can seed your syllabus with our canonical preset.
              </p>
            </div>
            <button
              onClick={() => {
                startTransition(() => {
                  import("@/app/(dashboard)/syllabus/actions").then((a) => a.seedSyllabus());
                });
              }}
              disabled={isPending}
              className="px-4 py-2 bg-white text-black font-semibold text-sm rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              Seed Canonical Syllabus
            </button>
          </div>
        ) : (
          filtered.map(s => <SubjectCard key={s.id} subject={s as React.ComponentProps<typeof SubjectCard>["subject"]} allSubjects={subjects} />)
        )}
      </div>
    </div>
  );
}

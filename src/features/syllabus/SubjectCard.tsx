"use client";

import { useTransition, useState, useRef } from "react";
import { updateTopicStatus, updateSubjectColor, deleteSubject, archiveTopic, updateTopicLifecycle } from "@/app/(dashboard)/syllabus/actions";

type TopicStatus = "not_started" | "learning" | "learned" | "revising" | "strong" | "weak";

interface Topic {
  id: string;
  name: string;
  status: TopicStatus;
  chapter_id: string | null;
  lifecycle: {
    book_practice_done: boolean;
    dpp_done: boolean;
    pyq_done: boolean;
    tests_attempted_count: number;
  } | null;
}

interface Chapter {
  id: string;
  name: string;
  subject_id: string;
  sort_order: number;
}

interface Subject {
  id: string;
  name: string;
  color: string | null;
  exam_type: string | null;
  topics: Topic[];
  chapters: Chapter[];
}

const STATUS_CONFIG: Record<TopicStatus, { label: string; color: string; bg: string }> = {
  not_started: { label: "Not started", color: "#525252", bg: "#1a1a1a" },
  learning:    { label: "Learning",    color: "#38bdf8", bg: "#38bdf815" },
  learned:     { label: "Learned",     color: "#10b981", bg: "#10b98115" },
  revising:    { label: "Revising",    color: "#f59e0b", bg: "#f59e0b15" },
  strong:      { label: "Strong",      color: "#34d399", bg: "#34d39915" },
  weak:        { label: "Weak",        color: "#ef4444", bg: "#ef444415" },
};

const STATUS_ORDER: TopicStatus[] = ["not_started", "learning", "learned", "revising", "strong", "weak"];

function TopicRow({ topic }: { topic: Topic }) {
  const [isPending, startTransition] = useTransition();
  const [archived, setArchived] = useState(false);
  const [status, setStatus] = useState<TopicStatus>(topic.status);
  
  // Local state for lifecycle to provide optimistic updates
  const [book, setBook] = useState(topic.lifecycle?.book_practice_done ?? false);
  const [dpp, setDpp] = useState(topic.lifecycle?.dpp_done ?? false);
  const [pyq, setPyq] = useState(topic.lifecycle?.pyq_done ?? false);
  const [mocks, setMocks] = useState(topic.lifecycle?.tests_attempted_count ?? 0);

  const cfg = STATUS_CONFIG[status];

  const cycleStatus = () => {
    const idx = STATUS_ORDER.indexOf(status);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    setStatus(next);
    startTransition(() => updateTopicStatus(topic.id, next));
  };

  const toggleLifecycle = (field: "book_practice_done" | "dpp_done" | "pyq_done") => {
    let newVal = false;
    if (field === "book_practice_done") { newVal = !book; setBook(newVal); }
    if (field === "dpp_done") { newVal = !dpp; setDpp(newVal); }
    if (field === "pyq_done") { newVal = !pyq; setPyq(newVal); }
    
    startTransition(() => updateTopicLifecycle(topic.id, { [field]: newVal }));
  };

  const changeMocks = (delta: number) => {
    const newVal = Math.max(0, mocks + delta);
    setMocks(newVal);
    startTransition(() => updateTopicLifecycle(topic.id, { tests_attempted_count: newVal }));
  };

  if (archived) return null;

  return (
    <div className="grid grid-cols-[1fr_80px_48px_48px_48px_72px_24px] gap-2 items-center px-3 py-1.5 rounded-lg group hover:bg-white/5 transition-colors border-b border-[#1a1a1a]/50 last:border-0">
      <span className="text-sm text-neutral-300 truncate" title={topic.name}>{topic.name}</span>
      
      <div className="flex justify-center">
        <button
          type="button"
          onClick={cycleStatus}
          disabled={isPending}
          className="text-[9px] px-2 py-1 rounded-full font-medium transition-all hover:opacity-80 active:scale-95 disabled:opacity-40 w-full text-center truncate"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}
          title="Click to cycle status"
        >
          {cfg.label}
        </button>
      </div>
      
      <div className="flex justify-center">
        <input 
          type="checkbox" 
          checked={book}
          onChange={() => toggleLifecycle("book_practice_done")}
          disabled={isPending}
          className="w-4 h-4 rounded bg-[#0a0a0a] border border-white/30 checked:bg-indigo-500 checked:border-indigo-500 cursor-pointer disabled:opacity-50 appearance-none flex items-center justify-center
                     after:content-[''] after:hidden checked:after:block after:w-1.5 after:h-2.5 after:border-r-2 after:border-b-2 after:border-white after:rotate-45 after:-translate-y-px" 
        />
      </div>

      <div className="flex justify-center">
        <input 
          type="checkbox" 
          checked={dpp}
          onChange={() => toggleLifecycle("dpp_done")}
          disabled={isPending}
          className="w-4 h-4 rounded bg-[#0a0a0a] border border-white/30 checked:bg-indigo-500 checked:border-indigo-500 cursor-pointer disabled:opacity-50 appearance-none flex items-center justify-center
                     after:content-[''] after:hidden checked:after:block after:w-1.5 after:h-2.5 after:border-r-2 after:border-b-2 after:border-white after:rotate-45 after:-translate-y-px" 
        />
      </div>

      <div className="flex justify-center">
        <input 
          type="checkbox" 
          checked={pyq}
          onChange={() => toggleLifecycle("pyq_done")}
          disabled={isPending}
          className="w-4 h-4 rounded bg-[#0a0a0a] border border-white/30 checked:bg-indigo-500 checked:border-indigo-500 cursor-pointer disabled:opacity-50 appearance-none flex items-center justify-center
                     after:content-[''] after:hidden checked:after:block after:w-1.5 after:h-2.5 after:border-r-2 after:border-b-2 after:border-white after:rotate-45 after:-translate-y-px" 
        />
      </div>

      <div className="flex items-center justify-center gap-1.5">
        <button 
          onClick={() => changeMocks(-1)} 
          disabled={isPending || mocks === 0}
          className="w-5 h-5 flex items-center justify-center rounded bg-[#1a1a1a] text-neutral-400 hover:text-white disabled:opacity-40"
        >
          -
        </button>
        <span className="text-xs text-neutral-300 tabular-nums w-3 text-center">{mocks}</span>
        <button 
          onClick={() => changeMocks(1)}
          disabled={isPending}
          className="w-5 h-5 flex items-center justify-center rounded bg-[#1a1a1a] text-neutral-400 hover:text-white disabled:opacity-40"
        >
          +
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { setArchived(true); startTransition(() => archiveTopic(topic.id)); }}
          className="opacity-0 group-hover:opacity-100 text-xs text-neutral-700 hover:text-rose-400 transition-all px-1"
          title="Archive topic"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

interface SubjectCardProps {
  subject: Subject;
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [color, setColor] = useState(subject.color ?? "#6366f1");
  const [deleted, setDeleted] = useState(false);
  const [, startColorTransition] = useTransition();
  const [, startDeleteTransition] = useTransition();
  const colorRef = useRef<HTMLInputElement>(null);
  const done = subject.topics.filter(t => ["learned", "strong"].includes(t.status)).length;
  const total = subject.topics.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (deleted) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
      
      <div className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors group">
        
        <button
          type="button"
          onClick={() => colorRef.current?.click()}
          className="w-3 h-3 rounded-full shrink-0 hover:ring-2 hover:ring-white/20 transition-all"
          style={{ background: color }}
          title="Click to change color"
        />
        <input
          ref={colorRef}
          type="color"
          value={color}
          onChange={e => {
            const c = e.target.value;
            setColor(c);
            startColorTransition(() => updateSubjectColor(subject.id, c));
          }}
          className="sr-only"
          aria-label="Subject color"
        />

        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <span className="text-sm font-medium text-neutral-200 flex-1 truncate">{subject.name}</span>
          <span className="text-[10px] text-neutral-600 shrink-0">{done}/{total} done</span>
          {total > 0 && (
            <div className="w-16 h-1 rounded-full overflow-hidden shrink-0" style={{ background: "#1a1a1a" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          )}
          <span className="text-neutral-600 text-xs shrink-0">{expanded ? "▲" : "▼"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!confirm(`Delete subject "${subject.name}" and all its topics? This cannot be undone.`)) return;
            setDeleted(true);
            startDeleteTransition(() => deleteSubject(subject.id));
          }}
          className="opacity-0 group-hover:opacity-100 text-xs text-neutral-700 hover:text-rose-400 transition-all px-1 shrink-0"
          title="Delete subject"
        >
          ✕
        </button>
      </div>

      <div
        className="transition-all duration-300 ease-in-out"
        style={{
          display: expanded ? "block" : "none",
          borderTop: "1px solid #1a1a1a",
        }}
      >
        <div className="p-4 overflow-x-auto">
          {subject.topics.length > 0 && (
            <div className="min-w-125">
              <div className="grid grid-cols-[1fr_80px_48px_48px_48px_72px_24px] gap-2 px-3 py-2 text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 border-b border-[#1a1a1a]">
                <div>Topic</div>
                <div className="text-center">Status</div>
                <div className="text-center" title="Book Practice">Book</div>
                <div className="text-center" title="Daily Practice Problems">DPP</div>
                <div className="text-center" title="Previous Year Questions">PYQ</div>
                <div className="text-center">Mocks</div>
                <div></div>
              </div>
              
              <div className="space-y-6">
                {subject.chapters.sort((a, b) => a.sort_order - b.sort_order).map(ch => {
                  const chTopics = subject.topics.filter(t => t.chapter_id === ch.id);
                  if (chTopics.length === 0) return null;
                  return (
                    <div key={ch.id} className="space-y-2">
                      <div className="flex items-center gap-2 pl-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                        <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                          {ch.name}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        {chTopics.map(t => (
                          <TopicRow key={t.id} topic={t} />
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {subject.topics.filter(t => !t.chapter_id).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pl-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        Other Topics
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      {subject.topics.filter(t => !t.chapter_id).map(t => (
                        <TopicRow key={t.id} topic={t} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {subject.topics.length === 0 && (
            <p className="text-sm text-neutral-600 px-3">No topics added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

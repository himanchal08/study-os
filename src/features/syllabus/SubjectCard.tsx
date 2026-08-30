"use client";

import { useTransition, useState, useRef, useTransition as useT } from "react";
import { updateTopicStatus, updateSubjectColor, deleteSubject, archiveTopic } from "@/app/(dashboard)/syllabus/actions";

type TopicStatus = "not_started" | "learning" | "learned" | "revising" | "strong" | "weak";

interface Topic {
  id: string;
  name: string;
  status: TopicStatus;
}

interface Subject {
  id: string;
  name: string;
  color: string | null;
  exam_type: "banking" | "ssc" | "both";
  topics: Topic[];
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
  const cfg = STATUS_CONFIG[status];

  const cycleStatus = () => {
    const idx = STATUS_ORDER.indexOf(status);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    setStatus(next);
    startTransition(() => updateTopicStatus(topic.id, next));
  };

  if (archived) return null;

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg group hover:bg-white/2 transition-colors">
      <span className="text-sm text-neutral-300 truncate">{topic.name}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={cycleStatus}
          disabled={isPending}
          className="text-[10px] px-2 py-1 rounded-full font-medium transition-all hover:opacity-80 active:scale-95 disabled:opacity-40"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}
          title="Click to cycle status"
        >
          {cfg.label}
        </button>
        <button
          type="button"
          onClick={() => { setArchived(true); startTransition(() => archiveTopic(topic.id)); }}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-neutral-700 hover:text-rose-400 transition-all px-1"
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
      {/* Header */}
      <div className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors group">
        {/* Color swatch — click to open color picker */}
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

        {/* Delete button — visible on hover */}
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

      {/* Topics */}
      {expanded && (
        <div className="px-2 pb-2 border-t" style={{ borderColor: "#1a1a1a" }}>
          {subject.topics.length === 0 ? (
            <p className="text-xs text-neutral-700 py-3 text-center">No topics yet. Add one below.</p>
          ) : (
            subject.topics.map(t => <TopicRow key={t.id} topic={t} />)
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useTransition, useState } from "react";
import { saveTopicLifecycle } from "@/app/(dashboard)/performance/actions";

interface TopicLifecycleData {
  learning_completed_at: string | null;
  book_practice_done: boolean;
  dpp_done: boolean;
  pyq_done: boolean;
  tests_attempted_count: number;
  revision_count: number;
  confidence_level: number | null;
}

interface TopicLifecycleBadgesProps {
  topicId: string;
  topicName: string;
  lifecycle: TopicLifecycleData | null;
}

const CONFIDENCE_COLORS = [
  "", 
  "#ef4444", 
  "#f97316", 
  "#f59e0b", 
  "#22d3ee", 
  "#10b981", 
];

export function TopicLifecycleBadges({
  topicId,
  topicName,
  lifecycle,
}: TopicLifecycleBadgesProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<TopicLifecycleData>({
    learning_completed_at: lifecycle?.learning_completed_at ?? null,
    book_practice_done: lifecycle?.book_practice_done ?? false,
    dpp_done: lifecycle?.dpp_done ?? false,
    pyq_done: lifecycle?.pyq_done ?? false,
    tests_attempted_count: lifecycle?.tests_attempted_count ?? 0,
    revision_count: lifecycle?.revision_count ?? 0,
    confidence_level: lifecycle?.confidence_level ?? null,
  });

  function toggle(field: "book_practice_done" | "dpp_done" | "pyq_done") {
    const updated = { ...state, [field]: !state[field] };
    setState(updated);
    startTransition(() => void saveTopicLifecycle(topicId, { [field]: updated[field] }));
  }

  function toggleLearning() {
    const now = new Date().toISOString();
    const updated = {
      ...state,
      learning_completed_at: state.learning_completed_at ? null : now,
    };
    setState(updated);
    startTransition(() =>
      void saveTopicLifecycle(topicId, {
        learning_completed_at: updated.learning_completed_at,
      })
    );
  }

  function setConfidence(level: number) {
    const updated = {
      ...state,
      confidence_level: state.confidence_level === level ? null : level,
    };
    setState(updated);
    startTransition(() =>
      void saveTopicLifecycle(topicId, { confidence_level: updated.confidence_level })
    );
  }

  const badgeClass = (active: boolean) =>
    `text-[10px] px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer select-none ${
      isPending ? "opacity-50 pointer-events-none" : "hover:opacity-80 active:scale-95"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-1.5" title={topicName}>
      
      <button
        type="button"
        onClick={toggleLearning}
        disabled={isPending}
        className={badgeClass(!!state.learning_completed_at)}
        style={
          state.learning_completed_at
            ? { background: "#10b98120", color: "#10b981", border: "1px solid #10b98133" }
            : { background: "#1a1a1a", color: "#525252", border: "1px solid #262626" }
        }
        title="Mark learning as completed"
      >
        📘 Learn
      </button>

      
      <button
        type="button"
        onClick={() => toggle("book_practice_done")}
        disabled={isPending}
        className={badgeClass(state.book_practice_done)}
        style={
          state.book_practice_done
            ? { background: "#38bdf820", color: "#38bdf8", border: "1px solid #38bdf833" }
            : { background: "#1a1a1a", color: "#525252", border: "1px solid #262626" }
        }
        title="Mark book practice as done"
      >
        📖 Book
      </button>

      
      <button
        type="button"
        onClick={() => toggle("dpp_done")}
        disabled={isPending}
        className={badgeClass(state.dpp_done)}
        style={
          state.dpp_done
            ? { background: "#a78bfa20", color: "#a78bfa", border: "1px solid #a78bfa33" }
            : { background: "#1a1a1a", color: "#525252", border: "1px solid #262626" }
        }
        title="Mark DPP / online practice as done"
      >
        📝 DPP
      </button>

      
      <button
        type="button"
        onClick={() => toggle("pyq_done")}
        disabled={isPending}
        className={badgeClass(state.pyq_done)}
        style={
          state.pyq_done
            ? { background: "#f59e0b20", color: "#f59e0b", border: "1px solid #f59e0b33" }
            : { background: "#1a1a1a", color: "#525252", border: "1px solid #262626" }
        }
        title="Mark PYQs as practised"
      >
        🏛 PYQ
      </button>

      
      <div className="flex items-center gap-0.5 ml-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setConfidence(level)}
            disabled={isPending}
            className="w-4 h-4 rounded-full transition-all hover:scale-110 active:scale-95"
            style={{
              background:
                state.confidence_level !== null && state.confidence_level >= level
                  ? CONFIDENCE_COLORS[level]
                  : "#1a1a1a",
              border: `1px solid ${CONFIDENCE_COLORS[level]}44`,
            }}
            title={`Confidence: ${level}/5`}
          />
        ))}
        <span className="text-[9px] text-neutral-600 ml-0.5">
          {state.confidence_level !== null ? `${state.confidence_level}/5` : "—"}
        </span>
      </div>
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import { logMockSection, deleteMockSection } from "./mockSectionActions";
import type { SectionAnalysis } from "@/lib/mockAnalysis";

interface LogMockSectionFormProps {
  mockId: string;
  sections: SectionAnalysis[];
}

export function LogMockSectionForm({ mockId, sections }: LogMockSectionFormProps) {
  const [state, formAction, pending] = useActionState(logMockSection, null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(sectionId: string) {
    setDeleting(sectionId);
    await deleteMockSection(sectionId, mockId);
    setDeleting(null);
  }

  return (
    <div className="space-y-5">
      {/* Existing sections */}
      {sections.length > 0 && (
        <div className="space-y-2">
          {sections.map((s) => (
            <div
              key={s.id}
              className="p-3 rounded-xl flex items-center justify-between gap-3"
              style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-neutral-200">{s.name}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                    style={{ background: `${s.flagColor}20`, color: s.flagColor }}
                  >
                    {s.flagLabel}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                  <span>{s.score}/{s.maxMarks} ({s.percentScore.toFixed(1)}%)</span>
                  <span>·</span>
                  <span>✓ {s.correct} ✗ {s.wrong}</span>
                  {s.accuracy !== null && (
                    <>
                      <span>·</span>
                      <span>{s.accuracy.toFixed(0)}% acc</span>
                    </>
                  )}
                  {s.durationMinutes && (
                    <>
                      <span>·</span>
                      <span>{s.durationMinutes}m{s.recommendedMinutes ? ` / ${s.recommendedMinutes.toFixed(0)}m rec` : ""}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                disabled={deleting === s.id}
                className="text-xs text-neutral-600 hover:text-rose-400 transition-colors shrink-0"
              >
                {deleting === s.id ? "..." : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add section form */}
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="mock_id" value={mockId} />
        
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Add Section</p>

        <input
          name="name"
          type="text"
          required
          placeholder="Section name (e.g. Quantitative)"
          className="input-premium text-sm"
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-neutral-600 uppercase tracking-wider block mb-1">Max Marks</label>
            <input name="maximum_marks" type="number" min="1" required placeholder="50" className="input-premium text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-neutral-600 uppercase tracking-wider block mb-1">Score</label>
            <input name="score" type="number" min="0" required placeholder="38" className="input-premium text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-neutral-600 uppercase tracking-wider block mb-1">Attempted</label>
            <input name="attempted" type="number" min="0" required placeholder="30" className="input-premium text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-neutral-600 uppercase tracking-wider block mb-1">Correct</label>
            <input name="correct" type="number" min="0" required placeholder="25" className="input-premium text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-neutral-600 uppercase tracking-wider block mb-1">Wrong</label>
            <input name="wrong" type="number" min="0" required placeholder="5" className="input-premium text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-neutral-600 uppercase tracking-wider block mb-1">Unattempted</label>
            <input name="unattempted" type="number" min="0" required placeholder="0" className="input-premium text-sm" />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-neutral-600 uppercase tracking-wider block mb-1">Time Taken (minutes)</label>
          <input name="duration_minutes" type="number" min="1" placeholder="Optional — enables timing analysis" className="input-premium text-sm" />
        </div>

        {state?.error && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}>
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-premium w-full"
        >
          {pending ? "Adding..." : "+ Add Section"}
        </button>
      </form>
    </div>
  );
}

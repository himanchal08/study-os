"use client";

import { useTransition } from "react";
import { deleteSavedQuestion } from "@/app/(dashboard)/vault/actions";
import { createClient } from "@/lib/supabase/client";

interface VaultCardProps {
  id: string;
  topicName: string | null;
  subjectName: string | null;
  source: string | null;
  errorCategory: string | null;
  explanation: string | null;
  imagePath: string | null;
  createdAt: string;
}

const ERROR_COLORS: Record<string, { label: string; color: string }> = {
  concept: { label: "Concept Gap", color: "#ef4444" },
  calculation: { label: "Calculation Error", color: "#f59e0b" },
  reading: { label: "Misread Question", color: "#3b82f6" },
  silly: { label: "Silly Mistake", color: "#a855f7" },
  time: { label: "Time Management", color: "#64748b" },
  other: { label: "Other", color: "#71717a" },
};

export function VaultCard({
  id,
  topicName,
  subjectName,
  source,
  errorCategory,
  explanation,
  imagePath,
  createdAt,
}: VaultCardProps) {
  const [isPending, startTransition] = useTransition();
  
  const supabase = createClient();
  const imageUrl = imagePath 
    ? supabase.storage.from("question-images").getPublicUrl(imagePath).data.publicUrl 
    : null;

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this saved question?")) {
      startTransition(() => {
        deleteSavedQuestion(id, imagePath);
      });
    }
  };

  const errCfg = errorCategory && ERROR_COLORS[errorCategory] ? ERROR_COLORS[errorCategory] : ERROR_COLORS.other;

  return (
    <div className="rounded-xl overflow-hidden flex flex-col transition-all hover:border-[#333]" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
      
      {imageUrl ? (
        <div className="w-full aspect-video bg-black border-b relative group" style={{ borderColor: "#1a1a1a" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Saved Question" className="w-full h-full object-contain" loading="lazy" />
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-2 right-2 bg-black/70 hover:bg-white text-white hover:text-black w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs"
            title="Open original"
          >
            ↗
          </a>
        </div>
      ) : (
        <div className="w-full h-12 bg-black border-b flex items-center justify-center text-neutral-600 text-xs" style={{ borderColor: "#1a1a1a" }}>
          No Image
        </div>
      )}

      
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-neutral-200 truncate">{topicName ?? "Unknown Topic"}</p>
              <span className="text-[9px] text-neutral-500 whitespace-nowrap">
                {new Date(createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {subjectName && <span className="text-[10px] text-neutral-500">{subjectName}</span>}
              {source && <span className="text-[10px] text-neutral-600">· {source}</span>}
            </div>
          </div>
          
          <button 
            onClick={handleDelete} 
            disabled={isPending}
            className="text-neutral-600 hover:text-red-400 p-1 shrink-0 transition-colors disabled:opacity-50"
            title="Delete"
          >
            ✕
          </button>
        </div>

        {errorCategory && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md mb-3 self-start border" style={{ background: `${errCfg.color}15`, color: errCfg.color, borderColor: `${errCfg.color}33` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: errCfg.color }} />
            <span className="text-[10px] uppercase tracking-wider font-medium">{errCfg.label}</span>
          </div>
        )}

        {explanation && (
          <p className="text-xs text-neutral-400 mt-auto pt-3 border-t" style={{ borderColor: "#1a1a1a" }}>
            {explanation}
          </p>
        )}
      </div>
    </div>
  );
}

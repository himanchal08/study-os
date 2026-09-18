"use client";

import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";

const ERROR_COLORS: Record<string, string> = {
  "Concept gap":       "#ef4444",
  "Calculation error": "#f59e0b",
  "Misread question":  "#818cf8",
  "Time pressure":     "#22d3ee",
  "Silly mistake":     "#fb7185",
  "Other":             "#52525b",
};

interface VaultCardProps {
  id: string;
  topicName:     string | null;
  subjectName:   string | null;
  source:        string | null;
  errorCategory: string | null;
  explanation:   string | null;
  imagePath:     string | null;
  createdAt:     string;
}

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
  const router = useRouter();

  const errColor = errorCategory ? (ERROR_COLORS[errorCategory] ?? "#52525b") : "#52525b";

  const handleDelete = () => {
    if (!confirm("Remove from vault?")) return;
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("saved_questions").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      router.refresh();
    });
  };

  let imageUrl: string | null = null;
  if (imagePath) {
    const supabase = createClient();
    const { data } = supabase.storage.from("vault-images").getPublicUrl(imagePath);
    imageUrl = data.publicUrl;
  }

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col group"
      style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderTop: `3px solid ${errColor}` }}
    >
      {imageUrl && (
        <div className="w-full aspect-video relative overflow-hidden bg-neutral-900">
          <Image src={imageUrl} alt="Question screenshot" fill unoptimized className="object-cover" />
        </div>
      )}

      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {(subjectName || topicName) && (
              <p className="text-[10px] text-neutral-500 truncate">
                {subjectName}{topicName ? ` › ${topicName}` : ""}
              </p>
            )}
            {source && (
              <p className="text-xs font-medium text-neutral-300 truncate mt-0.5">{source}</p>
            )}
          </div>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-neutral-600 hover:text-red-400 transition-all shrink-0"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {errorCategory && (
          <span
            className="self-start text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${errColor}18`, color: errColor }}
          >
            {errorCategory}
          </span>
        )}

        {explanation && (
          <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">{explanation}</p>
        )}

        <p className="text-[10px] text-neutral-700 mt-auto pt-1">
          {format(new Date(createdAt), "d MMM yyyy")}
        </p>
      </div>
    </div>
  );
}

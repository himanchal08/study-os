"use client";

import { useState, useTransition, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type ErrorCategory = "concept" | "calculation" | "silly" | "time" | "reading" | "other";

const ERROR_LABELS: { value: ErrorCategory; label: string }[] = [
  { value: "concept",     label: "Concept gap" },
  { value: "calculation", label: "Calculation error" },
  { value: "silly",       label: "Silly mistake" },
  { value: "time",        label: "Time pressure" },
  { value: "reading",     label: "Reading error" },
  { value: "other",       label: "Other" },
];

interface Subject { id: string; name: string; }
interface Topic   { id: string; name: string; subject_id: string; }

export function VaultUploadForm({
  subjects,
  topics,
  userId,
}: {
  subjects: Subject[];
  topics: Topic[];
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [selSubject, setSelSubject] = useState("");
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredTopics = topics.filter(t => t.subject_id === selSubject);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd   = new FormData(e.currentTarget);
    const file = fileRef.current?.files?.[0];

    startTransition(async () => {
      const supabase = createClient();
      let imagePath: string | null = null;

      if (file) {
        const ext  = file.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("vault-images")
          .upload(path, file, { upsert: true });
        if (!upErr) imagePath = path;
      }

      const rawCat = (fd.get("error_category") as string) || null;
      const errorCategory = rawCat as ErrorCategory | null;

      await supabase.from("saved_questions").insert({
        user_id:        userId,
        subject_id:     (fd.get("subject_id")  as string) || null,
        topic_id:       (fd.get("topic_id")    as string) || null,
        source:         (fd.get("source")      as string) || null,
        error_category: errorCategory,
        explanation:    (fd.get("explanation") as string) || null,
        image_path:     imagePath,
      });

      (e.target as HTMLFormElement).reset();
      setSelSubject("");
      router.refresh();
    });
  }

  const inputStyle = { background: "#0f0f0f", border: "1px solid #1e1e1e", color: "#ededed" };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <select
        name="subject_id"
        value={selSubject}
        onChange={e => setSelSubject(e.target.value)}
        className="select-premium text-xs"
      >
        <option value="">Subject (optional)</option>
        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {selSubject && (
        <select name="topic_id" className="select-premium text-xs">
          <option value="">Topic (optional)</option>
          {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}

      <input
        name="source"
        placeholder="Source (e.g. Mock 3 Q.12)"
        className="w-full px-3 py-2.5 rounded-xl text-xs outline-none"
        style={inputStyle}
      />

      <select name="error_category" className="select-premium text-xs">
        <option value="">Error type (optional)</option>
        {ERROR_LABELS.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <textarea
        name="explanation"
        placeholder="What went wrong? What's the correct approach?"
        rows={3}
        className="w-full px-3 py-2.5 rounded-xl text-xs outline-none resize-none"
        style={inputStyle}
      />

      <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs cursor-pointer" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e", color: "#555" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Attach screenshot
        <input ref={fileRef} type="file" accept="image/*" className="hidden" />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all"
        style={{ background: "#facc1520", color: "#facc15", border: "1px solid #facc1530", opacity: isPending ? 0.6 : 1 }}
      >
        {isPending ? "Saving…" : "Save to Vault"}
      </button>
    </form>
  );
}

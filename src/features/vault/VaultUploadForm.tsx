"use client";

import { useActionState, useState, useRef } from "react";
import { saveVaultItem } from "./actions";
import { SubjectOptions } from "@/components/ui/SubjectOptions";

const ERROR_LABELS = [
  { value: "concept",     label: "Concept gap" },
  { value: "calculation", label: "Calculation error" },
  { value: "silly",       label: "Silly mistake" },
  { value: "time",        label: "Time pressure" },
  { value: "reading",     label: "Reading error" },
  { value: "other",       label: "Other" },
] as const;

interface Subject { id: string; name: string; }
interface Topic   { id: string; name: string; subject_id: string; }

export function VaultUploadForm({
  subjects,
  topics,
}: {
  subjects: Subject[];
  topics: Topic[];
  /** @deprecated userId is now resolved server-side in the action */
  userId?: string;
}) {
  const [state, formAction, isPending] = useActionState(saveVaultItem, null);
  const [selSubject, setSelSubject] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredTopics = topics.filter(t => t.subject_id === selSubject);

  const inputStyle = { background: "#0f0f0f", border: "1px solid #1e1e1e", color: "#ededed" };

  // Reset form after successful submission
  if (state?.success && formRef.current) {
    formRef.current.reset();
    setSelSubject("");
    setFileName(null);
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {state?.error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          Saved to vault!
        </p>
      )}

      <select
        name="subject_id"
        value={selSubject}
        onChange={e => setSelSubject(e.target.value)}
        className="select-premium text-xs"
      >
        <option value="">Subject (optional)</option>
        <SubjectOptions subjects={subjects} />
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

      <label
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs cursor-pointer"
        style={{ background: "#0f0f0f", border: "1px solid #1e1e1e", color: fileName ? "#ededed" : "#555" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        {fileName ?? "Attach screenshot"}
        <input
          ref={fileRef}
          name="image"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => setFileName(e.target.files?.[0]?.name ?? null)}
        />
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

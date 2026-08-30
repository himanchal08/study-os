"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveQuestionMetadata } from "@/app/(dashboard)/vault/actions";

interface Subject { id: string; name: string; }
interface Topic { id: string; name: string; subject_id: string; }

interface VaultUploadFormProps {
  subjects: Subject[];
  topics: Topic[];
  userId: string;
}

const ERROR_CATEGORIES = [
  { id: "concept", label: "Concept Gap", color: "#ef4444" },
  { id: "calculation", label: "Calculation Error", color: "#f59e0b" },
  { id: "reading", label: "Misread Question", color: "#3b82f6" },
  { id: "silly", label: "Silly Mistake", color: "#a855f7" },
  { id: "time", label: "Time Management", color: "#64748b" },
  { id: "other", label: "Other", color: "#71717a" },
];

const inputCls = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-white/30 placeholder:text-neutral-600 transition-all";
const inputStyle = { background: "#111111", border: "1px solid #262626", color: "#ededed" };
const labelCls = "block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider";

export function VaultUploadForm({ subjects, topics, userId }: VaultUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    if (selected.size > 5 * 1024 * 1024) {
      setErrorMsg("Image must be smaller than 5MB");
      return;
    }
    
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setErrorMsg(null);
  };

  const clearImage = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData(e.currentTarget);
      let imagePath: string | null = null;

      // 1. Upload image to Supabase Storage if present
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("question-images")
          .upload(filePath, file, { cacheControl: "31536000" });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        imagePath = filePath;
      }

      if (imagePath) {
        formData.append("image_path", imagePath);
      }

      // 2. Save metadata via Server Action
      const result = await saveQuestionMetadata(formData);
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Success
      setSuccessMsg("Question saved to vault!");
      clearImage();
      e.currentTarget.reset();
      
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  // Group topics for select
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Image Uploader */}
      <div>
        <label className={labelCls}>Screenshot / Photo</label>
        {previewUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-[#262626] group bg-black aspect-video flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 bg-black/70 hover:bg-red-500/80 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors" style={{ borderColor: "#262626", background: "#0a0a0a" }}>
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-neutral-500">
              <span className="text-2xl mb-2">📸</span>
              <p className="text-sm font-medium">Click to upload image</p>
              <p className="text-xs mt-1">PNG, JPG up to 5MB</p>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </label>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Topic</label>
          <select name="topic_id" className={inputCls + " appearance-none"} style={inputStyle} required>
            <option value="">— Select topic —</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>
                {subjectMap[t.subject_id] ? `${subjectMap[t.subject_id]} · ` : ""}{t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Source / Exam</label>
          <input
            name="source"
            type="text"
            placeholder="e.g. Testbook Mock #5"
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Error Category */}
      <div>
        <label className={labelCls}>Why did you get it wrong?</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ERROR_CATEGORIES.map(c => (
            <label key={c.id} className="cursor-pointer">
              <input type="radio" name="error_category" value={c.id} className="peer sr-only" required />
              <div 
                className="text-xs text-center py-2 px-3 rounded-lg border transition-all peer-checked:bg-white/10 peer-checked:text-white text-neutral-400"
                style={{ borderColor: "#262626" }}
              >
                <div className="w-2 h-2 rounded-full inline-block mr-1.5" style={{ background: c.color }} />
                {c.label}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div>
        <label className={labelCls}>Explanation / Right Approach</label>
        <textarea
          name="explanation"
          rows={3}
          placeholder="Jot down the trick or concept you missed..."
          className={inputCls + " resize-none"}
          style={inputStyle}
        />
      </div>

      {errorMsg && (
        <p className="text-xs p-2 rounded-lg" style={{ background: "#1a0a0a", border: "1px solid #3f1515", color: "#f87171" }}>
          {errorMsg}
        </p>
      )}
      {successMsg && (
        <p className="text-xs p-2 rounded-lg" style={{ background: "#0a1a0f", border: "1px solid #14532d", color: "#4ade80" }}>
          {successMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={isUploading}
        className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: "#ededed", color: "#0a0a0a" }}
      >
        {isUploading ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
            Saving to Vault...
          </>
        ) : (
          "Save to Error Vault"
        )}
      </button>
    </form>
  );
}

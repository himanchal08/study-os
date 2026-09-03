import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubjectCard } from "@/features/syllabus/SubjectCard";
import { AddSubjectForm } from "@/features/syllabus/AddSubjectForm";
import { AddTopicForm } from "@/features/syllabus/AddTopicForm";

export const metadata: Metadata = { title: "Syllabus Coverage" };

export default async function SyllabusPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: subjects }, { data: topics }, { data: chapters }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, color, exam_type")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("topics")
      .select("id, name, status, subject_id, chapter_id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("chapters")
      .select("id, name, subject_id, sort_order")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("sort_order"),
  ]);

  // Group topics and chapters by subject
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjectWithTopics = ((subjects as any[]) ?? []).map(s => ({
    ...s,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    topics: ((topics as any[]) ?? []).filter(t => t.subject_id === s.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chapters: ((chapters as any[]) ?? []).filter(ch => ch.subject_id === s.id),
  }));

  // Overall stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTopics = (topics as any[]) ?? [];
  const learnedCount = allTopics.filter(t => ["learned", "strong"].includes(t.status)).length;
  const coverage = allTopics.length > 0 ? Math.round((learnedCount / allTopics.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight mb-1">Syllabus Coverage</h1>
        <p className="text-sm text-neutral-500">Track topics by status - click any status badge to cycle through it.</p>
      </div>

      {/* Coverage strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Subjects", value: (subjects ?? []).length },
          { label: "Topics", value: allTopics.length },
          { label: "Coverage", value: `${coverage}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1">{label}</p>
            <p className="text-xl font-semibold text-neutral-100 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject tree */}
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Subjects & Topics</p>
          {subjectWithTopics.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <p className="text-neutral-600 text-sm">No subjects yet. Add your first subject using the form.</p>
            </div>
          ) : (
            subjectWithTopics.map(s => (
              <SubjectCard key={s.id} subject={s} />
            ))
          )}
        </div>

        {/* Add forms */}
        <div className="space-y-3">
          <div className="rounded-xl p-5 sticky top-6 space-y-6" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Add Subject</p>
              <AddSubjectForm />
            </div>
            {(subjects ?? []).length > 0 && (
              <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "1.25rem" }}>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Add Topic</p>
                <AddTopicForm subjects={subjects ?? []} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

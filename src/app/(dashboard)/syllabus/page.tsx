import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AddSubjectForm } from "@/features/syllabus/AddSubjectForm";
import { AddTopicForm } from "@/features/syllabus/AddTopicForm";
import { SyllabusTabs } from "@/features/syllabus/SyllabusTabs";

export const metadata: Metadata = { title: "Syllabus Coverage" };

export default async function SyllabusPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: subjects }, { data: topics }, { data: chapters }, { data: lifecycles }, { data: profile }] = await Promise.all([
    supabase.from("subjects").select("id, name, color, exam_type").eq("user_id", user.id).is("deleted_at", null).order("name"),
    supabase.from("topics").select("id, name, status, subject_id, chapter_id").eq("user_id", user.id).is("deleted_at", null).is("archived_at", null).order("name"),
    supabase.from("chapters").select("id, name, subject_id, sort_order").eq("user_id", user.id).is("deleted_at", null).order("sort_order"),
    supabase.from("topic_lifecycle").select("topic_id, book_practice_done, dpp_done, pyq_done, tests_attempted_count").eq("user_id", user.id),
    supabase.from("profiles").select("exam_targets").eq("user_id", user.id).single(),
  ]);

  const subjectWithTopics = ((subjects as {id: string; name: string; color: string; exam_type: string}[]) ?? []).map(s => ({
    ...s,
    topics:   ((topics   as {id: string; name: string; status: any; subject_id: string; chapter_id: string | null}[]) ?? []).filter(t  => t.subject_id  === s.id).map(t => {
      const lc = ((lifecycles as {topic_id: string; book_practice_done: boolean; dpp_done: boolean; pyq_done: boolean; tests_attempted_count: number}[]) ?? []).find(l => l.topic_id === t.id);
      return { ...t, status: t.status as "not_started" | "learning" | "learned" | "revising" | "strong" | "weak", lifecycle: lc || null };
    }),
    chapters: ((chapters as {id: string; name: string; subject_id: string; sort_order: number}[]) ?? []).filter(ch => ch.subject_id === s.id),
  }));

  return (
    <div className="space-y-5 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight">Syllabus Coverage</h1>
        <p className="text-xs mt-1 text-neutral-500">Track topic status — tap a badge to update it.</p>
      </div>

      <SyllabusTabs subjects={subjectWithTopics} initialExamTargets={profile?.exam_targets ?? []} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Add Subject</p>
          <AddSubjectForm />
        </div>
        {(subjects ?? []).length > 0 && (
          <div className="rounded-xl p-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Add Topic</p>
            <AddTopicForm subjects={subjects ?? []} />
          </div>
        )}
      </div>
    </div>
  );
}

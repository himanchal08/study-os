import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { VaultUploadForm } from "@/features/vault/VaultUploadForm";
import { VaultCard } from "@/features/vault/VaultCard";
import type { Tables } from "@/types/database";

export const metadata: Metadata = { title: "Error Vault" };

type SavedQuestionRow = Pick<
  Tables<"saved_questions">,
  "id" | "source" | "error_category" | "explanation" | "image_path" | "created_at"
> & {
  topics: { name: string; subject_id: string; subjects: { name: string } | null } | null;
};

export default async function VaultPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: subjects }, { data: topics }, { data: questionsRaw }] = await Promise.all([
    supabase.from("subjects").select("id, name").order("name"),
    supabase.from("topics").select("id, name, subject_id").is("archived_at", null).order("name"),
    supabase
      .from("saved_questions")
      .select("id, source, error_category, explanation, image_path, created_at, topics(name, subject_id, subjects(name))")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const savedQuestions = (questionsRaw ?? []) as unknown as SavedQuestionRow[];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 tracking-tight mb-1">Error Vault</h1>
        <p className="text-sm text-neutral-500">Save tricky questions and categorize your mistakes for future review.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Upload Form */}
        <div className="lg:col-span-1 rounded-xl p-5 sticky top-6 space-y-4" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Add to Vault</p>
            <p className="text-[10px] text-neutral-600 mb-4">Take a screenshot of a hard question to save it.</p>
          </div>
          <VaultUploadForm subjects={subjects ?? []} topics={topics ?? []} userId={user.id} />
        </div>

        {/* Gallery */}
        <div className="lg:col-span-3">
          {savedQuestions.length === 0 ? (
            <div className="rounded-xl p-12 text-center flex flex-col items-center justify-center" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              <span className="text-4xl mb-3 opacity-50">🗄️</span>
              <p className="text-neutral-300 font-medium mb-1">Your vault is empty</p>
              <p className="text-sm text-neutral-600 max-w-sm">
                When you make a mistake or find a tricky concept in a mock test, take a screenshot and save it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {savedQuestions.map(q => (
                <VaultCard
                  key={q.id}
                  id={q.id}
                  topicName={q.topics?.name ?? null}
                  subjectName={q.topics?.subjects?.name ?? null}
                  source={q.source}
                  errorCategory={q.error_category}
                  explanation={q.explanation}
                  imagePath={q.image_path}
                  createdAt={q.created_at}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

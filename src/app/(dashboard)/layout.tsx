import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { Tables } from "@/types/database";
import { GlobalTimerLoader } from "@/features/study-timer/GlobalTimerLoader";
import { Suspense } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const safeUser = user!;

  // Run independent queries in parallel — previously sequential, each adding
  // a full round-trip latency to every page navigation.
  const [
    { data: profile },
    { data: rawSubjects },
    { data: rawTopics },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", safeUser.id)
      .single(),
    supabase
      .from("subjects")
      .select("id, name, color, exam_type")
      .eq("user_id", safeUser.id)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("topics")
      .select("id, name, subject_id")
      .eq("user_id", safeUser.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("name", { ascending: true }),
  ]);

  // Deduplicate subjects by lowercase name — keep first occurrence
  const subjectsSeen = new Set<string>();
  const subjects = (rawSubjects ?? []).filter(s => {
    const key = s.name.toLowerCase().trim();
    if (subjectsSeen.has(key)) return false;
    subjectsSeen.add(key);
    return true;
  });

  const subjectIds = new Set(subjects.map(s => s.id));

  // Only include topics belonging to the deduplicated subjects; remove "no specific topic"
  const topicsSeen = new Set<string>();
  const topics = (rawTopics ?? []).filter(t => {
    if (!subjectIds.has(t.subject_id)) return false;
    if (t.name.toLowerCase().includes("no specific")) return false;
    const key = `${t.subject_id}-${t.name.toLowerCase().trim()}`;
    if (topicsSeen.has(key)) return false;
    topicsSeen.add(key);
    return true;
  });

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: "var(--background)" }}>
      {/* Desktop sidebar */}
      <Sidebar userEmail={safeUser.email ?? ""} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          profile={profile as Tables<"profiles"> | null}
          userId={safeUser.id}
          userEmail={safeUser.email ?? ""}
        />
        {/* GlobalTimerLoader in Suspense keeps the client timer state stable
            across RSC re-renders — prevents "multiple clicks" to start timer */}
        <Suspense fallback={<div className="h-14 border-b shrink-0" style={{ borderColor: "var(--border-subtle)" }} />}>
          <GlobalTimerLoader
            userId={safeUser.id}
            subjects={subjects ?? []}
            topics={topics ?? []}
          />
        </Suspense>
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6"
          tabIndex={-1}
        >
          <div className="w-full max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

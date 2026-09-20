import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { Tables } from "@/types/database";
import { GlobalTimer } from "@/features/study-timer/GlobalTimer";
import { dayBoundaryAwareDate } from "@/lib/calculations";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", safeUser.id)
    .single();

  const offsetMin = profile?.day_boundary_offset_minutes ?? 0;
  const timezone  = profile?.timezone ?? "Asia/Kolkata";
  const todayStr  = dayBoundaryAwareDate(Date.now(), offsetMin, timezone);

  const [
    { data: activeSession },
    { data: rawSubjects },
    { data: rawTopics },
    { count: pendingTaskCount },
  ] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", safeUser.id)
      .is("end_timestamp", null)
      .maybeSingle(),
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
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", safeUser.id)
      .eq("planned_date", todayStr)
      .neq("status", "completed")
      .is("deleted_at", null),
  ]);

  const subjectsSeen = new Set<string>();
  const subjects = (rawSubjects ?? []).filter(s => {
    const key = s.name.toLowerCase().trim();
    if (subjectsSeen.has(key)) return false;
    subjectsSeen.add(key);
    return true;
  });

  const subjectIds = new Set(subjects.map(s => s.id));

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
    <div key={safeUser.id} className="flex h-dvh overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar userEmail={safeUser.email ?? ""} pendingTaskCount={pendingTaskCount ?? 0} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          profile={profile as Tables<"profiles"> | null}
          userId={safeUser.id}
          userEmail={safeUser.email ?? ""}
          pendingTaskCount={pendingTaskCount ?? 0}
        />
        <GlobalTimer
          userId={safeUser.id}
          activeSession={activeSession}
          subjects={subjects ?? []}
          topics={topics ?? []}
          timezone={profile?.timezone ?? "Asia/Kolkata"}
        />
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

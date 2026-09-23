import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { Tables } from "@/types/database";
import { GlobalTimer } from "@/features/study-timer/GlobalTimer";
import { dayBoundaryAwareDate } from "@/lib/calculations";
import { deduplicateSubjects, deduplicateTopics } from "@/lib/subject-utils";
import { CommandPalette } from "@/components/ui/CommandPalette";

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
  // eslint-disable-next-line react-hooks/purity
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
      .order("sort_order", { ascending: true }),
    supabase
      .from("topics")
      .select("id, name, subject_id")
      .eq("user_id", safeUser.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", safeUser.id)
      .eq("planned_date", todayStr)
      .neq("status", "completed")
      .is("deleted_at", null),
  ]);

  const subjects = deduplicateSubjects(rawSubjects ?? []);
  const subjectIds = new Set(subjects.map(s => s.id));
  const topics = deduplicateTopics(rawTopics ?? [], subjectIds);

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
      <CommandPalette />
    </div>
  );
}

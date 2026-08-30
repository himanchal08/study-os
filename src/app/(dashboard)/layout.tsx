import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { Tables } from "@/types/database";
import { SiteTutorial } from "@/components/layout/SiteTutorial";
import { GlobalTimer } from "@/features/study-timer/GlobalTimer";

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

  const { data: activeSession } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", safeUser.id)
    .is("end_timestamp", null)
    .maybeSingle();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, color")
    .eq("user_id", safeUser.id)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .eq("user_id", safeUser.id)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("name", { ascending: true });

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar userEmail={safeUser.email ?? ""} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          profile={profile as Tables<"profiles"> | null}
          userId={safeUser.id}
        />
        <GlobalTimer 
          userId={safeUser.id} 
          activeSession={activeSession} 
          subjects={subjects ?? []}
          topics={topics ?? []}
        />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-6"
          tabIndex={-1}
        >
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <SiteTutorial userId={safeUser.id} startImmediately={profile?.tutorial_completed === false} />
    </div>
  );
}

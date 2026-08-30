import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { KpiStrip } from "@/features/analytics/KpiStrip";
import { StudyTimer } from "@/features/study-timer/StudyTimer";
import { RevisionQueue } from "@/features/revisions/RevisionQueue";

export const metadata: Metadata = {
  title: "Home",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_target_hours, day_boundary_offset_minutes, timezone")
    .eq("user_id", user.id)
    .single();

  const { data: activeSession } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", user.id)
    .is("end_timestamp", null)
    .maybeSingle();

  const today = new Date().toISOString().split("T")[0];
  const { data: revisionsDue } = await supabase
    .from("revisions")
    .select("*, topics(name, subjects(name, color))")
    .eq("user_id", user.id)
    .lte("due_date", today)
    .is("completed_at", null)
    .order("due_date", { ascending: true })
    .limit(10);

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, color")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  return (
    <div className="space-y-6 animate-fade-in">
      <section aria-label="Today's overview">
        <KpiStrip
          userId={user.id}
          dailyTargetHours={profile?.daily_target_hours ?? 8}
          dayBoundaryOffsetMin={profile?.day_boundary_offset_minutes ?? 0}
          timezone={profile?.timezone ?? "Asia/Kolkata"}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <section aria-label="Study timer">
            <StudyTimer
              userId={user.id}
              activeSession={activeSession}
              subjects={subjects ?? []}
            />
          </section>
        </div>

        <div>
          <section aria-label="Revisions due today">
            <RevisionQueue
              userId={user.id}
              revisions={revisionsDue ?? []}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

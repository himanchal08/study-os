import { createClient } from "@/lib/supabase/server";
import { GlobalTimer } from "./GlobalTimer";

interface Props {
  userId: string;
  subjects: { id: string; name: string; color: string | null; exam_type: string | null }[];
  topics: { id: string; name: string; subject_id: string }[];
}

export async function GlobalTimerLoader({ userId, subjects, topics }: Props) {
  const supabase = await createClient();

  const { data: activeSession } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("end_timestamp", null)
    .maybeSingle();

  return (
    <GlobalTimer
      userId={userId}
      activeSession={activeSession}
      subjects={subjects}
      topics={topics}
    />
  );
}

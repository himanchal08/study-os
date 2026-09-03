import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { domain, session_id, event_type, duration_seconds } = body;

    if (!domain) {
      return NextResponse.json({ error: "Missing domain" }, { status: 400 });
    }

    const { error } = await supabase
      .from("browser_events")
      .insert({
        user_id: user.id,
        session_id: session_id,
        domain: domain,
        event_type: event_type || "distraction_start",
        duration_seconds: duration_seconds || 10,
        source_client: "extension",
        occurred_at: new Date().toISOString()
      });

    if (error) {
      console.error("Failed to log browser event:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Extension log error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

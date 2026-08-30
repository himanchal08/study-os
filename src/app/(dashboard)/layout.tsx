import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { Tables } from "@/types/database";

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

  // After redirect() throws, user is guaranteed non-null here.
  // Cast to satisfy TypeScript (redirect() throws NEXT_REDIRECT, never returns).
  const safeUser = user!;

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", safeUser.id)
    .single();

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: "var(--background)" }}>
      {/* Sidebar */}
      <Sidebar userEmail={safeUser.email ?? ""} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          profile={profile as Tables<"profiles"> | null}
          userId={safeUser.id}
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
    </div>
  );
}

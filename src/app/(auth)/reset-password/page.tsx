import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Update Password" };

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If there's no user session, they shouldn't be here (or link is invalid/expired)
  if (!user) {
    redirect("/login?error=unauthorized");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 relative overflow-hidden" style={{ background: "var(--background)" }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] opacity-[0.03] pointer-events-none" style={{ background: "#ffffff" }} />
      
      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Update password</h1>
          <p className="text-sm mt-2 text-neutral-500">
            Enter a new password for your account
          </p>
        </div>

        <ResetPasswordForm />
      </div>
    </main>
  );
}

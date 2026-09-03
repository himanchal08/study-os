import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6 relative overflow-hidden" style={{ background: "var(--background)" }}>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] opacity-[0.03] pointer-events-none" style={{ background: "#ffffff" }} />
      
      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Reset password</h1>
          <p className="text-sm mt-2 text-neutral-500">
            Enter your email to receive a reset link
          </p>
        </div>

        <ForgotPasswordForm />

        <div className="mt-8 text-center">
          <Link href="/login" className="text-xs font-medium text-neutral-400 hover:text-white transition-colors">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}

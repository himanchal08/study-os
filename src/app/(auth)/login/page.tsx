import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Study OS",
};

export default function LoginPage() {
  return (
    <main
      className="min-h-dvh flex items-center justify-center p-4"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-md animate-fade-in">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 mb-5 shadow-sm">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ededed"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Study OS</h1>
          <p
            className="text-sm mt-1.5 text-neutral-500"
          >
            Your exam prep command centre
          </p>
        </div>

        
        <div className="glass rounded-2xl p-8">
          <h2
            className="text-lg font-semibold mb-6"
            style={{ color: "var(--foreground)" }}
          >
            Sign in to continue
          </h2>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

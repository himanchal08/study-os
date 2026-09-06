"use client";

import { useState, useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp, signInWithGoogle } from "./actions";
import type { AuthState } from "./actions";

const INITIAL_STATE: AuthState = null;

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [lastUsed, setLastUsed] = useState<string | null>(null);

  useEffect(() => {
    setLastUsed(localStorage.getItem("lastUsedAuth"));
  }, []);

  const handleEmailSubmit = () => {
    localStorage.setItem("lastUsedAuth", "email");
  };

  const handleGoogleSubmit = () => {
    localStorage.setItem("lastUsedAuth", "google");
  };

  const [signInState, signInAction, signInPending] = useActionState(
    signIn,
    INITIAL_STATE
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUp,
    INITIAL_STATE
  );

  const state = isSignUp ? signUpState : signInState;
  const formAction = isSignUp ? signUpAction : signInAction;
  const pending = isSignUp ? signUpPending : signInPending;

  const router = useRouter();

  useEffect(() => {
    if (state?.success && isSignUp) {
      const timer = setTimeout(() => {
        if (state.session) {
          router.push("/");
        } else {
          setIsSignUp(false); // switch to sign in if they need to verify email
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, isSignUp, router]);

  return (
    <div className="w-full relative">
      {/* Success Popup */}
      {state?.success && isSignUp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-2xl flex flex-col items-center text-center max-w-[280px]">
            {state.session ? (
              <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            
            <h3 className="text-neutral-100 font-semibold text-lg mb-2">
              {state.session ? "Account Created!" : "Check your inbox!"}
            </h3>
            <p className="text-neutral-400 text-sm">
              {state.session 
                ? "Redirecting to your dashboard..." 
                : "We've sent a secure confirmation link to your email."}
            </p>
          </div>
        </div>
      )}

      <form action={formAction} onSubmit={handleEmailSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium mb-1.5"
            style={{ color: "rgba(226,226,240,0.7)" }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-1 focus:ring-white"
            style={{
              background: "#171717",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
            aria-describedby={state?.error ? "auth-error" : undefined}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-medium"
              style={{ color: "rgba(226,226,240,0.7)" }}
            >
              Password
            </label>
            {!isSignUp && (
              <Link href="/forgot-password" className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors">
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-1 focus:ring-white"
            style={{
              background: "#171717",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>

        {state?.error && (
          <p
            id="auth-error"
            role="alert"
            className="text-xs px-3 py-2 rounded-lg"
            style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}
          >
            {state.error}
          </p>
        )}

        {state?.message && !isSignUp && (
          <p
            role="status"
            className="text-xs px-3 py-2 rounded-lg"
            style={{ background: "rgba(34,197,94,0.12)", color: "#86efac" }}
          >
            {state.message}
          </p>
        )}

        <button
          id="submit-auth"
          type="submit"
          disabled={pending}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "#ededed",
            color: "#0a0a0a",
          }}
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              {isSignUp ? "Creating account..." : "Signing in..."}
            </span>
          ) : isSignUp ? (
            "Create account"
          ) : (
            <span className="flex items-center justify-center gap-2">
              Sign in
              {lastUsed === "email" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-medium tracking-wide border border-neutral-700">Last used</span>
              )}
            </span>
          )}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-800"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-[#0a0a0a] text-neutral-500 rounded-lg">Or continue with</span>
        </div>
      </div>

      <form action={signInWithGoogle} onSubmit={handleGoogleSubmit}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-neutral-800 active:scale-[0.98] border border-neutral-800"
          style={{
            background: "#171717",
            color: "#ededed",
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
          {lastUsed === "google" && (
            <span className="text-[10px] px-1.5 py-0.5 ml-1 rounded-full bg-neutral-800 text-neutral-400 font-medium tracking-wide border border-neutral-700">Last used</span>
          )}
        </button>
      </form>

      <p
        className="text-center text-xs mt-6"
        style={{ color: "rgba(226,226,240,0.45)" }}
      >
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="font-medium hover:underline transition-colors"
          style={{ color: "#ededed" }}
        >
          {isSignUp ? "Sign in" : "Create one"}
        </button>
      </p>
    </div>
  );
}

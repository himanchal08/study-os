"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { signIn, signUp } from "./actions";
import type { AuthState } from "./actions";

const INITIAL_STATE: AuthState = null;

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);

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

  return (
    <form action={formAction} className="space-y-4">
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

      {state?.message && (
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
          "Sign in"
        )}
      </button>

      <p
        className="text-center text-xs"
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
    </form>
  );
}

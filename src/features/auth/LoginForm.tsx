"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp, signInWithGoogle } from "./actions";
import type { AuthState } from "./actions";

const INITIAL_STATE: AuthState = null;

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const searchParams = useSearchParams();

  const [signInState, signInAction, signInPending] = useActionState(signIn, INITIAL_STATE);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, INITIAL_STATE);

  const state = isSignUp ? signUpState : signInState;
  const formAction = isSignUp ? signUpAction : signInAction;
  const pending = isSignUp ? signUpPending : signInPending;

  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // Read + immediately clear any ?error= from URL — never leave errors visible in URL bar
  const [urlError, setUrlError] = useState<string | null>(null);
  useEffect(() => {
    const raw = searchParams.get("error");
    if (!raw) return;
    const msg =
      raw === "auth_callback_failed"
        ? "Sign-in failed. Please try again."
        : decodeURIComponent(raw).replace(/_/g, " ");
    setUrlError(msg);
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState({}, "", url.toString());
  }, [searchParams]);

  // Also strip hash fragment errors (Supabase OAuth error_description in hash)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("error_description")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const desc = params.get("error_description");
      if (desc) setUrlError(decodeURIComponent(desc.replace(/\+/g, " ")));
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
    }
  }, []);

  const displayError = state?.error ?? urlError;

  useEffect(() => {
    if (state?.error || state?.success) setUrlError(null);
  }, [state]);

  useEffect(() => {
    if (state?.success && isSignUp) {
      const t = setTimeout(() => {
        state.session ? router.push("/") : setIsSignUp(false);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [state, isSignUp, router]);

  const switchMode = (signup: boolean) => {
    setIsSignUp(signup);
    setUrlError(null);
    formRef.current?.reset();
  };

  // Google — handled entirely client-side so no ?error= hits the URL
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setGooglePending(true);
    setGoogleError(null);
    try {
      const result = await signInWithGoogle();
      if (result?.error) setGoogleError(result.error);
    } catch (err: unknown) {
      // NEXT_REDIRECT is how next/navigation redirect() signals — it is NOT an error
      const digest =
        err && typeof err === "object" && "digest" in err
          ? String((err as Record<string, unknown>).digest)
          : "";
      if (digest.startsWith("NEXT_REDIRECT")) throw err; // let Next.js handle it
      setGoogleError("Could not sign in with Google. Please try again.");
    } finally {
      setGooglePending(false);
    }
  };

  return (
    <div className="w-full relative">
      {/* ── Success overlay (sign up) ───────────────────────────────── */}
      {state?.success && isSignUp && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="p-7 rounded-2xl flex flex-col items-center text-center max-w-xs w-full mx-4"
            style={{ background: "#111", border: "1px solid #2a2a2a" }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={
                state.session
                  ? { background: "rgba(16,185,129,0.12)", color: "#34d399" }
                  : { background: "rgba(99,102,241,0.12)", color: "#818cf8" }
              }
            >
              {state.session ? (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <p className="font-semibold text-base mb-1" style={{ color: "#ededed" }}>
              {state.session ? "Account created!" : "Check your inbox"}
            </p>
            <p className="text-sm" style={{ color: "#666" }}>
              {state.session
                ? "Redirecting to your dashboard…"
                : "We sent a confirmation link to your email."}
            </p>
          </div>
        </div>
      )}

      {/* ── Mode Tabs ─────────────────────────────────────────────────── */}
      <div
        className="flex rounded-xl p-1 mb-6"
        role="tablist"
        aria-label="Authentication mode"
        style={{ background: "#080808", border: "1px solid #1c1c1c" }}
      >
        {(["Sign In", "Create Account"] as const).map((label, i) => {
          const active = isSignUp === (i === 1);
          return (
            <button
              key={label}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => switchMode(i === 1)}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200"
              style={
                active
                  ? {
                      background: "#1e1e1e",
                      color: "#ededed",
                      border: "1px solid #333",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.6)",
                    }
                  : { color: "#555", border: "1px solid transparent" }
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Email / Password form ─────────────────────────────────────── */}
      <form ref={formRef} action={formAction} className="space-y-4">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium mb-1.5"
            style={{ color: "rgba(226,226,240,0.6)" }}
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!displayError}
            aria-describedby={displayError ? "auth-error" : undefined}
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: "#0f0f0f", border: "1px solid #252525", color: "#ededed" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#444")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#252525")}
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-medium"
              style={{ color: "rgba(226,226,240,0.6)" }}
            >
              Password
            </label>
            {!isSignUp && (
              <Link
                href="/forgot-password"
                className="text-[11px] transition-colors"
                style={{ color: "#555" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#999")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
              >
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
            minLength={isSignUp ? 6 : undefined}
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: "#0f0f0f", border: "1px solid #252525", color: "#ededed" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#444")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#252525")}
          />
          {isSignUp && (
            <p className="text-[10px] mt-1" style={{ color: "#4a4a4a" }}>
              Minimum 6 characters
            </p>
          )}
        </div>

        {/* Confirm Password — sign up only */}
        {isSignUp && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-medium mb-1.5"
              style={{ color: "rgba(226,226,240,0.6)" }}
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: "#0f0f0f", border: "1px solid #252525", color: "#ededed" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#444")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#252525")}
            />
          </div>
        )}

        {/* Inline error — never shown in URL */}
        {displayError && (
          <div
            id="auth-error"
            role="alert"
            className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-xs"
            style={{
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.18)",
              color: "#fca5a5",
            }}
          >
            <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{displayError}</span>
          </div>
        )}

        {/* Submit */}
        <button
          id="submit-auth"
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          style={{ background: "#ededed", color: "#0a0a0a" }}
          onMouseEnter={(e) => { if (!pending) e.currentTarget.style.background = "#d4d4d8"; }}
          onMouseLeave={(e) => { if (!pending) e.currentTarget.style.background = "#ededed"; }}
        >
          {pending ? (
            <span className="inline-flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {isSignUp ? "Creating account…" : "Signing in…"}
            </span>
          ) : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ borderTop: "1px solid #1c1c1c" }} />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3" style={{ background: "#0a0a0a", color: "#3a3a3a" }}>
            or
          </span>
        </div>
      </div>

      {/* ── Google ────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googlePending}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "#0f0f0f", color: "#ededed", border: "1px solid #252525" }}
        onMouseEnter={(e) => { if (!googlePending) e.currentTarget.style.background = "#161616"; }}
        onMouseLeave={(e) => { if (!googlePending) e.currentTarget.style.background = "#0f0f0f"; }}
      >
        {googlePending ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        Continue with Google
      </button>

      {googleError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-xs mt-2"
          style={{
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.18)",
            color: "#fca5a5",
          }}
        >
          <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {googleError}
        </div>
      )}
    </div>
  );
}
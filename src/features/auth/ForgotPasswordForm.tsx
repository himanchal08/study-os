"use client";

import { useActionState } from "react";
import { resetPassword } from "./actions";

export function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState(resetPassword, null);

  if (state?.success) {
    return (
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-center">
        <p className="text-sm text-emerald-400 font-medium">Check your email</p>
        <p className="text-xs text-neutral-400 mt-1">We sent a password reset link to {state.email}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-medium text-neutral-400 ml-1">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-neutral-200 outline-none focus:border-neutral-500 transition-colors placeholder:text-neutral-600"
          placeholder="you@example.com"
        />
      </div>

      {state?.error && (
        <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/10">
          <p className="text-xs text-rose-400 font-medium">{state.error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-white text-black font-medium text-sm py-2.5 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Sending link..." : "Send reset link"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { updatePassword } from "./actions";

export function ResetPasswordForm() {
  const [state, action, isPending] = useActionState(updatePassword, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-medium text-neutral-400 ml-1">New Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-neutral-200 outline-none focus:border-neutral-500 transition-colors placeholder:text-neutral-600"
          placeholder="••••••••"
        />
      </div>
      
      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-xs font-medium text-neutral-400 ml-1">Confirm New Password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-4 py-2.5 text-sm text-neutral-200 outline-none focus:border-neutral-500 transition-colors placeholder:text-neutral-600"
          placeholder="••••••••"
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
        className="w-full bg-white text-black font-medium text-sm py-2.5 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        {isPending ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}

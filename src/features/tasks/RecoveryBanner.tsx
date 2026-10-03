"use client";

import { useState, useEffect, useTransition } from "react";
import { recoverStuckTasks } from "@/features/tasks/actions";

interface RecoveryBannerProps {
  todayStr: string;
  stuckCount: number;
}

export function RecoveryBanner({ todayStr, stuckCount }: RecoveryBannerProps) {
  const [isPending, startTransition] = useTransition();
  const [visible, setVisible] = useState(stuckCount > 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVisible(stuckCount > 0);
  }, [stuckCount]);

  if (!visible) return null;

  function handleRecover() {
    startTransition(async () => {
      const res = await recoverStuckTasks(todayStr);
      if (res && "error" in res) {
        setError(res.error as string);
        return;
      }
      // Hard reload so the server component fully re-fetches
      window.location.reload();
    });
  }

  return (
    <div
      className="rounded-xl p-4 mb-2 flex items-center justify-between gap-4 flex-wrap"
      style={{ background: "#1c1300", border: "1px solid #78350f" }}
    >
      <div>
        <p className="text-sm font-semibold text-amber-400">
          ⚠️ {stuckCount} task{stuckCount > 1 ? "s" : ""} not showing in Today
        </p>
        <p className="text-xs text-amber-400/60 mt-0.5">
          {error
            ? `Error: ${error}`
            : "Found tasks with cancelled/postponed status on past dates. Click to restore them to today."}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleRecover}
          disabled={isPending}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          style={{ background: "#f59e0b", color: "#000" }}
        >
          {isPending ? "Restoring..." : "Restore to Today"}
        </button>
        <button
          onClick={() => setVisible(false)}
          disabled={isPending}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "transparent", color: "#92400e", border: "1px solid #78350f" }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

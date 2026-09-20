"use client";

import { useState } from "react";
import { handleOverdueTasks } from "@/features/tasks/actions";
import { useRouter } from "next/navigation";

interface OverdueManagerProps {
  overdueCount: number;
  todayStr: string;
}

export function OverdueManager({ overdueCount, todayStr }: OverdueManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (overdueCount === 0) return null;

  async function handleAction(action: "rollover" | "delete" | "dismiss") {
    setLoading(true);
    await handleOverdueTasks(action, todayStr);
    setLoading(false);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="rounded-xl p-4 mb-6 flex items-center justify-center bg-orange-950/30 border border-orange-900/50">
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-4 mb-6 relative overflow-hidden" style={{ background: "#2a1508", border: "1px solid #4a2511" }}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-orange-400 font-semibold flex items-center gap-2 text-sm md:text-base">
            <span>⚠️</span> You have {overdueCount} overdue task{overdueCount > 1 ? "s" : ""}
          </h3>
          <p className="text-orange-400/70 text-xs mt-1">
            They were planned for a past date but never completed.
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => handleAction("rollover")}
            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-orange-950 text-xs font-semibold rounded-lg transition-colors"
          >
            Roll Over to Today
          </button>
          <button 
            onClick={() => handleAction("dismiss")}
            className="px-3 py-1.5 bg-transparent hover:bg-orange-950 text-orange-400/80 border border-orange-900/50 text-xs font-medium rounded-lg transition-colors"
          >
            Dismiss
          </button>
          <button 
            onClick={() => handleAction("delete")}
            className="px-3 py-1.5 bg-transparent hover:bg-red-950 text-red-400/80 border border-red-900/30 text-xs font-medium rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

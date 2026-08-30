"use client";

interface PastYouComparisonProps {
  currentHours: number;
  pastHours: number;
  currentAccuracy: number | null;
  pastAccuracy: number | null;
}

export function PastYouComparison({ currentHours, pastHours, currentAccuracy, pastAccuracy }: PastYouComparisonProps) {
  const hoursDiff = currentHours - pastHours;
  const hoursTrend = hoursDiff >= 0 ? "up" : "down";
  
  const accDiff = currentAccuracy !== null && pastAccuracy !== null ? currentAccuracy - pastAccuracy : 0;
  const accTrend = accDiff >= 0 ? "up" : "down";

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
        <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-semibold">Study Hours (7d)</p>
        <div className="flex items-end gap-3">
          <span className="text-2xl font-bold text-neutral-100 tabular-nums">{currentHours.toFixed(1)}h</span>
          <span className={`text-xs font-medium mb-1 ${hoursTrend === "up" ? "text-emerald-400" : "text-rose-400"}`}>
            {hoursTrend === "up" ? "+" : ""}{hoursDiff.toFixed(1)}h vs last week
          </span>
        </div>
      </div>

      <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
        <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-semibold">Accuracy (7d)</p>
        <div className="flex items-end gap-3">
          <span className="text-2xl font-bold text-neutral-100 tabular-nums">{currentAccuracy !== null ? Math.round(currentAccuracy) + "%" : "--"}</span>
          {currentAccuracy !== null && pastAccuracy !== null && (
            <span className={`text-xs font-medium mb-1 ${accTrend === "up" ? "text-emerald-400" : "text-rose-400"}`}>
              {accTrend === "up" ? "+" : ""}{Math.round(accDiff)}% vs last week
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

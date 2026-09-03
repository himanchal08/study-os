"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GoogleCalendarPanelProps {
  isConnected: boolean;
  lastSyncedAt: string | null;
}

export function GoogleCalendarPanel({ isConnected, lastSyncedAt }: GoogleCalendarPanelProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<{ message: string; ok: boolean } | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult({ message: data.message ?? data.error ?? "Done", ok: res.ok });
      if (res.ok) router.refresh(); 
    } catch {
      setSyncResult({ message: "Network error — could not reach sync endpoint.", ok: false });
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Calendar? Future syncs will stop working.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/calendar/disconnect", { method: "POST" });
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  function formatSyncTime(ts: string): string {
    const d = new Date(ts);
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="rounded-xl p-5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-neutral-200">Google Calendar Sync</h2>
        {isConnected && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        )}
      </div>

      <p className="text-xs text-neutral-500 mb-4">
        Push today&apos;s tasks and the last 7 days of study sessions to Google Calendar as timed events.
      </p>

      {isConnected ? (
        <div className="space-y-3">
          {lastSyncedAt && (
            <p className="text-[11px] text-neutral-600">
              Last synced: {formatSyncTime(lastSyncedAt)}
            </p>
          )}

          {syncResult && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: syncResult.ok ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${syncResult.ok ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)"}`,
                color: syncResult.ok ? "#34d399" : "#ef4444",
              }}
            >
              {syncResult.message}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              id="btn-sync-calendar"
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "#1a1a1a", border: "1px solid #262626", color: "#ededed" }}
            >
              {syncing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Syncing…
                </span>
              ) : "Sync Now"}
            </button>

            <button
              id="btn-disconnect-calendar"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        </div>
      ) : (
        <a
          id="btn-connect-calendar"
          href="/api/calendar/auth"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
          style={{ background: "#ffffff", color: "#000000" }}
        >
          <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Connect Google Calendar
        </a>
      )}
    </div>
  );
}

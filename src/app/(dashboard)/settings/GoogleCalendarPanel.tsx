"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GoogleCalendarPanelProps {
  isConnected: boolean;
  lastSyncedAt: string | null;
}

type SyncResult = { message: string; ok: boolean } | null;

export function GoogleCalendarPanel({ isConnected, lastSyncedAt }: GoogleCalendarPanelProps) {
  const router = useRouter();
  const [syncingTasks, setSyncingTasks] = useState(false);
  const [syncingSessions, setSyncingSessions] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [tasksResult, setTasksResult] = useState<SyncResult>(null);
  const [sessionsResult, setSessionsResult] = useState<SyncResult>(null);

  async function handleSyncTasks() {
    setSyncingTasks(true);
    setTasksResult(null);
    try {
      const res = await fetch("/api/calendar/sync/tasks", { method: "POST" });
      const data = await res.json();
      setTasksResult({ message: data.message ?? data.error ?? "Done", ok: res.ok });
      if (res.ok) router.refresh();
    } catch {
      setTasksResult({ message: "Network error — could not reach sync endpoint.", ok: false });
    } finally {
      setSyncingTasks(false);
    }
  }

  async function handleSyncSessions() {
    setSyncingSessions(true);
    setSessionsResult(null);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();
      setSessionsResult({ message: data.message ?? data.error ?? "Done", ok: res.ok });
      if (res.ok) router.refresh();
    } catch {
      setSessionsResult({ message: "Network error — could not reach sync endpoint.", ok: false });
    } finally {
      setSyncingSessions(false);
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

  function SyncResultBanner({ result }: { result: SyncResult }) {
    if (!result) return null;
    return (
      <div
        className="text-xs px-3 py-2 rounded-lg"
        style={{
          background: result.ok ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${result.ok ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)"}`,
          color: result.ok ? "#34d399" : "#ef4444",
        }}
      >
        {result.message}
      </div>
    );
  }

  function SpinnerIcon() {
    return (
      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-neutral-200">Google Calendar &amp; Tasks Sync</h2>
        {isConnected && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        )}
      </div>

      <p className="text-xs text-neutral-500 mb-4">
        Sync your planner tasks to Google Tasks &amp; Calendar, or push study sessions as timed calendar events.
      </p>

      {isConnected ? (
        <div className="space-y-3">
          {lastSyncedAt && (
            <p className="text-[11px] text-neutral-600">
              Last synced: {formatSyncTime(lastSyncedAt)}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <button
                id="btn-sync-tasks"
                onClick={handleSyncTasks}
                disabled={syncingTasks || syncingSessions}
                className="w-full px-4 py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8" }}
              >
                {syncingTasks ? (
                  <><SpinnerIcon /> Syncing tasks…</>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Sync Tasks
                  </>
                )}
              </button>
              <SyncResultBanner result={tasksResult} />
              <p className="text-[10px] text-neutral-700 leading-relaxed">Pushes planner tasks to Google Tasks list &amp; Calendar</p>
            </div>

            <div className="space-y-2">
              <button
                id="btn-sync-sessions"
                onClick={handleSyncSessions}
                disabled={syncingTasks || syncingSessions}
                className="w-full px-4 py-2.5 rounded-lg text-xs font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}
              >
                {syncingSessions ? (
                  <><SpinnerIcon /> Syncing…</>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Sync Sessions
                  </>
                )}
              </button>
              <SyncResultBanner result={sessionsResult} />
              <p className="text-[10px] text-neutral-700 leading-relaxed">Pushes study sessions as timed Calendar events</p>
            </div>
          </div>

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

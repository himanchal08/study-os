"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { startSession, stopSession } from "./actions";
import type { Tables } from "@/types/database";

interface GlobalTimerProps {
  userId: string;
  activeSession: Tables<"study_sessions"> | null;
  subjects: Array<{ id: string; name: string; color: string | null }>;
}

export function GlobalTimer({ userId, activeSession, subjects }: GlobalTimerProps) {
  const [session, setSession] = useState(activeSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedSubject, setSelectedSubject] = useState<string>(activeSession?.subject_id ?? "");
  const [notes, setNotes] = useState<string>(activeSession?.notes ?? "");

  const [sessionStartMs, setSessionStartMs] = useState<number | null>(() => {
    if (!activeSession?.start_timestamp) return null;
    const ms = new Date(activeSession.start_timestamp).getTime();
    return Math.min(ms, Date.now());
  });

  const [pausedAtMs, setPausedAtMs] = useState<number | null>(null);
  const [totalPauseSec, setTotalPauseSec] = useState(0);

  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunning = !!session;
  const isPaused = pausedAtMs !== null;

  useEffect(() => {
    if (!isRunning || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused]);

  const nowMs = new Date().getTime();
  const netElapsed = sessionStartMs !== null
    ? Math.max(0, Math.floor((nowMs - sessionStartMs) / 1000) - totalPauseSec)
    : 0;

  const handleStart = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await startSession({ 
      userId,
      subjectId: selectedSubject || null,
      notes: notes.trim() || null
    });
    if ("error" in result && result.error) {
      setError(result.error);
    } else if ("session" in result && result.session) {
      setSession(result.session);
      setSessionStartMs(Date.now());
      setTotalPauseSec(0);
      setPausedAtMs(null);
    }
    setLoading(false);
  }, [userId, selectedSubject, notes]);

  const handleStop = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    const additionalPause = isPaused && pausedAtMs
      ? Math.floor((new Date().getTime() - pausedAtMs) / 1000)
      : 0;
    const finalPauseSec = totalPauseSec + additionalPause;

    const result = await stopSession({
      sessionId: session.id,
      userId,
      pauseDurationSeconds: finalPauseSec,
    });
    
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      setSession(null);
      setSessionStartMs(null);
      setTotalPauseSec(0);
      setPausedAtMs(null);
      setNotes("");
    }
    setLoading(false);
  }, [session, userId, isPaused, pausedAtMs, totalPauseSec]);

  return (
    <div 
      className="h-14 border-b shrink-0 flex items-center justify-between px-6 transition-all"
      style={{ 
        background: isRunning ? "rgba(232,232,240,0.02)" : "var(--surface)",
        borderColor: "var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 40
      }}
      role="region"
      aria-label="Global study timer"
    >
      <div className="flex items-center gap-4 flex-1">
        <input 
          type="text" 
          placeholder="What are you working on?" 
          className="bg-transparent border-none outline-none text-sm w-full max-w-sm text-neutral-200 placeholder:text-neutral-500"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isRunning || loading}
        />

        <div className="h-4 w-px bg-neutral-800 mx-2" />

        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          {isRunning ? (
            <span className="text-xs text-neutral-300">
              {subjects.find(s => s.id === selectedSubject)?.name || "No Subject"}
            </span>
          ) : (
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={isRunning || loading}
              className="text-xs bg-transparent text-neutral-300 outline-none hover:text-neutral-200 cursor-pointer appearance-none pr-4"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right center',
                backgroundSize: '12px'
              }}
            >
              <option value="" className="bg-neutral-900 text-neutral-400">No Subject</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id} className="bg-neutral-900 text-white">{s.name}</option>
              ))}
            </select>
          )}
        </div>
        
        {error && (
          <span className="text-xs text-rose-400 ml-4 truncate">{error}</span>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div 
          className="text-xl font-mono font-semibold tabular-nums tracking-tight transition-colors"
          style={{ 
            color: isRunning ? "#ededed" : "rgba(226,226,240,0.25)"
          }}
        >
          {formatElapsed(netElapsed)}
        </div>

        {isRunning ? (
          <button
            onClick={handleStop}
            disabled={loading}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ background: "#ef4444" }}
            aria-label="Stop Timer"
          >
            <div className="w-3 h-3 bg-white rounded-sm" />
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 pl-0.5"
            style={{ background: "#d946ef" }} // Toggl-like pinkish purple
            aria-label="Start Timer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [
    h,
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ].join(":");
}

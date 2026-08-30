"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { startSession, stopSession } from "./actions";
import { formatDuration } from "@/lib/calculations";
import type { Tables } from "@/types/database";

interface StudyTimerProps {
  userId: string;
  activeSession: Tables<"study_sessions"> | null;
}

export function StudyTimer({ userId, activeSession }: StudyTimerProps) {
  const [session, setSession] = useState(activeSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionStartMs, setSessionStartMs] = useState<number | null>(
    activeSession?.start_timestamp
      ? new Date(activeSession.start_timestamp).getTime()
      : null
  );

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
  const netElapsed =
    sessionStartMs !== null
      ? Math.max(0, Math.floor((nowMs - sessionStartMs) / 1000) - totalPauseSec)
      : 0;

  const handleStart = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await startSession({ userId });
    if ("error" in result && result.error) {
      setError(result.error);
    } else if ("session" in result && result.session) {
      const startMs = new Date(result.session.start_timestamp).getTime();
      setSession(result.session);
      setSessionStartMs(startMs);
      setTotalPauseSec(0);
      setPausedAtMs(null);
    }
    setLoading(false);
  }, [userId]);

  const handlePause = useCallback(() => {
    if (isPaused) {
      const pausedMs = pausedAtMs ?? new Date().getTime();
      const addedPause = Math.floor((new Date().getTime() - pausedMs) / 1000);
      setTotalPauseSec((prev) => prev + addedPause);
      setPausedAtMs(null);
    } else {
      setPausedAtMs(new Date().getTime());
    }
  }, [isPaused, pausedAtMs]);

  const handleStop = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    const additionalPause =
      isPaused && pausedAtMs
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
    }
    setLoading(false);
  }, [session, userId, isPaused, pausedAtMs, totalPauseSec]);

  return (
    <div
      className="glass rounded-2xl p-6 relative overflow-hidden"
      role="region"
      aria-label="Study timer"
    >
      {isRunning && !isPaused && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />
      )}

      <div className="relative">
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-4"
          style={{ color: "rgba(226,226,240,0.4)" }}
        >
          Study Timer
        </h2>

        <div className="text-center py-6">
          <div
            className="text-7xl font-mono font-bold tabular-nums tracking-tight transition-all"
            style={{
              color: isRunning
                ? isPaused
                  ? "#f59e0b"
                  : "#ededed"
                : "rgba(226,226,240,0.25)",
              fontFamily: "var(--font-mono)",
            }}
            aria-live="polite"
            aria-label={`${formatDuration(netElapsed)} elapsed`}
          >
            {formatElapsed(netElapsed)}
          </div>

          {isPaused && (
            <p
              className="text-xs mt-2 animate-pulse-glow inline-block px-3 py-1 rounded-full"
              style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}
            >
              Paused
            </p>
          )}

          {isRunning && !isPaused && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <span
                className="w-2 h-2 rounded-full bg-green-400 animate-pulse"
                aria-hidden="true"
              />
              <span className="text-xs" style={{ color: "#86efac" }}>
                Recording
              </span>
            </div>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="text-xs mb-4 px-3 py-2 rounded-lg text-center"
            style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-center gap-3 flex-wrap">
          {!isRunning ? (
            <button
              id="start-session-btn"
              onClick={handleStart}
              disabled={loading}
              className="btn-premium px-8 py-3 text-base"
            >
              {loading ? "Starting..." : "▶ Start Study"}
            </button>
          ) : (
            <>
              <button
                id="pause-session-btn"
                onClick={handlePause}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl font-medium text-sm transition-all hover:opacity-80"
                style={{
                  background: "rgba(245,158,11,0.12)",
                  color: "#fbbf24",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}
              >
                {isPaused ? "▶ Resume" : "⏸ Pause"}
              </button>
              <button
                id="stop-session-btn"
                onClick={handleStop}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl font-medium text-sm transition-all hover:opacity-80"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  color: "#fca5a5",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                {loading ? "Stopping..." : "⏹ Stop"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ].join(":");
}

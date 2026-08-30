"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { startSession, stopSession } from "./actions";
import { formatDuration } from "@/lib/calculations";
import type { Tables } from "@/types/database";

interface StudyTimerProps {
  userId: string;
  activeSession: Tables<"study_sessions"> | null;
}

/**
 * StudyTimer — wall-clock-based elapsed display.
 *
 * Architecture to satisfy React Compiler lint rules:
 *  - No setState inside useEffect (rule: react-hooks/set-state-in-effect)
 *  - No ref.current reads during render (rule: react-hooks/refs)
 *
 * Pattern:
 *  - sessionStartMs + pausedAtMs + totalPauseSeconds are normal state.
 *  - setInterval bumps `tick` (just a counter) to trigger re-renders.
 *  - elapsed is computed at render time from state values only (no refs).
 */
export function StudyTimer({ userId, activeSession }: StudyTimerProps) {
  const [session, setSession] = useState(activeSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wall-clock anchor — set when session starts, never changes mid-session
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(
    activeSession?.start_timestamp
      ? new Date(activeSession.start_timestamp).getTime()
      : null
  );

  // Pause state — both stored as state so they can be read during render
  const [pausedAtMs, setPausedAtMs] = useState<number | null>(null);
  const [totalPauseSec, setTotalPauseSec] = useState(0);

  // Tick counter — setInterval bumps this to trigger re-renders (only touches state inside interval)
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunning = !!session;
  const isPaused = pausedAtMs !== null;

  // Start/stop the 1-second ticker interval
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

  // Compute elapsed from pure state values (no ref reads during render)
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
      // Resume — accumulate pause duration into state
      const pausedMs = pausedAtMs ?? new Date().getTime();
      const addedPause = Math.floor((new Date().getTime() - pausedMs) / 1000);
      setTotalPauseSec((prev) => prev + addedPause);
      setPausedAtMs(null);
    } else {
      // Pause — record pause start time
      setPausedAtMs(new Date().getTime());
    }
  }, [isPaused, pausedAtMs]);

  const handleStop = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    // Compute final pause seconds (include current pause if still paused)
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
      {/* Ambient glow when running */}
      {isRunning && !isPaused && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)",
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

        {/* Timer display */}
        <div className="text-center py-6">
          <div
            className="text-7xl font-mono font-bold tabular-nums tracking-tight transition-all"
            style={{
              color: isRunning
                ? isPaused
                  ? "#f59e0b"
                  : "#818cf8"
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

        {/* Error */}
        {error && (
          <p
            role="alert"
            className="text-xs mb-4 px-3 py-2 rounded-lg text-center"
            style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}
          >
            {error}
          </p>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {!isRunning ? (
            <button
              id="start-session-btn"
              onClick={handleStart}
              disabled={loading}
              className="px-8 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(99,102,241,0.35)",
              }}
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

/** Format seconds as HH:MM:SS */
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

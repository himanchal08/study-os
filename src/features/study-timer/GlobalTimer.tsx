"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { startSession, stopSession } from "./actions";
import type { Tables } from "@/types/database";

interface GlobalTimerProps {
  userId: string;
  activeSession: Tables<"study_sessions"> | null;
  subjects: Array<{ id: string; name: string; color: string | null }>;
  topics: Array<{ id: string; name: string; subject_id: string }>;
}

// A fake session used for optimistic UI while DB call is in flight
function makeOptimisticSession(opts: {
  subjectId: string;
  topicId: string;
  activityType: Tables<"study_sessions">["activity_type"];
  notes: string;
}): Tables<"study_sessions"> {
  return {
    id: "__optimistic__",
    user_id: "",
    start_timestamp: new Date().toISOString(),
    end_timestamp: null,
    pause_duration_seconds: 0,
    subject_id: opts.subjectId || null,
    topic_id: opts.topicId || null,
    activity_type: opts.activityType,
    notes: opts.notes || null,
    chapter_id: null,
    task_id: null,
    client_generated_id: null,
    source_client: "web",
    created_at: new Date().toISOString(),
    deleted_at: null,
  } as unknown as Tables<"study_sessions">;
}

export function GlobalTimer({ userId, activeSession, subjects, topics }: GlobalTimerProps) {
  const [session, setSession] = useState(activeSession);
  const [error, setError] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState<string>(activeSession?.subject_id ?? "");
  const [selectedTopic, setSelectedTopic] = useState<string>(activeSession?.topic_id ?? "");
  const [activityType, setActivityType] = useState<Tables<"study_sessions">["activity_type"]>(
    activeSession?.activity_type ?? "practice"
  );
  const [notes, setNotes] = useState<string>(activeSession?.notes ?? "");

  // Sync with server-side session on mount / re-render
  useEffect(() => {
    setSession(activeSession);
    setSelectedSubject(activeSession?.subject_id ?? "");
    setSelectedTopic(activeSession?.topic_id ?? "");
    setActivityType(activeSession?.activity_type ?? "practice");
    setNotes(activeSession?.notes ?? "");
  }, [activeSession]);

  const filteredTopics = topics.filter(t => t.subject_id === selectedSubject);

  // ── Timer tick ──────────────────────────────────────────────────────────────
  const segmentStartMonoRef = useRef<number | null>(null);
  const [accumulatedSec, setAccumulatedSec] = useState<number>(() => {
    if (!activeSession?.start_timestamp) return 0;
    const sessionMs = new Date(activeSession.start_timestamp).getTime();
    return Math.max(0, Math.floor((Date.now() - sessionMs) / 1000) - (activeSession.pause_duration_seconds ?? 0));
  });
  const [pausedAtMs, setPausedAtMs] = useState<number | null>(null);
  const [totalPauseSec, setTotalPauseSec] = useState(activeSession?.pause_duration_seconds ?? 0);
  const [displayedSec, setDisplayedSec] = useState(accumulatedSec);
  const rafRef = useRef<number | null>(null);

  const isRunning = !!session;
  const isPaused = pausedAtMs !== null;

  useEffect(() => {
    if (isRunning && !isPaused) {
      segmentStartMonoRef.current = performance.now();

      const tick = () => {
        if (segmentStartMonoRef.current === null) return;
        const monoElapsed = (performance.now() - segmentStartMonoRef.current) / 1000;
        setDisplayedSec(Math.floor(accumulatedSec + monoElapsed));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      segmentStartMonoRef.current = null;
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isPaused]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    setError(null);
    // 1. Optimistic update — show timer running immediately
    const optimistic = makeOptimisticSession({
      subjectId: selectedSubject,
      topicId: selectedTopic,
      activityType,
      notes,
    });
    setSession(optimistic);
    setAccumulatedSec(0);
    setDisplayedSec(0);
    setTotalPauseSec(0);
    setPausedAtMs(null);

    // 2. Fire DB call in background
    startSession({
      userId,
      subjectId: selectedSubject || null,
      topicId: selectedTopic || null,
      activityType,
      notes: notes.trim() || null,
    }).then(result => {
      if ("error" in result && result.error) {
        // Roll back
        setError(result.error);
        setSession(null);
        setAccumulatedSec(0);
        setDisplayedSec(0);
      } else if ("session" in result && result.session) {
        // Swap optimistic with real session
        setSession(result.session);
      }
    });
  }, [userId, selectedSubject, selectedTopic, notes, activityType]);

  const handlePauseToggle = useCallback(() => {
    if (isPaused) {
      setPausedAtMs(null);
    } else {
      setAccumulatedSec(displayedSec);
      setPausedAtMs(Date.now());
    }
  }, [isPaused, displayedSec]);

  const handleStop = useCallback(() => {
    if (!session) return;
    setError(null);

    // 1. Optimistic update — hide timer immediately
    const sessionId = session.id;
    let finalPauseSec = totalPauseSec;
    if (isPaused && pausedAtMs !== null) {
      finalPauseSec += Math.floor((Date.now() - pausedAtMs) / 1000);
    }
    const finalNotes = notes.trim();

    setSession(null);
    setAccumulatedSec(0);
    setDisplayedSec(0);
    setTotalPauseSec(0);
    setPausedAtMs(null);
    setNotes("");
    setSelectedTopic("");

    // 2. Fire DB call in background (skip optimistic sessions)
    if (sessionId !== "__optimistic__") {
      stopSession({
        sessionId,
        userId,
        pauseDurationSeconds: finalPauseSec,
        notes: finalNotes || undefined,
      }).then(result => {
        if ("error" in result && result.error) {
          setError(result.error);
        }
      });
    }
  }, [session, userId, isPaused, pausedAtMs, totalPauseSec, notes]);

  return (
    <div
      id="global-timer-card"
      className="h-14 border-b shrink-0 flex items-center justify-between px-4 md:px-6 transition-all"
      style={{
        background: isRunning ? "rgba(232,232,240,0.02)" : "var(--surface)",
        borderColor: isRunning ? "rgba(139,92,246,0.2)" : "var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
      role="region"
      aria-label="Global study timer"
    >
      {/* Left: description + pickers */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <input
          type="text"
          placeholder="What are you working on?"
          className="bg-transparent border-none outline-none text-sm min-w-0 text-neutral-200 placeholder:text-neutral-500"
          style={{ width: isRunning ? "auto" : "100%", maxWidth: "280px" }}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !isRunning) handleStart(); }}
        />

        <div className="h-4 w-px bg-neutral-800 hidden sm:block shrink-0" />

        {/* Subject picker */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          {isRunning ? (
            <span className="text-xs text-neutral-300">
              {subjects.find(s => s.id === selectedSubject)?.name || "No Subject"}
            </span>
          ) : (
            <select
              value={selectedSubject}
              onChange={e => { setSelectedSubject(e.target.value); setSelectedTopic(""); }}
              className="text-xs bg-transparent text-neutral-300 outline-none cursor-pointer appearance-none"
            >
              <option value="" className="bg-neutral-900 text-neutral-400">No Subject</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id} className="bg-neutral-900 text-white">{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Topic picker */}
        {selectedSubject && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <div className="h-4 w-px bg-neutral-800" />
            {isRunning ? (
              <span className="text-xs text-neutral-500">
                {topics.find(t => t.id === selectedTopic)?.name || "—"}
              </span>
            ) : (
              <select
                value={selectedTopic}
                onChange={e => setSelectedTopic(e.target.value)}
                className="text-xs bg-transparent text-neutral-500 outline-none cursor-pointer appearance-none"
              >
                <option value="" className="bg-neutral-900 text-neutral-500">No Topic</option>
                {filteredTopics.map(t => (
                  <option key={t.id} value={t.id} className="bg-neutral-900 text-white">{t.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Activity type */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <div className="h-4 w-px bg-neutral-800" />
          {isRunning ? (
            <span className="text-xs text-neutral-400 capitalize">{activityType}</span>
          ) : (
            <select
              value={activityType}
              onChange={e => setActivityType(e.target.value as Tables<"study_sessions">["activity_type"])}
              className="text-xs bg-transparent text-neutral-400 outline-none cursor-pointer appearance-none"
            >
              <option value="practice" className="bg-neutral-900 text-white">Practice</option>
              <option value="lecture" className="bg-neutral-900 text-white">Lecture</option>
              <option value="revision" className="bg-neutral-900 text-white">Revision</option>
              <option value="mock" className="bg-neutral-900 text-white">Mock</option>
              <option value="reading" className="bg-neutral-900 text-white">Reading</option>
              <option value="other" className="bg-neutral-900 text-white">Other</option>
            </select>
          )}
        </div>

        {error && (
          <span className="text-xs text-rose-400 ml-2 truncate hidden sm:block">{error}</span>
        )}
      </div>

      {/* Right: timer display + controls */}
      <div className="flex items-center gap-4 shrink-0">
        <div
          className="text-xl font-mono font-semibold tabular-nums tracking-tight transition-colors"
          style={{ color: isRunning ? "#ededed" : "rgba(226,226,240,0.2)" }}
        >
          {formatElapsed(displayedSec)}
        </div>

        {isRunning ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePauseToggle}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-neutral-700 bg-transparent text-neutral-300"
              aria-label={isPaused ? "Resume Timer" : "Pause Timer"}
            >
              {isPaused ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              ) : (
                <div className="flex gap-1">
                  <div className="w-1 h-3.5 bg-current rounded-sm" />
                  <div className="w-1 h-3.5 bg-current rounded-sm" />
                </div>
              )}
            </button>
            <button
              onClick={handleStop}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{ background: "#ef4444" }}
              aria-label="Stop Timer"
            >
              <div className="w-3 h-3 bg-white rounded-sm" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleStart}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 pl-0.5"
            style={{ background: "#d946ef" }}
            aria-label="Start Timer"
            id="timer-play-btn"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

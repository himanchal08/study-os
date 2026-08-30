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

export function GlobalTimer({ userId, activeSession, subjects, topics }: GlobalTimerProps) {
  const [session, setSession] = useState(activeSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedSubject, setSelectedSubject] = useState<string>(activeSession?.subject_id ?? "");
  const [selectedTopic, setSelectedTopic] = useState<string>(activeSession?.topic_id ?? "");
  const [activityType, setActivityType] = useState<Tables<"study_sessions">["activity_type"]>(
    activeSession?.activity_type ?? "practice"
  );
  
  const [notes, setNotes] = useState<string>(activeSession?.notes ?? "");

  // Topics filtered by selected subject — cascading dropdown
  const filteredTopics = topics.filter(t => t.subject_id === selectedSubject);

  // Wall-clock ms when the current running segment started (not the session start timestamp).
  // This is reset on every resume so we can accumulate clean elapsed time.
  const segmentStartMonoRef = useRef<number | null>(null);
  const segmentStartWallRef = useRef<number | null>(null);

  // Elapsed seconds at the end of the PREVIOUS running segment (before the last pause).
  const [accumulatedSec, setAccumulatedSec] = useState<number>(() => {
    if (!activeSession?.start_timestamp) return 0;
    const sessionMs = new Date(activeSession.start_timestamp).getTime();
    const elapsed = Math.max(0, Math.floor((Date.now() - sessionMs) / 1000) - (activeSession.pause_duration_seconds ?? 0));
    return elapsed;
  });

  const [pausedAtMs, setPausedAtMs] = useState<number | null>(null);
  const [totalPauseSec, setTotalPauseSec] = useState(activeSession?.pause_duration_seconds ?? 0);

  // Displayed elapsed seconds — derived purely from monotonic clock to prevent drift.
  const [displayedSec, setDisplayedSec] = useState(accumulatedSec);
  const rafRef = useRef<number | null>(null);

  const isRunning = !!session;
  const isPaused = pausedAtMs !== null;

  // Sync state to localStorage for the browser extension
  useEffect(() => {
    try {
      localStorage.setItem("study_os_timer_state", JSON.stringify({
        isRunning,
        isPaused,
        session_id: session?.id || null
      }));
    } catch {
      // ignore
    }
  }, [isRunning, isPaused, session?.id]);

  // Start the segment monotonic reference when we begin running.
  useEffect(() => {
    if (isRunning && !isPaused) {
      segmentStartMonoRef.current = performance.now();
      segmentStartWallRef.current = Date.now();

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

  const netElapsed = displayedSec;

  const handleStart = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await startSession({ 
      userId,
      subjectId: selectedSubject || null,
      topicId: selectedTopic || null,
      activityType: activityType,
      notes: notes.trim() || null
    });
    if ("error" in result && result.error) {
      setError(result.error);
    } else if ("session" in result && result.session) {
      setSession(result.session);
      setAccumulatedSec(0);
      setDisplayedSec(0);
      setTotalPauseSec(0);
      setPausedAtMs(null);
    }
    setLoading(false);
  }, [userId, selectedSubject, selectedTopic, notes, activityType]);

  const handlePauseToggle = useCallback(() => {
    if (isPaused) {
      // Resume: snapshot how many seconds we had at pause and start a fresh monotonic segment
      setPausedAtMs(null);
      // accumulatedSec is already frozen at the value when we paused
    } else {
      // Pause: freeze accumulatedSec at the current displayed value
      setAccumulatedSec(displayedSec);
      setPausedAtMs(Date.now());
    }
  }, [isPaused, displayedSec]);

  const handleStop = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    // Total pause seconds = however long was accumulated while paused
    // We track this via totalPauseSec which we update on each resume.
    let finalPauseSec = totalPauseSec;
    if (isPaused && pausedAtMs !== null) {
      finalPauseSec += Math.floor((Date.now() - pausedAtMs) / 1000);
    }

    const result = await stopSession({
      sessionId: session.id,
      userId,
      pauseDurationSeconds: finalPauseSec,
    });
    
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      setSession(null);
      setAccumulatedSec(0);
      setDisplayedSec(0);
      setTotalPauseSec(0);
      setPausedAtMs(null);
      setNotes("");
      setSelectedTopic("");
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

        {/* Subject picker */}
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500 shrink-0">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          {isRunning ? (
            <span className="text-xs text-neutral-300">
              {subjects.find(s => s.id === selectedSubject)?.name || "No Subject"}
            </span>
          ) : (
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedTopic(""); // reset topic on subject change
              }}
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

        {/* Topic picker — cascades from selected subject */}
        {(selectedSubject || session?.topic_id) && (
          <>
            <div className="h-4 w-px bg-neutral-800" />
            <div className="flex items-center gap-2">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600 shrink-0">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
              {isRunning ? (
                <span className="text-xs text-neutral-400">
                  {topics.find(t => t.id === session?.topic_id)?.name || "No Topic"}
                </span>
              ) : (
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  disabled={isRunning || loading}
                  className="text-xs bg-transparent text-neutral-500 outline-none hover:text-neutral-300 cursor-pointer appearance-none pr-4"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23525252' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right center',
                    backgroundSize: '12px'
                  }}
                >
                  <option value="" className="bg-neutral-900 text-neutral-500">No Topic</option>
                  {filteredTopics.map(t => (
                    <option key={t.id} value={t.id} className="bg-neutral-900 text-white">{t.name}</option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}

        <div className="h-4 w-px bg-neutral-800 mx-2" />

        <div className="flex items-center gap-2">
          {isRunning ? (
            <span className="text-xs text-neutral-300 capitalize">
              {activityType}
            </span>
          ) : (
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as Tables<"study_sessions">["activity_type"])}
              disabled={isRunning || loading}
              className="text-xs bg-transparent text-neutral-300 outline-none hover:text-neutral-200 cursor-pointer appearance-none pr-4"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right center',
                backgroundSize: '12px'
              }}
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
          <div className="flex items-center gap-2">
            <button
              onClick={handlePauseToggle}
              disabled={loading}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-neutral-700 bg-transparent text-neutral-300"
              aria-label={isPaused ? "Resume Timer" : "Pause Timer"}
            >
              {isPaused ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              disabled={loading}
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

"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { startSession, stopSession } from "./actions";
import { logQuestionBatch } from "@/app/(dashboard)/questions/actions";
import type { Tables } from "@/types/database";
import { SubjectOptions } from "@/components/ui/SubjectOptions";

// Defined at module scope so it’s not recreated on every render
type PostLog = {
  subjectId:    string | null;
  subjectName:  string;
  topicId:      string | null;
  topicName:    string;
  activityType: string;
  durationSecs: number;
};

interface GlobalTimerProps {
  userId: string;
  activeSession: Tables<"study_sessions"> | null;
  subjects: Array<{ id: string; name: string; color: string | null; exam_type?: string | null }>;
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

  // Post-session quick-log: populated when practice/mock ends, cleared on dismiss
  const [postLog, setPostLog] = useState<PostLog | null>(null);
  const [postAttempted, setPostAttempted] = useState("");
  const [postCorrect, setPostCorrect] = useState("");
  const [postSource, setPostSource] = useState("");
  const [postPending, startPostTransition] = useTransition();
  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccess, setPostSuccess] = useState(false);
  const postSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel the auto-close timer on unmount to avoid setState on unmounted component
  useEffect(() => {
    return () => {
      if (postSuccessTimerRef.current !== null) clearTimeout(postSuccessTimerRef.current);
    };
  }, []);

  // Sync with server-side session on mount / re-render
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(activeSession);
    setSelectedSubject(activeSession?.subject_id ?? "");
    setSelectedTopic(activeSession?.topic_id ?? "");
    setActivityType(activeSession?.activity_type ?? "practice");
    setNotes(activeSession?.notes ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

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
  // Mirror accumulatedSec in a ref so the rAF tick always reads the latest value
  // without triggering effect restarts (fixes stale-closure timer drift after pause/resume).
  const accumulatedSecRef = useRef(accumulatedSec);
  // Sync the ref in an effect so we never write .current during render
  // (satisfies react-hooks/refs). The rAF tick only reads this after the
  // effect has fired, which is before the next animation frame.
  useEffect(() => {
    accumulatedSecRef.current = accumulatedSec;
  }, [accumulatedSec]);

  const isRunning = !!session;
  const isPaused = pausedAtMs !== null;

  useEffect(() => {
    if (isRunning && !isPaused) {
      segmentStartMonoRef.current = performance.now();

      const tick = () => {
        if (segmentStartMonoRef.current === null) return;
        const monoElapsed = (performance.now() - segmentStartMonoRef.current) / 1000;
        setDisplayedSec(Math.floor(accumulatedSecRef.current + monoElapsed));
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
        // Roll back — but only if the user hasn't already manually stopped
        // (handleStop sets session=null; don't re-open a dead session)
        setError(result.error);
        setSession(prev => prev?.id === "__optimistic__" ? null : prev);
        setAccumulatedSec(0);
        setDisplayedSec(0);
      } else if ("session" in result && result.session) {
        // Functional update: only swap if user hasn’t already stopped the timer
        // (stopped state = session is null). Prevents zombie open session in DB.
        setSession(prev => prev === null ? null : result.session);
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

    // Compute elapsed from timestamps — avoids stale displayedSec in closure.
    const elapsedSecs = sessionId === "__optimistic__"
      ? 0
      : Math.max(0, (Date.now() - new Date(session.start_timestamp).getTime()) / 1000 - totalPauseSec);

    let finalPauseSec = totalPauseSec;
    if (isPaused && pausedAtMs !== null) {
      finalPauseSec += Math.floor((Date.now() - pausedAtMs) / 1000);
    }
    const finalNotes = notes.trim();

    // Capture metadata BEFORE resetting state for the post-session form
    const capturedSubjectId   = session.subject_id ?? null;
    const capturedTopicId     = (session.topic_id ?? selectedTopic) || null;
    const capturedActivityType = session.activity_type ?? activityType;
    const capturedSubjectName = subjects.find(s => s.id === capturedSubjectId)?.name ?? "";
    const capturedTopicName   = topics.find(t => t.id === capturedTopicId)?.name ?? "";

    setSession(null);
    setAccumulatedSec(0);
    setDisplayedSec(0);
    setTotalPauseSec(0);
    setPausedAtMs(null);
    setNotes("");
    setSelectedTopic("");

    // Skip the DB write for very short or still-optimistic sessions.
    // Avoids spurious revision entries from accidental start taps.
    if (sessionId === "__optimistic__" || elapsedSecs < 30) return;

    // Show quick-log form for practice and mock sessions
    if (capturedActivityType === "practice" || capturedActivityType === "mock") {
      setPostLog({
        subjectId:    capturedSubjectId,
        subjectName:  capturedSubjectName,
        topicId:      capturedTopicId,
        topicName:    capturedTopicName,
        activityType: capturedActivityType,
        durationSecs: Math.round(elapsedSecs),
      });
      setPostAttempted("");
      setPostCorrect("");
      setPostSource("");
      setPostError(null);
      setPostSuccess(false);
    }

    // 2. Fire DB call in background
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
  }, [session, userId, isPaused, pausedAtMs, totalPauseSec, notes, activityType, selectedTopic, subjects, topics]);

  const handlePostSubmit = useCallback(() => {
    if (!postLog) return;
    const attempted = Number(postAttempted);
    const correct   = Number(postCorrect || 0);
    if (!attempted || attempted <= 0) {
      setPostError("Attempted must be at least 1.");
      return;
    }
    if (correct > attempted) {
      setPostError("Correct cannot exceed attempted.");
      return;
    }
    setPostError(null);
    startPostTransition(async () => {
      const fd = new FormData();
      fd.set("attempted", String(attempted));
      fd.set("correct",   String(correct));
      fd.set("wrong",     String(Math.max(0, attempted - correct)));
      fd.set("skipped",   "0");
      if (postLog.subjectId) fd.set("subject_id", postLog.subjectId);
      if (postLog.topicId)   fd.set("topic_id",   postLog.topicId);
      if (postSource.trim()) fd.set("source",     postSource.trim());
      fd.set("duration_minutes", String(Math.round(postLog.durationSecs / 60)));
      const res = await logQuestionBatch(null, fd);
      if (res && "error" in res) {
        setPostError(res.error ?? "Failed to log.");
      } else {
        setPostSuccess(true);
        // Auto-close after 1.5 s — cancel on unmount via postSuccessTimerRef
        if (postSuccessTimerRef.current !== null) clearTimeout(postSuccessTimerRef.current);
        postSuccessTimerRef.current = setTimeout(() => setPostLog(null), 1500);
      }
    });
  }, [postLog, postAttempted, postCorrect, postSource, startPostTransition]);

  return (
    <>
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
      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
        <input
          type="text"
          placeholder="What are you working on?"
          className="bg-transparent border-none outline-none text-sm min-w-0 text-neutral-200 placeholder:text-neutral-500 flex-1"
          style={{ maxWidth: isRunning ? "160px" : "100%" }}
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
              <SubjectOptions subjects={subjects} />
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

    {/* ── Post-session quick-log overlay ─────────────────────────── */}
    {postLog && (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        onClick={e => { if (e.target === e.currentTarget) setPostLog(null); }}
      >
        <div
          className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4"
          style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
          role="dialog"
          aria-label="Log questions from this session"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: postLog.activityType === "mock" ? "#a78bfa" : "#34d399" }}>
                {postLog.activityType === "mock" ? "🏆 Mock Ended" : "✅ Practice Ended"}
              </p>
              <h3 className="text-sm font-semibold text-neutral-100 mt-0.5">
                Log your questions
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {[postLog.subjectName, postLog.topicName].filter(Boolean).join(" · ")}
                {" · "}{Math.round(postLog.durationSecs / 60)}m session
              </p>
            </div>
            <button
              onClick={() => setPostLog(null)}
              className="text-neutral-600 hover:text-neutral-300 transition-colors text-lg leading-none mt-0.5"
              aria-label="Skip logging"
            >
              ×
            </button>
          </div>

          {postSuccess ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-1">✅</p>
              <p className="text-sm font-medium text-neutral-300">Questions logged!</p>
              <button
                onClick={() => setPostLog(null)}
                className="mt-3 text-xs text-neutral-500 hover:text-neutral-300"
              >Close</button>
            </div>
          ) : (
            <>
              {/* Attempted + Correct */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-neutral-500 block mb-1">Attempted *</label>
                  <input
                    id="post-log-attempted"
                    type="number"
                    min="1"
                    autoFocus
                    value={postAttempted}
                    onChange={e => setPostAttempted(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") document.getElementById("post-log-correct")?.focus(); }}
                    placeholder="e.g. 30"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#ededed" }}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-neutral-500 block mb-1">Correct *</label>
                  <input
                    id="post-log-correct"
                    type="number"
                    min="0"
                    value={postCorrect}
                    onChange={e => setPostCorrect(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handlePostSubmit(); }}
                    placeholder="e.g. 22"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#ededed" }}
                  />
                </div>
              </div>

              {/* Source (optional) */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-neutral-500 block mb-1">
                  {postLog.activityType === "mock" ? "Mock Name (optional)" : "Source / Book (optional)"}
                </label>
                <input
                  type="text"
                  value={postSource}
                  onChange={e => setPostSource(e.target.value)}
                  placeholder={postLog.activityType === "mock" ? "e.g. SBI PO Mock 12" : "e.g. Arun Sharma Chapter 4"}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#ededed" }}
                />
              </div>

              {/* Pre-filled info strip */}
              <div className="flex items-center gap-3 text-[10px] text-neutral-600">
                <span>⏱ {Math.round(postLog.durationSecs / 60)}m</span>
                {postLog.subjectName && <span>📚 {postLog.subjectName}</span>}
                {postLog.topicName   && <span>📌 {postLog.topicName}</span>}
              </div>

              {postError && (
                <p className="text-xs text-red-400">{postError}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handlePostSubmit}
                  disabled={postPending || !postAttempted}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: postLog.activityType === "mock" ? "rgba(167,139,250,0.15)" : "rgba(52,211,153,0.15)", color: postLog.activityType === "mock" ? "#a78bfa" : "#34d399", border: `1px solid ${postLog.activityType === "mock" ? "rgba(167,139,250,0.3)" : "rgba(52,211,153,0.3)"}` }}
                >
                  {postPending ? "Saving…" : "Log Questions"}
                </button>
                <button
                  onClick={() => setPostLog(null)}
                  className="px-4 py-2.5 rounded-xl text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Skip
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}
    </>
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

"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { startSession, stopSession } from "./actions";
import { logQuestionBatch } from "@/app/(dashboard)/questions/actions";
import { logMock } from "@/app/(dashboard)/mocks/actions";
import type { Tables } from "@/types/database";
import { SubjectOptions } from "@/components/ui/SubjectOptions";

type PostLog = {
  subjectId:    string | null;
  subjectName:  string;
  topicId:      string | null;
  topicName:    string;
  activityType: string;
  durationSecs: number;
  todayStr:     string;
};

interface GlobalTimerProps {
  userId: string;
  activeSession: Tables<"study_sessions"> | null;
  subjects: Array<{ id: string; name: string; color: string | null; exam_type?: string | null }>;
  topics: Array<{ id: string; name: string; subject_id: string }>;
}

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

function getTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

  // post-session log state
  const [postLog, setPostLog] = useState<PostLog | null>(null);

  // Shared fields
  const [postAttempted, setPostAttempted] = useState("");
  const [postCorrect,   setPostCorrect]   = useState("");
  const [postWrong,     setPostWrong]     = useState("");
  const [postSkipped,   setPostSkipped]   = useState("");
  const [postSource,    setPostSource]    = useState("");
  const [postNotes,     setPostNotes]     = useState("");

  // Mock-only fields
  const [postMockName,            setPostMockName]            = useState("");
  const [postScore,               setPostScore]               = useState("");
  const [postMaxMarks,            setPostMaxMarks]            = useState("200");
  const [postExamType,            setPostExamType]            = useState<"banking" | "ssc" | "other">("banking");
  const [postStage,               setPostStage]               = useState("");
  const [postPercentile,          setPostPercentile]          = useState("");
  const [postRank,                setPostRank]                = useState("");
  const [postRecommendedDuration, setPostRecommendedDuration] = useState("");

  const [postPending, startPostTransition] = useTransition();
  const [postError,   setPostError]        = useState<string | null>(null);
  const [postSuccess, setPostSuccess]      = useState(false);

  // Tracks if we need to show the form once the optimistic session resolves
  const pendingPostLogRef = useRef<PostLog | null>(null);

  const correctInputRef  = useRef<HTMLInputElement>(null);
  const wrongInputRef    = useRef<HTMLInputElement>(null);
  const skippedInputRef  = useRef<HTMLInputElement>(null);

  const [prevSessionId, setPrevSessionId] = useState(activeSession?.id);
  if (activeSession?.id !== prevSessionId) {
    setPrevSessionId(activeSession?.id);
    setSession(activeSession);
    setSelectedSubject(activeSession?.subject_id ?? "");
    setSelectedTopic(activeSession?.topic_id ?? "");
    setActivityType(activeSession?.activity_type ?? "practice");
    setNotes(activeSession?.notes ?? "");
    setPostLog(null);
  }

  const filteredTopics = topics.filter(t => t.subject_id === selectedSubject);

  // ── Listen for prefill events fired by session history rows ──────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      if (session) return; // timer is running — don't clobber
      const { subjectId, topicId, activityType: at, notes: n } =
        (e as CustomEvent<{ subjectId: string; topicId: string; activityType: string; notes: string }>).detail;
      if (subjectId) setSelectedSubject(subjectId);
      if (topicId)   setSelectedTopic(topicId);
      if (at)        setActivityType(at as Tables<"study_sessions">["activity_type"]);
      setNotes(n ?? "");
    };
    window.addEventListener("timer:prefill", handler);
    return () => window.removeEventListener("timer:prefill", handler);
  }, [session]);

  const segmentStartMonoRef = useRef<number | null>(null);
  const [accumulatedSec, setAccumulatedSec] = useState<number>(() => {
    if (!activeSession?.start_timestamp) return 0;
    const sessionMs = new Date(activeSession.start_timestamp).getTime();
    return Math.max(0, Math.floor((Date.now() - sessionMs) / 1000));
  });
  const [displayedSec, setDisplayedSec] = useState(accumulatedSec);
  const rafRef = useRef<number | null>(null);
  const accumulatedSecRef = useRef(accumulatedSec);
  useEffect(() => {
    accumulatedSecRef.current = accumulatedSec;
  }, [accumulatedSec]);

  const isRunning = !!session;

  useEffect(() => {
    if (isRunning) {
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
  }, [isRunning]);

  const openPostLog = useCallback((log: PostLog) => {
    setPostLog(log);
    setPostAttempted("");
    setPostCorrect("");
    setPostWrong("");
    setPostSkipped("");
    setPostSource("");
    setPostNotes("");
    setPostMockName("");
    setPostScore("");
    setPostMaxMarks("200");
    setPostExamType("banking");
    setPostStage("");
    setPostPercentile("");
    setPostRank("");
    setPostRecommendedDuration("");
    setPostError(null);
    setPostSuccess(false);
  }, []);

  const handleStart = useCallback(() => {
    setError(null);
    const optimistic = makeOptimisticSession({
      subjectId: selectedSubject,
      topicId: selectedTopic,
      activityType,
      notes,
    });
    setSession(optimistic);
    setAccumulatedSec(0);
    setDisplayedSec(0);

    startSession({
      userId,
      subjectId: selectedSubject || null,
      topicId: selectedTopic || null,
      activityType,
      notes: notes.trim() || null,
    }).then(result => {
      if ("error" in result && result.error) {
        setError(result.error);
        setSession(prev => {
          if (prev?.id === "__optimistic__") {
            setAccumulatedSec(0);
            setDisplayedSec(0);
            return null;
          }
          return prev;
        });
      } else if ("session" in result && result.session) {
        setSession(prev => {
          if (prev === null) return null;
          const updated = result.session;
          // If there was a pending post-log queued while optimistic, show it now
          if (pendingPostLogRef.current) {
            const pending = pendingPostLogRef.current;
            pendingPostLogRef.current = null;
            openPostLog(pending);
          }
          return updated;
        });
      }
    });
  }, [userId, selectedSubject, selectedTopic, notes, activityType, openPostLog]);

  const handleStop = useCallback(() => {
    if (!session) return;
    setError(null);

    // ← Capture the exact click moment BEFORE any async work
    const clickedAtMs = Date.now();
    const clickedAtIso = new Date(clickedAtMs).toISOString();

    const sessionId = session.id;

    const elapsedSecs = sessionId === "__optimistic__"
      ? displayedSec
      : Math.max(0, (clickedAtMs - new Date(session.start_timestamp).getTime()) / 1000);

    const finalNotes = notes.trim();

    const capturedSubjectId    = session.subject_id ?? null;
    const capturedTopicId      = (session.topic_id ?? selectedTopic) || null;
    const capturedActivityType = session.activity_type ?? activityType;
    const capturedSubjectName  = subjects.find(s => s.id === capturedSubjectId)?.name ?? "";
    const capturedTopicName    = topics.find(t => t.id === capturedTopicId)?.name ?? "";

    setSession(null);
    setAccumulatedSec(0);
    setDisplayedSec(0);
    setNotes("");
    setSelectedTopic("");

    if (elapsedSecs < 30) return;

    if (capturedActivityType === "practice" || capturedActivityType === "mock") {
      const logData: PostLog = {
        subjectId:    capturedSubjectId,
        subjectName:  capturedSubjectName,
        topicId:      capturedTopicId,
        topicName:    capturedTopicName,
        activityType: capturedActivityType,
        durationSecs: Math.round(elapsedSecs),
        todayStr:     getTodayStr(),
      };

      if (sessionId === "__optimistic__") {
        pendingPostLogRef.current = logData;
      } else {
        openPostLog(logData);
      }
    }

    if (sessionId === "__optimistic__") return;

    stopSession({
      sessionId,
      userId,
      pauseDurationSeconds: 0,
      notes: finalNotes || undefined,
      endTimestamp: clickedAtIso,
    }).then(result => {
      if ("error" in result && result.error) {
        setError(result.error);
      }
    });
  }, [session, userId, notes, activityType, selectedTopic, subjects, topics, displayedSec, openPostLog]);

  // Practice submit
  const handlePracticeSubmit = useCallback(() => {
    if (!postLog) return;
    const attempted = Number(postAttempted);
    const correct   = Number(postCorrect   || 0);
    const wrong     = Number(postWrong     || 0);
    const skipped   = Math.max(0, attempted - correct - wrong);

    if (!attempted || attempted <= 0) {
      setPostError("Attempted must be at least 1.");
      return;
    }
    if (!postSource.trim()) {
      setPostError("Source / Book is required.");
      return;
    }
    if (correct > attempted) {
      setPostError("Correct cannot exceed attempted.");
      return;
    }
    if (correct + wrong > attempted) {
      setPostError("Correct + wrong cannot exceed attempted.");
      return;
    }

    setPostError(null);
    startPostTransition(async () => {
      const fd = new FormData();
      fd.set("attempted",        String(attempted));
      fd.set("correct",          String(correct));
      fd.set("wrong",            String(wrong));
      fd.set("skipped",          String(skipped));
      fd.set("source",           postSource.trim());
      if (postLog.subjectId) fd.set("subject_id", postLog.subjectId);
      if (postLog.topicId)   fd.set("topic_id",   postLog.topicId);
      fd.set("duration_minutes", String(Math.round(postLog.durationSecs / 60)));
      if (postNotes.trim()) fd.set("notes", postNotes.trim());

      const res = await logQuestionBatch(null, fd);
      if (res && "error" in res) {
        setPostError(res.error ?? "Failed to log.");
      } else {
        setPostSuccess(true);
      }
    });
  }, [postLog, postAttempted, postCorrect, postWrong, postSource, postNotes]);

  // Mock submit
  const handleMockSubmit = useCallback(() => {
    if (!postLog) return;
    const mockName  = postMockName.trim();
    const source    = postSource.trim();
    const attempted = Number(postAttempted);
    const correct   = Number(postCorrect   || 0);
    const wrong     = Number(postWrong     || 0);
    const skipped   = Number(postSkipped   || 0);
    const score     = Number(postScore     || 0);
    const maxMarks  = Number(postMaxMarks  || 200);

    if (!mockName) {
      setPostError("Mock name is required.");
      return;
    }
    if (!source) {
      setPostError("Platform / Source is required.");
      return;
    }
    if (!postScore) {
      setPostError("Score is required.");
      return;
    }
    if (!attempted || attempted <= 0) {
      setPostError("Attempted must be at least 1.");
      return;
    }

    setPostError(null);
    startPostTransition(async () => {
      const fd = new FormData();
      fd.set("name",                     mockName);
      fd.set("source",                   source);
      fd.set("exam_type",                postExamType);
      fd.set("mock_date",                postLog.todayStr);
      fd.set("score",                    String(score));
      fd.set("maximum_marks",            String(maxMarks));
      fd.set("attempted",                String(attempted));
      fd.set("correct",                  String(correct));
      fd.set("wrong",                    String(wrong));
      fd.set("unattempted",              String(skipped));
      fd.set("actual_duration_minutes",  String(Math.round(postLog.durationSecs / 60)));
      if (postStage.trim())               fd.set("stage",                         postStage.trim());
      if (postPercentile.trim())          fd.set("percentile",                    postPercentile.trim());
      if (postRank.trim())                fd.set("rank",                          postRank.trim());
      if (postRecommendedDuration.trim()) fd.set("recommended_duration_minutes",  postRecommendedDuration.trim());
      if (postNotes.trim())               fd.set("notes",                         postNotes.trim());

      const res = await logMock(null, fd);
      if (res && "error" in res) {
        setPostError(res.error ?? "Failed to log.");
      } else {
        setPostSuccess(true);
      }
    });
  }, [
    postLog, postMockName, postSource, postExamType, postScore, postMaxMarks,
    postAttempted, postCorrect, postWrong, postSkipped,
    postStage, postPercentile, postRank, postRecommendedDuration, postNotes,
  ]);

  const isMock = postLog?.activityType === "mock";

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
      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
        <input
          id="timer-notes-input"
          type="text"
          placeholder="What are you working on?"
          className="bg-transparent border-none outline-none text-sm min-w-0 text-neutral-200 placeholder:text-neutral-500 flex-1"
          style={{ maxWidth: isRunning ? "160px" : "100%" }}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !isRunning) handleStart(); }}
        />

        <div className="h-4 w-px bg-neutral-800 hidden sm:block shrink-0" />

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
              <option value="lecture"  className="bg-neutral-900 text-white">Lecture</option>
              <option value="revision" className="bg-neutral-900 text-white">Revision</option>
              <option value="mock"     className="bg-neutral-900 text-white">Mock</option>
              <option value="reading"  className="bg-neutral-900 text-white">Reading</option>
              <option value="other"    className="bg-neutral-900 text-white">Other</option>
            </select>
          )}
        </div>

        {error && (
          <span className="text-xs text-rose-400 ml-2 truncate hidden sm:block">{error}</span>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div
          className="text-xl font-mono font-semibold tabular-nums tracking-tight transition-colors"
          style={{ color: isRunning ? "#ededed" : "rgba(226,226,240,0.2)" }}
        >
          {formatElapsed(displayedSec)}
        </div>

        {isRunning ? (
          <button
            onClick={handleStop}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ background: "#ef4444" }}
            aria-label="Stop Timer"
          >
            <div className="w-3 h-3 bg-white rounded-sm" />
          </button>
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

    {/* Post-session log modal */}
    {postLog && (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      >
        <div
          className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden"
          style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90dvh", display: "flex", flexDirection: "column" }}
          role="dialog"
          aria-label={`Log ${isMock ? "mock" : "practice"} session`}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: isMock ? "#a78bfa" : "#34d399" }}>
                {isMock ? "🏆 Mock Ended" : "✅ Practice Ended"}
              </p>
              <h3 className="text-sm font-semibold text-neutral-100 mt-0.5">
                Log your {isMock ? "mock test" : "questions"}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {[postLog.subjectName, postLog.topicName].filter(Boolean).join(" · ")}
                {" · "}{Math.round(postLog.durationSecs / 60)}m session
              </p>
            </div>
            <button
              onClick={() => setPostLog(null)}
              className="text-neutral-600 hover:text-neutral-300 transition-colors text-xl leading-none mt-0.5 ml-4"
              aria-label="Skip logging"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 pb-5 space-y-3 flex-1">
            {postSuccess ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">{isMock ? "🏆" : "✅"}</p>
                <p className="text-sm font-medium text-neutral-200">
                  {isMock ? "Mock logged!" : "Questions logged!"}
                </p>
                <p className="text-xs text-neutral-500 mt-1">Great work — keep it up.</p>
                <button
                  onClick={() => setPostLog(null)}
                  className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={{ background: isMock ? "rgba(167,139,250,0.15)" : "rgba(52,211,153,0.15)", color: isMock ? "#a78bfa" : "#34d399", border: `1px solid ${isMock ? "rgba(167,139,250,0.3)" : "rgba(52,211,153,0.3)"}` }}
                >
                  Close
                </button>
              </div>
            ) : isMock ? (
              <MockFields
                postLog={postLog}
                mockName={postMockName}       setMockName={setPostMockName}
                source={postSource}           setSource={setPostSource}
                examType={postExamType}       setExamType={setPostExamType}
                stage={postStage}             setStage={setPostStage}
                score={postScore}             setScore={setPostScore}
                maxMarks={postMaxMarks}       setMaxMarks={setPostMaxMarks}
                attempted={postAttempted}     setAttempted={setPostAttempted}
                correct={postCorrect}         setCorrect={setPostCorrect}
                wrong={postWrong}             setWrong={setPostWrong}
                skipped={postSkipped}         setSkipped={setPostSkipped}
                percentile={postPercentile}   setPercentile={setPostPercentile}
                rank={postRank}               setRank={setPostRank}
                recommendedDuration={postRecommendedDuration} setRecommendedDuration={setPostRecommendedDuration}
                postNotes={postNotes}         setPostNotes={setPostNotes}
              />
            ) : (
              <PracticeFields
                postLog={postLog}
                attempted={postAttempted}   setAttempted={setPostAttempted}
                correct={postCorrect}       setCorrect={setPostCorrect}
                wrong={postWrong}           setWrong={setPostWrong}
                source={postSource}         setSource={setPostSource}
                postNotes={postNotes}       setPostNotes={setPostNotes}
                correctInputRef={correctInputRef}
                wrongInputRef={wrongInputRef}
                skippedInputRef={skippedInputRef}
              />
            )}

            {postError && (
              <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "#1a0808", border: "1px solid #3f1515", color: "#f87171" }}>
                {postError}
              </p>
            )}

            {!postSuccess && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={isMock ? handleMockSubmit : handlePracticeSubmit}
                  disabled={postPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
                  style={{
                    background: isMock ? "rgba(167,139,250,0.15)" : "rgba(52,211,153,0.15)",
                    color:      isMock ? "#a78bfa"                 : "#34d399",
                    border:     `1px solid ${isMock ? "rgba(167,139,250,0.3)" : "rgba(52,211,153,0.3)"}`,
                  }}
                >
                  {postPending ? "Saving…" : isMock ? "Log Mock" : "Log Questions"}
                </button>
                <button
                  onClick={() => setPostLog(null)}
                  className="px-4 py-2.5 rounded-xl text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Skip
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ─── Practice sub-form ────────────────────────────────────────────────────────

interface PracticeFieldsProps {
  postLog: PostLog;
  attempted: string;   setAttempted: (v: string) => void;
  correct: string;     setCorrect:   (v: string) => void;
  wrong: string;       setWrong:     (v: string) => void;
  source: string;      setSource:    (v: string) => void;
  postNotes: string;   setPostNotes: (v: string) => void;
  correctInputRef:  React.RefObject<HTMLInputElement | null>;
  wrongInputRef:    React.RefObject<HTMLInputElement | null>;
  skippedInputRef:  React.RefObject<HTMLInputElement | null>;
}

function PracticeFields({
  postLog,
  attempted, setAttempted,
  correct,   setCorrect,
  wrong,     setWrong,
  source,    setSource,
  postNotes, setPostNotes,
  correctInputRef, wrongInputRef,
}: PracticeFieldsProps) {
  const attemptedNum = Number(attempted) || 0;
  const correctNum   = Number(correct)   || 0;
  const wrongNum     = Number(wrong)     || 0;
  const skipped      = Math.max(0, attemptedNum - correctNum - wrongNum);
  const accuracy     = attemptedNum > 0 ? Math.round((correctNum / attemptedNum) * 100) : null;
  const accColor     = accuracy == null ? "#525252" : accuracy >= 80 ? "#10b981" : accuracy >= 60 ? "#f59e0b" : "#ef4444";

  const inp  = "w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-1 focus:ring-white/20 placeholder:text-neutral-600 transition-all";
  const inpS = { background: "#111", border: "1px solid #1e1e1e", color: "#ededed" };
  const lbl  = "text-[10px] uppercase tracking-wider text-neutral-500 block mb-1";

  return (
    <>
      {/* Auto-filled read-only info */}
      <div className="grid grid-cols-2 gap-2">
        <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <span className="text-neutral-600 block text-[10px] uppercase tracking-wider mb-0.5">Duration</span>
          <span className="text-neutral-300 font-mono">{Math.round(postLog.durationSecs / 60)} min</span>
        </div>
        {postLog.subjectName && (
          <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <span className="text-neutral-600 block text-[10px] uppercase tracking-wider mb-0.5">Subject</span>
            <span className="text-neutral-300 truncate block">{postLog.subjectName}</span>
          </div>
        )}
      </div>

      {/* Q counts */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { label: "Attempted *", val: attempted, set: setAttempted, color: "#ededed",  autoFocus: true,  nextRef: correctInputRef },
          { label: "Correct",     val: correct,   set: setCorrect,   color: "#10b981",  autoFocus: false, nextRef: wrongInputRef   },
          { label: "Wrong",       val: wrong,     set: setWrong,     color: "#ef4444",  autoFocus: false, nextRef: null            },
        ] as const).map(({ label, val, set, color, autoFocus, nextRef }) => (
          <div key={label} className="rounded-xl p-3 flex flex-col items-center gap-1" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "rgba(226,226,240,0.4)" }}>
              {label}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus={autoFocus}
              ref={nextRef === correctInputRef ? undefined : nextRef === wrongInputRef ? correctInputRef : undefined}
              value={val}
              onChange={e => set(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && nextRef) nextRef.current?.focus(); }}
              placeholder="0"
              className="w-full text-center text-lg font-bold tabular-nums bg-transparent outline-none"
              style={{ color }}
            />
          </div>
        ))}
      </div>

      {/* Derived skipped + accuracy bar */}
      {attemptedNum > 0 && (
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${accuracy ?? 0}%`, background: accColor }} />
          </div>
          <div className="flex justify-between text-[10px]" style={{ color: accColor }}>
            <span>{accuracy ?? 0}% accuracy</span>
            <span>{skipped} skipped</span>
          </div>
        </div>
      )}

      {/* Source — required */}
      <div>
        <label className={lbl}>Source / Book *</label>
        <input
          ref={wrongInputRef}
          type="text"
          value={source}
          onChange={e => setSource(e.target.value)}
          placeholder="e.g. Arun Sharma Chapter 4, Testbook Set 7…"
          className={inp}
          style={inpS}
        />
      </div>

      {/* Notes */}
      <div>
        <label className={lbl}>Notes (optional)</label>
        <input
          type="text"
          value={postNotes}
          onChange={e => setPostNotes(e.target.value)}
          placeholder="Anything to remember?"
          className={inp}
          style={inpS}
        />
      </div>
    </>
  );
}

// ─── Mock sub-form ────────────────────────────────────────────────────────────

interface MockFieldsProps {
  postLog: PostLog;
  mockName: string;              setMockName:              (v: string) => void;
  source: string;                setSource:                (v: string) => void;
  examType: "banking"|"ssc"|"other"; setExamType:          (v: "banking"|"ssc"|"other") => void;
  stage: string;                 setStage:                 (v: string) => void;
  score: string;                 setScore:                 (v: string) => void;
  maxMarks: string;              setMaxMarks:              (v: string) => void;
  attempted: string;             setAttempted:             (v: string) => void;
  correct: string;               setCorrect:               (v: string) => void;
  wrong: string;                 setWrong:                 (v: string) => void;
  skipped: string;               setSkipped:               (v: string) => void;
  percentile: string;            setPercentile:            (v: string) => void;
  rank: string;                  setRank:                  (v: string) => void;
  recommendedDuration: string;   setRecommendedDuration:   (v: string) => void;
  postNotes: string;             setPostNotes:             (v: string) => void;
}

function MockFields({
  postLog,
  mockName, setMockName,
  source, setSource,
  examType, setExamType,
  stage, setStage,
  score, setScore,
  maxMarks, setMaxMarks,
  attempted, setAttempted,
  correct, setCorrect,
  wrong, setWrong,
  skipped, setSkipped,
  percentile, setPercentile,
  rank, setRank,
  recommendedDuration, setRecommendedDuration,
  postNotes, setPostNotes,
}: MockFieldsProps) {
  const inp  = "w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-white/20 placeholder:text-neutral-600 transition-all";
  const inpS = { background: "#111", border: "1px solid #1e1e1e", color: "#ededed" };
  const lbl  = "text-[10px] uppercase tracking-wider text-neutral-500 block mb-1";
  const selS = { ...inpS, appearance: "none" as const };

  const durationMin = Math.round(postLog.durationSecs / 60);

  return (
    <>
      {/* Auto-filled read-only info */}
      <div className="grid grid-cols-3 gap-2">
        <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <span className="text-neutral-600 block text-[10px] uppercase tracking-wider mb-0.5">Duration</span>
          <span className="text-neutral-300 font-mono">{durationMin} min</span>
        </div>
        <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
          <span className="text-neutral-600 block text-[10px] uppercase tracking-wider mb-0.5">Date</span>
          <span className="text-neutral-300">{postLog.todayStr}</span>
        </div>
        {postLog.subjectName && (
          <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <span className="text-neutral-600 block text-[10px] uppercase tracking-wider mb-0.5">Subject</span>
            <span className="text-neutral-300 truncate block">{postLog.subjectName}</span>
          </div>
        )}
      </div>

      {/* Mock name */}
      <div>
        <label className={lbl}>Mock Name *</label>
        <input
          type="text"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={mockName}
          onChange={e => setMockName(e.target.value)}
          placeholder="e.g. SBI PO Pre Mock 12"
          className={inp}
          style={inpS}
        />
      </div>

      {/* Source + Exam Type */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>Platform / Source *</label>
          <input
            type="text"
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="Oliveboard, Testbook…"
            className={inp}
            style={inpS}
          />
        </div>
        <div>
          <label className={lbl}>Exam Type</label>
          <select
            value={examType}
            onChange={e => setExamType(e.target.value as "banking" | "ssc" | "other")}
            className={inp}
            style={selS}
          >
            <option value="banking">Banking</option>
            <option value="ssc">SSC CGL</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Stage */}
      <div>
        <label className={lbl}>Stage (optional)</label>
        <input
          type="text"
          value={stage}
          onChange={e => setStage(e.target.value)}
          placeholder="Pre / Mains / Tier 1…"
          className={inp}
          style={inpS}
        />
      </div>

      {/* Score + Max Marks */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>Score *</label>
          <input
            type="number"
            step="0.25"
            value={score}
            onChange={e => setScore(e.target.value)}
            placeholder="e.g. 142.5"
            className={inp}
            style={inpS}
          />
        </div>
        <div>
          <label className={lbl}>Max Marks</label>
          <input
            type="number"
            value={maxMarks}
            onChange={e => setMaxMarks(e.target.value)}
            placeholder="200"
            className={inp}
            style={inpS}
          />
        </div>
      </div>

      {/* Q counts */}
      <div className="grid grid-cols-4 gap-2">
        {([
          { label: "Attempted *", val: attempted, set: setAttempted },
          { label: "Correct",     val: correct,   set: setCorrect   },
          { label: "Wrong",       val: wrong,      set: setWrong    },
          { label: "Skipped",     val: skipped,    set: setSkipped  },
        ] as const).map(({ label, val, set }) => (
          <div key={label} className="rounded-xl p-2.5 flex flex-col items-center gap-1" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-center leading-tight" style={{ color: "rgba(226,226,240,0.4)" }}>
              {label}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={val}
              onChange={e => set(e.target.value)}
              placeholder="0"
              className="w-full text-center text-base font-bold tabular-nums bg-transparent outline-none text-neutral-200"
            />
          </div>
        ))}
      </div>

      {/* Recommended duration + percentile + rank */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={lbl}>Rec. Duration (min)</label>
          <input
            type="number"
            value={recommendedDuration}
            onChange={e => setRecommendedDuration(e.target.value)}
            placeholder={String(durationMin)}
            className={inp}
            style={inpS}
          />
        </div>
        <div>
          <label className={lbl}>Percentile</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={percentile}
            onChange={e => setPercentile(e.target.value)}
            placeholder="optional"
            className={inp}
            style={inpS}
          />
        </div>
        <div>
          <label className={lbl}>Rank</label>
          <input
            type="number"
            value={rank}
            onChange={e => setRank(e.target.value)}
            placeholder="optional"
            className={inp}
            style={inpS}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={lbl}>Notes (optional)</label>
        <textarea
          rows={2}
          value={postNotes}
          onChange={e => setPostNotes(e.target.value)}
          placeholder="What went wrong? What to improve?"
          className={inp + " resize-none"}
          style={inpS}
        />
      </div>
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

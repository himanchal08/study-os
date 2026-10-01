"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { skipRevision, deleteWeeklyRevisionWithFollowup } from "@/app/(dashboard)/revisions/actions";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SessionInfo {
  id: string;
  notes: string | null;
  activity_type: string | null;
  subject_id: string | null;
  topic_id: string | null;
  subjects: { name: string; color: string | null } | null;
  topics: { name: string } | null;
}

interface RevisionInfo {
  id: string;
  due_date: string;
  cycle_type: "daily" | "weekly" | "monthly";
  skip_count: number | null;
  topics: {
    name: string;
    subject_id: string;
    subjects: { name: string; color: string | null } | null;
  } | null;
}

interface NotificationData {
  todaySessions: SessionInfo[];
  weekSessions: SessionInfo[];
  dueRevisions: RevisionInfo[];
  todayStr: string;
  dayOfWeek: number; // 0=Sun
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getTopSubjectFromSessions(sessions: SessionInfo[]): {
  subjectName: string;
  subjectColor: string;
  topicNames: string[];
} | null {
  const counts = new Map<
    string,
    { name: string; color: string; topicNames: Set<string>; count: number }
  >();

  for (const s of sessions) {
    if (!s.subjects?.name) continue;
    const key = s.subject_id ?? s.subjects.name;
    if (!counts.has(key)) {
      counts.set(key, {
        name: s.subjects.name,
        color: s.subjects.color ?? "#818cf8",
        topicNames: new Set(),
        count: 0,
      });
    }
    const entry = counts.get(key)!;
    entry.count++;
    if (s.topics?.name) entry.topicNames.add(s.topics.name);
  }

  if (counts.size === 0) return null;

  const top = [...counts.values()].sort((a, b) => b.count - a.count)[0];
  return {
    subjectName: top.name,
    subjectColor: top.color,
    topicNames: [...top.topicNames],
  };
}

function getSessionHeadings(sessions: SessionInfo[]): string[] {
  const seen = new Set<string>();
  return sessions
    .map((s) => s.notes?.trim())
    .filter((n): n is string => !!n && !seen.has(n) && !!seen.add(n))
    .slice(0, 3);
}

function sortRevisionsByRelevance(
  revisions: RevisionInfo[],
  topSubjectName: string | null
): RevisionInfo[] {
  return [...revisions].sort((a, b) => {
    const aMatch = a.topics?.subjects?.name === topSubjectName ? 1 : 0;
    const bMatch = b.topics?.subjects?.name === topSubjectName ? 1 : 0;
    return bMatch - aMatch;
  });
}

// ─── Weekly Popup ──────────────────────────────────────────────────────────────

function WeeklyDeletePopup({
  revision,
  onConfirm,
  onCancel,
}: {
  revision: RevisionInfo;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const topicName = revision.topics?.name ?? "this topic";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: "#111", border: "1px solid #a78bfa40" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: "#a78bfa18" }}
          >
            📚
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-100">
              This will only take 1 minute!
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Weekly revision for{" "}
              <span className="text-a78bfa font-medium text-purple-300">{topicName}</span>
            </p>
          </div>
        </div>

        <p className="text-xs text-neutral-400">
          Deleting this weekly revision will schedule the next one for{" "}
          <span className="text-neutral-300 font-medium">next Saturday</span>. Consider doing
          it now — it only takes a minute.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 transition-all hover:bg-white/5"
            style={{ border: "1px solid #2a2a2a" }}
          >
            Keep it
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
            style={{ background: "#ef444418", color: "#ef4444", border: "1px solid #ef444430" }}
          >
            Delete anyway
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Revision Row ──────────────────────────────────────────────────────────────

function RevisionRow({
  rev,
  isWeekly,
  onSkipped,
  onWeeklyDelete,
}: {
  rev: RevisionInfo;
  isWeekly: boolean;
  onSkipped: (escalated: boolean) => void;
  onWeeklyDelete: (rev: RevisionInfo) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const color = rev.topics?.subjects?.color ?? "#818cf8";
  const subjectName = rev.topics?.subjects?.name;
  const skipCount = rev.skip_count ?? 0;

  const handleSkip = () => {
    startTransition(async () => {
      const res = await skipRevision(rev.id);
      if (res && "escalated" in res) {
        onSkipped(res.escalated ?? false);
      }
    });
  };

  return (
    <div
      className="flex items-center gap-3 py-2 px-3 rounded-lg"
      style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5"
        style={{ background: color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-neutral-200 truncate">
          {rev.topics?.name ?? "Unknown topic"}
        </p>
        {subjectName && (
          <p className="text-[10px] truncate" style={{ color }}>
            {subjectName}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {skipCount > 0 && (
          <span className="text-[9px] text-orange-400 px-1.5 py-0.5 rounded" style={{ background: "#f59e0b18" }}>
            {skipCount}× skipped
          </span>
        )}
        {isWeekly ? (
          <button
            onClick={() => onWeeklyDelete(rev)}
            disabled={isPending}
            className="text-[10px] px-2 py-1 rounded text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
          >
            Delete
          </button>
        ) : (
          <button
            onClick={handleSkip}
            disabled={isPending}
            className="text-[10px] px-2 py-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-all disabled:opacity-40"
            title={skipCount >= 2 ? "3rd skip → moves to weekly" : "Skip to tomorrow"}
          >
            {isPending ? "…" : skipCount >= 2 ? "Skip (→ weekly)" : "Skip"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Banner ───────────────────────────────────────────────────────────────

const DISMISSED_KEY = "revision-banner-dismissed";

export function RevisionNotificationBanner() {
  const pathname = usePathname();
  const [data, setData] = useState<NotificationData | null>(null);
  const [dismissed, setDismissed] = useState(true); // start hidden until we check time
  const [weeklyDeleteTarget, setWeeklyDeleteTarget] = useState<RevisionInfo | null>(null);
  const [isPending, startTransition] = useTransition();
  const [escalatedMsg, setEscalatedMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/revision-notification");
      if (!res.ok) return;
      const json: NotificationData = await res.json();
      setData(json);

      const now = new Date();
      const hour = now.getHours();
      const isAfter8pm = hour >= 20;
      const isSunday = now.getDay() === 0;

      // Check if already dismissed today
      const dismissedStr = sessionStorage.getItem(DISMISSED_KEY);
      const alreadyDismissed = dismissedStr === json.todayStr;

      if (!alreadyDismissed && (isAfter8pm || isSunday) && json.dueRevisions.length > 0) {
        setDismissed(false);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDismiss = () => {
    if (data) sessionStorage.setItem(DISMISSED_KEY, data.todayStr);
    setDismissed(true);
  };

  const handleSkipped = (escalated: boolean) => {
    if (escalated) {
      setEscalatedMsg("Moved to weekly revision (next Sunday)");
      setTimeout(() => setEscalatedMsg(null), 4000);
    }
    fetchData();
  };

  const handleWeeklyDeleteConfirm = () => {
    if (!weeklyDeleteTarget) return;
    const revId = weeklyDeleteTarget.id;
    setWeeklyDeleteTarget(null);
    startTransition(async () => {
      await deleteWeeklyRevisionWithFollowup(revId);
      fetchData();
    });
  };

  // Don't show the notification banner on the revisions page itself
  if (pathname === "/revisions") return null;

  if (dismissed || !data) return null;

  const now = new Date();
  const isAfter8pm = now.getHours() >= 20;
  const isSunday = now.getDay() === 0;

  // Which sessions to base recommendation on
  const sessions = isSunday ? data.weekSessions : data.todaySessions;
  const topSubject = getTopSubjectFromSessions(sessions);
  const headings = getSessionHeadings(data.todaySessions);

  // Filter revisions by type for this banner
  const relevantRevisions = isSunday
    ? data.dueRevisions // show all on Sunday (weekly banner)
    : data.dueRevisions.filter((r) => r.cycle_type === "daily" || r.cycle_type !== "weekly");

  const weeklyRevisions = data.dueRevisions.filter((r) => r.cycle_type === "weekly");
  const sortedRevisions = sortRevisionsByRelevance(
    isSunday ? weeklyRevisions : relevantRevisions,
    topSubject?.subjectName ?? null
  );

  if (sortedRevisions.length === 0) return null;

  const bannerColor = isSunday ? "#a78bfa" : "#38bdf8";
  const bannerBg = isSunday ? "#a78bfa12" : "#38bdf812";
  const bannerBorder = isSunday ? "#a78bfa30" : "#38bdf830";
  const bannerIcon = isSunday ? "📅" : "🔔";
  const bannerTitle = isSunday
    ? "Weekly Revision — Sunday Check-in"
    : isAfter8pm
    ? "Evening Revision Reminder"
    : "Revision Due";

  const bannerSubtitle = isSunday
    ? `You studied ${sessions.length} session${sessions.length !== 1 ? "s" : ""} this week. Review what you covered.`
    : headings.length > 0
    ? `Based on today's sessions: ${headings.join(", ")}`
    : `You have ${sortedRevisions.length} revision${sortedRevisions.length !== 1 ? "s" : ""} due.`;

  return (
    <>
      {weeklyDeleteTarget && (
        <WeeklyDeletePopup
          revision={weeklyDeleteTarget}
          onConfirm={handleWeeklyDeleteConfirm}
          onCancel={() => setWeeklyDeleteTarget(null)}
        />
      )}

      <div
        className="mx-4 mt-3 rounded-2xl overflow-hidden animate-fade-in"
        style={{ border: `1px solid ${bannerBorder}`, background: bannerBg }}
        role="alert"
        aria-label="Revision notification"
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-lg shrink-0">{bannerIcon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: bannerColor }}>
                {bannerTitle}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">{bannerSubtitle}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-neutral-600 hover:text-neutral-400 transition-colors shrink-0 mt-0.5"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Recommended subject strip */}
        {topSubject && (
          <div
            className="px-4 pb-2 flex items-center gap-2"
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: topSubject.subjectColor }}
            />
            <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: topSubject.subjectColor }}>
              {isSunday ? "Week focus" : "Today's focus"}: {topSubject.subjectName}
              {topSubject.topicNames.length > 0 && ` · ${topSubject.topicNames.slice(0, 2).join(", ")}`}
            </p>
          </div>
        )}

        {/* Revisions list */}
        <div className="px-4 pb-3 space-y-1.5 max-h-48 overflow-y-auto">
          {escalatedMsg && (
            <p className="text-[10px] text-orange-400 py-1">⬆ {escalatedMsg}</p>
          )}
          {sortedRevisions.slice(0, 5).map((rev) => (
            <RevisionRow
              key={rev.id}
              rev={rev}
              isWeekly={rev.cycle_type === "weekly"}
              onSkipped={handleSkipped}
              onWeeklyDelete={(r) => setWeeklyDeleteTarget(r)}
            />
          ))}
          {sortedRevisions.length > 5 && (
            <p className="text-[10px] text-neutral-600 text-center pt-1">
              +{sortedRevisions.length - 5} more on the revisions page
            </p>
          )}
        </div>

        {/* Footer CTA */}
        <div
          className="px-4 py-2.5 flex items-center justify-between"
          style={{ borderTop: `1px solid ${bannerBorder}` }}
        >
          <button
            onClick={handleDismiss}
            className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            Remind me later
          </button>
          <Link
            href="/revisions"
            onClick={handleDismiss}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: `${bannerColor}18`, color: bannerColor, border: `1px solid ${bannerColor}30` }}
          >
            Go to Revisions →
          </Link>
        </div>
      </div>
    </>
  );
}

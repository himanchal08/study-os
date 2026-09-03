"use client";

import { useState, useMemo } from "react";
import { TopicLifecycleBadges } from "@/features/performance/TopicLifecycleBadges";


interface Subject {
  id: string;
  name: string;
  color: string | null;
  exam_type: string;
}

interface Chapter {
  id: string;
  name: string;
  subject_id: string;
  sort_order: number;
}

interface Topic {
  id: string;
  name: string;
  status: string;
  subject_id: string;
  chapter_id: string | null;
}

interface Lifecycle {
  topic_id: string;
  learning_completed_at: string | null;
  book_practice_done: boolean;
  dpp_done: boolean;
  pyq_done: boolean;
  tests_attempted_count: number;
  revision_count: number;
  confidence_level: number | null;
}

interface PracticeStats {
  attempted: number;
  correct: number;
}

interface Props {
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  lifecycles: Lifecycle[];
  practiceMap: Record<string, PracticeStats>;
  topicExamRecord: Record<string, string[]>;
}


const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  not_started: { label: "Not started", color: "#71717a", bg: "#71717a18" },
  learning:    { label: "Learning",    color: "#38bdf8", bg: "#38bdf818" },
  learned:     { label: "Learned",     color: "#10b981", bg: "#10b98118" },
  revising:    { label: "Revising",    color: "#f59e0b", bg: "#f59e0b18" },
  strong:      { label: "Strong",      color: "#34d399", bg: "#34d39918" },
  weak:        { label: "Weak",        color: "#ef4444", bg: "#ef444418" },
};

function pctColor(n: number) {
  if (n >= 80) return "#34d399";
  if (n >= 60) return "#f59e0b";
  return "#ef4444";
}

const EXAM_TABS = [
  { key: "banking", label: "Banking", icon: "🏦", color: "#38bdf8", bg: "#38bdf815" },
  { key: "ssc",    label: "SSC CGL", icon: "📋", color: "#a78bfa", bg: "#a78bfa15" },
] as const;

type ExamTab = "banking" | "ssc";


function lifecycleProgress(lc: Lifecycle | undefined): number {
  if (!lc) return 0;
  let done = 0;
  if (lc.learning_completed_at) done++;
  if (lc.book_practice_done) done++;
  if (lc.dpp_done) done++;
  if (lc.pyq_done) done++;
  return done; 
}


export function LifecyclePanel({ subjects, chapters, topics, lifecycles, practiceMap, topicExamRecord }: Props) {
  const [activeTab, setActiveTab] = useState<ExamTab>("banking");
  const [activeSubject, setActiveSubject] = useState<string>("all");

  
  const lcMap = useMemo(() => {
    const m = new Map<string, Lifecycle>();
    lifecycles.forEach(l => m.set(l.topic_id, l));
    return m;
  }, [lifecycles]);

  
  const tabTopics = useMemo(() => {
    return topics.filter(t => (topicExamRecord[t.id] ?? []).includes(activeTab));
  }, [topics, topicExamRecord, activeTab]);

  
  const tabSubjects = useMemo(() => {
    const relevantSubjectIds = new Set(tabTopics.map(t => t.subject_id));
    return subjects.filter(s => relevantSubjectIds.has(s.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, tabTopics]);

  
  const handleTabChange = (tab: ExamTab) => {
    setActiveTab(tab);
    setActiveSubject("all");
  };

  
  const filteredSubjects = useMemo(() => {
    if (activeSubject === "all") return tabSubjects;
    return tabSubjects.filter(s => s.id === activeSubject);
  }, [tabSubjects, activeSubject]);

  const activeTabConfig = EXAM_TABS.find(t => t.key === activeTab)!;

  
  const tabStats = useMemo(() => {
    const total = tabTopics.length;
    const done = tabTopics.filter(t => ["learned", "strong"].includes(t.status)).length;
    const lcDone = tabTopics.filter(t => lifecycleProgress(lcMap.get(t.id)) === 4).length;
    return { total, done, lcDone };
  }, [tabTopics, lcMap]);

  return (
    <section aria-label="Topic lifecycle" className="space-y-4">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Topic Lifecycle
          </h2>
          <p className="text-[11px] text-neutral-600 mt-0.5">
            Toggle each milestone as you complete it. Confidence: 5 dots.
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-[11px] text-neutral-500">
            <span style={{ color: activeTabConfig.color }} className="font-semibold tabular-nums">
              {tabStats.done}
            </span>
            <span className="text-neutral-600">/{tabStats.total} learned</span>
          </p>
          <p className="text-[10px] text-neutral-600">
            <span className="tabular-nums">{tabStats.lcDone}</span> full lifecycle ✓
          </p>
        </div>
      </div>

      
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
      >
        {EXAM_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const examTopicCount = topics.filter(t => (topicExamRecord[t.id] ?? []).includes(tab.key)).length;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={
                isActive
                  ? { background: tab.bg, color: tab.color, border: `1px solid ${tab.color}30` }
                  : { color: "#52525b", border: "1px solid transparent" }
              }
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className="text-[10px] rounded-full px-1.5 py-0.5 tabular-nums"
                style={
                  isActive
                    ? { background: `${tab.color}20`, color: tab.color }
                    : { background: "#1a1a1a", color: "#52525b" }
                }
              >
                {examTopicCount}
              </span>
            </button>
          );
        })}
      </div>

      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubject("all")}
          className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
          style={
            activeSubject === "all"
              ? { background: activeTabConfig.bg, color: activeTabConfig.color, border: `1px solid ${activeTabConfig.color}30` }
              : { background: "#111", color: "#71717a", border: "1px solid #1f1f1f" }
          }
        >
          All subjects
        </button>
        {tabSubjects.map(s => {
          const isActive = activeSubject === s.id;
          const topicCount = tabTopics.filter(t => t.subject_id === s.id).length;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSubject(isActive ? "all" : s.id)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 flex items-center gap-1.5"
              style={
                isActive
                  ? { background: `${s.color ?? "#52525b"}20`, color: s.color ?? "#e5e5e5", border: `1px solid ${s.color ?? "#52525b"}40` }
                  : { background: "#111", color: "#71717a", border: "1px solid #1f1f1f" }
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: s.color ?? "#52525b" }}
              />
              {s.name}
              <span
                className="text-[10px] rounded-full px-1 tabular-nums"
                style={{ background: "#1a1a1a", color: "#52525b" }}
              >
                {topicCount}
              </span>
            </button>
          );
        })}
      </div>

      
      <div className="space-y-6">
        {filteredSubjects.map(s => {
          const subjectTopics = tabTopics.filter(t => t.subject_id === s.id);
          if (subjectTopics.length === 0) return null;

          const doneCount = subjectTopics.filter(t => ["learned", "strong"].includes(t.status)).length;
          const pct = Math.round((doneCount / subjectTopics.length) * 100);

          
          const subjectChapterIds = new Set(subjectTopics.map(t => t.chapter_id).filter(id => id !== null));
          const subjectChapters = chapters
            .filter(ch => ch.subject_id === s.id && subjectChapterIds.has(ch.id))
            .sort((a, b) => a.sort_order - b.sort_order);

          return (
            <div
              key={s.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: "#080808", border: `1px solid #1e1e1e` }}
            >
              
              <div
                className="px-5 py-4 flex items-center gap-4"
                style={{ background: `${s.color ?? "#52525b"}0c`, borderBottom: "1px solid #1a1a1a" }}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: s.color ?? "#52525b", boxShadow: `0 0 8px ${s.color ?? "#52525b"}60` }}
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-neutral-100">{s.name}</p>
                  <p className="text-[11px] text-neutral-600 mt-0.5">{subjectTopics.length} topics</p>
                </div>

                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold tabular-nums" style={{ color: s.color ?? "#71717a" }}>
                      {doneCount}<span className="text-neutral-600 font-normal">/{subjectTopics.length}</span>
                    </p>
                    <p className="text-[10px] text-neutral-600">learned</p>
                  </div>
                  <div className="w-24 h-2 rounded-full" style={{ background: "#1f1f1f" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: s.color ?? "#52525b" }}
                    />
                  </div>
                </div>
              </div>

              
              <div className="divide-y divide-[#141414]">
                {subjectChapters.map((ch) => {
                  const chapterTopics = subjectTopics
                    .filter(t => t.chapter_id === ch.id)
                    .sort((a, b) => a.name.localeCompare(b.name));
                  
                  if (chapterTopics.length === 0) return null;

                  return (
                    <div key={ch.id} className="pb-2">
                      
                      <div className="px-5 py-3 sticky top-0 z-10 backdrop-blur-sm" style={{ background: "#050505cc" }}>
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-wide">
                          {ch.name}
                        </p>
                      </div>

                      
                      <div className="space-y-1 px-2">
                        {chapterTopics.map((t, tIdx) => {
                          const lc = lcMap.get(t.id) ?? undefined;
                          const practice = practiceMap[t.id];
                          const acc =
                            practice && practice.attempted >= 10
                              ? Math.round((practice.correct / practice.attempted) * 100)
                              : null;
                          const sc = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.not_started;
                          const progress = lifecycleProgress(lc);

                          return (
                            <div
                              key={t.id}
                              className="px-3 py-3 rounded-xl flex flex-col gap-3 transition-colors"
                              style={{ background: tIdx % 2 === 0 ? "transparent" : "#0c0c0c" }}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className="text-[10px] tabular-nums font-mono mt-0.5 shrink-0 w-5 text-right"
                                  style={{ color: "#444" }}
                                >
                                  {tIdx + 1}.
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <p className="text-sm font-medium text-neutral-200 leading-snug">
                                      {t.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                                      {acc !== null && (
                                        <span
                                          className="text-[10px] tabular-nums font-semibold px-2 py-0.5 rounded-md"
                                          style={{ color: pctColor(acc), background: `${pctColor(acc)}15` }}
                                        >
                                          {acc}%
                                        </span>
                                      )}
                                      <span
                                        className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                                        style={{ color: sc.color, background: sc.bg }}
                                      >
                                        {sc.label}
                                      </span>
                                    </div>
                                  </div>

                                  
                                  <div className="flex items-center gap-1 mb-2.5">
                                    {["Learn", "Book", "DPP", "PYQ"].map((label, i) => (
                                      <div key={i} className="flex-1 flex flex-col gap-0.5">
                                        <div
                                          className="h-1 rounded-full transition-all"
                                          style={{ background: i < progress ? (s.color ?? "#38bdf8") : "#1f1f1f" }}
                                        />
                                        <span className="text-[8px] text-center" style={{ color: i < progress ? (s.color ?? "#38bdf8") : "#333" }}>
                                          {label}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  
                                  <TopicLifecycleBadges
                                    topicId={t.id}
                                    topicName={t.name}
                                    lifecycle={lc ?? null}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredSubjects.length === 0 && (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}
          >
            <p className="text-sm text-neutral-500">No subjects found for this exam type.</p>
          </div>
        )}
      </div>
    </section>
  );
}

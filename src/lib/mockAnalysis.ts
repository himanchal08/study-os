export type SectionFlag =
  | "accurate_and_fast"
  | "accurate_but_slow"
  | "fast_but_inaccurate"
  | "slow_and_inaccurate"
  | "on_track"
  | "no_time_data";

export interface SectionAnalysis {
  id: string;
  name: string;
  maxMarks: number;
  score: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  durationMinutes: number | null;
  recommendedMinutes: number | null;
  accuracy: number | null;       
  percentScore: number;          
  flag: SectionFlag;
  flagLabel: string;
  flagColor: string;
}

interface RawSection {
  id: string;
  name: string;
  maximum_marks: number;
  score: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  duration_minutes: number | null;
}

const FLAG_META: Record<SectionFlag, { label: string; color: string }> = {
  accurate_and_fast:   { label: "✅ Accurate & Fast",    color: "#34d399" },
  accurate_but_slow:   { label: "⚠️ Accurate but Slow",  color: "#f59e0b" },
  fast_but_inaccurate: { label: "⚠️ Fast but Inaccurate", color: "#fb923c" },
  slow_and_inaccurate: { label: "🚨 Slow & Inaccurate",  color: "#ef4444" },
  on_track:            { label: "→ On Track",            color: "#818cf8" },
  no_time_data:        { label: "— No Time Data",        color: "#52525b" },
};

export function analyzeSections(
  sections: RawSection[],
  mockMaxMarks: number,
  mockRecommendedMinutes: number | null
): SectionAnalysis[] {
  return sections.map((s) => {
    const accuracy = s.attempted > 0 ? (s.correct / s.attempted) * 100 : null;
    const percentScore = mockMaxMarks > 0 ? (s.score / s.maximum_marks) * 100 : 0;

    const recommendedMinutes =
      mockRecommendedMinutes && mockMaxMarks > 0
        ? (mockRecommendedMinutes * s.maximum_marks) / mockMaxMarks
        : null;

    let flag: SectionFlag = "on_track";

    if (s.duration_minutes === null) {
      flag = "no_time_data";
    } else if (recommendedMinutes !== null) {
      const timeRatio = s.duration_minutes / recommendedMinutes;
      const acc = accuracy ?? 0;

      if (acc >= 80 && timeRatio <= 0.9) {
        flag = "accurate_and_fast";
      } else if (acc >= 80 && timeRatio > 1.15) {
        flag = "accurate_but_slow";
      } else if (acc < 70 && timeRatio <= 0.9) {
        flag = "fast_but_inaccurate";
      } else if (acc < 70 && timeRatio > 1.1) {
        flag = "slow_and_inaccurate";
      } else {
        flag = "on_track";
      }
    }

    return {
      id: s.id,
      name: s.name,
      maxMarks: s.maximum_marks,
      score: s.score,
      attempted: s.attempted,
      correct: s.correct,
      wrong: s.wrong,
      unattempted: s.unattempted,
      durationMinutes: s.duration_minutes,
      recommendedMinutes,
      accuracy,
      percentScore,
      flag,
      flagLabel: FLAG_META[flag].label,
      flagColor: FLAG_META[flag].color,
    };
  });
}

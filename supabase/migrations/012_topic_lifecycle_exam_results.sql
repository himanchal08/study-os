-- ============================================================
-- Migration 012: topic_lifecycle + real_exam_results
-- Phase 11 (Syllabus Coverage Intelligence) + Phase 22 (Exam Readiness)
-- ============================================================

-- topic_lifecycle
-- One row per (user_id, topic_id) — upserted on change.
-- Tracks the per-topic learning lifecycle:
--   learning → book_practice → dpp → pyq → tests → revision
CREATE TABLE IF NOT EXISTS topic_lifecycle (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid        NOT NULL,
  topic_id                 uuid        NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  -- lifecycle stages
  learning_completed_at    timestamptz,
  book_practice_done       boolean     NOT NULL DEFAULT false,
  dpp_done                 boolean     NOT NULL DEFAULT false,
  pyq_done                 boolean     NOT NULL DEFAULT false,
  tests_attempted_count    integer     NOT NULL DEFAULT 0 CHECK (tests_attempted_count >= 0),
  revision_count           integer     NOT NULL DEFAULT 0 CHECK (revision_count >= 0),
  last_revised_at          date,
  -- confidence_level: 1 (very low) – 5 (very high)
  confidence_level         smallint    CHECK (confidence_level BETWEEN 1 AND 5),
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  -- one lifecycle row per user+topic
  UNIQUE (user_id, topic_id)
);

-- RLS for topic_lifecycle
ALTER TABLE topic_lifecycle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topic_lifecycle_select" ON topic_lifecycle
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "topic_lifecycle_insert" ON topic_lifecycle
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "topic_lifecycle_update" ON topic_lifecycle
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "topic_lifecycle_delete" ON topic_lifecycle
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_topic_lifecycle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER topic_lifecycle_updated_at
  BEFORE UPDATE ON topic_lifecycle
  FOR EACH ROW EXECUTE FUNCTION update_topic_lifecycle_updated_at();

-- ============================================================

-- real_exam_results
-- Stores actual exam scores from real Banking/SSC exams the user attempted.
-- subject_breakdown is a JSONB array:
--   [{"subject_name": "Quantitative Aptitude", "marks_scored": 18.5, "marks_available": 25}, ...]
-- This enables subject-wise gap analysis vs practice accuracy.
CREATE TABLE IF NOT EXISTS real_exam_results (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL,
  exam_name            text        NOT NULL,
  -- exam_type: 'banking' | 'ssc' | 'other'
  exam_type            text        NOT NULL DEFAULT 'banking'
                                   CHECK (exam_type IN ('banking', 'ssc', 'other')),
  stage                text,                        -- e.g. 'Prelims', 'Tier 1', 'Mains'
  exam_date            date        NOT NULL,
  total_score          numeric     NOT NULL CHECK (total_score >= 0),
  total_max            numeric     NOT NULL CHECK (total_max > 0),
  -- subject_breakdown: [{subject_name, marks_scored, marks_available}]
  subject_breakdown    jsonb,
  cutoff_used          numeric     CHECK (cutoff_used >= 0),
  notes                text,
  -- idempotency key (PRD §C / LLM rules §4)
  client_generated_id  uuid        UNIQUE,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Validation: score must not exceed max
ALTER TABLE real_exam_results
  ADD CONSTRAINT real_exam_results_score_check
  CHECK (total_score <= total_max);

-- Validation: cutoff must not exceed max
ALTER TABLE real_exam_results
  ADD CONSTRAINT real_exam_results_cutoff_check
  CHECK (cutoff_used IS NULL OR cutoff_used <= total_max);

-- RLS for real_exam_results
ALTER TABLE real_exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "real_exam_results_select" ON real_exam_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "real_exam_results_insert" ON real_exam_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "real_exam_results_update" ON real_exam_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "real_exam_results_delete" ON real_exam_results
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_real_exam_results_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER real_exam_results_updated_at
  BEFORE UPDATE ON real_exam_results
  FOR EACH ROW EXECUTE FUNCTION update_real_exam_results_updated_at();

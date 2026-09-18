DROP TABLE IF EXISTS public.chapters CASCADE;

CREATE TABLE public.chapters (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id  uuid        NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chapters: select own" ON public.chapters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chapters: insert own" ON public.chapters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chapters: update own" ON public.chapters FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chapters: delete own" ON public.chapters FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER chapters_updated_at BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS topics_chapter_id ON public.topics (user_id, chapter_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.topic_exam_map (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id    uuid        NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  exam_type   text        NOT NULL CHECK (exam_type IN ('banking', 'ssc', 'other')),
  priority    smallint    NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  difficulty  smallint    NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  pyq_weight  smallint    CHECK (pyq_weight BETWEEN 1 AND 5),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id, exam_type)
);

ALTER TABLE public.topic_exam_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tem: select own" ON public.topic_exam_map FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tem: insert own" ON public.topic_exam_map FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tem: update own" ON public.topic_exam_map FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tem: delete own" ON public.topic_exam_map FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS tem_topic   ON public.topic_exam_map (user_id, topic_id);
CREATE INDEX IF NOT EXISTS tem_exam    ON public.topic_exam_map (user_id, exam_type);

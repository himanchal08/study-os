-- Replaces the hardcoded syllabus seed with a dynamic clone from the main account.

CREATE OR REPLACE FUNCTION public.seed_user_canonical_syllabus(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_uid UUID;
  sub RECORD;
  top RECORD;
  new_sub_id UUID;
  new_top_id UUID;
BEGIN
  -- Find the template user (the main account)
  SELECT id INTO v_template_uid FROM auth.users WHERE email = 'himanchalkhattri@gmail.com';

  -- If the template user doesn't exist (e.g. in local dev), fallback or exit silently
  IF v_template_uid IS NULL THEN
    RETURN;
  END IF;

  -- 1. Loop through all active subjects of the template user
  FOR sub IN SELECT * FROM public.subjects WHERE user_id = v_template_uid AND deleted_at IS NULL
  LOOP
      -- Clone the subject for the new user
      INSERT INTO public.subjects (name, exam_type, color, sort_order, user_id, created_at, updated_at)
      VALUES (sub.name, sub.exam_type, sub.color, sub.sort_order, p_user_id, now(), now())
      RETURNING id INTO new_sub_id;

      -- 2. Loop through all active topics belonging to this subject
      FOR top IN SELECT * FROM public.topics WHERE subject_id = sub.id AND user_id = v_template_uid AND deleted_at IS NULL
      LOOP
          -- Clone the topic for the new user
          INSERT INTO public.topics (name, status, pyq_frequency_weight, archived_at, subject_id, user_id, created_at, updated_at)
          VALUES (top.name, top.status, top.pyq_frequency_weight, top.archived_at, new_sub_id, p_user_id, now(), now())
          RETURNING id INTO new_top_id;

          -- 3. Clone any chapters belonging to this topic
          INSERT INTO public.chapters (name, sort_order, topic_id, user_id, created_at, updated_at)
          SELECT name, sort_order, new_top_id, p_user_id, now(), now()
          FROM public.chapters
          WHERE topic_id = top.id AND user_id = v_template_uid AND deleted_at IS NULL;

      END LOOP;
  END LOOP;
END;
$$;

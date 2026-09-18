DO $$
DECLARE
  v_user_id uuid := (SELECT user_id FROM public.profiles WHERE id = 'f84506bd-63ed-427c-9e8f-80da90f030b5' LIMIT 1);
  dup RECORD;
  keeper_id uuid;
BEGIN
  FOR dup IN
    SELECT name, exam_type
    FROM subjects
    WHERE user_id = v_user_id
      AND deleted_at IS NULL
    GROUP BY name, exam_type
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keeper_id
    FROM subjects
    WHERE user_id = v_user_id
      AND name = dup.name
      AND exam_type = dup.exam_type
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    UPDATE topics
    SET subject_id = keeper_id
    WHERE user_id = v_user_id
      AND subject_id IN (
        SELECT id FROM subjects
        WHERE user_id = v_user_id
          AND name = dup.name
          AND exam_type = dup.exam_type
          AND deleted_at IS NULL
          AND id <> keeper_id
      );

    UPDATE subjects
    SET deleted_at = now()
    WHERE user_id = v_user_id
      AND name = dup.name
      AND exam_type = dup.exam_type
      AND deleted_at IS NULL
      AND id <> keeper_id;

    RAISE NOTICE 'Deduped: % (%) — kept %', dup.name, dup.exam_type, keeper_id;
  END LOOP;
END $$;

SELECT name, exam_type, COUNT(*) 
FROM subjects 
WHERE deleted_at IS NULL
  AND user_id = (SELECT user_id FROM profiles WHERE id = 'f84506bd-63ed-427c-9e8f-80da90f030b5')
GROUP BY name, exam_type 
HAVING COUNT(*) > 1;

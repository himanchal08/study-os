-- ============================================================
-- Cleanup: Remove duplicate subjects
-- Keeps the earliest created subject for each (name, exam_type)
-- and reassigns any topics from duplicates before soft-deleting them.
-- Run in Supabase SQL Editor.
-- ============================================================

DO $$
DECLARE
  v_user_id uuid := (SELECT user_id FROM public.profiles WHERE id = 'f84506bd-63ed-427c-9e8f-80da90f030b5' LIMIT 1);
  dup RECORD;
  keeper_id uuid;
BEGIN
  -- For each set of duplicate subjects (same name + exam_type), find duplicates
  FOR dup IN
    SELECT name, exam_type
    FROM subjects
    WHERE user_id = v_user_id
      AND deleted_at IS NULL
    GROUP BY name, exam_type
    HAVING COUNT(*) > 1
  LOOP
    -- The one to keep: earliest created_at
    SELECT id INTO keeper_id
    FROM subjects
    WHERE user_id = v_user_id
      AND name = dup.name
      AND exam_type = dup.exam_type
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    -- Reassign topics from duplicate subjects to the keeper
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

    -- Soft-delete the duplicates (not the keeper)
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

-- Verify: should now be 0 rows
SELECT name, exam_type, COUNT(*) 
FROM subjects 
WHERE deleted_at IS NULL
  AND user_id = (SELECT user_id FROM profiles WHERE id = 'f84506bd-63ed-427c-9e8f-80da90f030b5')
GROUP BY name, exam_type 
HAVING COUNT(*) > 1;

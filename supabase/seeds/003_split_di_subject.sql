DO $$
DECLARE
  v_user_id    uuid := (SELECT user_id FROM public.profiles WHERE id = 'f84506bd-63ed-427c-9e8f-80da90f030b5' LIMIT 1);
  di_bank_id   uuid := gen_random_uuid();
  di_ssc_id    uuid := gen_random_uuid();
  quant_bank   uuid;
  quant_ssc    uuid;
BEGIN
  SELECT id INTO quant_bank FROM subjects
  WHERE user_id = v_user_id AND name = 'Quantitative Aptitude' AND exam_type = 'banking' AND deleted_at IS NULL LIMIT 1;

  SELECT id INTO quant_ssc FROM subjects
  WHERE user_id = v_user_id AND name = 'Quantitative Aptitude (SSC)' AND exam_type = 'ssc' AND deleted_at IS NULL LIMIT 1;

  IF quant_bank IS NOT NULL THEN
    INSERT INTO subjects (id, user_id, name, color, exam_type, created_at)
    VALUES (di_bank_id, v_user_id, 'Data Interpretation', '#06b6d4', 'banking', now());

    UPDATE topics
    SET subject_id = di_bank_id
    WHERE user_id = v_user_id
      AND subject_id = quant_bank
      AND name ILIKE '%Data Interpretation%';

    RAISE NOTICE 'Banking DI subject created: %', di_bank_id;
  END IF;

  IF quant_ssc IS NOT NULL THEN
    INSERT INTO subjects (id, user_id, name, color, exam_type, created_at)
    VALUES (di_ssc_id, v_user_id, 'Data Interpretation (SSC)', '#06b6d4', 'ssc', now());

    UPDATE topics
    SET subject_id = di_ssc_id
    WHERE user_id = v_user_id
      AND subject_id = quant_ssc
      AND name ILIKE '%Data Interpretation%';

    RAISE NOTICE 'SSC DI subject created: %', di_ssc_id;
  END IF;
END $$;

SELECT s.name as subject, t.name as topic
FROM topics t JOIN subjects s ON t.subject_id = s.id
WHERE t.user_id = (SELECT user_id FROM profiles WHERE id = 'f84506bd-63ed-427c-9e8f-80da90f030b5')
  AND t.name ILIKE '%Data Interpretation%'
  AND t.deleted_at IS NULL
ORDER BY s.name, t.name;

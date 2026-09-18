DO $$
DECLARE
  v_uid   uuid := 'b9f715ea-e543-4dd0-90e2-8cd93ca68218';
  s_eng   uuid; s_reas uuid; s_quant uuid; s_gk uuid;
BEGIN
  INSERT INTO subjects (user_id, name, color, exam_type) VALUES (v_uid, 'English (SSC)',           '#818cf8', 'ssc') RETURNING id INTO s_eng;
  INSERT INTO subjects (user_id, name, color, exam_type) VALUES (v_uid, 'Reasoning (SSC)',         '#34d399', 'ssc') RETURNING id INTO s_reas;
  INSERT INTO subjects (user_id, name, color, exam_type) VALUES (v_uid, 'Quantitative Apt. (SSC)', '#fbbf24', 'ssc') RETURNING id INTO s_quant;
  INSERT INTO subjects (user_id, name, color, exam_type) VALUES (v_uid, 'GK / General Studies',   '#fb923c', 'ssc') RETURNING id INTO s_gk;

  INSERT INTO topics (user_id, subject_id, name) VALUES
    (v_uid,s_eng,'Spot the Error'),(v_uid,s_eng,'Fill in the Blanks'),(v_uid,s_eng,'Synonyms & Homonyms'),
    (v_uid,s_eng,'Antonyms'),(v_uid,s_eng,'Spellings & Misspelt Words'),(v_uid,s_eng,'Idioms and Phrases'),
    (v_uid,s_eng,'One-Word Substitution'),(v_uid,s_eng,'Improvement of Sentences'),
    (v_uid,s_eng,'Active & Passive Voice'),(v_uid,s_eng,'Direct & Indirect Narration'),
    (v_uid,s_eng,'Shuffling of Sentence Parts'),(v_uid,s_eng,'Shuffling of Sentences in a Passage'),
    (v_uid,s_eng,'Cloze Passage & Comprehension');

  INSERT INTO topics (user_id, subject_id, name) VALUES
    (v_uid,s_reas,'Classification'),(v_uid,s_reas,'Analogy'),(v_uid,s_reas,'Coding-Decoding'),
    (v_uid,s_reas,'Figure Counting'),(v_uid,s_reas,'Syllogism'),(v_uid,s_reas,'Word Formation'),
    (v_uid,s_reas,'Venn Diagram'),(v_uid,s_reas,'Direction and Distance'),(v_uid,s_reas,'Blood Relations'),
    (v_uid,s_reas,'Order & Ranking'),(v_uid,s_reas,'Dice'),(v_uid,s_reas,'Non-Verbal Reasoning'),
    (v_uid,s_reas,'Seating Arrangement'),(v_uid,s_reas,'Mathematical Operations'),
    (v_uid,s_reas,'Series'),(v_uid,s_reas,'Clock & Calendar');

  INSERT INTO topics (user_id, subject_id, name) VALUES
    (v_uid,s_quant,'Simplification'),(v_uid,s_quant,'Interest (SI & CI)'),(v_uid,s_quant,'Averages'),
    (v_uid,s_quant,'Percentage'),(v_uid,s_quant,'Ratio and Proportion'),(v_uid,s_quant,'Problem on Ages'),
    (v_uid,s_quant,'Speed, Distance & Time'),(v_uid,s_quant,'Number System'),(v_uid,s_quant,'Mensuration'),
    (v_uid,s_quant,'Data Interpretation'),(v_uid,s_quant,'Time and Work'),(v_uid,s_quant,'Algebra'),
    (v_uid,s_quant,'Trigonometry'),(v_uid,s_quant,'Geometry'),(v_uid,s_quant,'Permutation & Combination'),
    (v_uid,s_quant,'Probability'),(v_uid,s_quant,'Statistics');

  INSERT INTO topics (user_id, subject_id, name) VALUES
    (v_uid,s_gk,'History'),(v_uid,s_gk,'Geography'),(v_uid,s_gk,'Indian Polity'),
    (v_uid,s_gk,'Economy'),(v_uid,s_gk,'Science & Technology'),
    (v_uid,s_gk,'Current Affairs'),(v_uid,s_gk,'Static Awareness');

  RAISE NOTICE 'SSC CGL: 4 subjects, 53 topics seeded.';
END $$;

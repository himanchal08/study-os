-- ============================================================
-- BANKING SYLLABUS SEED  (exam_type = 'banking')
-- Run in: Supabase Dashboard -> SQL Editor -> New Query
-- Run AFTER data_wipe.sql
-- ============================================================
DO $$
DECLARE
  v_uid   uuid := 'b9f715ea-e543-4dd0-90e2-8cd93ca68218';
  s_eng   uuid; s_reas uuid; s_quant uuid; s_comp uuid; s_ga uuid; s_di uuid;
BEGIN
  INSERT INTO subjects (user_id, name, color, exam_type) VALUES (v_uid, 'English Language',      '#818cf8', 'banking') RETURNING id INTO s_eng;
  INSERT INTO subjects (user_id, name, color, exam_type) VALUES (v_uid, 'Reasoning',             '#34d399', 'banking') RETURNING id INTO s_reas;
  INSERT INTO subjects (user_id, name, color, exam_type) VALUES (v_uid, 'Quantitative Aptitude', '#fbbf24', 'banking') RETURNING id INTO s_quant;
  INSERT INTO subjects (user_id, name, color, exam_type) VALUES (v_uid, 'Computer Aptitude',     '#38bdf8', 'banking') RETURNING id INTO s_comp;
  INSERT INTO subjects (user_id, name, color, exam_type) VALUES (v_uid, 'General Awareness',     '#fb7185', 'banking') RETURNING id INTO s_ga;
  INSERT INTO subjects (user_id, name, color, exam_type) VALUES (v_uid, 'Data Interpretation',   '#a78bfa', 'banking') RETURNING id INTO s_di;

  INSERT INTO topics (user_id, subject_id, name) VALUES
    (v_uid,s_eng,'Reading Comprehension'),(v_uid,s_eng,'Cloze Test'),(v_uid,s_eng,'Word Swap'),
    (v_uid,s_eng,'Fillers'),(v_uid,s_eng,'Sentence Improvement'),(v_uid,s_eng,'Spotting Error'),
    (v_uid,s_eng,'Paragraph Completion'),(v_uid,s_eng,'Synonym & Antonym'),(v_uid,s_eng,'Connectors'),
    (v_uid,s_eng,'Vocabulary'),(v_uid,s_eng,'Phrase Replacement'),(v_uid,s_eng,'Word Association'),
    (v_uid,s_eng,'Para Jumbles'),(v_uid,s_eng,'Spelling Errors'),(v_uid,s_eng,'Fill in the Blanks'),
    (v_uid,s_eng,'Column Based Fillers'),(v_uid,s_eng,'Sentence Connectors');

  INSERT INTO topics (user_id, subject_id, name) VALUES
    (v_uid,s_reas,'Alphanumeric Series'),(v_uid,s_reas,'Coding Decoding'),(v_uid,s_reas,'Inequalities'),
    (v_uid,s_reas,'Syllogism'),(v_uid,s_reas,'Blood Relation'),(v_uid,s_reas,'Direction Distance'),
    (v_uid,s_reas,'Puzzle'),(v_uid,s_reas,'Seating Arrangement'),(v_uid,s_reas,'Data Sufficiency'),
    (v_uid,s_reas,'Machine Input'),(v_uid,s_reas,'Logical Reasoning');

  INSERT INTO topics (user_id, subject_id, name) VALUES
    (v_uid,s_quant,'Simplification'),(v_uid,s_quant,'Approximation'),(v_uid,s_quant,'Number Series'),
    (v_uid,s_quant,'Quadratic Equations'),(v_uid,s_quant,'Ratio & Proportion'),(v_uid,s_quant,'Percentage'),
    (v_uid,s_quant,'Profit & Loss'),(v_uid,s_quant,'Simple & Compound Interest'),(v_uid,s_quant,'Average'),
    (v_uid,s_quant,'Age Problems'),(v_uid,s_quant,'Mixture & Allegation'),(v_uid,s_quant,'Time & Work'),
    (v_uid,s_quant,'Speed, Time & Distance'),(v_uid,s_quant,'Partnership'),(v_uid,s_quant,'Probability'),
    (v_uid,s_quant,'Permutation & Combination'),(v_uid,s_quant,'Boat & Stream'),
    (v_uid,s_quant,'Pipe & Cistern'),(v_uid,s_quant,'Mensuration');

  INSERT INTO topics (user_id, subject_id, name) VALUES
    (v_uid,s_comp,'Internet'),(v_uid,s_comp,'Memory'),(v_uid,s_comp,'Keyboard Shortcuts'),
    (v_uid,s_comp,'Computer Abbreviations'),(v_uid,s_comp,'Microsoft Office'),
    (v_uid,s_comp,'Computer Hardware'),(v_uid,s_comp,'Computer Software'),
    (v_uid,s_comp,'Operating System'),(v_uid,s_comp,'Networking'),
    (v_uid,s_comp,'Computer Fundamentals & Terminologies');

  INSERT INTO topics (user_id, subject_id, name) VALUES
    (v_uid,s_ga,'Banking Awareness'),(v_uid,s_ga,'Current Affairs'),(v_uid,s_ga,'Static GK'),
    (v_uid,s_ga,'Current Static GK'),(v_uid,s_ga,'Current Banking & Financial Awareness');

  INSERT INTO topics (user_id, subject_id, name) VALUES
    (v_uid,s_di,'Tabular DI'),(v_uid,s_di,'Line Graph DI'),(v_uid,s_di,'Bar Graph DI'),
    (v_uid,s_di,'Pie Chart DI'),(v_uid,s_di,'Mixed DI'),(v_uid,s_di,'Caselet DI'),
    (v_uid,s_di,'Arithmetic-Based DI'),(v_uid,s_di,'Missing DI');

  RAISE NOTICE 'Banking: 6 subjects, 70 topics seeded.';
END $$;

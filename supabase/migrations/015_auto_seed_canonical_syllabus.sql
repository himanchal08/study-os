-- ============================================================
-- Migration 015: Auto-seed canonical syllabus on user signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_user_canonical_syllabus(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := p_user_id;
  v_count int;

  -- ── Subject IDs ──────────────────────────────────────────────────────────────
  s_quant       uuid := gen_random_uuid();  -- Quantitative Aptitude (both)
  s_di          uuid := gen_random_uuid();  -- Data Interpretation (both)
  s_reasoning   uuid := gen_random_uuid();  -- Logical Reasoning (both)
  s_computer    uuid := gen_random_uuid();  -- Computer Aptitude (banking)
  s_eng_obj     uuid := gen_random_uuid();  -- English — Objective (both)
  s_eng_desc    uuid := gen_random_uuid();  -- English — Descriptive (banking)
  s_ga_static   uuid := gen_random_uuid();  -- General Awareness — Static (both)
  s_ca          uuid := gen_random_uuid();  -- Current Affairs (both)
  s_bank_aware  uuid := gen_random_uuid();  -- Banking & Financial Awareness (banking)
  s_gen_sci     uuid := gen_random_uuid();  -- General Science (ssc)
  s_nonverbal   uuid := gen_random_uuid();  -- Non-Verbal Reasoning (ssc)

  -- ── Chapter IDs: Quant ───────────────────────────────────────────────────────
  ch_arith      uuid := gen_random_uuid();
  ch_numsy      uuid := gen_random_uuid();
  ch_algebra    uuid := gen_random_uuid();
  ch_geom       uuid := gen_random_uuid();
  ch_stats      uuid := gen_random_uuid();

  -- ── Chapter IDs: DI ─────────────────────────────────────────────────────────
  ch_chart_di   uuid := gen_random_uuid();
  ch_datasuf    uuid := gen_random_uuid();

  -- ── Chapter IDs: Reasoning ──────────────────────────────────────────────────
  ch_puzzles    uuid := gen_random_uuid();
  ch_verbal_r   uuid := gen_random_uuid();
  ch_series     uuid := gen_random_uuid();

  -- ── Chapter IDs: Computer ───────────────────────────────────────────────────
  ch_comp_fund  uuid := gen_random_uuid();
  ch_network    uuid := gen_random_uuid();
  ch_software   uuid := gen_random_uuid();

  -- ── Chapter IDs: English Objective ──────────────────────────────────────────
  ch_reading    uuid := gen_random_uuid();
  ch_grammar    uuid := gen_random_uuid();
  ch_sentence   uuid := gen_random_uuid();

  -- ── Chapter IDs: English Descriptive ────────────────────────────────────────
  ch_essay      uuid := gen_random_uuid();

  -- ── Chapter IDs: GA Static ──────────────────────────────────────────────────
  ch_history    uuid := gen_random_uuid();
  ch_geography  uuid := gen_random_uuid();
  ch_polity     uuid := gen_random_uuid();
  ch_st_econ    uuid := gen_random_uuid();

  -- ── Chapter IDs: Current Affairs ────────────────────────────────────────────
  ch_national   uuid := gen_random_uuid();
  ch_intl       uuid := gen_random_uuid();
  ch_eco_news   uuid := gen_random_uuid();
  ch_sports     uuid := gen_random_uuid();
  ch_sci_tech   uuid := gen_random_uuid();

  -- ── Chapter IDs: Banking Awareness ──────────────────────────────────────────
  ch_bank_sys   uuid := gen_random_uuid();
  ch_fin_sys    uuid := gen_random_uuid();
  ch_schemes    uuid := gen_random_uuid();

  -- ── Chapter IDs: General Science ────────────────────────────────────────────
  ch_bio        uuid := gen_random_uuid();
  ch_physics    uuid := gen_random_uuid();
  ch_chem       uuid := gen_random_uuid();

  -- ── Chapter IDs: Non-Verbal ─────────────────────────────────────────────────
  ch_visual     uuid := gen_random_uuid();

BEGIN
  SELECT count(*) INTO v_count FROM public.subjects WHERE user_id = p_user_id AND deleted_at IS NULL;
  IF v_count > 0 THEN
    RETURN;
  END IF;


  -- ── Step 1: Soft-delete ALL existing subjects + topics for this user ─────────
  UPDATE public.topics   SET deleted_at = now() WHERE user_id = v_user_id AND deleted_at IS NULL;
  UPDATE public.subjects SET deleted_at = now() WHERE user_id = v_user_id AND deleted_at IS NULL;
  DELETE FROM public.topic_exam_map WHERE user_id = v_user_id;

  -- ── Step 2: Canonical Subjects ───────────────────────────────────────────────
  -- exam_type = 'both'    → relevant for Banking AND SSC
  -- exam_type = 'banking' → Banking (SBI PO / IBPS PO) only
  -- exam_type = 'ssc'     → SSC CGL only
  INSERT INTO public.subjects (id, user_id, name, color, exam_type, sort_order, created_at) VALUES
    (s_quant,      v_user_id, 'Quantitative Aptitude',          '#38bdf8', 'both',    1, now()),
    (s_di,         v_user_id, 'Data Interpretation',            '#06b6d4', 'both',    2, now()),
    (s_reasoning,  v_user_id, 'Logical Reasoning',              '#a78bfa', 'both',    3, now()),
    (s_computer,   v_user_id, 'Computer Aptitude',              '#fb923c', 'banking', 4, now()),
    (s_eng_obj,    v_user_id, 'English - Objective',            '#4ade80', 'both',    5, now()),
    (s_eng_desc,   v_user_id, 'English - Descriptive',          '#86efac', 'banking', 6, now()),
    (s_ga_static,  v_user_id, 'General Awareness - Static',     '#f59e0b', 'both',    7, now()),
    (s_ca,         v_user_id, 'Current Affairs',                '#ef4444', 'both',    8, now()),
    (s_bank_aware, v_user_id, 'Banking & Financial Awareness',  '#ec4899', 'banking', 9, now()),
    (s_gen_sci,    v_user_id, 'General Science',                '#22d3ee', 'ssc',    10, now()),
    (s_nonverbal,  v_user_id, 'Non-Verbal Reasoning',           '#c084fc', 'ssc',    11, now());

  -- ── Step 3: Chapters ─────────────────────────────────────────────────────────
  INSERT INTO public.chapters (id, user_id, subject_id, name, sort_order, created_at) VALUES
    -- Quantitative Aptitude
    (ch_arith,     v_user_id, s_quant,      'Arithmetic',                      1, now()),
    (ch_numsy,     v_user_id, s_quant,      'Number System',                   2, now()),
    (ch_algebra,   v_user_id, s_quant,      'Algebra',                         3, now()),
    (ch_geom,      v_user_id, s_quant,      'Geometry & Mensuration',          4, now()),
    (ch_stats,     v_user_id, s_quant,      'Statistics & Probability',        5, now()),
    -- Data Interpretation
    (ch_chart_di,  v_user_id, s_di,         'Chart-Based DI',                  1, now()),
    (ch_datasuf,   v_user_id, s_di,         'Data Sufficiency',                2, now()),
    -- Logical Reasoning
    (ch_puzzles,   v_user_id, s_reasoning,  'Puzzles & Arrangements',          1, now()),
    (ch_verbal_r,  v_user_id, s_reasoning,  'Verbal Reasoning',                2, now()),
    (ch_series,    v_user_id, s_reasoning,  'Series & Analogy',                3, now()),
    -- Computer Aptitude
    (ch_comp_fund, v_user_id, s_computer,   'Computer Fundamentals',           1, now()),
    (ch_network,   v_user_id, s_computer,   'Internet & Networking',           2, now()),
    (ch_software,  v_user_id, s_computer,   'Software & Data',                 3, now()),
    -- English — Objective
    (ch_reading,   v_user_id, s_eng_obj,    'Reading & Comprehension',         1, now()),
    (ch_grammar,   v_user_id, s_eng_obj,    'Grammar & Vocabulary',            2, now()),
    (ch_sentence,  v_user_id, s_eng_obj,    'Sentence Structure',              3, now()),
    -- English — Descriptive
    (ch_essay,     v_user_id, s_eng_desc,   'Essay, Letter & Report',          1, now()),
    -- General Awareness — Static
    (ch_history,   v_user_id, s_ga_static,  'Indian History',                  1, now()),
    (ch_geography, v_user_id, s_ga_static,  'Geography',                       2, now()),
    (ch_polity,    v_user_id, s_ga_static,  'Polity & Governance',             3, now()),
    (ch_st_econ,   v_user_id, s_ga_static,  'Economy — Static',                4, now()),
    -- Current Affairs
    (ch_national,  v_user_id, s_ca,         'National Affairs',                1, now()),
    (ch_intl,      v_user_id, s_ca,         'International Affairs',           2, now()),
    (ch_eco_news,  v_user_id, s_ca,         'Economy & Finance News',          3, now()),
    (ch_sports,    v_user_id, s_ca,         'Sports, Awards & Appointments',   4, now()),
    (ch_sci_tech,  v_user_id, s_ca,         'Science, Tech & Environment',     5, now()),
    -- Banking & Financial Awareness
    (ch_bank_sys,  v_user_id, s_bank_aware, 'Banking System & RBI',            1, now()),
    (ch_fin_sys,   v_user_id, s_bank_aware, 'Financial Regulators & Markets',  2, now()),
    (ch_schemes,   v_user_id, s_bank_aware, 'Schemes, Budget & International', 3, now()),
    -- General Science (SSC)
    (ch_bio,       v_user_id, s_gen_sci,    'Biology',                         1, now()),
    (ch_physics,   v_user_id, s_gen_sci,    'Physics',                         2, now()),
    (ch_chem,      v_user_id, s_gen_sci,    'Chemistry',                       3, now()),
    -- Non-Verbal Reasoning (SSC)
    (ch_visual,    v_user_id, s_nonverbal,  'Visual Reasoning',                1, now());

  -- ── Step 4: Canonical Topics (one per concept) ───────────────────────────────

  -- QUANT — Arithmetic
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_quant, ch_arith, 'Percentage',                    'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_arith, 'Profit, Loss & Discount',       'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_arith, 'Simple & Compound Interest',    'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_arith, 'Ratio & Proportion',            'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_arith, 'Time, Work & Wages',            'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_arith, 'Time, Speed & Distance',        'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_arith, 'Pipes & Cisterns',              'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_arith, 'Mixtures & Alligations',        'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_arith, 'Partnership',                   'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_arith, 'Ages',                          'not_started', 2, now());

  -- QUANT — Number System
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_quant, ch_numsy, 'Number System & Divisibility', 'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_numsy, 'Simplification & Approximation','not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_numsy, 'HCF & LCM',                    'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_numsy, 'Surds & Indices',               'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_numsy, 'Number Series',                 'not_started', 5, now());

  -- QUANT — Algebra
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_quant, ch_algebra, 'Linear Equations',            'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_algebra, 'Quadratic Equations',         'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_algebra, 'Inequalities',                'not_started', 4, now());

  -- QUANT — Geometry & Mensuration
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_quant, ch_geom, '2D Mensuration',                'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_geom, '3D Mensuration',                'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_geom, 'Coordinate Geometry',           'not_started', 2, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_geom, 'Trigonometry',                  'not_started', 3, now());

  -- QUANT — Statistics & Probability
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_quant, ch_stats, 'Mean, Median & Mode',           'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_stats, 'Probability',                   'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_quant, ch_stats, 'Permutation & Combination',     'not_started', 3, now());

  -- DI — Chart-Based
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_di, ch_chart_di, 'Tabular DI',                   'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_di, ch_chart_di, 'Bar Graph DI',                 'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_di, ch_chart_di, 'Pie Chart DI',                 'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_di, ch_chart_di, 'Line Graph DI',                'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_di, ch_chart_di, 'Mixed / Caselet DI',           'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_di, ch_chart_di, 'Radar / Spider Chart DI',      'not_started', 2, now());

  -- DI — Data Sufficiency
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_di, ch_datasuf, 'Data Sufficiency',              'not_started', 4, now());

  -- REASONING — Puzzles & Arrangements
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_reasoning, ch_puzzles, 'Linear Arrangement',        'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_puzzles, 'Circular Arrangement',      'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_puzzles, 'Floor & Building Puzzle',   'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_puzzles, 'Box & Stack Puzzle',        'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_puzzles, 'Scheduling Puzzle',         'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_puzzles, 'Double Row Seating',        'not_started', 4, now());

  -- REASONING — Verbal
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_reasoning, ch_verbal_r, 'Syllogism',               'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_verbal_r, 'Blood Relations',         'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_verbal_r, 'Coding-Decoding',         'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_verbal_r, 'Direction & Distance',    'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_verbal_r, 'Ranking & Order',         'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_verbal_r, 'Inequalities',            'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_verbal_r, 'Input-Output',            'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_verbal_r, 'Statement & Assumption',  'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_verbal_r, 'Cause & Effect',          'not_started', 2, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_verbal_r, 'Course of Action',        'not_started', 2, now());

  -- REASONING — Series & Analogy
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_reasoning, ch_series, 'Alphabet Series',           'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_series, 'Number Series (Reasoning)', 'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_series, 'Alphanumeric Series',       'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_reasoning, ch_series, 'Analogy',                   'not_started', 3, now());

  -- COMPUTER — Fundamentals
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_computer, ch_comp_fund, 'Hardware & Software',        'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_computer, ch_comp_fund, 'Input/Output Devices',       'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_computer, ch_comp_fund, 'Memory & Storage',           'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_computer, ch_comp_fund, 'Operating Systems',          'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_computer, ch_comp_fund, 'Number Systems (Binary/Hex)','not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_computer, ch_comp_fund, 'Shortcut Keys',              'not_started', 2, now());

  -- COMPUTER — Networking
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_computer, ch_network, 'Networking Basics & OSI',    'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_computer, ch_network, 'Internet, Email & Browsers', 'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_computer, ch_network, 'Cyber Security & Threats',   'not_started', 4, now());

  -- COMPUTER — Software
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_computer, ch_software, 'MS Office Suite',            'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_computer, ch_software, 'DBMS & SQL Basics',          'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_computer, ch_software, 'Programming Concepts',       'not_started', 2, now());

  -- ENGLISH OBJ — Reading
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_eng_obj, ch_reading, 'Reading Comprehension',        'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_eng_obj, ch_reading, 'Cloze Test',                   'not_started', 5, now());

  -- ENGLISH OBJ — Grammar & Vocabulary
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_eng_obj, ch_grammar, 'Error Detection & Correction', 'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_eng_obj, ch_grammar, 'Sentence Improvement',         'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_eng_obj, ch_grammar, 'Fill in the Blanks',           'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_eng_obj, ch_grammar, 'Vocabulary (Synonyms, Antonyms)','not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_eng_obj, ch_grammar, 'Idioms & Phrases',             'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_eng_obj, ch_grammar, 'Word Usage & One-Word Sub.',   'not_started', 3, now());

  -- ENGLISH OBJ — Sentence Structure
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_eng_obj, ch_sentence, 'Para Jumbles',               'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_eng_obj, ch_sentence, 'Para Completion & Fillers',  'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_eng_obj, ch_sentence, 'Sentence Rearrangement',     'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_eng_obj, ch_sentence, 'Sentence Connectors',        'not_started', 3, now());

  -- ENGLISH DESC
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_eng_desc, ch_essay, 'Essay Writing',               'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_eng_desc, ch_essay, 'Formal Letter / Email Writing','not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_eng_desc, ch_essay, 'Report Writing',              'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_eng_desc, ch_essay, 'Précis Writing',              'not_started', 3, now());

  -- GA STATIC — History
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_ga_static, ch_history, 'Ancient India',            'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_ga_static, ch_history, 'Medieval India',           'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_ga_static, ch_history, 'Modern India & Freedom Movement','not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_ga_static, ch_history, 'World History',            'not_started', 2, now());

  -- GA STATIC — Geography
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_ga_static, ch_geography, 'Indian Geography',       'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_ga_static, ch_geography, 'World Geography',        'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_ga_static, ch_geography, 'Physical Geography',     'not_started', 3, now());

  -- GA STATIC — Polity
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_ga_static, ch_polity, 'Indian Constitution',       'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_ga_static, ch_polity, 'Parliament & Legislature',  'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_ga_static, ch_polity, 'Executive, Judiciary & Federalism','not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_ga_static, ch_polity, 'Constitutional Amendments', 'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_ga_static, ch_polity, 'Panchayati Raj & Local Bodies','not_started', 3, now());

  -- GA STATIC — Economy
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_ga_static, ch_st_econ, 'Indian Economy Fundamentals','not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_ga_static, ch_st_econ, 'Agriculture & Industry',    'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_ga_static, ch_st_econ, 'Planning & National Institutions','not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_ga_static, ch_st_econ, 'International Organisations','not_started', 3, now());

  -- CURRENT AFFAIRS — National
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_ca, ch_national, 'Government Policies & Schemes',  'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_ca, ch_national, 'Laws & Acts',                    'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_ca, ch_national, 'National Events & Summits',      'not_started', 4, now());

  -- CURRENT AFFAIRS — International
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_ca, ch_intl, 'International Relations',            'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_ca, ch_intl, 'International Organisations & Treaties','not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_ca, ch_intl, 'Countries, Capitals & Currencies',   'not_started', 4, now());

  -- CURRENT AFFAIRS — Economy News
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_ca, ch_eco_news, 'RBI & Monetary Policy Updates',  'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_ca, ch_eco_news, 'Budget & Finance News',          'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_ca, ch_eco_news, 'Banking & Capital Markets News', 'not_started', 4, now());

  -- CURRENT AFFAIRS — Sports/Awards
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_ca, ch_sports, 'Sports Events & Results',          'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_ca, ch_sports, 'Awards & Recognitions',            'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_ca, ch_sports, 'Important Appointments',           'not_started', 5, now());

  -- CURRENT AFFAIRS — Sci/Tech
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_ca, ch_sci_tech, 'Science & Technology News',      'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_ca, ch_sci_tech, 'Space & Defence',                'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_ca, ch_sci_tech, 'Environment & Climate',          'not_started', 3, now());

  -- BANKING AWARENESS — Banking System
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_bank_aware, ch_bank_sys, 'Types of Banks & NBFCs','not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_bank_aware, ch_bank_sys, 'RBI — Structure & Functions','not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_bank_aware, ch_bank_sys, 'Banking Regulations (Acts)','not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_bank_aware, ch_bank_sys, 'Monetary Policy & Tools','not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_bank_aware, ch_bank_sys, 'Digital Banking & FinTech','not_started', 4, now());

  -- BANKING AWARENESS — Financial System
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_bank_aware, ch_fin_sys, 'SEBI, NABARD, SIDBI, NHB','not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_bank_aware, ch_fin_sys, 'Capital Markets & Securities','not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_bank_aware, ch_fin_sys, 'Insurance (IRDAI)',        'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_bank_aware, ch_fin_sys, 'Pension System (PFRDA)',   'not_started', 3, now());

  -- BANKING AWARENESS — Schemes & Budget
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_bank_aware, ch_schemes, 'Government Financial Schemes','not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_bank_aware, ch_schemes, 'Union Budget Highlights',  'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_bank_aware, ch_schemes, 'Economic Survey',          'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_bank_aware, ch_schemes, 'IMF, World Bank, ADB, WTO','not_started', 4, now());

  -- GENERAL SCIENCE — Biology
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_gen_sci, ch_bio, 'Cell Biology & Genetics',        'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_gen_sci, ch_bio, 'Human Body Systems',             'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_gen_sci, ch_bio, 'Plant Kingdom',                  'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_gen_sci, ch_bio, 'Animal Kingdom & Diseases',      'not_started', 4, now());

  -- GENERAL SCIENCE — Physics
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_gen_sci, ch_physics, 'Mechanics (Force, Motion, Gravity)','not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_gen_sci, ch_physics, 'Heat, Light & Optics',       'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_gen_sci, ch_physics, 'Electricity & Magnetism',    'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_gen_sci, ch_physics, 'Sound & Modern Physics',     'not_started', 3, now());

  -- GENERAL SCIENCE — Chemistry
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_gen_sci, ch_chem, 'Periodic Table & Elements',     'not_started', 5, now()),
    (gen_random_uuid(), v_user_id, s_gen_sci, ch_chem, 'Chemical Bonding & Reactions',  'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_gen_sci, ch_chem, 'Acids, Bases & Salts',          'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_gen_sci, ch_chem, 'Everyday Chemistry',            'not_started', 4, now());

  -- NON-VERBAL REASONING
  INSERT INTO public.topics (id, user_id, subject_id, chapter_id, name, status, pyq_frequency_weight, created_at) VALUES
    (gen_random_uuid(), v_user_id, s_nonverbal, ch_visual, 'Mirror & Water Images',     'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_nonverbal, ch_visual, 'Paper Folding & Cutting',   'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_nonverbal, ch_visual, 'Embedded & Hidden Figures', 'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_nonverbal, ch_visual, 'Cube, Dice & Nets',         'not_started', 4, now()),
    (gen_random_uuid(), v_user_id, s_nonverbal, ch_visual, 'Counting Figures',          'not_started', 3, now()),
    (gen_random_uuid(), v_user_id, s_nonverbal, ch_visual, 'Completion of Figures',     'not_started', 3, now());

  RAISE NOTICE 'Subjects: %  Chapters: %  Topics: %',
    (SELECT COUNT(*) FROM subjects WHERE user_id = v_user_id AND deleted_at IS NULL),
    (SELECT COUNT(*) FROM chapters WHERE user_id = v_user_id AND deleted_at IS NULL),
    (SELECT COUNT(*) FROM topics   WHERE user_id = v_user_id AND deleted_at IS NULL);
END $$;


-- ── BLOCK 2: topic_exam_map — exam-specific relevance metadata ────────────────
-- (Run immediately after Block 1.)
DO $$
DECLARE
  v_user_id uuid := (SELECT user_id FROM public.profiles
                     WHERE id = 'f84506bd-63ed-427c-9e8f-80da90f030b5' LIMIT 1);
BEGIN

  -- QUANTITATIVE APTITUDE → banking + ssc
  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'banking',
    CASE t.name
      WHEN 'Percentage'                  THEN 5 WHEN 'Profit, Loss & Discount'      THEN 5
      WHEN 'Ratio & Proportion'          THEN 5 WHEN 'Simplification & Approximation'THEN 5
      WHEN 'Number Series'               THEN 5 WHEN 'Quadratic Equations'           THEN 5
      WHEN 'Time, Work & Wages'          THEN 4 WHEN 'Time, Speed & Distance'        THEN 4
      WHEN 'Simple & Compound Interest'  THEN 4 WHEN 'Mixtures & Alligations'        THEN 4
      WHEN 'Inequalities'                THEN 4 WHEN '2D Mensuration'                THEN 4
      WHEN 'Mean, Median & Mode'         THEN 4 WHEN 'Probability'                   THEN 4
      ELSE 3 END,
    3, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'Quantitative Aptitude' AND t.deleted_at IS NULL
  ON CONFLICT (user_id, topic_id, exam_type) DO NOTHING;

  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'ssc',
    CASE t.name
      WHEN 'Percentage'                  THEN 5 WHEN 'Profit, Loss & Discount'       THEN 5
      WHEN 'Ratio & Proportion'          THEN 5 WHEN 'Simplification & Approximation' THEN 5
      WHEN '2D Mensuration'              THEN 5 WHEN 'Trigonometry'                   THEN 5
      WHEN 'Number Series'               THEN 4 WHEN 'Time, Work & Wages'             THEN 4
      WHEN 'Time, Speed & Distance'      THEN 4 WHEN 'Permutation & Combination'      THEN 4
      ELSE 3 END,
    3, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'Quantitative Aptitude' AND t.deleted_at IS NULL
  ON CONFLICT (user_id, topic_id, exam_type) DO NOTHING;

  -- DATA INTERPRETATION → banking (priority 5) + ssc (priority 4)
  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'banking', 5, 4, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'Data Interpretation' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'ssc', 4, 4, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'Data Interpretation' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  -- LOGICAL REASONING → banking + ssc
  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'banking',
    CASE t.name
      WHEN 'Linear Arrangement'    THEN 5 WHEN 'Circular Arrangement'  THEN 5
      WHEN 'Floor & Building Puzzle' THEN 5 WHEN 'Syllogism'            THEN 5
      WHEN 'Inequalities'          THEN 5 WHEN 'Input-Output'           THEN 4
      WHEN 'Blood Relations'       THEN 4 WHEN 'Coding-Decoding'        THEN 4
      WHEN 'Direction & Distance'  THEN 4 WHEN 'Box & Stack Puzzle'     THEN 4
      WHEN 'Scheduling Puzzle'     THEN 4 WHEN 'Double Row Seating'     THEN 4
      ELSE 3 END,
    3, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'Logical Reasoning' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'ssc',
    CASE t.name
      WHEN 'Syllogism'            THEN 5 WHEN 'Coding-Decoding'         THEN 5
      WHEN 'Analogy'              THEN 5 WHEN 'Blood Relations'          THEN 4
      WHEN 'Direction & Distance' THEN 4 WHEN 'Alphabet Series'          THEN 4
      WHEN 'Number Series (Reasoning)' THEN 4 WHEN 'Ranking & Order'    THEN 4
      WHEN 'Statement & Assumption'    THEN 3
      ELSE 3 END,
    3, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'Logical Reasoning' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  -- COMPUTER APTITUDE → banking only
  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'banking', 3, 2, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'Computer Aptitude' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  -- ENGLISH OBJECTIVE → banking + ssc
  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'banking',
    CASE t.name
      WHEN 'Reading Comprehension'     THEN 5 WHEN 'Cloze Test'                 THEN 5
      WHEN 'Error Detection & Correction' THEN 5 WHEN 'Para Jumbles'             THEN 5
      WHEN 'Para Completion & Fillers' THEN 4 WHEN 'Sentence Improvement'       THEN 4
      ELSE 3 END,
    3, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'English — Objective' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'ssc',
    CASE t.name
      WHEN 'Error Detection & Correction'     THEN 5 WHEN 'Fill in the Blanks'          THEN 5
      WHEN 'Vocabulary (Synonyms, Antonyms)'  THEN 5 WHEN 'Idioms & Phrases'            THEN 4
      WHEN 'Reading Comprehension'            THEN 4 WHEN 'Word Usage & One-Word Sub.'  THEN 4
      ELSE 3 END,
    3, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'English — Objective' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  -- ENGLISH DESCRIPTIVE → banking only (Mains)
  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'banking', 4, 4, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'English — Descriptive' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  -- GA STATIC → banking (priority 4) + ssc (priority 5)
  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'banking', 4, 3, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'General Awareness — Static' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'ssc', 5, 3, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'General Awareness — Static' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  -- CURRENT AFFAIRS → banking + ssc
  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'banking', 5, 2, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'Current Affairs' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'ssc', 5, 2, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'Current Affairs' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  -- BANKING & FINANCIAL AWARENESS → banking only
  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'banking', 5, 3, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'Banking & Financial Awareness' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  -- GENERAL SCIENCE → ssc only
  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'ssc', 5, 3, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'General Science' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  -- NON-VERBAL REASONING → ssc only
  INSERT INTO topic_exam_map (user_id, topic_id, exam_type, priority, difficulty, pyq_weight)
  SELECT v_user_id, t.id, 'ssc', 4, 3, t.pyq_frequency_weight
  FROM topics t JOIN subjects s ON t.subject_id = s.id
  WHERE t.user_id = v_user_id AND s.name = 'Non-Verbal Reasoning' AND t.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'topic_exam_map rows: %  (banking: %, ssc: %)',
    (SELECT COUNT(*)   FROM topic_exam_map WHERE user_id = v_user_id),
    (SELECT COUNT(*)   FROM topic_exam_map WHERE user_id = v_user_id AND exam_type = 'banking'),
    (SELECT COUNT(*)   FROM topic_exam_map WHERE user_id = v_user_id AND exam_type = 'ssc');
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM public.seed_user_canonical_syllabus(new.id);

  RETURN new;
END;
$$;

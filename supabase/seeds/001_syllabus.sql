DO $$
DECLARE
  -- Look up the real auth.users UUID from the profiles table using the profile row id
  v_user_id uuid := (SELECT user_id FROM public.profiles WHERE id = 'f84506bd-63ed-427c-9e8f-80da90f030b5' LIMIT 1);

  -- Subject IDs
  s_quant     uuid := gen_random_uuid();
  s_reasoning uuid := gen_random_uuid();
  s_english   uuid := gen_random_uuid();
  s_ga        uuid := gen_random_uuid();
  s_computer  uuid := gen_random_uuid();
  s_banking   uuid := gen_random_uuid();

  -- SSC Subject IDs
  s_ssc_quant     uuid := gen_random_uuid();
  s_ssc_reasoning uuid := gen_random_uuid();
  s_ssc_english   uuid := gen_random_uuid();
  s_ssc_ga        uuid := gen_random_uuid();

BEGIN

-- ============================================================
-- BANKING SUBJECTS (SBI PO / IBPS PO — Prelims + Mains)
-- exam_type = 'banking'
-- Source: ibps.in CRP PO/MT notifications, sbi.bank.in recruitment notifications
-- ============================================================

INSERT INTO subjects (id, user_id, name, color, exam_type, created_at)
VALUES
  (s_quant,     v_user_id, 'Quantitative Aptitude',          '#38bdf8', 'banking', now()),
  (s_reasoning, v_user_id, 'Reasoning & Computer Aptitude',  '#a78bfa', 'banking', now()),
  (s_english,   v_user_id, 'English Language',               '#34d399', 'banking', now()),
  (s_ga,        v_user_id, 'General/Economy/Banking Awareness','#f59e0b','banking', now()),
  (s_computer,  v_user_id, 'Computer Knowledge',             '#22d3ee', 'banking', now()),
  (s_banking,   v_user_id, 'Banking & Financial Awareness',  '#fb7185', 'banking', now())
ON CONFLICT DO NOTHING;

-- ── Quantitative Aptitude ────────────────────────────────────
INSERT INTO topics (id, user_id, subject_id, name, status, pyq_frequency_weight, created_at) VALUES
  (gen_random_uuid(), v_user_id, s_quant, 'Simplification & Approximation',    'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Number Series',                      'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Quadratic Equations',                'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Data Interpretation — Tabular',      'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Data Interpretation — Bar Graph',    'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Data Interpretation — Pie Chart',    'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Data Interpretation — Line Graph',   'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Data Interpretation — Mixed/Caselet','not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Profit & Loss',                      'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Simple Interest & Compound Interest','not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Time & Work / Pipes & Cisterns',     'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Speed, Time & Distance / Boats & Streams','not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Ratio & Proportion / Partnership',   'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Percentages',                        'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Averages',                           'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Mixtures & Alligations',             'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Number System & HCF/LCM',            'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Age Problems',                       'not_started', 2, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Probability',                        'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Permutation & Combination',          'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_quant, 'Data Sufficiency (Quant)',            'not_started', 3, now())
ON CONFLICT DO NOTHING;

-- ── Reasoning & Computer Aptitude ──────────────────────────
INSERT INTO topics (id, user_id, subject_id, name, status, pyq_frequency_weight, created_at) VALUES
  (gen_random_uuid(), v_user_id, s_reasoning, 'Puzzles — Seating Arrangement (Linear/Circular)', 'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Puzzles — Floor/Box/Complex Arrangements',        'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Syllogism',                                        'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Blood Relations',                                  'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Coding-Decoding',                                  'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Inequalities (Mathematical & Coded)',              'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Alphanumeric Series & Number Series',              'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Direction Sense & Ranking',                        'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Data Sufficiency (Reasoning)',                     'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Input-Output',                                     'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Logical Reasoning / Course of Action',             'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Critical Reasoning / Assumptions',                 'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Order & Ranking',                                  'not_started', 2, now()),
  -- Computer Aptitude (part of Mains Reasoning section)
  (gen_random_uuid(), v_user_id, s_reasoning, 'Computer Basics — Hardware & Software',            'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Operating Systems & MS Office',                    'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Internet & Networking Basics',                     'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'DBMS & Data Storage Concepts',                     'not_started', 2, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Number Systems (Binary, Hexadecimal)',              'not_started', 2, now()),
  (gen_random_uuid(), v_user_id, s_reasoning, 'Cybersecurity & Computer Shortcuts',               'not_started', 2, now())
ON CONFLICT DO NOTHING;

-- ── English Language ────────────────────────────────────────
INSERT INTO topics (id, user_id, subject_id, name, status, pyq_frequency_weight, created_at) VALUES
  (gen_random_uuid(), v_user_id, s_english, 'Reading Comprehension (RC)',          'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Cloze Test',                          'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Error Spotting / Error Detection',    'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Fill in the Blanks (Single/Double)',  'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Para Jumbles',                        'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Sentence Improvement & Correction',  'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Phrase Replacement',                  'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Vocabulary — Synonyms & Antonyms',   'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Vocabulary — Idioms & Phrases',      'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Word Usage / Contextual Vocabulary', 'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Column-Based Fill in the Blanks',    'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Sentence Connectors / Starters',     'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Paragraph Conclusion / Inference',   'not_started', 4, now()),
  -- Mains Descriptive
  (gen_random_uuid(), v_user_id, s_english, 'Essay Writing (Mains Descriptive)',  'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Letter Writing (Formal/Informal)',   'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_english, 'Précis Writing',                     'not_started', 3, now())
ON CONFLICT DO NOTHING;

-- ── General / Economy / Banking / Financial Awareness ───────
INSERT INTO topics (id, user_id, subject_id, name, status, pyq_frequency_weight, created_at) VALUES
  -- Current Affairs (last 6 months before exam)
  (gen_random_uuid(), v_user_id, s_ga, 'Current Affairs — National',              'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Current Affairs — International',          'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Government Schemes & Policies',            'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Sports — Recent Championships & Awards',  'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Important Appointments & Summits',        'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Science & Technology News',               'not_started', 3, now()),
  -- Static GK
  (gen_random_uuid(), v_user_id, s_ga, 'Indian History — Ancient & Medieval',     'not_started', 2, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Indian History — Modern & Freedom Movement','not_started',3, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Indian Geography',                         'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Indian Polity & Constitution',             'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Indian Economy — Basics',                  'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Union Budget & Economic Survey',           'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'RBI — Functions, Policies & Circulars',    'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Banking System in India — Structure',      'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Types of Banks & Financial Institutions',  'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Banking Terms & Abbreviations',            'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Financial Inclusion & Digital Banking',    'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'SEBI, NABARD, SIDBI, NHB & Regulators',   'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Monetary Policy & Credit Policy',          'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'International Organisations — IMF, WB, ADB','not_started',3, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Important Awards — Padma, Nobel, etc.',    'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ga, 'Books & Authors',                           'not_started', 2, now())
ON CONFLICT DO NOTHING;

-- ============================================================
-- SSC CGL SUBJECTS (Tier 1 + Tier 2)
-- exam_type = 'ssc'
-- Source: ssc.gov.in CGL notifications (2024/2025/2026 pattern)
-- ============================================================

INSERT INTO subjects (id, user_id, name, color, exam_type, created_at)
VALUES
  (s_ssc_quant,     v_user_id, 'Quantitative Aptitude (SSC)',      '#38bdf8', 'ssc', now()),
  (s_ssc_reasoning, v_user_id, 'General Intelligence & Reasoning', '#a78bfa', 'ssc', now()),
  (s_ssc_english,   v_user_id, 'English Language & Comprehension', '#34d399', 'ssc', now()),
  (s_ssc_ga,        v_user_id, 'General Awareness (SSC)',          '#f59e0b', 'ssc', now())
ON CONFLICT DO NOTHING;

-- ── Quantitative Aptitude (SSC CGL Tier 1 + Tier 2 Paper I) ─
INSERT INTO topics (id, user_id, subject_id, name, status, pyq_frequency_weight, created_at) VALUES
  -- Arithmetic (high weight in Tier 1 & Tier 2)
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Number System & Simplification',       'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'LCM & HCF',                            'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Fractions & Decimals',                 'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Ratio & Proportion',                   'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Partnership',                          'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Percentages',                          'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Profit, Loss & Discount',              'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Simple Interest & Compound Interest',  'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Time & Work / Pipes & Cisterns',       'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Speed, Time & Distance',               'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Boats & Streams / Trains',             'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Averages',                             'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Mixtures & Alligations',               'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Age Problems',                         'not_started', 3, now()),
  -- Algebra
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Algebra — Basic Identities & Equations','not_started',5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Linear & Quadratic Equations',         'not_started', 4, now()),
  -- Geometry & Mensuration
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Geometry — Lines, Angles & Triangles', 'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Geometry — Circles & Quadrilaterals',  'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Mensuration — 2D (Area & Perimeter)',  'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Mensuration — 3D (Volume & Surface Area)','not_started',5, now()),
  -- Trigonometry
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Trigonometry — Ratios & Identities',   'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Trigonometry — Heights & Distances',   'not_started', 4, now()),
  -- Data Interpretation (Tier 2 heavy)
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Data Interpretation — Bar/Pie/Line',   'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Data Interpretation — Tables & Mixed', 'not_started', 5, now()),
  -- Statistics (Tier 2 Paper III — JSO)
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Statistics — Mean, Median, Mode',      'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Statistics — Standard Deviation & Variance','not_started',3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Probability',                          'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Permutation & Combination',            'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Coordinate Geometry',                  'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_quant, 'Surds & Indices',                      'not_started', 4, now())
ON CONFLICT DO NOTHING;

-- ── General Intelligence & Reasoning (SSC CGL) ─────────────
INSERT INTO topics (id, user_id, subject_id, name, status, pyq_frequency_weight, created_at) VALUES
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Analogies — Verbal & Non-Verbal',         'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Classification (Odd One Out)',             'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Series — Number, Letter & Figural',       'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Coding-Decoding',                          'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Blood Relations',                          'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Direction Sense',                          'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Ranking & Ordering',                       'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Syllogism',                                'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Statements & Conclusions / Assumptions',  'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Matrix — Figure & Word',                  'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Venn Diagrams',                            'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Missing Number / Figure',                  'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Embedded Figures',                         'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Paper Folding & Cutting',                  'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Mirror & Water Images',                    'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Cube & Dice',                              'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Counting of Figures',                      'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Mathematical Operations',                  'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Word Formation / Dictionary Order',        'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Calendar & Clocks',                        'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Puzzles & Seating Arrangement (Tier 2)',   'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Input-Output (Tier 2)',                    'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_reasoning, 'Critical Reasoning (Tier 2)',              'not_started', 3, now())
ON CONFLICT DO NOTHING;

-- ── English Language & Comprehension (SSC CGL) ─────────────
INSERT INTO topics (id, user_id, subject_id, name, status, pyq_frequency_weight, created_at) VALUES
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Reading Comprehension',                     'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Cloze Test',                                'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Error Spotting',                            'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Fill in the Blanks',                        'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Sentence Improvement',                      'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Para Jumbles',                              'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Active & Passive Voice',                    'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Direct & Indirect Speech',                  'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Idioms & Phrases',                          'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'One Word Substitution',                     'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Synonyms & Antonyms',                       'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Spelling Correction',                       'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Phrase/Preposition/Conjunction Usage',      'not_started', 4, now()),
  -- Tier 2 specific
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Paragraph Summary / Inference (Tier 2)',    'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Vocabulary in Context (Tier 2)',             'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_english, 'Advanced Grammar — Tenses & Clauses (Tier 2)','not_started',3, now())
ON CONFLICT DO NOTHING;

-- ── General Awareness (SSC CGL) ────────────────────────────
INSERT INTO topics (id, user_id, subject_id, name, status, pyq_frequency_weight, created_at) VALUES
  -- History
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Ancient Indian History',                        'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Medieval Indian History',                        'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Modern Indian History & Freedom Movement',       'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'World History — Key Events',                     'not_started', 2, now()),
  -- Geography
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Indian Geography — Physical',                   'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Indian Geography — Resources & Agriculture',    'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'World Geography — Continents & Features',       'not_started', 3, now()),
  -- Polity
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Indian Constitution — Fundamentals',             'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Indian Polity — Parliament & Judiciary',         'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Panchayati Raj & Local Governance',              'not_started', 3, now()),
  -- Economics
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Indian Economy — Basic Concepts',                'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Budget, Taxes & Fiscal Policy',                  'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Five Year Plans & Economic Reforms',             'not_started', 3, now()),
  -- Science (Biology, Physics, Chemistry)
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Biology — Human Body Systems',                  'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Biology — Cell, Nutrition & Diseases',          'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Physics — Laws, Motion & Electricity',          'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Physics — Light, Sound & Modern Physics',       'not_started', 4, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Chemistry — Elements, Reactions & Compounds',   'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Chemistry — Acids, Bases & Everyday Chemistry', 'not_started', 4, now()),
  -- Computer & Technology
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Computer Basics & MS Office (Tier 2)',          'not_started', 4, now()),
  -- Current Affairs
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Current Affairs — National & International',    'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Government Schemes & Policies',                  'not_started', 5, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Sports — Recent Events & Awards',               'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Important Days, Persons & Books',               'not_started', 3, now()),
  -- Static GK
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'National Parks, Rivers & Dams',                 'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'Famous Temples, Monuments & UNESCO Sites',      'not_started', 3, now()),
  (gen_random_uuid(), v_user_id, s_ssc_ga, 'International Organisations & Headquarters',    'not_started', 3, now())
ON CONFLICT DO NOTHING;

END $$;

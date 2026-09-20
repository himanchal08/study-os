alter table public.profiles add column daily_questions_cap integer not null default 250 check (daily_questions_cap >= 0);

alter table public.tasks add column questions_count integer check (questions_count >= 0);

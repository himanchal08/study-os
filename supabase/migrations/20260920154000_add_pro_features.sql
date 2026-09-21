alter table public.tasks add column if not exists checklist jsonb;

alter table public.study_sessions 
add column if not exists pomodoro_breaks_count integer default 0,
add column if not exists pomodoro_breaks_time_seconds integer default 0;

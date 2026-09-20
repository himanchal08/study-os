alter table public.tasks add column checklist jsonb;

alter table public.study_sessions 
add column pomodoro_breaks_count integer default 0,
add column pomodoro_breaks_time_seconds integer default 0;

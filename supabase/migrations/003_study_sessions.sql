
create type public.activity_type_enum as enum ('lecture', 'practice', 'revision', 'mock', 'reading', 'other');

create table if not exists public.study_sessions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  subject_id              uuid references public.subjects(id) on delete set null,
  topic_id                uuid references public.topics(id) on delete set null,
  chapter_id              uuid references public.chapters(id) on delete set null,
  activity_type           public.activity_type_enum not null default 'practice',
  start_timestamp         timestamptz not null default now(),
  end_timestamp           timestamptz,               -- NULL = session is still active
  pause_duration_seconds  integer not null default 0 check (pause_duration_seconds >= 0),
  notes                   text,
  task_id                 uuid,                      -- optional link to tasks table
  -- Idempotency key (LLM rules §4.1)
  client_generated_id     uuid unique,
  source_client           public.source_client_enum not null default 'web',
  deleted_at              timestamptz,               -- soft delete
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint end_after_start check (end_timestamp is null or end_timestamp > start_timestamp)
);

create unique index study_sessions_one_active_per_user
  on public.study_sessions (user_id)
  where end_timestamp is null;

-- RLS
alter table public.study_sessions enable row level security;
create policy "study_sessions: select own" on public.study_sessions for select using (auth.uid() = user_id);
create policy "study_sessions: insert own" on public.study_sessions for insert with check (auth.uid() = user_id);
create policy "study_sessions: update own" on public.study_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "study_sessions: delete own" on public.study_sessions for delete using (auth.uid() = user_id);

create trigger study_sessions_updated_at
  before update on public.study_sessions
  for each row execute function public.set_updated_at();

-- Index for common queries
create index study_sessions_user_start on public.study_sessions (user_id, start_timestamp desc);
create index study_sessions_subject on public.study_sessions (user_id, subject_id) where deleted_at is null;
create index study_sessions_topic on public.study_sessions (user_id, topic_id) where deleted_at is null;

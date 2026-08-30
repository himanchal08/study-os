
create type public.revision_cycle_enum as enum ('daily', 'weekly', 'monthly');

create table if not exists public.revisions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  topic_id                uuid not null references public.topics(id) on delete cascade,
  source_session_id       uuid references public.study_sessions(id) on delete set null,
  cycle_type              public.revision_cycle_enum not null,
  due_date                date not null,
  completed_at            timestamptz,
  -- Optional recall test score (0–5 for adaptive interval, New Feature #1)
  recall_score            integer check (recall_score between 0 and 5),
  -- Adaptive interval overlay (opt-in per user settings)
  is_adaptive             boolean not null default false,
  adaptive_interval_days  integer check (adaptive_interval_days > 0),
  -- Grace window for early completion (PRD §E, default 0)
  grace_window_days       integer not null default 0 check (grace_window_days >= 0),
  client_generated_id     uuid,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- DB-level deduplication: second generation attempt is a no-op (PRD §C)
  constraint revisions_no_duplicate unique (user_id, topic_id, cycle_type, due_date)
);

alter table public.revisions enable row level security;
create policy "revisions: select own" on public.revisions for select using (auth.uid() = user_id);
create policy "revisions: insert own" on public.revisions for insert with check (auth.uid() = user_id);
create policy "revisions: update own" on public.revisions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "revisions: delete own" on public.revisions for delete using (auth.uid() = user_id);
create trigger revisions_updated_at before update on public.revisions for each row execute function public.set_updated_at();

create index revisions_user_due on public.revisions (user_id, due_date) where completed_at is null;
create index revisions_topic on public.revisions (user_id, topic_id);

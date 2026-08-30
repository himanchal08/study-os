-- ============================================================
-- Migration 008: mocks
-- Idempotency key on creation (PRD §C).
-- Full validation at DB level (PRD §E).
-- ============================================================

create table if not exists public.mocks (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  source                      text not null,  -- "Testbook", "Oliveboard", "PYQ", etc.
  exam_type                   public.exam_type_enum not null default 'banking',
  stage                       text,           -- "Prelims", "Mains", etc.
  name                        text not null,
  mock_date                   date not null,
  -- Marks out of N, not normalized — see metric dictionary
  maximum_marks               numeric(6,2) not null check (maximum_marks > 0),
  score                       numeric(6,2) not null check (score >= 0),
  attempted                   integer not null check (attempted >= 0),
  correct                     integer not null check (correct >= 0),
  wrong                       integer not null check (wrong >= 0),
  unattempted                 integer not null check (unattempted >= 0),
  -- PRD §E: correct + wrong + unattempted = attempted
  constraint mocks_counts_valid check (correct + wrong + unattempted = attempted),
  -- PRD §E: score <= maximum_marks
  constraint mocks_score_valid check (score <= maximum_marks),
  actual_duration_minutes     integer not null check (actual_duration_minutes > 0),
  recommended_duration_minutes integer check (recommended_duration_minutes > 0),
  percentile                  numeric(5,2) check (percentile between 0 and 100),
  rank                        integer check (rank > 0),
  notes                       text,
  -- Idempotency key (PRD §C)
  client_generated_id         uuid unique,
  source_client               public.source_client_enum not null default 'web',
  deleted_at                  timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

alter table public.mocks enable row level security;
create policy "mocks: select own" on public.mocks for select using (auth.uid() = user_id);
create policy "mocks: insert own" on public.mocks for insert with check (auth.uid() = user_id);
create policy "mocks: update own" on public.mocks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mocks: delete own" on public.mocks for delete using (auth.uid() = user_id);
create trigger mocks_updated_at before update on public.mocks for each row execute function public.set_updated_at();

create index mocks_user_date on public.mocks (user_id, mock_date desc) where deleted_at is null;

-- Mock sections (optional per-section breakdown)
create table if not exists public.mock_sections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  mock_id         uuid not null references public.mocks(id) on delete cascade,
  name            text not null,
  maximum_marks   numeric(6,2) not null check (maximum_marks > 0),
  score           numeric(6,2) not null check (score >= 0),
  attempted       integer not null check (attempted >= 0),
  correct         integer not null check (correct >= 0),
  wrong           integer not null check (wrong >= 0),
  unattempted     integer not null check (unattempted >= 0),
  constraint ms_counts_valid check (correct + wrong + unattempted = attempted),
  constraint ms_score_valid check (score <= maximum_marks),
  duration_minutes integer check (duration_minutes > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.mock_sections enable row level security;
create policy "mock_sections: select own" on public.mock_sections for select using (auth.uid() = user_id);
create policy "mock_sections: insert own" on public.mock_sections for insert with check (auth.uid() = user_id);
create policy "mock_sections: update own" on public.mock_sections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mock_sections: delete own" on public.mock_sections for delete using (auth.uid() = user_id);
create trigger mock_sections_updated_at before update on public.mock_sections for each row execute function public.set_updated_at();

-- Mock topic results
create table if not exists public.mock_topic_results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  mock_id     uuid not null references public.mocks(id) on delete cascade,
  topic_id    uuid not null references public.topics(id) on delete cascade,
  attempted   integer not null check (attempted >= 0),
  correct     integer not null check (correct >= 0),
  wrong       integer not null check (wrong >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.mock_topic_results enable row level security;
create policy "mock_topic_results: select own" on public.mock_topic_results for select using (auth.uid() = user_id);
create policy "mock_topic_results: insert own" on public.mock_topic_results for insert with check (auth.uid() = user_id);
create policy "mock_topic_results: update own" on public.mock_topic_results for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mock_topic_results: delete own" on public.mock_topic_results for delete using (auth.uid() = user_id);
create trigger mock_topic_results_updated_at before update on public.mock_topic_results for each row execute function public.set_updated_at();

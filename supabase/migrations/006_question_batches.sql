-- ============================================================
-- Migration 006: question_batches
-- Full validation enforced at DB level (PRD §E).
-- ============================================================

create table if not exists public.question_batches (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  session_id          uuid references public.study_sessions(id) on delete set null,
  subject_id          uuid references public.subjects(id) on delete set null,
  topic_id            uuid references public.topics(id) on delete set null,
  chapter_id          uuid references public.chapters(id) on delete set null,
  source              text,     -- e.g. "DPP", "PYQ 2023", "Testbook"
  attempted           integer not null check (attempted > 0),
  correct             integer not null default 0 check (correct >= 0),
  wrong               integer not null default 0 check (wrong >= 0),
  skipped             integer not null default 0 check (skipped >= 0),
  -- PRD §E: correct + wrong + skipped <= attempted
  constraint qb_counts_valid check (correct + wrong + skipped <= attempted),
  duration_minutes    integer check (duration_minutes > 0),
  notes               text,
  logged_at           timestamptz not null default now(),
  client_generated_id uuid unique,
  source_client       public.source_client_enum not null default 'web',
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.question_batches enable row level security;
create policy "question_batches: select own" on public.question_batches for select using (auth.uid() = user_id);
create policy "question_batches: insert own" on public.question_batches for insert with check (auth.uid() = user_id);
create policy "question_batches: update own" on public.question_batches for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "question_batches: delete own" on public.question_batches for delete using (auth.uid() = user_id);
create trigger question_batches_updated_at before update on public.question_batches for each row execute function public.set_updated_at();

create index qb_user_logged on public.question_batches (user_id, logged_at desc) where deleted_at is null;
create index qb_topic on public.question_batches (user_id, topic_id) where deleted_at is null;

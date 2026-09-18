create type public.exam_type_enum as enum ('banking', 'ssc', 'both', 'other');
create type public.source_client_enum as enum ('web', 'extension', 'android', 'import');
create type public.topic_status_enum as enum ('not_started', 'learning', 'learned', 'revising', 'strong', 'weak');

create table if not exists public.subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  exam_type   public.exam_type_enum not null default 'both',
  color       text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

alter table public.subjects enable row level security;
create policy "subjects: select own" on public.subjects for select using (auth.uid() = user_id);
create policy "subjects: insert own" on public.subjects for insert with check (auth.uid() = user_id);
create policy "subjects: update own" on public.subjects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subjects: delete own" on public.subjects for delete using (auth.uid() = user_id);
create trigger subjects_updated_at before update on public.subjects for each row execute function public.set_updated_at();

create table if not exists public.topics (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  subject_id           uuid not null references public.subjects(id) on delete cascade,
  name                 text not null,
  status               public.topic_status_enum not null default 'not_started',
  pyq_frequency_weight integer check (pyq_frequency_weight between 1 and 5),
  archived_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

alter table public.topics enable row level security;
create policy "topics: select own" on public.topics for select using (auth.uid() = user_id);
create policy "topics: insert own" on public.topics for insert with check (auth.uid() = user_id);
create policy "topics: update own" on public.topics for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "topics: delete own" on public.topics for delete using (auth.uid() = user_id);
create trigger topics_updated_at before update on public.topics for each row execute function public.set_updated_at();

create table if not exists public.topic_aliases (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  archived_topic_id     uuid not null references public.topics(id),
  merged_into_topic_id  uuid not null references public.topics(id),
  merged_at             timestamptz not null default now(),
  created_at            timestamptz not null default now()
);

alter table public.topic_aliases enable row level security;
create policy "topic_aliases: select own" on public.topic_aliases for select using (auth.uid() = user_id);
create policy "topic_aliases: insert own" on public.topic_aliases for insert with check (auth.uid() = user_id);
create policy "topic_aliases: no update" on public.topic_aliases for update using (false);
create policy "topic_aliases: no delete" on public.topic_aliases for delete using (false);

create table if not exists public.chapters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  topic_id    uuid not null references public.topics(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

alter table public.chapters enable row level security;
create policy "chapters: select own" on public.chapters for select using (auth.uid() = user_id);
create policy "chapters: insert own" on public.chapters for insert with check (auth.uid() = user_id);
create policy "chapters: update own" on public.chapters for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "chapters: delete own" on public.chapters for delete using (auth.uid() = user_id);
create trigger chapters_updated_at before update on public.chapters for each row execute function public.set_updated_at();


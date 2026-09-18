create table if not exists public.cutoffs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  exam_type     public.exam_type_enum not null,
  stage         text not null,
  year          integer not null check (year > 2000 and year <= 2100),
  category      text not null default 'General',
  maximum_marks numeric(6,2) not null check (maximum_marks > 0),
  cutoff        numeric(6,2) not null check (cutoff >= 0 and cutoff <= maximum_marks),
  reference     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.cutoffs enable row level security;
create policy "cutoffs: select own" on public.cutoffs for select using (auth.uid() = user_id);
create policy "cutoffs: insert own" on public.cutoffs for insert with check (auth.uid() = user_id);
create policy "cutoffs: update own" on public.cutoffs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cutoffs: delete own" on public.cutoffs for delete using (auth.uid() = user_id);
create trigger cutoffs_updated_at before update on public.cutoffs for each row execute function public.set_updated_at();

create table if not exists public.targets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  metric      text not null,
  period_type text not null check (period_type in ('daily', 'weekly', 'monthly')),
  target_value numeric(8,2) not null check (target_value > 0),
  start_date  date not null,
  end_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.targets enable row level security;
create policy "targets: select own" on public.targets for select using (auth.uid() = user_id);
create policy "targets: insert own" on public.targets for insert with check (auth.uid() = user_id);
create policy "targets: update own" on public.targets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "targets: delete own" on public.targets for delete using (auth.uid() = user_id);
create trigger targets_updated_at before update on public.targets for each row execute function public.set_updated_at();

create type public.annotation_tag_enum as enum ('sick', 'travel', 'family', 'exam_day', 'holiday', 'custom');

create table if not exists public.day_annotations (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  date                  date not null,
  tag                   public.annotation_tag_enum not null,
  note                  text,
  exclude_from_trends   boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint day_annotations_unique_date unique (user_id, date)
);

alter table public.day_annotations enable row level security;
create policy "day_annotations: select own" on public.day_annotations for select using (auth.uid() = user_id);
create policy "day_annotations: insert own" on public.day_annotations for insert with check (auth.uid() = user_id);
create policy "day_annotations: update own" on public.day_annotations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "day_annotations: delete own" on public.day_annotations for delete using (auth.uid() = user_id);
create trigger day_annotations_updated_at before update on public.day_annotations for each row execute function public.set_updated_at();

create table if not exists public.exams (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  exam_type           public.exam_type_enum not null default 'banking',
  stage               text,
  exam_date           date,
  safety_target_score numeric(6,2) check (safety_target_score >= 0),
  maximum_marks       numeric(6,2) check (maximum_marks > 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

alter table public.exams enable row level security;
create policy "exams: select own" on public.exams for select using (auth.uid() = user_id);
create policy "exams: insert own" on public.exams for insert with check (auth.uid() = user_id);
create policy "exams: update own" on public.exams for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exams: delete own" on public.exams for delete using (auth.uid() = user_id);
create trigger exams_updated_at before update on public.exams for each row execute function public.set_updated_at();

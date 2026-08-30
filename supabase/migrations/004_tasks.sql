
create type public.task_status_enum as enum ('pending', 'in_progress', 'completed', 'postponed', 'cancelled');

create table if not exists public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  subject_id          uuid references public.subjects(id) on delete set null,
  topic_id            uuid references public.topics(id) on delete set null,
  title               text not null,
  status              public.task_status_enum not null default 'pending',
  planned_date        date not null,
  -- v3: due_date >= planned_date enforced at DB level
  due_date            date check (due_date is null or due_date >= planned_date),
  estimated_minutes   integer check (estimated_minutes > 0),
  actual_minutes      integer check (actual_minutes >= 0),
  failure_reason      text,
  postpone_count      integer not null default 0 check (postpone_count >= 0),
  -- Recurring tasks: generate concrete rows, not virtual recurrences
  is_recurring        boolean not null default false,
  recurrence_pattern  text,    -- e.g. "daily", "weekdays", "weekly:monday"
  parent_task_id      uuid references public.tasks(id) on delete set null,
  client_generated_id uuid unique,
  source_client       public.source_client_enum not null default 'web',
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.tasks enable row level security;
create policy "tasks: select own" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks: insert own" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks: update own" on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks: delete own" on public.tasks for delete using (auth.uid() = user_id);
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();

create index tasks_user_planned on public.tasks (user_id, planned_date desc) where deleted_at is null;
create index tasks_user_status on public.tasks (user_id, status) where deleted_at is null;

-- Task events (for planning analytics — Phase 14)
create table if not exists public.task_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  task_id     uuid not null references public.tasks(id) on delete cascade,
  event_type  text not null,  -- 'created' | 'started' | 'completed' | 'postponed' | 'cancelled'
  notes       text,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

alter table public.task_events enable row level security;
create policy "task_events: select own" on public.task_events for select using (auth.uid() = user_id);
create policy "task_events: insert own" on public.task_events for insert with check (auth.uid() = user_id);
create policy "task_events: no update" on public.task_events for update using (false);
create policy "task_events: no delete" on public.task_events for delete using (false);

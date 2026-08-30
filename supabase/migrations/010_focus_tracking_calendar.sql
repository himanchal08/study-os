-- ============================================================
-- Migration 010: focus tracking (browser + phone events)
-- Browser extension MV3 (Phase 16) + Android companion (Phase 17).
-- ============================================================

create type public.browser_event_type_enum as enum ('tab_switch', 'distraction_start', 'distraction_end', 'return_to_study');
create type public.phone_event_type_enum as enum ('app_open', 'app_close', 'distraction_start', 'distraction_end');

-- Focus sessions (one per study session per client)
create table if not exists public.focus_sessions (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  session_id                  uuid not null references public.study_sessions(id) on delete cascade,
  total_distraction_seconds   integer not null default 0 check (total_distraction_seconds >= 0),
  interruption_count          integer not null default 0 check (interruption_count >= 0),
  source_client               public.source_client_enum not null default 'extension',
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

alter table public.focus_sessions enable row level security;
create policy "focus_sessions: select own" on public.focus_sessions for select using (auth.uid() = user_id);
create policy "focus_sessions: insert own" on public.focus_sessions for insert with check (auth.uid() = user_id);
create policy "focus_sessions: update own" on public.focus_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "focus_sessions: delete own" on public.focus_sessions for delete using (auth.uid() = user_id);
create trigger focus_sessions_updated_at before update on public.focus_sessions for each row execute function public.set_updated_at();

-- Browser events (raw telemetry from MV3 extension)
create table if not exists public.browser_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  session_id        uuid not null references public.study_sessions(id) on delete cascade,
  focus_session_id  uuid references public.focus_sessions(id) on delete set null,
  domain            text not null,
  title             text,
  event_type        public.browser_event_type_enum not null,
  occurred_at       timestamptz not null default now(),
  duration_seconds  integer check (duration_seconds >= 0),
  source_client     public.source_client_enum not null default 'extension',
  created_at        timestamptz not null default now()
);

alter table public.browser_events enable row level security;
create policy "browser_events: select own" on public.browser_events for select using (auth.uid() = user_id);
create policy "browser_events: insert own" on public.browser_events for insert with check (auth.uid() = user_id);
create policy "browser_events: no update" on public.browser_events for update using (false);
create policy "browser_events: no delete" on public.browser_events for delete using (false);

create index browser_events_session on public.browser_events (user_id, session_id);

-- Phone events (raw telemetry from Android companion)
create table if not exists public.phone_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  session_id        uuid not null references public.study_sessions(id) on delete cascade,
  app_package       text not null,
  app_name          text,
  event_type        public.phone_event_type_enum not null,
  occurred_at       timestamptz not null default now(),
  duration_seconds  integer check (duration_seconds >= 0),
  source_client     public.source_client_enum not null default 'android',
  created_at        timestamptz not null default now()
);

alter table public.phone_events enable row level security;
create policy "phone_events: select own" on public.phone_events for select using (auth.uid() = user_id);
create policy "phone_events: insert own" on public.phone_events for insert with check (auth.uid() = user_id);
create policy "phone_events: no update" on public.phone_events for update using (false);
create policy "phone_events: no delete" on public.phone_events for delete using (false);

create index phone_events_session on public.phone_events (user_id, session_id);

-- Calendar sync events (Phase 5)
create table if not exists public.calendar_sync_events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  source_type         text not null,   -- 'study_session' | 'revision' | 'task' | 'mock'
  source_id           uuid not null,
  google_event_id     text,            -- stable external event ID for update/delete
  synced_at           timestamptz,
  sync_status         text not null default 'pending',  -- 'pending' | 'synced' | 'failed'
  error_message       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.calendar_sync_events enable row level security;
create policy "calendar_sync: select own" on public.calendar_sync_events for select using (auth.uid() = user_id);
create policy "calendar_sync: insert own" on public.calendar_sync_events for insert with check (auth.uid() = user_id);
create policy "calendar_sync: update own" on public.calendar_sync_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "calendar_sync: delete own" on public.calendar_sync_events for delete using (auth.uid() = user_id);
create trigger calendar_sync_updated_at before update on public.calendar_sync_events for each row execute function public.set_updated_at();

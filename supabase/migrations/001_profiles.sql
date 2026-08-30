-- ============================================================
-- Migration 001: profiles
-- Every user gets a profile row on sign-up (via trigger).
-- Stores day-boundary offset and timezone for all aggregation.
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Updated_at trigger function (shared by all tables)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null unique references auth.users(id) on delete cascade,
  full_name                   text,
  exam_targets                text[] default '{}',
  -- hours out of 24; not normalized — see metric dictionary
  daily_target_hours          numeric(4,1) not null default 8.0,
  -- day ends at midnight + this offset. 0 = midnight, 180 = 3:00 AM
  day_boundary_offset_minutes integer not null default 0 check (day_boundary_offset_minutes >= 0 and day_boundary_offset_minutes < 1440),
  -- IANA timezone string, e.g. "Asia/Kolkata"
  timezone                    text not null default 'Asia/Kolkata',
  onboarding_complete         boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- RLS (LLM rules §3: every operation explicitly)
alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "profiles: delete own"
  on public.profiles for delete
  using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

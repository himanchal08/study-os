-- Add skip_count to revisions for rollover logic
alter table public.revisions
  add column if not exists skip_count integer not null default 0;

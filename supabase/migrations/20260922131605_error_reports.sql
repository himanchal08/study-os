create table public.error_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  digest text,
  message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.error_reports enable row level security;

create policy "Anyone can insert error reports"
  on public.error_reports for insert
  with check (true);

create policy "Admins can read error reports"
  on public.error_reports for select
  using (auth.role() = 'service_role');

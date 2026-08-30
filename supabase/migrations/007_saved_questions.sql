create type public.error_category_enum as enum ('concept', 'calculation', 'reading', 'silly', 'time', 'other');

create table if not exists public.saved_questions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  subject_id          uuid references public.subjects(id) on delete set null,
  topic_id            uuid references public.topics(id) on delete set null,
  source              text,
  exam_type           public.exam_type_enum,
  error_category      public.error_category_enum,
  explanation         text,
  -- Path in Supabase Storage bucket, scoped to {user_id}/saved-questions/...
  image_path          text,
  review_count        integer not null default 0 check (review_count >= 0),
  next_review_date    date,
  linked_revision_id  uuid references public.revisions(id) on delete set null,
  client_generated_id uuid unique,
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.saved_questions enable row level security;
create policy "saved_questions: select own" on public.saved_questions for select using (auth.uid() = user_id);
create policy "saved_questions: insert own" on public.saved_questions for insert with check (auth.uid() = user_id);
create policy "saved_questions: update own" on public.saved_questions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saved_questions: delete own" on public.saved_questions for delete using (auth.uid() = user_id);
create trigger saved_questions_updated_at before update on public.saved_questions for each row execute function public.set_updated_at();

-- Storage bucket (created via Supabase dashboard or CLI, policy below)
-- Bucket name: "question-images"
-- Path pattern: {user_id}/saved-questions/{filename}
-- Policy SQL (apply in Supabase Storage policies):
--   create policy "storage: select own questions"
--     on storage.objects for select using (bucket_id = 'question-images' and (storage.foldername(name))[1] = auth.uid()::text);
--   create policy "storage: insert own questions"
--     on storage.objects for insert with check (bucket_id = 'question-images' and (storage.foldername(name))[1] = auth.uid()::text);
--   create policy "storage: delete own questions"
--     on storage.objects for delete using (bucket_id = 'question-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Fix mocks_counts_valid: "attempted" means questions tried (correct + wrong),
-- not total questions. Unattempted (skipped) are separate from attempted.
alter table public.mocks
  drop constraint mocks_counts_valid,
  add constraint mocks_counts_valid check (correct + wrong = attempted);

-- Same fix for mock_sections
alter table public.mock_sections
  drop constraint ms_counts_valid,
  add constraint ms_counts_valid check (correct + wrong = attempted);

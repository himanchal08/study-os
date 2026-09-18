ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_refresh_token text,
ADD COLUMN IF NOT EXISTS tutorial_completed boolean DEFAULT false;


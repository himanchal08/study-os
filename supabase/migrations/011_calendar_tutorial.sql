-- Migration 011: Calendar & Tutorial 

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_refresh_token text,
ADD COLUMN IF NOT EXISTS tutorial_completed boolean DEFAULT false;

-- Update types for TypeScript (will be reflected in next type generation)

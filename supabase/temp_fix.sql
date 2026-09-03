UPDATE public.subjects SET name = REPLACE(name, 'â€“', '-');
UPDATE public.subjects SET name = REPLACE(name, '–', '-');

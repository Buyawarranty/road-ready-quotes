ALTER TABLE public.dealer_bogof_settings ALTER COLUMN enabled SET DEFAULT false;
ALTER TABLE public.dealer_bogof_settings ADD COLUMN IF NOT EXISTS eyebrow text NOT NULL DEFAULT 'Trade offer';
UPDATE public.dealer_bogof_settings SET enabled = false, banner_title = 'Buy one, get the next one FREE', banner_text = 'Up to 3 years'' cover' WHERE id = 1;
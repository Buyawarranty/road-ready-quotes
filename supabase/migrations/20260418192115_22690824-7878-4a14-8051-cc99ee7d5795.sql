-- Allow partial dealer quote drafts so users can save & resume mid-journey
ALTER TABLE public.dealer_quotes
  ADD COLUMN IF NOT EXISTS current_step smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vehicle_year text,
  ADD COLUMN IF NOT EXISTS vehicle_fuel_type text,
  ADD COLUMN IF NOT EXISTS vehicle_transmission text;

-- Relax NOT NULL constraints so a draft can be saved before all fields are filled
ALTER TABLE public.dealer_quotes ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE public.dealer_quotes ALTER COLUMN warranty_duration DROP NOT NULL;
ALTER TABLE public.dealer_quotes ALTER COLUMN plan_type DROP NOT NULL;
ALTER TABLE public.dealer_quotes ALTER COLUMN status SET DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_dealer_quotes_current_step ON public.dealer_quotes(current_step);
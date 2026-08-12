ALTER TYPE public.trade_warranty_signup_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.trade_warranty_signup_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TABLE public.trade_warranty_signups
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_notes text,
  ADD COLUMN IF NOT EXISTS dealer_id uuid REFERENCES public.dealers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;
GRANT SELECT, UPDATE ON public.trade_warranty_signups TO authenticated;
GRANT ALL ON public.trade_warranty_signups TO service_role;
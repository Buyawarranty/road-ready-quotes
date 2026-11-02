ALTER TABLE public.dealer_admin_claims
  ADD COLUMN IF NOT EXISTS baw_submission_id uuid,
  ADD COLUMN IF NOT EXISTS forward_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS forwarded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS forward_error text;

CREATE INDEX IF NOT EXISTS dealer_admin_claims_forward_status_idx
  ON public.dealer_admin_claims (forward_status);
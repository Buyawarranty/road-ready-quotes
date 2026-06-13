
DO $$ BEGIN
  CREATE TYPE public.trade_warranty_signup_status AS ENUM ('new', 'contacted', 'qualified', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.trade_warranty_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_name text,
  contact_name text,
  email_address text NOT NULL,
  phone_number text NOT NULL,
  monthly_vehicle_sales text,
  current_warranty_provider text,
  interested_in text,
  additional_information text,
  status public.trade_warranty_signup_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_warranty_signups_created_at
  ON public.trade_warranty_signups (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_warranty_signups_status
  ON public.trade_warranty_signups (status);

GRANT INSERT ON public.trade_warranty_signups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_warranty_signups TO authenticated;
GRANT ALL ON public.trade_warranty_signups TO service_role;

ALTER TABLE public.trade_warranty_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a trade warranty signup"
  ON public.trade_warranty_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view signups"
  ON public.trade_warranty_signups FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update signups"
  ON public.trade_warranty_signups FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete signups"
  ON public.trade_warranty_signups FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_trade_warranty_signups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_trade_warranty_signups_updated_at ON public.trade_warranty_signups;
CREATE TRIGGER trg_trade_warranty_signups_updated_at
  BEFORE UPDATE ON public.trade_warranty_signups
  FOR EACH ROW EXECUTE FUNCTION public.set_trade_warranty_signups_updated_at();

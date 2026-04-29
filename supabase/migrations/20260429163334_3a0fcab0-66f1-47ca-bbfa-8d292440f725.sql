CREATE TABLE IF NOT EXISTS public.dealer_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  email_normalized TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
  phone TEXT,
  mobile TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  county TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'United Kingdom',
  registration_plate TEXT,
  registration_plate_normalized TEXT GENERATED ALWAYS AS (upper(regexp_replace(coalesce(registration_plate,''), '\s+', '', 'g'))) STORED,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INT,
  vehicle_mileage INT,
  vehicle_fuel_type TEXT,
  plan_type TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  signup_date TIMESTAMPTZ,
  notes TEXT,
  assigned_to UUID,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dealer_customers_email ON public.dealer_customers(email_normalized);
CREATE INDEX IF NOT EXISTS idx_dealer_customers_reg ON public.dealer_customers(registration_plate_normalized);
CREATE INDEX IF NOT EXISTS idx_dealer_customers_dealer ON public.dealer_customers(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_customers_status ON public.dealer_customers(status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dealer_customers_signup ON public.dealer_customers(signup_date DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_dealer_customers_updated_at ON public.dealer_customers;
CREATE TRIGGER trg_dealer_customers_updated_at
BEFORE UPDATE ON public.dealer_customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.dealer_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dealer customers"
ON public.dealer_customers FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert dealer customers"
ON public.dealer_customers FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update dealer customers"
ON public.dealer_customers FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete dealer customers"
ON public.dealer_customers FOR DELETE
USING (public.is_admin(auth.uid()));
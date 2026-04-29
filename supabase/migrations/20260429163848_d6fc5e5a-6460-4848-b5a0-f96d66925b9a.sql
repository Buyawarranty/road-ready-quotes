CREATE TABLE IF NOT EXISTS public.dealer_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  email_normalized TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
  phone TEXT,
  mobile TEXT,
  registration_plate TEXT,
  registration_plate_normalized TEXT GENERATED ALWAYS AS (upper(regexp_replace(coalesce(registration_plate,''), '\s+', '', 'g'))) STORED,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INT,
  vehicle_mileage INT,
  plan_interest TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  assigned_to UUID,
  callback_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dealer_leads_email ON public.dealer_leads(email_normalized);
CREATE INDEX IF NOT EXISTS idx_dealer_leads_reg ON public.dealer_leads(registration_plate_normalized);
CREATE INDEX IF NOT EXISTS idx_dealer_leads_dealer ON public.dealer_leads(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_leads_status ON public.dealer_leads(status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dealer_leads_assigned ON public.dealer_leads(assigned_to) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dealer_leads_callback ON public.dealer_leads(callback_at) WHERE callback_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dealer_leads_created ON public.dealer_leads(created_at DESC);

DROP TRIGGER IF EXISTS trg_dealer_leads_updated_at ON public.dealer_leads;
CREATE TRIGGER trg_dealer_leads_updated_at
BEFORE UPDATE ON public.dealer_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.dealer_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dealer leads"
ON public.dealer_leads FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert dealer leads"
ON public.dealer_leads FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update dealer leads"
ON public.dealer_leads FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete dealer leads"
ON public.dealer_leads FOR DELETE
USING (public.is_admin(auth.uid()));
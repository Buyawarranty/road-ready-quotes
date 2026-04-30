-- Dealer Admin Claims table
CREATE TABLE public.dealer_admin_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.dealer_customers(id) ON DELETE SET NULL,
  claim_reference TEXT NOT NULL UNIQUE DEFAULT ('DC-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random() * 10000))::text, 4, '0')),
  customer_name TEXT,
  customer_email TEXT,
  customer_email_normalized TEXT GENERATED ALWAYS AS (lower(trim(customer_email))) STORED,
  customer_phone TEXT,
  registration_plate TEXT,
  registration_plate_normalized TEXT GENERATED ALWAYS AS (upper(regexp_replace(coalesce(registration_plate,''), '\s+', '', 'g'))) STORED,
  vehicle_make TEXT,
  vehicle_model TEXT,
  fault_description TEXT,
  repair_garage TEXT,
  repair_estimate NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'new',
  risk_level TEXT DEFAULT 'medium',
  approved_amount NUMERIC(10,2),
  paid_amount NUMERIC(10,2),
  assigned_to UUID,
  internal_notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dealer_admin_claims_dealer ON public.dealer_admin_claims(dealer_id);
CREATE INDEX idx_dealer_admin_claims_status ON public.dealer_admin_claims(status);
CREATE INDEX idx_dealer_admin_claims_reg ON public.dealer_admin_claims(registration_plate_normalized);
CREATE INDEX idx_dealer_admin_claims_email ON public.dealer_admin_claims(customer_email_normalized);

ALTER TABLE public.dealer_admin_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dealer admin claims"
  ON public.dealer_admin_claims FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert dealer admin claims"
  ON public.dealer_admin_claims FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update dealer admin claims"
  ON public.dealer_admin_claims FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete dealer admin claims"
  ON public.dealer_admin_claims FOR DELETE
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_dealer_admin_claims_updated_at
  BEFORE UPDATE ON public.dealer_admin_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Private storage bucket for claim attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('dealer-admin-claims', 'dealer-admin-claims', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can view dealer admin claim files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dealer-admin-claims' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can upload dealer admin claim files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dealer-admin-claims' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update dealer admin claim files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'dealer-admin-claims' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete dealer admin claim files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'dealer-admin-claims' AND public.is_admin(auth.uid()));
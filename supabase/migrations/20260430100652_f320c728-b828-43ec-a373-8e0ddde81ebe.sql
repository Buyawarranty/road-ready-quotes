
CREATE TABLE public.dealer_admin_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'standard',
  vehicle_type TEXT,
  description TEXT,
  monthly_price NUMERIC DEFAULT 0,
  yearly_price NUMERIC DEFAULT 0,
  three_yearly_price NUMERIC DEFAULT 0,
  pricing_matrix JSONB DEFAULT '{}'::jsonb,
  coverage_details JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dealer_admin_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dealer admin plans"
  ON public.dealer_admin_plans FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert dealer admin plans"
  ON public.dealer_admin_plans FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update dealer admin plans"
  ON public.dealer_admin_plans FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete dealer admin plans"
  ON public.dealer_admin_plans FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_dealer_admin_plans_updated_at
  BEFORE UPDATE ON public.dealer_admin_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dealer_admin_plans_active ON public.dealer_admin_plans(is_active);
CREATE INDEX idx_dealer_admin_plans_type ON public.dealer_admin_plans(plan_type);

CREATE TABLE public.dealer_admin_bulk_pricing_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dealer_admin_bulk_pricing_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bulk pricing uploads"
  ON public.dealer_admin_bulk_pricing_uploads FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert bulk pricing uploads"
  ON public.dealer_admin_bulk_pricing_uploads FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update bulk pricing uploads"
  ON public.dealer_admin_bulk_pricing_uploads FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete bulk pricing uploads"
  ON public.dealer_admin_bulk_pricing_uploads FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_dealer_admin_bulk_pricing_uploads_updated_at
  BEFORE UPDATE ON public.dealer_admin_bulk_pricing_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

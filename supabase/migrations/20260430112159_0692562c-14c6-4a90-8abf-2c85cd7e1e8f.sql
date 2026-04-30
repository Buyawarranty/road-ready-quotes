CREATE TABLE IF NOT EXISTS public.dealer_admin_pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  registration_type TEXT DEFAULT 'dealer',
  status TEXT DEFAULT 'pending',
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dealer_admin_pending_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pending registrations"
  ON public.dealer_admin_pending_registrations
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_dealer_admin_pending_registrations_updated_at
  BEFORE UPDATE ON public.dealer_admin_pending_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
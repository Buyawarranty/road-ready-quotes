
-- Document mappings
CREATE TABLE public.dealer_admin_document_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'standard',
  document_path TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dealer_admin_document_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage document mappings"
  ON public.dealer_admin_document_mappings FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_dam_doc_mappings_updated
  BEFORE UPDATE ON public.dealer_admin_document_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Policy letter templates
CREATE TABLE public.dealer_admin_policy_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_name TEXT NOT NULL,
  letter_type TEXT NOT NULL DEFAULT 'welcome',
  subject TEXT,
  body TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dealer_admin_policy_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage policy letters"
  ON public.dealer_admin_policy_letters FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_dam_policy_letters_updated
  BEFORE UPDATE ON public.dealer_admin_policy_letters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Posted letters log
CREATE TABLE public.dealer_admin_posted_letters_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_address TEXT,
  letter_type TEXT NOT NULL DEFAULT 'welcome',
  letter_id UUID,
  status TEXT NOT NULL DEFAULT 'printed',
  tracking_ref TEXT,
  posted_by TEXT,
  notes TEXT,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dealer_admin_posted_letters_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage posted letters log"
  ON public.dealer_admin_posted_letters_log FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_dam_posted_letters_updated
  BEFORE UPDATE ON public.dealer_admin_posted_letters_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dam_posted_letters_at ON public.dealer_admin_posted_letters_log(posted_at DESC);
CREATE INDEX idx_dam_doc_mappings_plan ON public.dealer_admin_document_mappings(plan_name);

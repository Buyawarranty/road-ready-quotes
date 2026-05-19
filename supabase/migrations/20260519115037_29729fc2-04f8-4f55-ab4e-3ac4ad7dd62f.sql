
DO $$ BEGIN
  CREATE TYPE public.finance_application_status AS ENUM (
    'draft','submitted','pre_screen','underwriting','referred',
    'approved','docs_pending','payout_pending','paid','completed',
    'declined','withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.dealers
  ADD COLUMN IF NOT EXISTS trading_name text,
  ADD COLUMN IF NOT EXISTS fca_number text,
  ADD COLUMN IF NOT EXISTS finance_limit numeric,
  ADD COLUMN IF NOT EXISTS commission_tier text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

CREATE OR REPLACE FUNCTION public.current_dealer_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.dealers WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin','super_admin','sales','sales_lead','accounts_manager','claims_manager','accounts')
  );
$$;

CREATE TABLE IF NOT EXISTS public.finance_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  reference text UNIQUE NOT NULL DEFAULT ('FA-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  status public.finance_application_status NOT NULL DEFAULT 'draft',
  assigned_underwriter uuid,
  customer jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision jsonb,
  notes text,
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_application_vehicle (
  application_id uuid PRIMARY KEY REFERENCES public.finance_applications(id) ON DELETE CASCADE,
  vrm text, make text, model text, derivative text,
  year int, mileage int, condition text,
  valuation numeric, hpi_clear boolean,
  data jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.finance_application_finance (
  application_id uuid PRIMARY KEY REFERENCES public.finance_applications(id) ON DELETE CASCADE,
  product text, lender_id uuid,
  cash_price numeric, deposit numeric, term_months int, balloon numeric,
  apr numeric, monthly numeric, commission numeric,
  data jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.finance_application_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.finance_applications(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.finance_applications(id) ON DELETE CASCADE,
  actor uuid, event_type text NOT NULL,
  from_status public.finance_application_status,
  to_status public.finance_application_status,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_application_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.finance_applications(id) ON DELETE CASCADE,
  author uuid, author_role text NOT NULL, body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_lenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, active boolean NOT NULL DEFAULT true, contact jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id uuid NOT NULL REFERENCES public.finance_lenders(id) ON DELETE CASCADE,
  name text NOT NULL, product_type text NOT NULL,
  rate_card jsonb NOT NULL DEFAULT '{}'::jsonb,
  commission_split jsonb, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.underwriting_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dealer_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  label text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['applications:read','applications:write'],
  last_used_at timestamptz, revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  url text NOT NULL, secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['application.status_changed'],
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.finance_applications(id),
  period text, amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_fa_updated_at BEFORE UPDATE ON public.finance_applications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.finance_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_application_vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_application_finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_application_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_application_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_lenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.underwriting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY fa_select ON public.finance_applications FOR SELECT
  USING (dealer_id = public.current_dealer_id() OR public.is_staff());
CREATE POLICY fa_insert ON public.finance_applications FOR INSERT
  WITH CHECK (dealer_id = public.current_dealer_id() OR public.is_staff());
CREATE POLICY fa_update ON public.finance_applications FOR UPDATE
  USING (dealer_id = public.current_dealer_id() OR public.is_staff());
CREATE POLICY fa_delete ON public.finance_applications FOR DELETE
  USING (public.is_staff());

CREATE POLICY fav_all ON public.finance_application_vehicle FOR ALL
  USING (EXISTS (SELECT 1 FROM public.finance_applications a WHERE a.id = application_id AND (a.dealer_id = public.current_dealer_id() OR public.is_staff())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.finance_applications a WHERE a.id = application_id AND (a.dealer_id = public.current_dealer_id() OR public.is_staff())));

CREATE POLICY faf_all ON public.finance_application_finance FOR ALL
  USING (EXISTS (SELECT 1 FROM public.finance_applications a WHERE a.id = application_id AND (a.dealer_id = public.current_dealer_id() OR public.is_staff())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.finance_applications a WHERE a.id = application_id AND (a.dealer_id = public.current_dealer_id() OR public.is_staff())));

CREATE POLICY fad_all ON public.finance_application_docs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.finance_applications a WHERE a.id = application_id AND (a.dealer_id = public.current_dealer_id() OR public.is_staff())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.finance_applications a WHERE a.id = application_id AND (a.dealer_id = public.current_dealer_id() OR public.is_staff())));

CREATE POLICY fae_select ON public.finance_application_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.finance_applications a WHERE a.id = application_id AND (a.dealer_id = public.current_dealer_id() OR public.is_staff())));
CREATE POLICY fae_insert ON public.finance_application_events FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.finance_applications a WHERE a.id = application_id AND (a.dealer_id = public.current_dealer_id() OR public.is_staff())));

CREATE POLICY fam_all ON public.finance_application_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.finance_applications a WHERE a.id = application_id AND (a.dealer_id = public.current_dealer_id() OR public.is_staff())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.finance_applications a WHERE a.id = application_id AND (a.dealer_id = public.current_dealer_id() OR public.is_staff())));

CREATE POLICY lenders_read ON public.finance_lenders FOR SELECT USING (active OR public.is_staff());
CREATE POLICY lenders_admin ON public.finance_lenders FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY products_read ON public.finance_products FOR SELECT USING (active OR public.is_staff());
CREATE POLICY products_admin ON public.finance_products FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY rules_admin ON public.underwriting_rules FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY apikeys_dealer ON public.dealer_api_keys FOR ALL
  USING (dealer_id = public.current_dealer_id() OR public.is_staff())
  WITH CHECK (dealer_id = public.current_dealer_id() OR public.is_staff());

CREATE POLICY webhooks_dealer ON public.api_webhook_endpoints FOR ALL
  USING (dealer_id = public.current_dealer_id() OR public.is_staff())
  WITH CHECK (dealer_id = public.current_dealer_id() OR public.is_staff());

CREATE POLICY payouts_select ON public.payouts FOR SELECT
  USING (dealer_id = public.current_dealer_id() OR public.is_staff());
CREATE POLICY payouts_admin ON public.payouts FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

INSERT INTO storage.buckets (id, name, public) VALUES ('finance-documents','finance-documents', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "finance docs read" ON storage.objects FOR SELECT
  USING (bucket_id = 'finance-documents' AND (public.is_staff() OR EXISTS (
    SELECT 1 FROM public.finance_applications a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.dealer_id = public.current_dealer_id()
  )));

CREATE POLICY "finance docs write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'finance-documents' AND (public.is_staff() OR EXISTS (
    SELECT 1 FROM public.finance_applications a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.dealer_id = public.current_dealer_id()
  )));

CREATE POLICY "finance docs delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'finance-documents' AND (public.is_staff() OR EXISTS (
    SELECT 1 FROM public.finance_applications a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.dealer_id = public.current_dealer_id()
  )));

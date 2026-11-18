CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  contact_name text,
  contact_email text,
  platform text,
  mode text NOT NULL DEFAULT 'test',
  status text NOT NULL DEFAULT 'active',
  api_key_hash text UNIQUE,
  api_key_prefix text,
  webhook_url text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partners" ON public.partners FOR ALL TO authenticated
  USING (public.bdm_is_town_admin(auth.uid())) WITH CHECK (public.bdm_is_town_admin(auth.uid()));

CREATE TABLE public.partner_dealers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, dealer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_dealers TO authenticated;
GRANT ALL ON public.partner_dealers TO service_role;
ALTER TABLE public.partner_dealers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partner dealers" ON public.partner_dealers FOR ALL TO authenticated
  USING (public.bdm_is_town_admin(auth.uid())) WITH CHECK (public.bdm_is_town_admin(auth.uid()));

CREATE TABLE public.partner_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status_code integer,
  success boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_webhook_deliveries TO authenticated;
GRANT ALL ON public.partner_webhook_deliveries TO service_role;
ALTER TABLE public.partner_webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view partner webhooks" ON public.partner_webhook_deliveries FOR SELECT TO authenticated
  USING (public.bdm_is_town_admin(auth.uid()));

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS customers_partner_id_idx ON public.customers(partner_id) WHERE partner_id IS NOT NULL;
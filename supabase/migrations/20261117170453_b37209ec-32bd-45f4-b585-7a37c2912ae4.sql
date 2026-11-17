CREATE TABLE public.dealer_trade_terms_versions (
  version text PRIMARY KEY,
  summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  change_note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dealer_trade_terms_versions TO anon;
GRANT SELECT, INSERT ON public.dealer_trade_terms_versions TO authenticated;
GRANT ALL ON public.dealer_trade_terms_versions TO service_role;
ALTER TABLE public.dealer_trade_terms_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read trade terms" ON public.dealer_trade_terms_versions FOR SELECT USING (true);
CREATE POLICY "Admins publish trade terms" ON public.dealer_trade_terms_versions FOR INSERT TO authenticated
  WITH CHECK (public.bdm_has_role(auth.uid(), ARRAY['super_admin','admin']) AND created_by = auth.uid());
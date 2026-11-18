CREATE TABLE public.dealer_last_activity (
  dealer_id uuid PRIMARY KEY REFERENCES public.dealers(id) ON DELETE CASCADE,
  path text NOT NULL,
  page_label text NOT NULL,
  activity_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dealer_last_activity TO authenticated;
GRANT ALL ON public.dealer_last_activity TO service_role;
ALTER TABLE public.dealer_last_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view dealer last activity" ON public.dealer_last_activity FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_admin_tab(auth.uid(), 'dealer-dealers'));

CREATE OR REPLACE FUNCTION public.record_dealer_activity(p_path text, p_label text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid := public.current_dealer_id();
BEGIN
  IF v_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.dealer_last_activity(dealer_id, path, page_label, activity_at)
  VALUES (v_id, left(coalesce(p_path,''),300), left(coalesce(p_label,''),100), now())
  ON CONFLICT (dealer_id) DO UPDATE SET path = EXCLUDED.path, page_label = EXCLUDED.page_label, activity_at = now();
END $$;
REVOKE ALL ON FUNCTION public.record_dealer_activity(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_dealer_activity(text, text) TO authenticated;
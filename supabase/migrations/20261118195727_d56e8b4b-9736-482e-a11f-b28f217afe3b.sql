CREATE TABLE public.dealer_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  path text NOT NULL,
  page_label text NOT NULL,
  activity_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dealer_activity_log_at_idx ON public.dealer_activity_log (activity_at DESC);
CREATE INDEX dealer_activity_log_dealer_idx ON public.dealer_activity_log (dealer_id, activity_at DESC);
GRANT SELECT ON public.dealer_activity_log TO authenticated;
GRANT ALL ON public.dealer_activity_log TO service_role;
ALTER TABLE public.dealer_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view dealer activity log" ON public.dealer_activity_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_admin_tab(auth.uid(), 'dealer-dealers') OR public.has_admin_tab(auth.uid(), 'dealer-overview'));

CREATE POLICY "Staff can view dealer sign-ins" ON public.dealer_login_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_admin_tab(auth.uid(), 'dealer-dealers') OR public.has_admin_tab(auth.uid(), 'dealer-overview'));
GRANT SELECT ON public.dealer_login_events TO authenticated;

CREATE OR REPLACE FUNCTION public.record_dealer_activity(p_path text, p_label text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid := public.current_dealer_id(); v_path text := left(coalesce(p_path,''),300); v_label text := left(coalesce(p_label,''),100);
BEGIN
  IF v_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.dealer_last_activity(dealer_id, path, page_label, activity_at)
  VALUES (v_id, v_path, v_label, now())
  ON CONFLICT (dealer_id) DO UPDATE SET path = EXCLUDED.path, page_label = EXCLUDED.page_label, activity_at = now();
  -- skip repeat hits of the same page within 2 minutes
  IF NOT EXISTS (SELECT 1 FROM public.dealer_activity_log WHERE dealer_id = v_id AND path = v_path AND activity_at > now() - interval '2 minutes') THEN
    INSERT INTO public.dealer_activity_log(dealer_id, path, page_label) VALUES (v_id, v_path, v_label);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.record_dealer_activity(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_dealer_activity(text, text) TO authenticated;
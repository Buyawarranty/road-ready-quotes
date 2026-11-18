ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.can_see_test_dealers()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','dev_tester'))
$$;
REVOKE ALL ON FUNCTION public.can_see_test_dealers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_test_dealers() TO authenticated, service_role;

DROP POLICY IF EXISTS "Test dealers hidden from non-testers" ON public.dealers;
CREATE POLICY "Test dealers hidden from non-testers" ON public.dealers AS RESTRICTIVE FOR SELECT TO authenticated, anon
  USING (NOT is_test OR user_id = auth.uid() OR public.can_see_test_dealers());

CREATE OR REPLACE FUNCTION public.set_dealer_test_flag(p_dealer_id uuid, p_is_test boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')) THEN
    RAISE EXCEPTION 'Only a Super Admin or Admin can mark test accounts.';
  END IF;
  UPDATE public.dealers SET is_test = p_is_test WHERE id = p_dealer_id;
END; $$;
REVOKE ALL ON FUNCTION public.set_dealer_test_flag(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_dealer_test_flag(uuid, boolean) TO authenticated, service_role;
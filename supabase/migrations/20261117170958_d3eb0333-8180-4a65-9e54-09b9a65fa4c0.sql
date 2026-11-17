CREATE OR REPLACE FUNCTION private.can_authorize_dealer_credit(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('admin','super_admin','accounts','accounts_manager'));
$$;

DROP POLICY IF EXISTS "Accounts view credit requests" ON public.dealer_paylater_requests;
CREATE POLICY "Accounts view credit requests" ON public.dealer_paylater_requests FOR SELECT TO authenticated
  USING (public.bdm_has_role(auth.uid(), ARRAY['accounts','accounts_manager']));

CREATE OR REPLACE FUNCTION public.bdm_pending_credit_dealers(p_dealer_ids uuid[])
RETURNS TABLE(dealer_id uuid, requested_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT r.dealer_id, min(r.created_at) FROM public.dealer_paylater_requests r
  WHERE public.bdm_is_staff(auth.uid()) AND r.status = 'pending' AND r.dealer_id = ANY(p_dealer_ids)
  GROUP BY r.dealer_id;
$$;
REVOKE EXECUTE ON FUNCTION public.bdm_pending_credit_dealers(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bdm_pending_credit_dealers(uuid[]) TO authenticated;